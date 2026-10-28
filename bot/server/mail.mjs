// Leads by email, the channel that works from a Russian server whatever
// happens to Telegram.
//
// Letters are not sent from inside a turn. A turn only puts them into the
// `outbox` table together with the lead itself (one transaction), and a loop
// here sends whatever is waiting, retrying for a day. So a mail server that is
// down for an hour delays the letter, it does not lose the lead's notification.
//
// Settings (.env.bot):
//   SMTP_HOST=smtp.mail.ru  SMTP_PORT=465  SMTP_USER=kluchtheatre@mail.ru
//   SMTP_PASS=<пароль для внешних приложений из настроек mail.ru>
//   LEADS_EMAIL_TO   who receives leads (default: SMTP_USER itself)
//   DEV_EMAIL_TO     who receives technical alerts (optional; none by default,
//                    the theatre should not get "модель не ответила")
// Without SMTP_HOST the outbox still fills up and nothing is sent: turning mail
// on later delivers what has accumulated.

import nodemailer from 'nodemailer'

const RETRY_MS = [60e3, 5 * 60e3, 15 * 60e3, 60 * 60e3]
// 1 + 5 + 15 minutes, then hourly: 30 tries is about a day (12 was 8.5 hours,
// less than a night of a mail server being down)
const GIVE_UP_AFTER = 30

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const msk = (iso) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export function mailConfig(env) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null
  const port = Number(env.SMTP_PORT || 465)
  return {
    transport: { host: env.SMTP_HOST, port, secure: port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } },
    from: env.MAIL_FROM || `Бот театра «Ключ» <${env.SMTP_USER}>`,
    leadsTo: env.LEADS_EMAIL_TO || env.SMTP_USER,
    devTo: env.DEV_EMAIL_TO || '',
  }
}

// ---- what a letter about a lead says

function leadLines(lead) {
  const rows = []
  rows.push(['Имя', lead.name])
  if (lead.phone) rows.push(['Телефон', lead.phone])
  for (const c of lead.children || []) rows.push(['Кого записывают', c])
  for (const a of lead.answers || []) {
    const i = a.indexOf(': ')
    rows.push(i > 0 ? [a.slice(0, i), a.slice(i + 2)] : ['', a])
  }
  for (const q of lead.questions || []) rows.push(['Вопрос', q])
  return rows.filter((r) => r[1])
}

// kind: 'new' | 'nudge' | 'more' | 'cancel'
export function leadLetter(lead, kind, at) {
  const what = lead.direction || 'Курсы'
  const head = { cancel: 'Клиент отменил заявку, звонить не нужно', nudge: 'Напоминает о себе, ждёт звонка', more: 'К заявке добавлен ещё один человек' }[kind] || 'Новая заявка'
  const subject = ({ cancel: 'Отмена: ', nudge: 'Ждёт звонка: ', more: 'Дополнение: ' }[kind] || 'Заявка: ') + what + ', ' + (lead.name || 'без имени')
  const rows = leadLines(lead)
  const where = ({ сайт: 'с формы на сайте', 'чат на сайте': 'из чата на сайте' }[lead.source] || 'из Telegram-бота') + ', ' + msk(at)
  const text = [head, what, where, '', ...rows.map(([k, v]) => (k ? k + ': ' : '') + v), '', 'Номер заявки: ' + lead.id].join('\n')
  const html =
    `<p style="font:15px/1.5 Arial,sans-serif;margin:0 0 4px"><b>${esc(head)}</b></p>` +
    `<p style="font:18px/1.4 Arial,sans-serif;margin:0 0 4px"><b>${esc(what)}</b></p>` +
    `<p style="font:13px Arial,sans-serif;color:#777;margin:0 0 14px">${esc(where)}</p>` +
    `<table style="font:15px/1.5 Arial,sans-serif;border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:#777;vertical-align:top">${esc(k)}</td><td style="padding:3px 0">${k === 'Телефон' ? `<a href="tel:${esc(String(v).replace(/[^+\d]/g, ''))}">${esc(v)}</a>` : esc(v)}</td></tr>`).join('') +
    `</table><p style="font:12px Arial,sans-serif;color:#999;margin-top:18px">Номер заявки: ${esc(lead.id)}</p>`
  return { to: 'leads', subject, text, html }
}

// The line a lead letter announces itself with in a messenger: its kind and
// direction, never the name or phone (a foreign messenger gets no personal
// data). Null for letters that are not about a lead.
export function leadNotice(subject) {
  const m = String(subject || '').match(/^(Заявка|Отмена|Ждёт звонка|Дополнение): (.*), [^,]*$/)
  if (!m) return null
  const head = { Заявка: '📩 Новая заявка', Отмена: '❌ Отмена заявки', 'Ждёт звонка': '⏰ Ждёт звонка', Дополнение: '➕ Дополнение к заявке' }[m[1]]
  return head + ': ' + m[2] + '. Подробности на почте.'
}

export function devLetter(text) {
  return { to: 'dev', subject: 'Бот «Ключ»: ' + String(text).slice(0, 60), text, html: '' }
}

// A technical alert for the developer's mailbox (DEV_EMAIL_TO), at most one an
// hour: a model that is down for a day must send a handful of letters, not one
// per visitor's message. Returns the outbox rows to commit (none when it is not
// time yet or no address is set). Before this the alerts went to the Telegram
// admin chat only, and with Telegram off nobody heard of a silent cat.
const DEV_EVERY_MS = 60 * 60e3
export function devMail(store, env, text, nowMs = Date.now()) {
  if (!env.DEV_EMAIL_TO) return []
  const last = store.getKv('devMailAt') || 0
  if (nowMs - last < DEV_EVERY_MS) return []
  store.putKv('devMailAt', nowMs)
  const body = text + '\n\nПохожие сигналы в течение часа письмом не приходят, они есть в bot.log на сервере.'
  return [{ at: new Date(nowMs).toISOString(), ...devLetter(body) }]
}

// ---- sending

// `transportFor` is injectable so tests can run without a mail server.
// `notify` (optional) gets the short line of each lead letter as it first
// goes out, whether the mail server takes it or not: a second channel.
export function createMailer({ env, store, log, notify = null, transportFor = (t) => nodemailer.createTransport(t), now = () => Date.now() }) {
  const cfg = mailConfig(env)
  const transport = cfg ? transportFor(cfg.transport) : null
  let busy = false

  async function sendNow({ to, subject, text, html, attachments }) {
    if (!transport) throw new Error('почта не настроена (SMTP_HOST, SMTP_USER, SMTP_PASS)')
    const address = to === 'dev' ? cfg.devTo : to === 'leads' ? cfg.leadsTo : to
    if (!address) return 'пропущено: нет адреса'
    await transport.sendMail({ from: cfg.from, to: address, subject, text, html: html || undefined, attachments })
    return 'отправлено'
  }

  // One pass over the outbox. Letters that keep failing are retried with a
  // growing pause and given up after about a day, with a line in the log.
  async function flush() {
    if (busy || !transport) return
    busy = true
    try {
      for (const m of store.dueMail(now())) {
        const notice = notify && m.tries === 0 && m.to === 'leads' ? leadNotice(m.subject) : null
        if (notice) notify(notice).catch((e) => log('уведомление не ушло:', e.message))
        try {
          const r = await sendNow(m)
          store.mailSent(m.id, now())
          if (r !== 'отправлено') log('письмо', m.id, r)
        } catch (e) {
          const tries = m.tries + 1
          const next = tries >= GIVE_UP_AFTER ? null : now() + RETRY_MS[Math.min(tries - 1, RETRY_MS.length - 1)]
          store.mailFailed(m.id, tries, next, String(e.message).slice(0, 300))
          log(next ? 'письмо не ушло, повторю:' : 'письмо так и не ушло, сдаюсь:', m.subject, '·', e.message)
          // a letter about a lead that never left is a lead nobody calls back;
          // the developer hears of it (if mail works at all for that address)
          if (!next && m.to !== 'dev') {
            const alert = devMail(store, env, 'Письмо так и не ушло после ' + tries + ' попыток: «' + m.subject + '». Ошибка: ' + String(e.message).slice(0, 200) + '. Заявка сохранена в базе бота.', now())
            if (alert.length) store.commit({ chats: [], leads: [], statuses: [], unanswered: [], mail: alert })
          }
        }
      }
    } finally {
      busy = false
    }
  }

  function start() {
    if (!cfg) { log('почта не настроена: заявки копятся в базе, письма уйдут, когда появятся SMTP_HOST, SMTP_USER, SMTP_PASS'); return }
    log('почта: заявки уходят на', cfg.leadsTo)
    const t = setInterval(flush, 30e3)
    t.unref()
    flush()
  }

  return { enabled: Boolean(cfg), flush, sendNow, start }
}
