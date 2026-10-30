// The turns journal: one row per message to the cat, to see over a month what
// people ask, where the cat fails them and where they leave a signup form.
// No names and no phones: a form's answers are not written at all, phone
// numbers and emails in free text are masked, and the chat is a short hash.
// Kept 90 days (index.mjs), sent weekly to DEV_EMAIL_TO as a file for Excel,
// and on demand with `npm run turns`.

import crypto from 'node:crypto'
import { cell, msk } from './csv.mjs'

export const KEEP_DAYS = 90

export function mask(text) {
  return String(text || '')
    .replace(/\S+@\S+\.\S+/g, '[почта]')
    .replace(/\+?\d[\d\s()-]{5,}\d/g, '[номер]')
    .replace(/\s+/g, ' ')
    .trim()
}

const plain = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const chatHash = (id) => crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 8)
const formTitle = (st) => (st && st.draft ? (st.draft.dir ? st.draft.dir.title : 'Актёрские курсы') : '')

// One turn as a row. `before` is the chat's state as it was, `res` what the
// turn decided (after the model, if there was one).
export function journalRow({ ev, before, res, parsed, parseAsked, parseFailed, modelCalled, modelFailed, knowledge, at }) {
  const stepBefore = (before && before.step) || ''
  const stepAfter = (res.state ? res.state.step : stepBefore) || ''
  const inForm = Boolean(stepBefore || stepAfter)
  const kind = ev.kind === 'callback' ? 'кнопка' : ev.kind === 'text' ? (/^\/start/.test(ev.text) ? 'начало чата' : 'текст') : ev.kind
  // a form's own answers are a name, an age, a phone: never written down; a
  // question asked in the middle of a form went to the model and is kept
  const text = ev.kind === 'callback' ? ev.data : stepBefore && !modelCalled && ev.kind === 'text' ? '[ответ анкеты]' : mask(ev.text || '').slice(0, 300)

  let parser = 'не нужен'
  if (parseAsked) parser = parseFailed || !parsed ? 'упал' : parsed.action + (parsed.target ? ' → ' + parsed.target : '') + (parsed.topics && parsed.topics.length ? ' [' + parsed.topics.join(', ') + ']' : '')

  const answeredBy = res.limited ? 'лимит: ' + res.limited : modelFailed ? 'модель не ответила' : modelCalled ? 'модель' : inForm ? 'анкета' : 'код'
  const signals = [...(res.notes || [])]
  if (parseAsked && (parseFailed || !parsed)) signals.push('разборщик упал')
  if (parsed && parsed.action === 'unclear') signals.push('разборщик: не понял')

  const buttons = []
  for (const m of res.out || []) for (const row of (m.reply_markup && m.reply_markup.inline_keyboard) || []) for (const b of row) buttons.push(b.callback_data)

  const outcome = []
  for (const e of res.effects || []) {
    if (e.type === 'leadSave') outcome.push(e.isNew ? 'заявка: ' + (e.lead.direction || 'Курсы') : /Напоминает/.test(e.notice || '') ? 'напомнил о звонке' : 'дополнение к заявке')
    if (e.type === 'leadCancel') outcome.push('заявка отменена')
    if (e.type === 'feedback') outcome.push('отзыв')
  }
  if (!stepBefore && stepAfter) outcome.push('анкета открыта: ' + formTitle(res.state))
  if (stepBefore && !stepAfter && !outcome.some((o) => o.startsWith('заявка:'))) outcome.push('анкета закрыта без заявки')

  // the bot's own words, except a form's steps, which repeat the name back
  const reply = inForm && !modelCalled ? '[шаг анкеты]' : mask(plain((res.out || []).map((m) => m.text).join(' / '))).slice(0, 400)

  return {
    at,
    chat: chatHash(ev.chatId),
    kind,
    text,
    step_before: stepBefore,
    parser,
    answered_by: answeredBy,
    signals: signals.join('; '),
    buttons: buttons.join(', '),
    step_after: stepAfter,
    outcome: outcome.join('; '),
    reply,
    data_version: (knowledge && knowledge.builtAt) || '',
  }
}

export const JOURNAL_COLUMNS = [
  ['at', 'Когда (МСК)'],
  ['chat', 'Разговор'],
  ['kind', 'Что пришло'],
  ['text', 'Сообщение'],
  ['parser', 'Разборщик решил'],
  ['answered_by', 'Кто ответил'],
  ['signals', 'Сигналы'],
  ['reply', 'Ответ кота'],
  ['buttons', 'Кнопки под ответом'],
  ['step_before', 'Шаг анкеты до'],
  ['step_after', 'Шаг анкеты после'],
  ['outcome', 'Итог'],
  ['data_version', 'Версия данных'],
]

export function turnsCsv(db, fromIso = '') {
  const rows = db.prepare('SELECT * FROM turns WHERE at >= ? ORDER BY id').all(fromIso)
  const lines = [JOURNAL_COLUMNS.map((c) => cell(c[1])).join(';')]
  for (const r of rows) lines.push(JOURNAL_COLUMNS.map(([k]) => cell(k === 'at' ? msk(r[k]) : r[k])).join(';'))
  return { text: '﻿' + lines.join('\r\n') + '\r\n', count: rows.length }
}

// A few lines for the letter the file comes with.
export function turnsSummary(db, fromIso = '') {
  const rows = db.prepare('SELECT * FROM turns WHERE at >= ? ORDER BY id').all(fromIso)
  if (!rows.length) return 'За неделю коту никто не писал.'
  const count = (f) => rows.filter(f).length
  const chats = new Set(rows.map((r) => r.chat))
  const opened = new Set(rows.filter((r) => /анкета открыта/.test(r.outcome)).map((r) => r.chat))
  const signed = new Set(rows.filter((r) => /заявка:/.test(r.outcome)).map((r) => r.chat))
  const left = [...opened].filter((c) => !signed.has(c)).length
  const noAnswer = rows.filter((r) => /нет ответа в данных/.test(r.signals)).map((r) => r.text)
  const lines = [
    'Разговоров: ' + chats.size + ', сообщений: ' + rows.length,
    'Ответила модель: ' + count((r) => r.answered_by === 'модель') + ', из них без ответа в данных: ' + noAnswer.length,
    'Разборщик не понял: ' + count((r) => /не понял/.test(r.signals)) + ', разборщик упал: ' + count((r) => /разборщик упал/.test(r.signals)),
    'Модель не ответила: ' + count((r) => r.answered_by === 'модель не ответила') + ', лимиты: ' + count((r) => /^лимит/.test(r.answered_by)),
    'Анкет открыто: ' + opened.size + ', заявок: ' + signed.size + ', бросили анкету: ' + left,
  ]
  if (noAnswer.length) lines.push('', 'Без ответа в данных (первые 10):', ...noAnswer.slice(0, 10).map((t) => '- ' + t))
  return lines.join('\n')
}
