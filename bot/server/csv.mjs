// Leads as a file Excel opens correctly: UTF-8 with a BOM (without it Excel
// shows the Cyrillic as garbage) and ";" between columns (the separator a
// Russian Excel expects; with "," everything lands in column A).

const COLUMNS = [
  ['created_at', 'Когда (МСК)'],
  ['source', 'Откуда'],
  ['direction', 'На что'],
  ['name', 'Имя'],
  ['phone', 'Телефон'],
  ['children', 'Кого записывают'],
  ['answers', 'Ответы анкеты'],
  ['questions', 'Вопросы'],
  ['status', 'Статус'],
  ['status_by', 'Кто менял статус'],
  ['lead_id', 'Номер заявки'],
]

export const cell = (v) => {
  const s = String(v == null ? '' : v)
  // a cell starting with = + - @ would run as a formula in Excel
  const safe = /^[=+\-@]/.test(s) ? "'" + s : s
  return /[";\n\r]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe
}

export const msk = (iso) => {
  if (!iso) return ''
  const p = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso))
  const g = (t) => (p.find((x) => x.type === t) || {}).value || ''
  return `${g('day')}.${g('month')}.${g('year')} ${g('hour')}:${g('minute')}`
}

export function leadsCsv(db, fromIso = '') {
  const rows = db.prepare('SELECT * FROM leads WHERE created_at >= ? ORDER BY created_at').all(fromIso)
  const lines = [COLUMNS.map((c) => cell(c[1])).join(';')]
  for (const r of rows) {
    lines.push(COLUMNS.map(([k]) => cell(k === 'created_at' ? msk(r[k]) : k === 'direction' ? r[k] || 'Курсы' : r[k])).join(';'))
  }
  return { text: '﻿' + lines.join('\r\n') + '\r\n', count: rows.length }
}
