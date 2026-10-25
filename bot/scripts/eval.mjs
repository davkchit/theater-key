// Runs bot/eval/cases.json against the real model and reports what passed,
// what broke, and what it cost. This is the "стало ли лучше" measurement:
// every run is saved to bot/eval/runs/ and can be diffed against an earlier one.
//
//   node bot/scripts/eval.mjs                     -- full set, YandexGPT Pro
//   node bot/scripts/eval.mjs --lite              -- cheaper, for iterating
//   node bot/scripts/eval.mjs --only=refusal,age  -- just those tags
//   node bot/scripts/eval.mjs --save=baseline     -- store under that name
//   node bot/scripts/eval.mjs --diff=baseline     -- compare with a stored run
//   node bot/scripts/eval.mjs --dry               -- no model calls, logic only
//   node bot/scripts/eval.mjs --parser            -- go through the turn parser,
//                                                    exactly as the live bot does
//   node bot/scripts/eval.mjs --tries=3            -- run every case three times;
//                                                    one lucky sample proves nothing
//
// A case fails loudly; a case that only *differs* from the previous run is
// reported separately, because a different wording is not automatically worse.

import fs from 'node:fs'
import path from 'node:path'
import { buildKnowledge } from '../core/knowledge.mjs'
import { loadEnv, redactor, repoRoot } from './env.mjs'
import { loadLib, callYandex } from './simulate.mjs'
import { callModel, llmConfig } from '../core/llm.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const MODEL = args.includes('--lite') ? 'yandexgpt-lite' : 'yandexgpt'
const DRY = args.includes('--dry')
const USE_PARSER = args.includes('--parser')
const TRIES = Math.max(1, Number(flag('tries') || 1))
const ONLY = (flag('only') || '').split(',').filter(Boolean)
const SAVE = flag('save')
const DIFF = flag('diff')
const PRICE = { yandexgpt: 1.2, 'yandexgpt-lite': 0.2 }

const EVAL_DIR = path.join(repoRoot, 'bot/eval')
const RUNS_DIR = path.join(EVAL_DIR, 'runs')
const spec = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'cases.json'), 'utf8'))

// a link keeps its address in the text, so cases can check where it leads
const plain = (h) => String(h).replace(/<a href="([^"]*)">([^<]*)<\/a>/g, '$2 $1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[   ]/g, ' ')
const rx = (s) => new RegExp(s, 'i')

// The parser uses the OpenAI-compatible endpoint, because that is the only one
// where response_format / json_schema is honoured.
async function callParser(env, model, req) {
  // the same budget as the live bot (server/turn.mjs): gpt-oss thinks before it
  // answers, and at 200 a long message left it nothing to answer with, so the
  // eval was quietly testing the fallback instead of the parser
  const r = await callModel(env, req.messages, { parser: true, schema: req.schema, maxTokens: 800, temperature: 0 })
  parserTokens += r.tokens
  parserPrice = r.price
  return loadLib().parseTurnReply(r.text, req.userText)
}

let parserPrice = 0

let parserTokens = 0

// ------------------------------------------------------------------ one case

async function runCase(lib, knowledge, env, c, state) {
  const chatId = 700000 + Math.floor(Math.random() * 100000)
  let t = Date.UTC(2026, 8, 17, 9, 0)
  // A case may start from a conversation that already happened. Without this
  // every case begins with a clean slate, and a whole class of bug is invisible:
  // the model copying its own earlier reply out of the history.
  let st = c.history ? { chatId, promptV: 'старая версия правил', history: c.history, day: '', llmDay: 0, llmMinute: [] } : null
  let global = null
  const said = []
  const effects = []
  const buttons = []
  let modelCalls = 0
  let parseCalls = 0
  let tokens = 0
  let failed = null

  const base = { chat: { id: chatId, type: 'private' }, from: { id: chatId, first_name: 'Тест' }, message_id: 1 }
  const toUpdate = (turn) => {
    if (typeof turn === 'string') return { message: { ...base, text: turn } }
    if (turn.tap) return { callback_query: { id: 'cb', from: base.from, data: turn.tap, message: { message_id: 1, chat: base.chat } } }
    if (turn.contact) return { message: { ...base, contact: { phone_number: turn.contact } } }
    throw new Error('unknown turn: ' + JSON.stringify(turn))
  }

  for (const turn of c.turns) {
    t += 60_000
    const ev = lib.normalizeUpdate(toUpdate(turn))
    let res = lib.decide(ev, st, global, knowledge, { nowMs: t, useParser: USE_PARSER })
    // first pass only asked for a parse -- run it and decide again, which is
    // precisely what the workflow does
    if (res.parse) {
      let parsed = null
      if (!DRY) {
        try { parsed = await callParser(env, MODEL, res.parse) } catch (e) { failed = 'парсер: ' + String(e.message).slice(0, 60) }
      }
      parseCalls += 1
      res = lib.decide(ev, st, global, knowledge, { nowMs: t, useParser: USE_PARSER, parsed })
    }
    if (res.state) st = res.state
    global = res.global
    for (const m of res.out) {
      said.push(plain(m.text))
      for (const row of m.reply_markup?.inline_keyboard || []) for (const b of row) buttons.push(b.callback_data)
    }
    effects.push(...res.effects.map((e) => e.type))

    if (res.model) {
      modelCalls += 1
      if (DRY) { said.push('(модель не вызывалась: --dry)'); continue }
      try {
        const r = await callYandex(env, MODEL, res.model.messages)
        tokens += r.tokens
        const fin = lib.afterModel(res, r.text, t, knowledge)
        for (const m of fin.out) {
          said.push(plain(m.text))
          for (const row of m.reply_markup?.inline_keyboard || []) for (const b of row) buttons.push(b.callback_data)
        }
        effects.push(...fin.effects.map((e) => e.type))
      } catch (e) {
        failed = 'модель: ' + String(e.message).slice(0, 400)
      }
    }
  }

  return { id: c.id, tags: c.tags || [], text: said.join('\n'), effects, buttons, modelCalls, tokens, failed }
}

// ------------------------------------------------------------------ checking

// the same phrasings the bot's own detector counts as «не знаю» (lib.js, markers.unknown)
const DONT_KNOW = /у меня информации нет|информации (об этом |про это )?(у меня )?нет|не подскажу|ничего не известно|в (моих|наших) данных|нет в (моих )?данных|(спросить|спросите|узнать|уточнить) (лучше )?у администратора/i

function checkCase(c, out, forbidden, allowedPrices) {
  const problems = []
  const e = c.expect || {}
  const text = out.text

  if (out.failed) problems.push(out.failed)

  // things no answer may ever contain
  for (const [name, pattern] of Object.entries(forbidden)) {
    if (name === '_') continue
    if (rx(pattern).test(text)) problems.push(`запрещённое «${name}»`)
  }

  // Any rouble sum that is neither in the theatre's data nor in the list of
  // confirmed prices is invented. The data counts too: course and ticket prices
  // change in the admin, and a fixed list here went stale and failed the bot
  // for naming the real ones.
  // A regexp with a negative lookahead kept misfiring on the digits inside a
  // legitimate "2 500", so the amounts are pulled out and compared as numbers.
  for (const m of text.matchAll(/(\d[\d\s  ]*)\s*(₽|руб)/gi)) {
    const amount = m[1].replace(/[^\d]/g, '')
    if (amount.length >= 3 && !(allowedPrices || []).includes(amount)) {
      problems.push(`сумма не из подтверждённых: ${amount} ₽`)
    }
  }

  if (e.model === true && out.modelCalls === 0) problems.push('модель не вызвана, а должна')
  if (e.model === false && out.modelCalls > 0) problems.push('модель вызвана, а не должна')
  for (const s of e.say || []) if (!rx(s).test(text)) problems.push(`нет «${s}»`)
  for (const s of e.never || []) if (rx(s).test(text)) problems.push(`есть лишнее «${s}»`)
  // «уточнит администратор» in a never-list means "the bot must not say it does
  // not know": the other ways of saying so count as the same failure
  if ((e.never || []).some((s) => /уточнит администратор|не знаю/.test(s)) && DONT_KNOW.test(text)) {
    problems.push('говорит «не знаю» там, где ответ есть в данных')
  }
  for (const eff of e.effects || []) if (!out.effects.includes(eff)) problems.push(`нет эффекта ${eff}`)
  for (const eff of e.noEffects || []) if (out.effects.includes(eff)) problems.push(`лишний эффект ${eff}`)
  for (const b of e.buttons || []) if (!out.buttons.includes(b)) problems.push(`нет кнопки ${b}`)
  for (const b of e.noButtons || []) if (out.buttons.includes(b)) problems.push(`лишняя кнопка ${b}`)

  return problems
}

// ------------------------------------------------------------------ main

async function main() {
  const env = DRY ? {} : loadEnv()
  const redact = DRY ? (s) => s : redactor(env)
  const lib = loadLib()
  const knowledge = buildKnowledge(repoRoot)
  const inData = [...JSON.stringify(knowledge).matchAll(/(\d[\d\s  ]*)\s*(₽|руб)/gi)].map((m) => m[1].replace(/[^\d]/g, ''))
  const allowedPrices = [...new Set((spec.allowedPrices || []).concat(inData))]

  const LIMIT = Number(flag('limit') || 0)
  const IDS = (flag('ids') || '').split(',').filter(Boolean)
  const cases = spec.cases.filter((c) => (!ONLY.length || (c.tags || []).some((t) => ONLY.includes(t))) && (!IDS.length || IDS.includes(c.id))).slice(Number(flag('from') || 0), LIMIT ? Number(flag('from') || 0) + LIMIT : undefined)
  console.log(`Прогон: ${cases.length} кейсов${TRIES > 1 ? ' × ' + TRIES + ' попытки' : ''} · ${DRY ? 'без модели' : MODEL}\n`)

  const results = []
  let passed = 0
  for (const c of cases) {
    // The model is not deterministic, so a case is only green when it is green
    // every time. Three "fixes" were declared today on a single lucky sample.
    let out = null
    let problems = []
    let flaky = 0
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const o = await runCase(lib, knowledge, env, c)
      const p = checkCase(c, o, spec.forbidden, allowedPrices)
      if (p.length && !problems.length && attempt > 0) flaky = attempt
      if (!out || (p.length && !problems.length)) { out = o; problems = p }
      if (p.length) { out = o; problems = p }
    }
    if (!problems.length) passed += 1
    results.push({ ...out, problems })
    const mark = problems.length ? '✗' : '✓'
    const note = flaky ? ` (упал с ${flaky + 1}-й попытки)` : ''
    console.log(`  ${mark} ${c.id.padEnd(30)} ${problems.length ? redact(problems.join('; ')).slice(0, 80) + note : ''}`)
  }

  const tokens = results.reduce((a, r) => a + r.tokens, 0)
  const calls = results.reduce((a, r) => a + r.modelCalls, 0)
  const answerPrice = DRY ? 0 : llmConfig(env, {}).price
  const cost = (tokens / 1000) * answerPrice

  console.log(`\n───────────────────────────────────`)
  console.log(`пройдено       ${passed}/${cases.length}  (${Math.round((passed / cases.length) * 100)}%)`)
  console.log(`вызовов модели ${calls}${USE_PARSER ? ` · разборов ${results.reduce((a, r) => a + (r.parseCalls || 0), 0)}` : ''}`)
  console.log(`токенов        ${tokens}${USE_PARSER ? ` + ${parserTokens} на разбор` : ''}${DRY ? '' : `  ≈ ${(cost + (parserTokens / 1000) * parserPrice).toFixed(1)} ₽`}`)

  // failures grouped by tag -- shows *what kind* of thing is broken
  const byTag = {}
  for (const r of results) for (const tag of r.tags) {
    byTag[tag] = byTag[tag] || { n: 0, bad: 0 }
    byTag[tag].n += 1
    if (r.problems.length) byTag[tag].bad += 1
  }
  console.log('\nпо темам:')
  for (const [tag, v] of Object.entries(byTag).sort((a, b) => b[1].bad - a[1].bad)) {
    console.log(`  ${tag.padEnd(14)} ${v.n - v.bad}/${v.n}`)
  }

  const run = {
    at: new Date().toISOString(),
    model: DRY ? 'dry' : MODEL,
    passed,
    total: cases.length,
    tokens,
    calls,
    cases: Object.fromEntries(results.map((r) => [r.id, { problems: r.problems, text: r.text, tokens: r.tokens }])),
  }

  if (SAVE) {
    fs.mkdirSync(RUNS_DIR, { recursive: true })
    const p = path.join(RUNS_DIR, SAVE + '.json')
    fs.writeFileSync(p, JSON.stringify(run, null, 1))
    console.log(`\nсохранено: bot/eval/runs/${SAVE}.json`)
  }

  if (DIFF) {
    const p = path.join(RUNS_DIR, DIFF + '.json')
    if (!fs.existsSync(p)) { console.log(`\n(не с чем сравнивать: ${DIFF} нет)`); return }
    const old = JSON.parse(fs.readFileSync(p, 'utf8'))
    console.log(`\n═══ сравнение с «${DIFF}» (${old.passed}/${old.total}, ${old.tokens} ток.)`)
    const fixed = [], broke = [], changed = []
    for (const r of results) {
      const before = old.cases[r.id]
      if (!before) continue
      const wasBad = before.problems.length > 0
      const isBad = r.problems.length > 0
      if (wasBad && !isBad) fixed.push(r.id)
      else if (!wasBad && isBad) broke.push(`${r.id}: ${r.problems.join('; ')}`)
      else if (before.text !== r.text) changed.push(r.id)
    }
    if (fixed.length) console.log(`  ✓ починилось (${fixed.length}): ` + fixed.join(', '))
    if (broke.length) console.log(`  ✗ СЛОМАЛОСЬ (${broke.length}):\n     ` + broke.join('\n     '))
    if (!fixed.length && !broke.length) console.log('  результат тот же')
    if (changed.length) console.log(`  · формулировка изменилась, проверки те же (${changed.length}): ` + changed.slice(0, 8).join(', '))
    const dt = tokens - old.tokens
    console.log(`  токены: ${old.tokens} → ${tokens} (${dt >= 0 ? '+' : ''}${dt}, ${((dt / old.tokens) * 100).toFixed(0)}%)`)
  }

  process.exitCode = passed === cases.length ? 0 : 1
}

main().catch((e) => { console.error(e); process.exit(1) })
