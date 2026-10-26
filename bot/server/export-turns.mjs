// The turns journal (journal.mjs) to a file for Excel: what people wrote to
// the cat and what it did, without names or phones.
//
//   npm run turns                        all of it -> bot/data/журнал-кота-ГГГГ-ММ-ДД.csv
//   npm run turns -- --days=30           the last 30 days
//   npm run turns -- --out=D:/журнал.csv
//
// On the server: cd /opt/kluch/app && BOT_DATA_DIR=/opt/kluch/data node bot/server/export-turns.mjs --days=30
// Reads the bot's database directly, so it works whether the bot is running or not.

import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { loadEnv, repoRoot } from '../scripts/env.mjs'
import { turnsCsv, turnsSummary } from './journal.mjs'

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')))
const env = { ...loadEnv(), ...process.env }
const dataDir = path.resolve(env.BOT_DATA_DIR || path.join(repoRoot, 'bot/data'))
const dbFile = path.join(dataDir, 'kluch.sqlite')
if (!fs.existsSync(dbFile)) {
  console.error('базы бота ещё нет: ' + dbFile)
  process.exit(1)
}

const from = args.days ? new Date(Date.now() - Number(args.days) * 86400e3).toISOString() : ''
const db = new DatabaseSync(dbFile, { readOnly: true })
const csv = turnsCsv(db, from)
const summary = turnsSummary(db, from)
db.close()

const out = args.out || path.join(dataDir, 'журнал-кота-' + new Date().toISOString().slice(0, 10) + '.csv')
fs.writeFileSync(out, csv.text)
console.log(summary + '\n\nстрок: ' + csv.count + ' → ' + out)
