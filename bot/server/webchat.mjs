// The same cat, in a chat window on the site.
//
//   POST /api/chat  { session, start: true }        opening greeting (no model)
//                   { session, text: "..." }         a message
//                   { session, tap: "consent:yes" }  a button under a message
//   -> { messages: [ { html, buttons: [[{ text, data }]], chips: [..] | null } ] }
//
// A site visitor is given to the bot exactly like a Telegram user: each message
// becomes a Telegram-shaped update for chat "w<session>", so the answers, the
// signup forms, the limits and the leads are the very same code. Only the
// output differs: Telegram keyboards become buttons and quick-reply chips, and
// the "share contact" button, which a browser does not have, becomes "type
// the number".
//
// What the bot sends to the admin chat (lead cards) still goes to Telegram.

const SESSION_RE = /^[a-z0-9]{16,40}$/
// modelPerIpDay: answers by the model to one address a day. The bot's own
// per-chat limit counts a session, and a session is whatever the browser sends:
// the chat's «↺» starts a new one, so one person could use up the whole bot's
// daily limit (150) in under an hour and leave the cat silent for everyone.
// Not lower than this: the theatre's Wi-Fi (the poster's QR in the lobby) and
// a mobile operator put many people behind one address.
const LIMITS = { perIpTenMin: 40, perIpDay: 300, modelPerIpDay: 60 }

// Telegram-only wording, where a phone button exists
const WEB_WORDING = [
  ['Оставьте телефон: нажмите кнопку ниже или напишите номер сообщением.', 'Напишите, пожалуйста, номер телефона.'],
  ['Остался телефон. Нажмите кнопку ниже, номер подставится сам. Или напишите номер сообщением.', 'Остался телефон. Напишите номер сообщением.'],
  ['Нажмите «Поделиться контактом» или напишите номер вида', 'Напишите его в виде'],
  ['телефон, кнопкой или сообщением.', 'телефон сообщением.'],
]

export const isWebChat = (chatId) => /^w[a-z0-9]+$/.test(String(chatId))

function webWording(html) {
  let s = String(html || '')
  for (const [a, b] of WEB_WORDING) s = s.split(a).join(b)
  return s
}

// A Telegram sendMessage payload -> a message for the chat window.
// chips: null = keep the previous chips, [] = remove them, [...] = replace.
export function toWebMessage(payload) {
  const rm = payload.reply_markup || {}
  const buttons = (rm.inline_keyboard || []).map((row) => row.map((b) => ({ text: b.text, data: b.callback_data })))
  let chips = null
  if (rm.keyboard) chips = rm.keyboard.flat().filter((b) => !b.request_contact).map((b) => b.text)
  else if (rm.remove_keyboard) chips = []
  return { html: webWording(payload.text), buttons, chips }
}

function rateLimiter() {
  const hits = new Map()
  return function allow(key, max, windowMs, nowMs) {
    const list = (hits.get(key) || []).filter((t) => nowMs - t < windowMs)
    if (list.length >= max) { hits.set(key, list); return false }
    list.push(nowMs)
    hits.set(key, list)
    if (hits.size > 5000) hits.delete(hits.keys().next().value)
    return true
  }
}

// `turn` is the bot's turn (turn.mjs) created with `send` = route() below, and
// `lane` runs work for one chat strictly in order (index.mjs).
export function createWebChat({ turn, lane, log, now = () => Date.now() }) {
  const inbox = new Map() // chat id -> messages collected during its turn
  const allow = rateLimiter()
  // address -> { day, n }: model answers given to it today (Moscow day). In
  // memory only: a restart forgives everyone, which is fine.
  const modelUse = new Map()
  const usedToday = (ip, day) => { const u = modelUse.get(ip); return u && u.day === day ? u.n : 0 }
  let seq = 0

  // Where each outgoing item of a turn goes: the web chat's own messages are
  // kept for the HTTP reply, everything else (the admin chat) to Telegram.
  function route(item, sendTelegram) {
    const p = item.payload || {}
    if (item.method === 'answerCallbackQuery') return String(p.callback_query_id || '').startsWith('web') ? true : sendTelegram(item)
    if (isWebChat(p.chat_id)) {
      if (item.method === 'sendMessage') {
        const list = inbox.get(String(p.chat_id))
        if (list) list.push(toWebMessage(p))
      }
      return true
    }
    return sendTelegram(item)
  }

  function update(chatId, body) {
    const updateId = now() * 100 + (seq++ % 100)
    const chat = { id: chatId, type: 'private' }
    const from = { id: 0, first_name: '' }
    if (body.tap) return { update_id: updateId, callback_query: { id: 'web' + updateId, from, message: { message_id: 0, chat, text: '' }, data: String(body.tap).slice(0, 64) } }
    const text = body.start ? '/start' : String(body.text || '').slice(0, 1000)
    return { update_id: updateId, message: { message_id: updateId, date: Math.floor(now() / 1000), chat, from, text } }
  }

  async function handle(body, ip) {
    if (!body || typeof body !== 'object') return { status: 400, body: { ok: false, error: 'пустое сообщение' } }
    const session = String(body.session || '')
    if (!SESSION_RE.test(session)) return { status: 400, body: { ok: false, error: 'неверная сессия' } }
    if (!body.start && !body.tap && !String(body.text || '').trim()) return { status: 400, body: { ok: false, error: 'пустое сообщение' } }
    const t = now()
    if (!allow('10m:' + ip, LIMITS.perIpTenMin, 600e3, t) || !allow('day:' + ip, LIMITS.perIpDay, 86400e3, t)) {
      return { status: 429, body: { ok: false, error: 'слишком много сообщений подряд, подождите немного' } }
    }

    const chatId = 'w' + session
    const messages = []
    const day = new Date(t + 3 * 3600e3).toISOString().slice(0, 10)
    await lane(chatId, async () => {
      inbox.set(chatId, messages)
      try {
        const p = await turn.handle(update(chatId, body), { llmBlocked: usedToday(ip, day) >= LIMITS.modelPerIpDay })
        if (p && p.llmCalls) {
          modelUse.set(ip, { day, n: usedToday(ip, day) + p.llmCalls })
          if (modelUse.size > 5000) modelUse.delete(modelUse.keys().next().value)
        }
      } finally {
        inbox.delete(chatId)
      }
    })
    return { status: 200, body: { ok: true, messages } }
  }

  return { handle, route }
}
