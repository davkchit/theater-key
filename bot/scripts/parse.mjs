// Try the turn parser on your own phrases and see, side by side, what it says
// and what today's keyword rules decide. Nothing here touches the live bot.
//
//   node bot/scripts/parse.mjs "хочу записать дочку 7 лет" "а что в субботу?"
//   node bot/scripts/parse.mjs --lite ...        -- cheaper model
//   node bot/scripts/parse.mjs --lead ...        -- pretend a lead already exists
//   node bot/scripts/parse.mjs --set             -- run the labelled set and score it
//
// The last mode is the one that decides whether the parser is ready: it replays
// bot/eval/intents.json, where every phrase has a hand-written expected intent.

import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { buildKnowledge } from '../core/knowledge.mjs'
import { loadEnv, redactor, repoRoot } from './env.mjs'
import { callModel, llmConfig } from '../core/llm.mjs'

const args = process.argv.slice(2)
const MODEL = args.includes('--lite') ? 'yandexgpt-lite' : 'yandexgpt'
const WITH_LEAD = args.includes('--lead')
const RUN_SET = args.includes('--set')
const PACE = Number((args.find((a) => a.startsWith('--pace=')) || '').split('=')[1] || 0)
const phrases = args.filter((a) => !a.startsWith('--'))
const PRICE = { yandexgpt: 1.2, 'yandexgpt-lite': 0.2 }

const env = loadEnv()
const redact = redactor(env)

function loadParserLib() {
  const code = fs.readFileSync(path.join(repoRoot, 'bot/core/lib.js'), 'utf8')
  const ctx = vm.createContext({ Intl, Date, console })
  vm.runInContext(code + '\n;globalThis.__p = { parserSchema, parserMessages, parseTurnReply, normalizeUpdate, decide, SIGNUP_WORDS, CANCEL_RE };', ctx)
  return ctx.__p
}

const lib = loadParserLib()
const knowledge = buildKnowledge(repoRoot)
let totalTokens = 0
let price = 0

async function parse(text, opts = {}) {
  const { hasLead = false, step = null } = opts
  const nowMs = Date.now()
  // the chat as the parser sees it: a course form at `step`, an old lead
  const state = {
    history: [],
    step,
    draft: step ? {} : null,
    lastLead: hasLead ? { id: 'X', at: nowMs - 86400e3, cancelled: false } : null,
    lastTopics: opts.lastTopics || null,
  }
  const r = await callModel(env, lib.parserMessages(text, state, knowledge, nowMs), {
    parser: true,
    schema: lib.parserSchema(knowledge, nowMs),
    maxTokens: 800,
    temperature: 0,
  })
  totalTokens += r.tokens
  price = r.price
  return lib.parseTurnReply(r.text, text)
}

// What the bot decides today, without the parser -- for the side-by-side column.
function todaysDecision(text, hasLead) {
  const state = hasLead
    ? { chatId: 1, step: null, history: [], lastLead: { id: 'X', name: 'Марина', at: Date.now(), children: ['7 лет'], cancelled: false }, llmDay: 0, llmMinute: [] }
    : null
  const ev = lib.normalizeUpdate({ message: { message_id: 1, chat: { id: 1, type: 'private' }, from: { id: 1, first_name: 'Т' }, text } })
  const res = lib.decide(ev, state, null, knowledge, { nowMs: Date.now() })
  if (res.model) return 'спросит модель'
  const said = res.out.map((m) => m.text).join(' ')
  if (/Оформлю заявку|уже есть заявка|Как вас зовут/.test(said)) return 'откроет запись'
  if (/отменил|нечего отменять|Точно отменить/.test(said)) return 'отмена'
  if (/Добавлю ещё/.test(said)) return 'добавит человека'
  if (/Мяу|Мурчу|пожалуйста|До встречи/.test(said)) return 'болтовня'
  if (/администратор на связи|Вижу вашу заявку/i.test(said)) return 'позовёт человека'
  if (/Ближайшие спектакли/.test(said)) return 'кнопка афиши'
  return 'ответит кнопкой'
}

// ------------------------------------------------------------------ modes

async function tryPhrases(list) {
  console.log(`Парсер: ${llmConfig(env, { parser: true }).model}${WITH_LEAD ? ' · заявка уже есть' : ''}\n`)
  for (const text of list) {
    let p = null
    try { p = await parse(text, { hasLead: WITH_LEAD }) } catch (e) { console.log('✗ ' + redact(String(e.message))); continue }
    const now = todaysDecision(text, WITH_LEAD)
    console.log(`👤 ${text}`)
    if (!p) { console.log('   парсер: не разобрал\n'); continue }
    const extra = [p.wantsAction ? 'ПРОСИТ СДЕЛАТЬ' : 'спрашивает', p.age != null ? 'возраст ' + p.age : null, p.show ? 'спектакль «' + p.show + '»' : null].filter(Boolean).join(', ')
    console.log(`   парсер:  ${p.action}${p.target ? ' → ' + p.target : ''}${p.topics.length ? '  →  ' + p.topics.join(', ') : ''}${extra ? '  ·  ' + extra : ''}`)
    console.log(`   сегодня: ${now}\n`)
  }
  console.log(`токенов: ${totalTokens} ≈ ${((totalTokens / 1000) * price).toFixed(2)} ₽`)
}

async function runSet() {
  const file = path.join(repoRoot, 'bot/eval/intents.json')
  const set = JSON.parse(fs.readFileSync(file, 'utf8')).cases
  console.log(`Размеченный набор: ${set.length} фраз · ${llmConfig(env, { parser: true }).model}\n`)
  let okIntent = 0, okAge = 0, ageTotal = 0, okTopic = 0, topicTotal = 0, bad = 0
  const wrong = []
  for (const c of set) {
    // free tiers cap tokens per minute; without a pause the run dies on 429
    if (PACE) await new Promise((r) => setTimeout(r, PACE))
    let p = null
    try { p = await parse(c.text, { hasLead: Boolean(c.lead), step: c.step || null }) } catch (e) { bad++; continue }
    if (!p) { bad++; wrong.push(`${c.text} → не разобрал`); continue }
    if (p.intent === c.intent) okIntent++
    else wrong.push(`«${c.text}»  ждали ${c.intent}, получили ${p.intent}`)
    if (c.age !== undefined) { ageTotal++; if (p.age === c.age) okAge++; else wrong.push(`«${c.text}»  возраст: ждали ${c.age}, получили ${p.age}`) }
    if (c.topic) { topicTotal++; if (p.topics.includes(c.topic)) okTopic++; else wrong.push(`«${c.text}»  тема: ждали ${c.topic}, получили [${p.topics.join(',')}]`) }
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 100) + '%'
  console.log('расхождения:')
  for (const w of wrong) console.log('  · ' + w)
  console.log(`\n───────────────────────────────`)
  console.log(`намерение   ${okIntent}/${set.length}  ${pct(okIntent, set.length)}`)
  console.log(`возраст     ${okAge}/${ageTotal}  ${pct(okAge, ageTotal)}`)
  console.log(`тема        ${okTopic}/${topicTotal}  ${pct(okTopic, topicTotal)}`)
  if (bad) console.log(`не разобрал ${bad}`)
  console.log(`токенов     ${totalTokens} ≈ ${((totalTokens / 1000) * price).toFixed(2)} ₽  (${(totalTokens / set.length).toFixed(0)} на фразу)`)
}

if (RUN_SET) await runSet()
else if (phrases.length) await tryPhrases(phrases)
else console.log('Дайте фразы аргументами или запустите с --set')
