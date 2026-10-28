// Everything the bot remembers, in one SQLite file on the server (Russia, so
// the applicants' names and phones stay inside the country: 152-FZ).
//
// The tables mirror the four n8n data tables the bot used before, column for
// column, so moving over is copying rows and nothing else.

import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export function openStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true })
  const db = new DatabaseSync(path.join(dataDir, 'kluch.sqlite'))
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS chats (
      chat_id TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leads (
      lead_id TEXT PRIMARY KEY, created_at TEXT, updated_at TEXT,
      status TEXT DEFAULT 'новая', status_by TEXT DEFAULT '',
      chat_id TEXT, source TEXT, name TEXT, phone TEXT,
      children TEXT, questions TEXT, nudges TEXT, direction TEXT, answers TEXT
    );
    CREATE TABLE IF NOT EXISTS unanswered (
      id INTEGER PRIMARY KEY AUTOINCREMENT, asked_at TEXT, chat_id TEXT, question TEXT
    );
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
    -- letters waiting to go out: written in the same transaction as the lead
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, to_whom TEXT,
      subject TEXT, text TEXT, html TEXT, tries INTEGER DEFAULT 0,
      next_at INTEGER, sent_at TEXT, last_error TEXT
    );
    -- what visitors open in the site's cat: questions only, no personal data
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, kind TEXT, data TEXT
    );
    -- one row per message to the cat, without names or phones (journal.mjs)
    CREATE TABLE IF NOT EXISTS turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, chat TEXT, kind TEXT,
      text TEXT, step_before TEXT, parser TEXT, answered_by TEXT, signals TEXT,
      buttons TEXT, step_after TEXT, outcome TEXT, reply TEXT, data_version TEXT
    );
  `)

  // a database made before directions existed has no such columns
  const have = db.prepare('PRAGMA table_info(leads)').all().map((c) => c.name)
  for (const col of ['direction', 'answers']) if (!have.includes(col)) db.exec('ALTER TABLE leads ADD COLUMN ' + col + ' TEXT')

  const q = {
    getChat: db.prepare('SELECT state FROM chats WHERE chat_id = ?'),
    putChat: db.prepare(
      'INSERT INTO chats (chat_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(chat_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at',
    ),
    getKv: db.prepare('SELECT v FROM kv WHERE k = ?'),
    putKv: db.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v'),
    status: db.prepare('UPDATE leads SET status = ?, status_by = ?, updated_at = ? WHERE lead_id = ?'),
    unanswered: db.prepare('INSERT INTO unanswered (asked_at, chat_id, question) VALUES (?, ?, ?)'),
    mail: db.prepare('INSERT INTO outbox (created_at, to_whom, subject, text, html, next_at) VALUES (?, ?, ?, ?, ?, 0)'),
    due: db.prepare('SELECT * FROM outbox WHERE sent_at IS NULL AND next_at IS NOT NULL AND next_at <= ? ORDER BY id LIMIT 20'),
    sent: db.prepare('UPDATE outbox SET sent_at = ?, last_error = NULL WHERE id = ?'),
    failed: db.prepare('UPDATE outbox SET tries = ?, next_at = ?, last_error = ? WHERE id = ?'),
    event: db.prepare('INSERT INTO events (at, kind, data) VALUES (?, ?, ?)'),
    turn: db.prepare(
      'INSERT INTO turns (at, chat, kind, text, step_before, parser, answered_by, signals, buttons, step_after, outcome, reply, data_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ),
    pruneTurns: db.prepare('DELETE FROM turns WHERE at < ?'),
    pruneChats: db.prepare('DELETE FROM chats WHERE updated_at < ?'),
    pruneMail: db.prepare('DELETE FROM outbox WHERE sent_at IS NOT NULL AND sent_at < ?'),
  }

  // A saved lead row carries only the columns the turn touched: a re-save of an
  // existing lead must not reset its status back to "новая".
  const KEEP_ON_UPDATE = new Set(['lead_id', 'created_at', 'status', 'status_by'])
  function saveLead(row) {
    const cols = Object.keys(row)
    const updates = cols.filter((c) => !KEEP_ON_UPDATE.has(c)).map((c) => `${c} = excluded.${c}`)
    const sql =
      `INSERT INTO leads (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ` +
      `ON CONFLICT(lead_id) DO UPDATE SET ${updates.join(', ')}`
    db.prepare(sql).run(...cols.map((c) => row[c]))
  }

  return {
    db,
    getChat(chatId) {
      const r = q.getChat.get(String(chatId))
      if (!r) return null
      try { return JSON.parse(r.state) } catch { return null }
    },
    getKv(k) {
      const r = q.getKv.get(k)
      if (!r) return null
      try { return JSON.parse(r.v) } catch { return null }
    },
    putKv(k, v) { q.putKv.run(k, JSON.stringify(v)) },
    // one turn's writes go in together or not at all: a half-saved turn would
    // leave a lead without its chat state (or the reverse)
    commit(plan) {
      db.exec('BEGIN')
      try {
        for (const c of plan.chats) q.putChat.run(c.chat_id, c.state, c.updated_at)
        for (const l of plan.leads) saveLead(l)
        for (const s of plan.statuses) q.status.run(s.status, s.status_by, s.updated_at, s.lead_id)
        for (const u of plan.unanswered) q.unanswered.run(u.asked_at, u.chat_id, u.question)
        for (const m of plan.mail || []) q.mail.run(m.at, m.to, m.subject, m.text, m.html || '')
        for (const t of plan.turns || []) q.turn.run(t.at, t.chat, t.kind, t.text, t.step_before, t.parser, t.answered_by, t.signals, t.buttons, t.step_after, t.outcome, t.reply, t.data_version)
        db.exec('COMMIT')
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
    dueMail(nowMs) {
      return q.due.all(nowMs).map((r) => ({ id: r.id, to: r.to_whom, subject: r.subject, text: r.text, html: r.html, tries: r.tries }))
    },
    mailSent(id, nowMs) { q.sent.run(new Date(nowMs).toISOString(), id) },
    // next = null: given up, stays in the table for the record
    mailFailed(id, tries, next, error) { q.failed.run(tries, next, error, id) },
    addEvent(kind, data) { q.event.run(new Date().toISOString(), kind, JSON.stringify(data)) },
    pruneTurns(beforeIso) { return q.pruneTurns.run(beforeIso).changes },
    // a chat keeps its last replies, and a sent letter a lead's name and phone;
    // the lead itself stays in `leads`, these copies need not live forever
    pruneOld(beforeIso) { return q.pruneChats.run(beforeIso).changes + q.pruneMail.run(beforeIso).changes },
    close() { db.close() },
  }
}
