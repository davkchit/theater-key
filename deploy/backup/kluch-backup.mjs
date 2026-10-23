// A copy of the bot's database (leads, the mail queue, chats) once a day.
// node:sqlite's backup is safe while the bot keeps writing. Copies are kept
// for KEEP_DAYS days, readable only by root.
//
//   node kluch-backup.mjs /opt/kluch/data/kluch.sqlite /var/backups/kluch
import { DatabaseSync, backup } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

const [src = '/opt/kluch/data/kluch.sqlite', dir = '/var/backups/kluch'] = process.argv.slice(2)
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 14)

fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
const day = new Date().toISOString().slice(0, 10)
const out = path.join(dir, `kluch-${day}.sqlite`)
const db = new DatabaseSync(src, { readOnly: true })
await backup(db, out)
db.close()
fs.chmodSync(out, 0o600)

// a copy that does not open is no copy; and one file per day, without -wal/-shm beside it
const check = new DatabaseSync(out)
check.exec('PRAGMA journal_mode = DELETE')
const tables = check.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get().n
check.close()
if (!tables) throw new Error('в копии нет таблиц: ' + out)

const cutoff = Date.now() - KEEP_DAYS * 86400000
for (const f of fs.readdirSync(dir)) {
  const p = path.join(dir, f)
  if (/^kluch-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f) && fs.statSync(p).mtimeMs < cutoff) fs.rmSync(p)
}
console.log('копия базы:', out)
