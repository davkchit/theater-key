// The bot as one small process (replaces n8n):
//
//   node bot/server/index.mjs        (npm run bot)
//
// It long-polls Telegram, so no public address or domain is needed, runs each
// update through bot/server/turn.mjs, keeps everything in SQLite, and answers
// GET /health on BOT_PORT (default 8787, localhost only).
//
// Settings come from .env.bot next to the repo, overridden by real environment
// variables (that is how Docker passes them):
//   TELEGRAM_BOT_TOKEN, ADMIN_CHAT_ID
//   LLM_BASE, LLM_AUTH, LLM_KEY, LLM_MODEL, LLM_PARSER_MODEL
//   SITE_URL          fetch knowledge.json from the deployed site (optional)
//   BOT_DATA_DIR      where kluch.sqlite and bot.log live (default bot/data)
//   BOT_PORT, BOT_HOST
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, LEADS_EMAIL_TO, DEV_EMAIL_TO   (see mail.mjs)
//   ALLOWED_ORIGINS   sites allowed to post leads from a browser, comma-separated
//   TRUST_PROXY=1     behind nginx/caddy: take the visitor's address from X-Forwarded-For
//   TG_NOTIFY_TOKEN, TG_NOTIFY_CHAT   a Telegram bot that only says «пришла
//                     заявка, смотрите почту», no names or phones; chat ids
//                     comma-separated (optional)
//   BOT_POLL=0        do not read Telegram (HTTP only); TELEGRAM_BOT_TOKEN is
//                     then optional

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { loadEnv, redactor, repoRoot } from '../scripts/env.mjs'
import { loadBotLib, fetchHelpers } from './lib.mjs'
import { openStore } from './store.mjs'
import { createTelegram } from './telegram.mjs'
import { createKnowledge } from './knowledge.mjs'
import { createTurn } from './turn.mjs'
import { createMailer, devMail } from './mail.mjs'
import { createSiteApi } from './site.mjs'
import { leadsCsv } from './csv.mjs'
import { KEEP_DAYS, turnsCsv, turnsSummary } from './journal.mjs'
import { createWebChat } from './webchat.mjs'

const env = { ...loadEnv(), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(TELEGRAM|ADMIN|LLM|YANDEX|SITE_URL|BOT_|KNOWLEDGE|SMTP|LEADS|MAIL_|DEV_EMAIL|ALLOWED_ORIGINS|TRUST_PROXY)/.test(k))) }
// the token is needed only to read Telegram; the site's chat and forms run
// without it (BOT_POLL=0), and a cleaned-up settings file must not stop them
if (!env.TELEGRAM_BOT_TOKEN && env.BOT_POLL !== '0') { console.error('нет TELEGRAM_BOT_TOKEN: впишите его в .env.bot или поставьте BOT_POLL=0 (без Telegram)'); process.exit(1) }

const redact = redactor(env)
const dataDir = path.resolve(env.BOT_DATA_DIR || path.join(repoRoot, 'bot/data'))
fs.mkdirSync(dataDir, { recursive: true })
const logFile = path.join(dataDir, 'bot.log')

function log(...parts) {
  const line = `${new Date().toISOString()} ${redact(parts.join(' '))}`
  console.log(line)
  try {
    // a log that grows forever fills the disk of a server nobody watches
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 5 * 1024 * 1024) fs.renameSync(logFile, logFile + '.1')
    fs.appendFileSync(logFile, line + '\n')
  } catch {}
}

const lib = loadBotLib()
const store = openStore(dataDir)
const tg = env.TELEGRAM_BOT_TOKEN
  ? createTelegram(env.TELEGRAM_BOT_TOKEN, redact, log)
  : { call: async () => ({ ok: false, description: 'Telegram не настроен' }), send: async () => false }

// a problem the developer must hear about: into the admin chat when there is one
async function alarm(text) {
  log('ВНИМАНИЕ:', text)
  const mail = devMail(store, env, text)
  if (mail.length) { store.commit({ chats: [], leads: [], statuses: [], unanswered: [], mail }); mailer.flush() }
  if (env.ADMIN_CHAT_ID) await tg.send({ method: 'sendMessage', payload: lib.msg(env.ADMIN_CHAT_ID, '⚠️ Бот «Ключ»: ' + lib.esc(text)) })
}

const knowledge = createKnowledge({ env, repoRoot, store, log, alarm })
const llm = (body, budgetMs) => lib.callLlm(fetchHelpers, env, body, budgetMs)

// a turn only queues its letters (outbox); they go out after the turn, see handleUpdate
const notifyTg = env.TG_NOTIFY_TOKEN && env.TG_NOTIFY_CHAT ? createTelegram(env.TG_NOTIFY_TOKEN, redact, log) : null
const notify = notifyTg
  ? async (text) => {
      for (const chat of env.TG_NOTIFY_CHAT.split(',').map((c) => c.trim()).filter(Boolean))
        await notifyTg.send({ method: 'sendMessage', payload: { chat_id: chat, text } })
    }
  : null
const mailer = createMailer({ env, store, log, notify })
// the chat window on the site shares the turn: its own messages go back in the
// HTTP reply, everything else (the admin chat) to Telegram, see webchat.mjs
let webchat = null
const send = (item) => (webchat ? webchat.route(item, tg.send) : tg.send(item))
const turn = createTurn({ env, lib, store, getKnowledge: knowledge.get, llm, send, log })
const site = createSiteApi({ env, lib, store, getKnowledge: knowledge.get, send: tg.send, log })

// ---- one line per chat: two quick messages from one person are answered in the
// order they were sent (in n8n they ran side by side and could swap places)
const lanes = new Map()
function inLane(key, job) {
  const prev = lanes.get(key) || Promise.resolve()
  const next = prev.then(job, job)
  lanes.set(key, next)
  next.finally(() => { if (lanes.get(key) === next) lanes.delete(key) })
  return next
}

webchat = createWebChat({ turn, lane: inLane, log })

const chatOf = (u) => String(u.message?.chat?.id ?? u.callback_query?.message?.chat?.id ?? u.update_id)
const seenUpdates = new Set()

async function handleUpdate(u) {
  // Telegram can deliver the same update twice after a restart
  if (seenUpdates.has(u.update_id)) return
  seenUpdates.add(u.update_id)
  if (seenUpdates.size > 500) seenUpdates.delete(seenUpdates.values().next().value)
  try {
    await inLane(chatOf(u), () => turn.handle(u))
    mailer.flush()
  } catch (e) {
    log('ход не удался:', e.stack || e.message)
    await alarm('ход не удался: ' + String(e.message).slice(0, 200))
  }
}

// ---- http: health, leads from the site, the cat's events
const origins = new Set(
  String(env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map((o) => o.trim()).filter(Boolean),
)

// A form on the site itself posts to the same address through the proxy;
// browsers still send Origin with a POST, so that case is recognised by host
// instead of having to be listed.
function allowedOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return false
  if (origins.has(origin)) return true
  try { return new URL(origin).host === (req.headers['x-forwarded-host'] || req.headers.host) } catch { return false }
}

function reply(req, res, status, body) {
  const origin = req.headers.origin
  const headers = { 'Content-Type': 'application/json; charset=utf-8' }
  if (origin && allowedOrigin(req)) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' })
  res.writeHead(status, headers)
  res.end(body == null ? '' : JSON.stringify(body))
}

function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { resolve(undefined); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { resolve(null) } })
    req.on('error', () => resolve(null))
  })
}

const ipOf = (req) => (env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?'

const server = http.createServer(async (req, res) => {
  const url = (req.url || '').split('?')[0]
  try {
    if (url === '/health') return reply(req, res, 200, { ok: true, knowledge: knowledge.info(), lanes: lanes.size, mail: mailer.enabled })
    // The site was just rebuilt (kluch-site-publish): read its knowledge now,
    // not up to ten minutes later, when a price changed in the admin was already
    // on the site and the cat still named the old one. Not under /api, so Caddy
    // does not pass it from outside, and only from this machine itself.
    if (req.method === 'POST' && url === '/reload-knowledge') {
      const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !req.headers['x-forwarded-for']
      if (!local) return reply(req, res, 403, { ok: false })
      await knowledge.refresh()
      return reply(req, res, 200, { ok: true, knowledge: knowledge.info() })
    }
    if (req.method === 'OPTIONS' && url.startsWith('/api/')) {
      const origin = req.headers.origin
      if (!allowedOrigin(req)) { res.writeHead(403); return res.end() }
      res.writeHead(204, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' })
      return res.end()
    }
    if (req.method === 'POST' && (url === '/api/lead' || url === '/api/event')) {
      // a browser from a foreign site is refused; no Origin (a server, curl) is allowed
      if (req.headers.origin && !allowedOrigin(req)) return reply(req, res, 403, { ok: false, error: 'чужой сайт' })
      const body = await readJson(req)
      if (body === undefined) return reply(req, res, 413, { ok: false, error: 'слишком большая заявка' })
      const r = url === '/api/lead' ? await site.lead(body, ipOf(req)) : site.event(body, ipOf(req))
      if (url === '/api/lead' && r.status === 200) mailer.flush()
      return reply(req, res, r.status, r.body)
    }
    if (req.method === 'POST' && url === '/api/chat') {
      if (req.headers.origin && !allowedOrigin(req)) return reply(req, res, 403, { ok: false, error: 'чужой сайт' })
      const body = await readJson(req, 4 * 1024)
      if (body === undefined) return reply(req, res, 413, { ok: false, error: 'слишком длинное сообщение' })
      const r = await webchat.handle(body, ipOf(req))
      if (r.status === 200) mailer.flush()
      return reply(req, res, r.status, r.body)
    }
    reply(req, res, 404, { ok: false })
  } catch (e) {
    log('ошибка запроса', url, e.stack || e.message)
    reply(req, res, 500, { ok: false, error: 'ошибка на сервере, позвоните нам' })
  }
})
server.on('error', (e) => {
  // a second copy of the bot would also fight the first for Telegram's updates
  log(e.code === 'EADDRINUSE' ? `порт ${env.BOT_PORT || 8787} занят: бот уже запущен в другом окне. Остановите его или смените BOT_PORT.` : 'ошибка сервера: ' + e.message)
  process.exit(1)
})
server.listen(Number(env.BOT_PORT || 8787), env.BOT_HOST || '127.0.0.1')

// ---- once a week the whole week's leads go to the mailbox as a file for Excel
function weekKey(nowMs) {
  const d = new Date(nowMs + 3 * 3600e3) // Moscow
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)))
  return { key: monday.toISOString().slice(0, 10), isMondayMorning: d.getUTCDay() === 1 && d.getUTCHours() >= 9 }
}
async function weeklyReport() {
  if (!mailer.enabled || env.LEADS_WEEKLY_CSV === '0') return
  const w = weekKey(Date.now())
  if (!w.isMondayMorning || store.getKv('weeklySent') === w.key) return
  const from = new Date(Date.parse(w.key + 'T00:00:00+03:00') - 7 * 86400e3).toISOString()
  const csv = leadsCsv(store.db, from)
  try {
    const text = 'Заявки за прошлую неделю во вложении. Файл открывается в Excel.' + unansweredSince(from)
    await mailer.sendNow({ to: 'leads', subject: 'Заявки за неделю: ' + csv.count, text, attachments: [{ filename: 'заявки-' + w.key + '.csv', content: csv.text, contentType: 'text/csv; charset=utf-8' }] })
    store.putKv('weeklySent', w.key)
    log('недельная выгрузка отправлена:', csv.count, 'заявок')
  } catch (e) {
    log('недельная выгрузка не ушла, повторю через час:', e.message)
  }
}
// What the bot could not answer last week, for whoever keeps «Ответы бота» in
// the admin: without this list the questions were saved and nobody ever saw
// them. Phones and emails people typed are masked, repeats counted once.
function unansweredSince(fromIso) {
  const rows = store.db.prepare('SELECT question FROM unanswered WHERE asked_at >= ? ORDER BY id').all(fromIso)
  const seen = new Map()
  for (const r of rows) {
    const q = String(r.question || '').replace(/\S+@\S+/g, '[почта]').replace(/\+?\d[\d\s()-]{5,}\d/g, '[номер]').replace(/\s+/g, ' ').trim().slice(0, 200)
    if (q) seen.set(q.toLowerCase(), { q, n: (seen.get(q.toLowerCase())?.n || 0) + 1 })
  }
  if (!seen.size) return ''
  const list = [...seen.values()].map((x) => '- ' + x.q + (x.n > 1 ? ' (×' + x.n + ')' : '')).join('\n')
  return '\n\nНа эти вопросы кот в чате не нашёл ответа. Если ответ стоит давать, впишите его в админке, раздел «Ответы бота»:\n' + list
}
setInterval(weeklyReport, 3600e3).unref()

// ---- the turns journal (journal.mjs): last week's file to the developer on
// Monday morning, and nothing older than 90 days kept
async function weeklyJournal() {
  const cut = new Date(Date.now() - KEEP_DAYS * 86400e3).toISOString()
  const gone = store.pruneTurns(cut)
  if (gone) log('журнал: удалено старых строк', gone)
  const old = store.pruneOld(cut)
  if (old) log('удалено старых чатов и отправленных писем:', old)
  if (!mailer.enabled || !env.DEV_EMAIL_TO) return
  const w = weekKey(Date.now())
  if (!w.isMondayMorning || store.getKv('turnsSent') === w.key) return
  const from = new Date(Date.parse(w.key + 'T00:00:00+03:00') - 7 * 86400e3).toISOString()
  const csv = turnsCsv(store.db, from)
  try {
    const text = 'Журнал кота за прошлую неделю во вложении, без имён и телефонов. Файл открывается в Excel.\n\n' + turnsSummary(store.db, from)
    await mailer.sendNow({ to: 'dev', subject: 'Журнал кота за неделю: ' + csv.count + ' сообщений', text, attachments: [{ filename: 'журнал-кота-' + w.key + '.csv', content: csv.text, contentType: 'text/csv; charset=utf-8' }] })
    store.putKv('turnsSent', w.key)
    log('журнал за неделю отправлен:', csv.count, 'строк')
  } catch (e) {
    log('журнал за неделю не ушёл, повторю через час:', e.message)
  }
}
setInterval(weeklyJournal, 3600e3).unref()

// ---- the afisha follows Bileton's widgets hourly (deploy/cms/bileton-sync.sh),
// which leaves a status file. What it removed and what failed goes to the
// mailbox that gets the leads — whoever runs the site — once per run that
// had something to say, not every hour.
const BILETON_STATUS = env.BOT_BILETON_STATUS || '/opt/kluch/cms/bileton-status.json'
function checkBileton() {
  let st
  try {
    st = JSON.parse(fs.readFileSync(BILETON_STATUS, 'utf8'))
  } catch {
    return // the sync is not set up on this machine
  }
  const broken = [...(st.errors || [])]
  const stale = Date.now() - Date.parse(st.checkedAt || 0)
  if (stale > 3 * 3600e3) broken.unshift('Синхронизация не запускалась с ' + new Date(Date.parse(st.checkedAt || 0)).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }))
  const gone = st.removed || []
  const fresh = st.newShows || []
  // a run's news (removals, new shows) is news once; a lasting failure is
  // news until fixed
  const sig = broken.join('\n') + '|' + (gone.length || fresh.length ? st.checkedAt : '')
  if (store.getKv('biletonSig') === sig) return
  store.putKv('biletonSig', sig)
  if (!broken.length && !gone.length && !fresh.length) return
  const parts = []
  if (fresh.length)
    parts.push(
      'На Билетоне появился новый спектакль — на сайте он уже есть в афише и в «Спектаклях»:\n- ' +
        fresh.map((t) => `«${t}»`).join('\n- ') +
        '\nДобавьте ему описание, жанр, режиссёра и фото: админка → «Репертуар» → «Спектакли».',
    )
  if (gone.length) parts.push('С сайта убраны даты, которых нет на Билетоне (отменены, перенесены или не заводились):\n- ' + gone.join('\n- '))
  if (broken.length) parts.push('Не получилось прочитать Билетон, даты этих спектаклей на сайте сейчас не обновляются:\n- ' + broken.join('\n- '))
  const text = 'Афиша сайта берётся с Билетона и обновляется каждый час.\n\n' + parts.join('\n\n')
  store.commit({ chats: [], leads: [], statuses: [], unanswered: [], mail: [{ at: new Date().toISOString(), to: 'leads', subject: 'Сайт «Ключ»: афиша и Билетон', text, html: '' }] })
  mailer.flush()
  log('Билетон: письмо —', gone.length, 'убрано,', broken.length, 'ошибок')
}
setInterval(checkBileton, 30 * 60e3).unref()
setTimeout(checkBileton, 60e3).unref()

// ---- polling
let stopping = false
async function poll() {
  // Telegram may be unreachable at start (network, VPN, a blocked server). The
  // site's forms and chat do not need it, so the service keeps running and
  // tries again instead of exiting.
  let me = null
  for (let attempt = 1; !stopping; attempt++) {
    try {
      me = await tg.call('getMe')
      if (me.ok) break
      throw new Error(me.description || 'нет ответа')
    } catch (e) {
      if (attempt === 1 || attempt % 20 === 0) log('Telegram недоступен, сайт и чат работают, пробую снова:', redact(e.cause?.code ?? e.message))
      await new Promise((r) => setTimeout(r, Math.min(30000, 3000 * attempt)))
    }
  }
  if (!me || !me.ok) return
  // polling and a webhook cannot coexist: drop one left over from n8n
  try { await tg.call('deleteWebhook', { drop_pending_updates: false }) } catch {}
  log(`бот запущен: @${me.result.username} · знание ${knowledge.get().builtAt} · показов ${knowledge.get().afisha.length}`)

  const saved = store.getKv('offset')
  let offset = typeof saved === 'number' ? saved : 0
  while (!stopping) {
    let r
    try {
      r = await tg.call('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] }, 40000)
    } catch (e) {
      log('сеть:', redact(e.cause?.code ?? e.message))
      await new Promise((res) => setTimeout(res, 3000))
      continue
    }
    if (!r.ok) {
      if (r.error_code === 409) log('Telegram: бота уже читает другой процесс (мост n8n или второй запуск). Остановите его.')
      else log('Telegram:', r.description)
      await new Promise((res) => setTimeout(res, 5000))
      continue
    }
    // the batch is finished before the offset moves: a crash in the middle
    // makes Telegram deliver it again instead of losing what people wrote
    await Promise.all(r.result.map(handleUpdate))
    if (r.result.length) {
      offset = r.result[r.result.length - 1].update_id + 1
      store.putKv('offset', offset)
    }
  }
}

function stop() {
  if (stopping) return
  stopping = true
  log('останавливаюсь')
  server.close()
  // give the turns in flight a few seconds to write their state
  setTimeout(() => { try { store.close() } catch {} ; process.exit(0) }, 4000).unref()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
process.on('unhandledRejection', (e) => log('необработанная ошибка:', e && e.stack ? e.stack : e))

// mail and the weekly report do not depend on Telegram
mailer.start()
weeklyReport()
weeklyJournal()

if (env.BOT_POLL === '0') {
  log(`сервис запущен без Telegram (BOT_POLL=0): только сайт и почта · знание ${knowledge.get().builtAt}`)
} else {
  poll().catch((e) => { log('остановка из-за ошибки:', e.message); process.exit(1) })
}
