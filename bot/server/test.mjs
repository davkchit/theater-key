// Offline check of the server's turn: real bot logic, real SQLite (in a temp
// folder), fake model and fake Telegram. Free and fast; run after any change
// to bot/server:
//
//   node bot/server/test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { repoRoot } from '../scripts/env.mjs'
import { buildKnowledge } from '../core/knowledge.mjs'
import { loadBotLib } from './lib.mjs'
import { openStore } from './store.mjs'
import { createTurn } from './turn.mjs'
import { createSiteApi } from './site.mjs'
import { createMailer } from './mail.mjs'
import { leadsCsv } from './csv.mjs'
import { createOauth } from './oauth.mjs'
import { createWebChat } from './webchat.mjs'

const lib = loadBotLib()
const knowledge = buildKnowledge(repoRoot)
const ADMIN = '-100777'
// Directions the theatre may switch off in the admin at any time; the tests
// that check how the bot handles them bring their own.
const withDirections = {
  ...knowledge,
  directions: knowledge.directions.concat([
    { id: 'preparatory', type: 'prep', title: 'Подготовительная группа', desc: 'Занятия для самых маленьких, по устройству как курсы.', open: true, askPhone: true, fields: [{ label: 'Возраст ребёнка', kind: 'number', ask: 'Сколько лет ребёнку?' }] },
    { id: 'newsletter', type: 'newsletter', title: 'Рассылка театра', desc: 'Афиша и новости театра на электронную почту.', open: true, askPhone: false, fields: [{ label: 'Email', kind: 'email', ask: 'На какую почту присылать рассылку?' }] },
  ]),
}
let updateId = 1000

function rig({ llm, parser = false, know = knowledge } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kluch-test-'))
  const store = openStore(dir)
  const sent = []
  const logs = []
  const env = { ADMIN_CHAT_ID: ADMIN, BOT_PARSER: parser ? '1' : '0', LLM_MODEL: 'm', LLM_PARSER_MODEL: 'p' }
  const turn = createTurn({
    env, lib, store,
    getKnowledge: () => know,
    llm: llm || (async () => { throw new Error('модель не должна вызываться') }),
    send: async (item) => { sent.push(item) },
    log: (...a) => logs.push(a.join(' ')),
    now: () => Date.UTC(2026, 8, 19, 10, 0) + updateId * 1000,
  })
  const say = (chatId, text) => turn.handle({ update_id: ++updateId, message: { message_id: updateId, date: 0, chat: { id: chatId, type: 'private' }, from: { id: chatId, first_name: 'Тест' }, text } })
  const tap = (chatId, data, messageId = 5, inChat = chatId) => turn.handle({ update_id: ++updateId, callback_query: { id: 'cb' + updateId, from: { id: chatId, first_name: 'Тест' }, message: { message_id: messageId, chat: { id: inChat, type: inChat < 0 ? 'group' : 'private' }, text: 'карточка' }, data } })
  const texts = () => sent.filter((s) => s.method === 'sendMessage').map((s) => s.payload.text)
  return { store, sent, logs, say, tap, texts, close: () => { store.close(); fs.rmSync(dir, { recursive: true, force: true }) } }
}

const tests = []
const test = (name, fn) => tests.push([name, fn])

test('приветствие отвечает сам, без модели, и запоминает чат', async () => {
  const t = rig()
  await t.say(1, 'привет')
  assert.equal(t.texts().length, 1)
  assert.ok(/кот|привет/i.test(t.texts()[0]))
  assert.ok(t.store.getChat(1), 'состояние диалога не сохранено')
  t.close()
})

test('вопрос уходит модели, название спектакля в ответе жирное', async () => {
  let asked = null
  const t = rig({ llm: async (body) => { asked = body; return { choices: [{ message: { content: '«Симон» - весёлая комедия о похоронах, 18+.' } }] } } })
  await t.say(2, 'расскажи про спектакль Симон')
  assert.ok(asked, 'модель не вызывалась')
  assert.equal(asked.model, 'm')
  assert.ok(asked.messages[0].content.includes('Симон'), 'знание не попало в промт')
  assert.ok(t.texts()[0].includes('<b>«Симон»</b>'), t.texts()[0])
  assert.equal(t.store.getChat(2).history.length, 2, 'история не сохранилась')
  t.close()
})

test('модель недоступна: человек получает честный ответ, админу уходит сигнал', async () => {
  const t = rig({ llm: async () => { throw new Error('лимит') } })
  await t.say(3, 'расскажи про спектакль Симон')
  assert.ok(t.texts().some((x) => /перегружен/.test(x)), t.texts().join(' | '))
  const alert = t.sent.find((s) => s.payload && s.payload.chat_id === ADMIN)
  assert.ok(alert && /Модель не ответила/.test(alert.payload.text), 'нет сигнала админу')
  assert.ok(t.store.getChat(3), 'состояние не сохранено')
  t.close()
})

test('парсер: ответ разбирается, а его сбой не роняет ход', async () => {
  const calls = []
  const t = rig({
    parser: true,
    llm: async (body) => {
      calls.push(body.model)
      if (body.model === 'p') throw new Error('парсер лёг')
      return { choices: [{ message: { content: 'Ответ.' } }] }
    },
  })
  await t.say(4, 'а сколько идёт Никаких последствий?')
  assert.ok(calls.includes('p'), 'парсер не вызывался')
  assert.ok(calls.includes('m'), 'модель не вызывалась после сбоя парсера')
  assert.ok(t.texts().length >= 1)
  t.close()
})

test('запись и вопрос в одном сообщении: сначала ответ, потом анкета, вопрос в заявке', async () => {
  let answered = 0
  const t = rig({
    parser: true,
    llm: async (body) => {
      if (body.model === 'p') return { choices: [{ message: { content: JSON.stringify({ action: 'signup', target: 'course', topics: ['courses'], age: 0, show: '' }) } }] }
      answered++
      return { choices: [{ message: { content: 'Про скидки уточнит администратор, когда перезвонит.' } }] }
    },
  })
  await t.say(31, 'хотим на курс, есть скидка многодетным?')
  const all = t.texts()
  assert.equal(answered, 1, 'вопрос остался без ответа: ' + all.join(' | '))
  assert.ok(/Согласен/.test(all.join(' ')) || t.sent.some((s) => JSON.stringify(s.payload).includes('consent:yes')), 'анкета не открылась: ' + all.join(' | '))
  await t.tap(31, 'consent:yes')
  await t.say(31, 'Ольга')
  await t.say(31, '9')
  await t.say(31, '89061234567')
  await t.tap(31, 'confirm:yes')
  const lead = t.store.db.prepare('SELECT * FROM leads').get()
  assert.ok(lead && /многодетн/.test(lead.questions), 'вопрос не дошёл до администратора: ' + JSON.stringify(lead))
  t.close()
})

test('запись на курс до конца: заявка в базе, карточка админу, статус кнопкой', async () => {
  const t = rig()
  await t.say(10, 'запишите дочку, ей 7')
  await t.tap(10, 'consent:yes')
  await t.say(10, 'Марина')
  await t.say(10, '7')
  await t.say(10, '89061234567')
  await t.tap(10, 'confirm:yes')
  const lead = t.store.db.prepare('SELECT * FROM leads').get()
  assert.ok(lead, 'заявка не сохранена: ' + t.texts().join(' | '))
  assert.equal(lead.phone, '+7 906 123-45-67') // stored the way the bot formats it, as under n8n
  assert.equal(lead.status, 'новая')
  assert.equal(lead.source, 'бот')
  const card = t.sent.find((s) => s.payload && s.payload.chat_id === ADMIN && /Марина/.test(s.payload.text))
  assert.ok(card, 'карточка админу не ушла')

  // the admin presses a status button under the card
  const keyboard = card.payload.reply_markup.inline_keyboard.flat()
  const btn = keyboard.find((b) => /^lead:/.test(b.callback_data))
  assert.ok(btn, 'у карточки нет кнопок статуса')
  await t.tap(99, btn.callback_data, 77, Number(ADMIN))
  const after = t.store.db.prepare('SELECT status, status_by FROM leads').get()
  assert.notEqual(after.status, 'новая', 'статус не изменился')
  assert.equal(after.status_by, 'Тест')
  assert.ok(t.sent.some((s) => s.method === 'editMessageText'), 'карточку не обновили')
  t.close()
})

test('возраст в заявке без лишних слов: «ой ребенку 12» -> 12', async () => {
  const t = rig()
  await t.say(12, 'запишите на курс')
  await t.tap(12, 'consent:yes')
  await t.say(12, 'дато')
  await t.say(12, '99')
  await t.say(12, 'ой ребенку 12')
  await t.say(12, '89061234567')
  await t.tap(12, 'confirm:yes')
  const lead = t.store.db.prepare('SELECT * FROM leads').get()
  assert.ok(lead, 'заявка не сохранена: ' + t.texts().join(' | '))
  assert.ok(!/ребенку|ой/.test(JSON.stringify(lead)), 'в заявке остались лишние слова: ' + JSON.stringify(lead))
  assert.ok(/\b12\b/.test(JSON.stringify(lead)), 'возраст потерялся: ' + JSON.stringify(lead))
  t.close()
})

test('запись на фестиваль: свои вопросы, заявка помнит направление и ответы', async () => {
  const t = rig()
  await t.say(20, 'запишите на фестиваль')
  await t.tap(20, 'consent:yes')
  await t.say(20, 'Анна')
  assert.ok(/коллектив/i.test(t.texts().at(-1)), 'не спросил про коллектив: ' + t.texts().at(-1))
  await t.say(20, 'Театр «Огонёк»')
  await t.say(20, 'Казань')
  await t.say(20, 'не почта')
  assert.ok(/почт/i.test(t.texts().at(-1)), 'принял неправильную почту')
  await t.say(20, 'anna@mail.ru')
  await t.say(20, '89061234567')
  assert.ok(/Проверьте/.test(t.texts().at(-1)), t.texts().at(-1))
  await t.tap(20, 'confirm:yes')
  const lead = t.store.db.prepare('SELECT * FROM leads').get()
  assert.ok(lead, 'заявка не сохранена')
  assert.match(lead.direction, /Действующие лица/)
  assert.match(lead.answers, /Коллектив: Театр «Огонёк»/)
  assert.match(lead.answers, /Email: anna@mail\.ru/)
  const card = t.sent.find((s) => s.payload && s.payload.chat_id === ADMIN)
  assert.ok(card && /Заявка: Фестиваль/.test(card.payload.text), 'карточка админу без направления')
  t.close()
})

test('ответ, упёршийся в лимит токенов, не уходит обрывком', async () => {
  const cutOff = 'Первое предложение полностью и понятно. Второе предложение тоже полностью, с цифрами 2 500. Третье обрывается на полусл'
  const t = rig({ llm: async () => ({ choices: [{ finish_reason: 'length', message: { content: cutOff } }] }) })
  await t.say(30, 'расскажи про спектакль Симон')
  const said = t.texts()[0]
  assert.ok(said.endsWith('2 500.'), said)
  t.close()
})

test('закрытый квест: формы нет, отвечает модель', async () => {
  let asked = 0
  // the quest is closed here on purpose: in the admin it may be open or closed
  const closed = { ...knowledge, directions: knowledge.directions.map((d) => (d.type === 'quest' ? { ...d, open: false } : d)) }
  const t = rig({ know: closed, llm: async () => { asked++; return { choices: [{ message: { content: 'Приём заявок на квест пока закрыт.' } }] } } })
  await t.say(21, 'запишите на квест')
  assert.equal(asked, 1, 'модель должна была ответить')
  assert.ok(!/Согласен/.test(t.texts().join(' ')), 'форма открылась на закрытый квест')
  assert.equal(t.store.getChat(21).step, null)
  t.close()
})

test('рассылка: телефон не спрашивается, заявка без него', async () => {
  const t = rig({ know: withDirections })
  await t.say(22, 'хочу записаться на рассылку')
  await t.tap(22, 'consent:yes')
  await t.say(22, 'Олег')
  await t.say(22, 'oleg@mail.ru')
  assert.ok(/Проверьте/.test(t.texts().at(-1)), 'после почты должно быть подтверждение: ' + t.texts().at(-1))
  await t.tap(22, 'confirm:yes')
  const lead = t.store.db.prepare('SELECT * FROM leads').get()
  assert.equal(lead.phone, '')
  assert.match(lead.direction, /Рассылка/)
  t.close()
})

test('«давай» после предложения записаться на подготовительную группу открывает именно её', async () => {
  const t = rig({ know: withDirections, llm: async () => ({ choices: [{ message: { content: 'Есть подготовительная группа для малышей. Оформить заявку можно прямо в чате.' } }] }) })
  await t.say(23, 'а есть подготовительная группа?')
  const btn = t.sent.flatMap((s) => (s.payload.reply_markup && s.payload.reply_markup.inline_keyboard ? s.payload.reply_markup.inline_keyboard.flat() : [])).find((b) => /signup:dir:/.test(b.callback_data || ''))
  assert.ok(btn, 'кнопки записи на направление нет')
  assert.match(btn.callback_data, /preparatory/)
  await t.say(23, 'давай')
  assert.ok(t.texts().some((x) => /Подготовительная группа/.test(x) && /Согласен/.test(x)), t.texts().at(-1))
  t.close()
})

test('курс записывается по-старому, как до направлений', async () => {
  const t = rig()
  await t.say(24, 'запишите дочку, ей 7')
  await t.tap(24, 'consent:yes')
  await t.say(24, 'Марина')
  assert.ok(/сколько лет/i.test(t.texts().at(-1)), 'курс должен спросить возраст: ' + t.texts().at(-1))
  t.close()
})

// ---- moving between forms (a real chat: the course form opened on «запиши
// меня куда-то», then «давай на солнечную пыль» was read as consent to it and
// the model kept pointing at a button that was not there)

// a fake parser: each test says which action it picks for a phrase, and where
// to; anything else is a question to answer. labels === null: the parser is down
function formRig(labels, reply = 'Ответ.') {
  const asked = []
  const parsedTexts = []
  const t = rig({
    parser: true,
    llm: async (body) => {
      if (body.model === 'p') {
        if (labels === null) throw new Error('разборщик лёг')
        const text = body.messages.at(-1).content
        parsedTexts.push(text)
        const [action, target] = labels[text] || ['answer', '']
        return { choices: [{ message: { content: JSON.stringify({ action, target: target || '', topics: [], age: 0, show: '' }) } }] }
      }
      asked.push(body.messages)
      return { choices: [{ message: { content: reply } }] }
    },
  })
  // the person's side only: the admin's lead card is sent after the reply
  const last = () => t.sent.filter((s) => s.method === 'sendMessage' && String(s.payload.chat_id) !== ADMIN).at(-1).payload
  const lastData = () => ((last().reply_markup || {}).inline_keyboard || []).flat().map((b) => b.callback_data)
  return { ...t, asked, parsedTexts, last, lastData }
}

test('«запиши меня куда-то» без направления: список, куда можно, без анкеты', async () => {
  // read as a bare yes, as the real parser sometimes does
  const t = formRig({ 'запиши ка меня куда то': ['signup', ''], 'давай на солнечную пыль': ['signup', 'camp'] }, 'Форма откроется автоматически.')
  await t.say(40, 'запиши ка меня куда то')
  assert.equal(t.store.getChat(40).step, null, 'анкета открылась сама: ' + t.last().text)
  assert.match(t.last().text, /Актёрские курсы/)
  assert.match(t.last().text, /Солнечная пыль/)
  await t.say(40, 'давай на солнечную пыль')
  assert.match(t.last().text, /Солнечная пыль/)
  assert.ok(t.lastData().includes('consent:yes'), 'нет кнопки «Согласен»: ' + t.last().text)
  t.close()
})

test('без разборщика: «хочу записаться» сразу после разговора о лагере открывает лагерь', async () => {
  const t = formRig(null, 'Лагерь «Солнечная пыль» проходит летом, смена 10 дней 🐾')
  await t.say(47, 'расскажи про лагерь')
  await t.say(47, 'хочу записаться')
  assert.equal(t.store.getChat(47).draft && t.store.getChat(47).draft.dir && t.store.getChat(47).draft.dir.id, 'camp', t.last().text)
  t.close()
})

test('в анкете на курсы «давай на солнечную пыль» переключает на лагерь, а не соглашается на курсы', async () => {
  // the parser read this «давай» as a yes: the trap from the real chat
  const t = formRig({ 'запишите на курс': ['signup', 'course'], 'давай на солнечную пыль': ['signup', 'camp'] }, 'Нажмите кнопку «Оформить заявку», откроется форма.')
  await t.say(41, 'запишите на курс')
  assert.match(t.last().text, /Актёрские курсы/, 'анкета не говорит, куда записывает')
  await t.say(41, 'а куда ты меня заполняешь')
  assert.ok(t.lastData().includes('consent:yes'), 'под ответом нет кнопок «Согласен / Отмена»: ' + t.last().text)
  assert.ok(!/Чтобы продолжить запись/.test(t.last().text), 'осталось напоминание текстом')
  assert.ok(/заполняет заявку на «Актёрские курсы»/.test(t.asked.at(-1)[0].content), 'модель не знает, что анкета открыта')
  await t.say(41, 'давай на солнечную пыль')
  const st = t.store.getChat(41)
  assert.equal(st.step, 'consent')
  assert.equal(st.draft.dir && st.draft.dir.id, 'camp', 'анкета осталась на курсах')
  assert.match(t.last().text, /меняем[\s\S]*Оформлю заявку: <b>Лагерь «Солнечная пыль»<\/b>/)
  assert.ok(t.lastData().includes('consent:yes'))
  t.close()
})

test('смена анкеты посреди заполнения: имя и телефон второй раз не спрашиваются', async () => {
  const t = formRig({ 'запишите на курс': ['signup', 'course'], 'нет, лучше на лсд': ['signup', 'lab'] })
  await t.say(42, 'запишите на курс')
  await t.tap(42, 'consent:yes')
  await t.say(42, 'Анна')
  await t.say(42, '9')
  await t.say(42, '89061234567')
  assert.equal(t.store.getChat(42).step, 'confirm')
  await t.say(42, 'нет, лучше на лсд')
  // the lab asks only for the name and the phone, both already given
  assert.equal(t.store.getChat(42).step, 'dir_confirm', t.last().text)
  assert.match(t.last().text, /Лаборатория/)
  await t.tap(42, 'confirm:yes')
  const lead = t.store.db.prepare('SELECT * FROM leads').get()
  assert.ok(lead, 'заявка не сохранена')
  assert.match(lead.direction, /ЛСД/)
  assert.equal(lead.name, 'Анна')
  assert.equal(lead.phone, '+7 906 123-45-67')
  t.close()
})

test('с лагеря обратно на курсы: согласие уже дано, сразу возраст по имени', async () => {
  const t = formRig({ 'запишите на лагерь': ['signup', 'camp'], 'хочу лучше на курсы': ['signup', 'course'] })
  await t.say(43, 'запишите на лагерь')
  await t.tap(43, 'consent:yes')
  await t.say(43, 'Олег')
  await t.say(43, 'хочу лучше на курсы')
  assert.equal(t.store.getChat(43).step, 'age', t.last().text)
  assert.match(t.last().text, /Олег, сколько лет/)
  t.close()
})

test('вопрос про другое направление посреди анкеты её не переключает', async () => {
  const t = formRig({ 'запишите на курс': ['signup', 'course'] })
  await t.say(44, 'запишите на курс')
  await t.say(44, 'а в лагере сколько стоит?')
  const st = t.store.getChat(44)
  assert.equal(st.step, 'consent')
  assert.ok(!st.draft.dir, 'анкета переключилась от вопроса')
  assert.ok(t.lastData().includes('consent:yes'))
  t.close()
})

test('«и на лагерь тоже»: сначала курсы до конца, потом кнопка записи в лагерь', async () => {
  const t = formRig({ 'запишите на курс': ['signup', 'course'], 'и на лагерь тоже запишите': ['signup_also', 'camp'] })
  await t.say(45, 'запишите на курс')
  await t.tap(45, 'consent:yes')
  await t.say(45, 'и на лагерь тоже запишите')
  assert.equal(t.store.getChat(45).step, 'name', 'курсовая анкета сбилась')
  assert.match(t.last().text, /сначала закончим/)
  await t.say(45, 'Анна')
  await t.say(45, '9')
  await t.say(45, '89061234567')
  await t.tap(45, 'confirm:yes')
  assert.ok(t.lastData().includes('signup:dir:camp'), 'после курсов нет кнопки лагеря: ' + t.last().text)
  t.close()
})

test('напоминание администратору только на «не перезвонили», не на любую жалобу', async () => {
  const t = formRig({
    'запишите на курс': ['signup', 'course'],
    'ты же отменил': ['answer'],
    'чето тяжело с тобой': ['human'],
    'мне до сих пор не перезвонили': ['human'],
  })
  await t.say(48, 'запишите на курс')
  await t.tap(48, 'consent:yes')
  await t.say(48, 'Анна')
  await t.say(48, '9')
  await t.say(48, '89061234567')
  await t.tap(48, 'confirm:yes')
  const nudges = () => t.store.db.prepare('SELECT nudges FROM leads').get().nudges
  await t.say(48, 'ты же отменил')
  await t.say(48, 'чето тяжело с тобой')
  assert.equal(String(nudges()), '0', 'администратору ушло ложное «ждёт звонка»')
  assert.ok(!/напомнил/.test(t.last().text), t.last().text)
  await t.say(48, 'мне до сих пор не перезвонили')
  assert.equal(String(nudges()), '1', 'настоящее «не перезвонили» не дошло')
  t.close()
})

test('разборщику даются направления админки по id, выдуманный id не принимается', async () => {
  let schema = null
  const t = rig({
    parser: true,
    llm: async (body) => {
      if (body.model === 'p') {
        schema = body.response_format.json_schema.schema
        return { choices: [{ message: { content: JSON.stringify({ action: 'signup', target: 'circus', topics: [], age: 0, show: '' }) } }] }
      }
      return { choices: [{ message: { content: 'Ответ.' } }] }
    },
  })
  await t.say(50, 'запиши меня в цирк')
  const targets = schema.properties.target.enum
  assert.ok(targets.includes('course') && targets.includes('camp') && targets.includes('lab'), JSON.stringify(targets))
  assert.equal(t.store.getChat(50).step, null, 'анкета открылась на несуществующее направление')
  assert.match(t.texts().at(-1), /Записать могу сюда/)
  t.close()
})

test('«курс или мероприятия»: без цели показывает список, а не угадывает курсы', async () => {
  const t = formRig({ 'привет короче хочу записаться на курс к вам какой нибудь или мероприятия или афишу': ['signup', ''] })
  await t.say(51, 'привет короче хочу записаться на курс к вам какой нибудь или мероприятия или афишу')
  assert.equal(t.store.getChat(51).step, null, 'открылась анкета: ' + t.last().text)
  assert.match(t.last().text, /Записать могу сюда/)
  t.close()
})

test('ответы на шаги анкеты читает код, разборщик на них не зовётся', async () => {
  const t = formRig({ 'запишите на курс': ['signup', 'course'] })
  await t.say(52, 'запишите на курс')
  await t.tap(52, 'consent:yes')
  await t.say(52, 'Анна')
  await t.say(52, '9')
  await t.say(52, '89061234567')
  assert.deepEqual(t.parsedTexts, ['запишите на курс'])
  assert.equal(t.store.getChat(52).step, 'confirm')
  t.close()
})

test('вопрос на шаге имени не становится именем', async () => {
  const t = formRig({ 'запишите на курс': ['signup', 'course'] })
  await t.say(53, 'запишите на курс')
  await t.tap(53, 'consent:yes')
  await t.say(53, 'а куда ты меня записываешь')
  const st = t.store.getChat(53)
  assert.equal(st.step, 'name', 'вопрос приняли за имя')
  assert.ok(!st.draft.name)
  assert.match(t.asked.at(-1)[0].content, /заполняет заявку на «Актёрские курсы»/)
  t.close()
})

test('«отмена» после отменённой анкеты: «уже отменил», старая заявка названа отдельно', async () => {
  const t = formRig({ 'запишите на курс': ['signup', 'course'], 'запишите на лагерь': ['signup', 'camp'], 'отмена': ['cancel'], 'ты же отменил': ['answer'] })
  // an old course lead in this chat
  await t.say(54, 'запишите на курс')
  await t.tap(54, 'consent:yes')
  await t.say(54, 'Анна')
  await t.say(54, '9')
  await t.say(54, '89061234567')
  await t.tap(54, 'confirm:yes')
  // a camp form, cancelled with the button, then «отмена» again
  await t.say(54, 'запишите на лагерь')
  await t.tap(54, 'signup:cancel')
  assert.match(t.last().text, /анкету отменил/)
  await t.say(54, 'отмена')
  assert.match(t.last().text, /уже отменил/)
  assert.match(t.last().text, /заявка на курсы от \d+ \S+ ещё действует/)
  assert.equal(t.store.db.prepare("SELECT status FROM leads").get().status, 'новая', 'старую заявку отменили без спроса')
  // the answering model now sees what happened, without names or phones
  await t.say(54, 'ты же отменил')
  const sys = t.asked.at(-1)[0].content
  assert.match(sys, /ЗАЯВКИ ЭТОГО ЧАТА/)
  assert.match(sys, /заявка на «Актёрские курсы»/)
  assert.ok(!/Анна|906/.test(sys.split('ЗАЯВКИ ЭТОГО ЧАТА')[1]), 'в строку о заявках попали личные данные')
  t.close()
})

test('непонятное сообщение: переспрос без модели', async () => {
  const t = formRig({ 'далвовл шплвд': ['unclear'] })
  await t.say(55, 'далвовл шплвд')
  assert.equal(t.asked.length, 0, 'модель вызвана на бессмыслицу')
  assert.match(t.last().text, /понял/i)
  t.close()
})

test('разборщик лёг: смена анкеты всё равно работает по запасным правилам', async () => {
  const t = formRig(null)
  await t.say(56, 'запишите на курс')
  assert.equal(t.store.getChat(56).step, 'consent')
  await t.say(56, 'давай на солнечную пыль')
  assert.equal(t.store.getChat(56).draft.dir && t.store.getChat(56).draft.dir.id, 'camp')
  t.close()
})

test('выйти из анкеты можно на любом шаге: кнопкой и словами', async () => {
  const t = formRig({ 'запишите на лагерь': ['signup', 'camp'], 'забей': ['cancel'] })
  await t.say(46, 'запишите на лагерь')
  await t.tap(46, 'signup:cancel')
  assert.equal(t.store.getChat(46).step, null, 'кнопка «Отмена» не сработала')
  await t.say(46, 'запишите на лагерь')
  await t.tap(46, 'consent:yes')
  await t.say(46, 'Олег')
  await t.say(46, 'забей')
  assert.equal(t.store.getChat(46).step, null, '«забей» не отменил')
  await t.say(46, 'запишите на лагерь')
  await t.tap(46, 'consent:yes')
  await t.say(46, 'отмена')
  assert.equal(t.store.getChat(46).step, null, '«отмена» не сработала')
  t.close()
})

// ---- stage 3: leads from the site, mail, CSV

function siteRig(know = knowledge) {
  const t = rig()
  const api = createSiteApi({ env: { ADMIN_CHAT_ID: ADMIN }, lib, store: t.store, getKnowledge: () => know, send: async (item) => { t.sent.push(item) }, log: () => {} })
  return { ...t, api }
}
const courseLead = (over = {}) => ({ form: 'course', consent: true, fields: { Курс: 'Детский', Имя: 'Ольга', 'Имя ребёнка': 'Маша', 'Возраст ребёнка': '8', Телефон: '8 906 111-22-33', Email: 'olga@mail.ru', Согласие: 'да' }, ...over })

test('заявка с сайта: в той же базе, письмо в очереди, карточка админу', async () => {
  const t = siteRig()
  const r = await t.api.lead(courseLead(), '1.1.1.1')
  assert.equal(r.status, 200, JSON.stringify(r.body))
  const lead = t.store.db.prepare('SELECT * FROM leads').get()
  assert.equal(lead.source, 'сайт')
  assert.equal(lead.phone, '+7 906 111-22-33')
  assert.match(lead.direction, /Курсы \(детский\)/)
  assert.match(lead.answers, /Имя ребёнка: Маша/)
  assert.doesNotMatch(lead.answers, /Согласие/)
  const mail = t.store.db.prepare('SELECT * FROM outbox').all()
  assert.equal(mail.length, 1)
  assert.match(mail[0].subject, /^Заявка: Курсы \(детский\), Ольга$/)
  assert.match(mail[0].text, /с формы на сайте/)
  const card = t.sent.find((s) => s.payload.chat_id === ADMIN)
  assert.ok(card && /Заявка с сайта/.test(card.payload.text) && card.payload.reply_markup, 'нет карточки с кнопками')
  t.close()
})

test('с сайта не принимается: без согласия, чужая форма, без телефона, мусор в полях', async () => {
  const t = siteRig()
  assert.equal((await t.api.lead(courseLead({ consent: false }), 'a')).status, 400)
  assert.equal((await t.api.lead(courseLead({ form: 'hack' }), 'a')).status, 400)
  assert.equal((await t.api.lead(courseLead({ fields: { Имя: 'Ольга' } }), 'a')).status, 400)
  assert.equal((await t.api.lead(courseLead({ fields: { Имя: 'О', Телефон: '89061112233', x: { y: 1 } } }), 'a')).status, 400)
  assert.equal((await t.api.lead(courseLead({ fields: { Имя: 'О', Телефон: '89061112233', x: 'я'.repeat(600) } }), 'a')).status, 400)
  assert.equal(t.store.db.prepare('SELECT count(*) n FROM leads').get().n, 0)
  t.close()
})

test('робот, заполнивший скрытое поле, получает «ок», но заявка не сохраняется', async () => {
  const t = siteRig()
  const r = await t.api.lead(courseLead({ fields: { ...courseLead().fields, website: 'http://spam' } }), 'b')
  assert.equal(r.status, 200)
  assert.equal(t.store.db.prepare('SELECT count(*) n FROM leads').get().n, 0)
  t.close()
})

test('с одного адреса не больше 6 заявок в час', async () => {
  const t = siteRig()
  for (let i = 0; i < 6; i++) assert.equal((await t.api.lead(courseLead(), 'c')).status, 200)
  assert.equal((await t.api.lead(courseLead(), 'c')).status, 429)
  assert.equal((await t.api.lead(courseLead(), 'd')).status, 200, 'другой адрес должен проходить')
  t.close()
})

test('фестиваль с закрытым приёмом: сайт получает отказ', async () => {
  const closed = { ...knowledge, directions: knowledge.directions.map((d) => (d.type === 'festival' ? { ...d, open: false } : d)) }
  const t = siteRig(closed)
  const r = await t.api.lead({ form: 'festival', consent: true, fields: { Коллектив: 'Огонёк', 'Контактное лицо': 'Анна', Город: 'Казань', Телефон: '89061112233', Email: 'a@a.ru' } }, 'e')
  assert.equal(r.status, 409)
  t.close()
})

test('заявка из бота тоже ставит письмо в очередь', async () => {
  const t = rig()
  await t.say(40, 'запишите дочку, ей 7')
  await t.tap(40, 'consent:yes')
  await t.say(40, 'Марина')
  await t.say(40, '7')
  await t.say(40, '89061234567')
  await t.tap(40, 'confirm:yes')
  const mail = t.store.db.prepare('SELECT * FROM outbox').all()
  assert.equal(mail.length, 1, 'письма нет')
  assert.match(mail[0].subject, /^Заявка: Курсы, Марина$/)
  assert.match(mail[0].text, /из Telegram-бота/)
  t.close()
})

test('почта: письмо уходит, при сбое повторяется позже и не теряется', async () => {
  const t = rig()
  let clock = 1_000_000
  let fail = true
  const sentMail = []
  const mailer = createMailer({
    env: { SMTP_HOST: 'smtp.test', SMTP_USER: 'box@mail.ru', SMTP_PASS: 'x', LEADS_EMAIL_TO: 'admin@mail.ru' },
    store: t.store,
    log: () => {},
    now: () => clock,
    transportFor: () => ({ sendMail: async (m) => { if (fail) throw new Error('сервер недоступен'); sentMail.push(m) } }),
  })
  t.store.commit({ chats: [], leads: [], statuses: [], unanswered: [], mail: [{ at: 'x', to: 'leads', subject: 'Заявка: тест', text: 'т', html: '' }] })
  await mailer.flush()
  let row = t.store.db.prepare('SELECT * FROM outbox').get()
  assert.equal(row.tries, 1)
  assert.equal(row.sent_at, null)
  assert.ok(row.next_at > clock, 'повтор не назначен')
  await mailer.flush()
  assert.equal(t.store.db.prepare('SELECT tries FROM outbox').get().tries, 1, 'повторил раньше времени')
  fail = false
  clock = row.next_at + 1
  await mailer.flush()
  row = t.store.db.prepare('SELECT * FROM outbox').get()
  assert.ok(row.sent_at, 'не отмечено отправленным')
  assert.equal(sentMail.length, 1)
  assert.equal(sentMail[0].to, 'admin@mail.ru')
  await mailer.flush()
  assert.equal(sentMail.length, 1, 'отправил второй раз')
  t.close()
})

test('выгрузка для Excel: BOM, точка с запятой, формулы обезврежены', async () => {
  const t = rig()
  t.store.commit({ chats: [], statuses: [], unanswered: [], leads: [{ lead_id: 'S1', created_at: '2026-09-20T10:00:00.000Z', updated_at: 'x', status: 'новая', status_by: '', chat_id: '', source: 'сайт', name: '=HACK()', phone: '+7 906 111-22-33', children: '', questions: 'а; б', nudges: '0', direction: 'Курсы', answers: 'Город: Казань' }] })
  const csv = leadsCsv(t.store.db)
  assert.ok(csv.text.startsWith('﻿'), 'нет BOM')
  const lines = csv.text.slice(1).trim().split('\r\n')
  assert.equal(lines.length, 2)
  assert.match(lines[0], /^Когда \(МСК\);Откуда;На что;Имя/)
  assert.match(lines[1], /^20\.09\.2026 13:00;сайт;Курсы;'=HACK\(\);/)
  assert.match(lines[1], /"а; б"/)
  t.close()
})

// ---- admin login (Decap) through our own server
function fakeRes() {
  const r = { status: 0, headers: {}, body: '' }
  r.writeHead = (st, h) => { r.status = st; r.headers = h || {} }
  r.end = (b) => { r.body = b || '' }
  return r
}

test('вход в админку: GitHub, проверка state, токен передаётся окну админки', async () => {
  const none = createOauth({ env: {}, log: () => {} })
  let res = fakeRes()
  await none.handle({ url: '/api/oauth/auth' }, res, '/api/oauth/auth')
  assert.equal(res.status, 503, 'без настроек должен честно сказать, что не настроено')

  let exchanged = null
  const oauth = createOauth({
    env: { GITHUB_OAUTH_ID: 'cid', GITHUB_OAUTH_SECRET: 'sec' },
    log: () => {},
    fetchImpl: async (url, o) => { exchanged = JSON.parse(o.body); return { json: async () => ({ access_token: 'tok123' }) } },
  })
  res = fakeRes()
  await oauth.handle({ url: '/api/oauth/auth' }, res, '/api/oauth/auth')
  assert.equal(res.status, 302)
  const loc = new URL(res.headers.Location)
  assert.equal(loc.host, 'github.com')
  assert.equal(loc.searchParams.get('client_id'), 'cid')
  const state = loc.searchParams.get('state')
  assert.ok(state && state.length >= 16)

  res = fakeRes()
  await oauth.handle({ url: '/api/oauth/callback?code=c1&state=wrong' }, res, '/api/oauth/callback')
  assert.equal(res.status, 400, 'чужой state должен отклоняться')

  res = fakeRes()
  await oauth.handle({ url: '/api/oauth/callback?code=c1&state=' + state }, res, '/api/oauth/callback')
  assert.equal(res.status, 200)
  assert.equal(exchanged.client_secret, 'sec')
  assert.equal(exchanged.code, 'c1')
  assert.match(res.body, /authorization:github:success:/)
  assert.match(res.body, /tok123/)

  res = fakeRes()
  await oauth.handle({ url: '/api/oauth/callback?code=c1&state=' + state }, res, '/api/oauth/callback')
  assert.equal(res.status, 400, 'один и тот же state нельзя использовать дважды')
})

// ---- the chat window on the site

function webRig({ llm } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kluch-web-'))
  const store = openStore(dir)
  const telegram = []
  let webchat = null
  const send = (item) => webchat.route(item, async (i) => { telegram.push(i); return true })
  const env = { ADMIN_CHAT_ID: ADMIN, BOT_PARSER: '0', LLM_MODEL: 'm' }
  const turn = createTurn({
    env, lib, store,
    getKnowledge: () => knowledge,
    llm: llm || (async () => { throw new Error('модель не должна вызываться') }),
    send,
    log: () => {},
    now: () => Date.UTC(2026, 8, 19, 10, 0) + (updateId += 1) * 1000,
  })
  webchat = createWebChat({ turn, lane: (k, job) => job(), log: () => {} })
  const session = 'abcdefghijklmnop1234'
  const post = (body) => webchat.handle({ session, ...body }, '9.9.9.9')
  return { store, telegram, post, session, close: () => { store.close(); fs.rmSync(dir, { recursive: true, force: true }) } }
}

test('чат на сайте: приветствие без модели, кнопки меню как подсказки', async () => {
  const w = webRig()
  const r = await w.post({ start: true })
  assert.equal(r.status, 200)
  assert.ok(r.body.messages.length >= 1)
  assert.match(r.body.messages[0].html, /кот/i)
  assert.ok(r.body.messages.some((m) => (m.chips || []).length >= 4), 'нет подсказок меню')
  w.close()
})

test('чат на сайте: вопрос уходит модели, ответ приходит в окно, не в Telegram', async () => {
  const w = webRig({ llm: async () => ({ choices: [{ message: { content: '«Симон» - весёлые похороны, 18+.' } }] }) })
  const r = await w.post({ text: 'расскажи про Симона' })
  assert.equal(r.status, 200)
  assert.match(r.body.messages.map((m) => m.html).join(' '), /<b>«Симон»<\/b>/)
  assert.equal(w.telegram.filter((i) => i.method === 'sendMessage').length, 0, 'ответ посетителю ушёл в Telegram')
  w.close()
})

test('чат на сайте: запись до конца кнопками, заявка «чат на сайте», карточка админу в Telegram', async () => {
  const w = webRig()
  let r = await w.post({ text: 'запишите дочку, ей 7' })
  const consent = r.body.messages.flatMap((m) => m.buttons.flat()).find((b) => b.data === 'consent:yes')
  assert.ok(consent, 'нет кнопки согласия')
  await w.post({ tap: 'consent:yes' })
  await w.post({ text: 'Марина' })
  r = await w.post({ text: '7' })
  const phoneAsk = r.body.messages.map((m) => m.html).join(' ')
  assert.doesNotMatch(phoneAsk, /кнопк|Поделиться контактом/, 'в окне сайта нет кнопки «поделиться контактом»')
  assert.ok(!r.body.messages.some((m) => (m.chips || []).some((c) => /контакт/i.test(c))), 'подсказка «поделиться контактом» в окне')
  await w.post({ text: '89061234567' })
  await w.post({ tap: 'confirm:yes' })
  const lead = w.store.db.prepare('SELECT * FROM leads').get()
  assert.ok(lead, 'заявка не сохранена')
  assert.equal(lead.source, 'чат на сайте')
  const card = w.telegram.find((i) => i.payload && i.payload.chat_id === ADMIN)
  assert.ok(card && /чат на сайте/.test(card.payload.text), 'карточка админу не ушла в Telegram')
  const mail = w.store.db.prepare('SELECT text FROM outbox').get()
  assert.match(mail.text, /из чата на сайте/)
  w.close()
})

test('чат на сайте: чужая сессия и кнопки админа не проходят', async () => {
  const w = webRig()
  assert.equal((await w.post({ session: 'bad', text: 'привет' })).status, 400)
  assert.equal((await w.post({ text: '   ' })).status, 400)
  // a visitor pressing an admin status button must not change anything
  const r = await w.post({ tap: 'lead:L1:записан' })
  assert.equal(r.status, 200)
  assert.equal(w.telegram.filter((i) => i.method === 'editMessageText').length, 0)
  w.close()
})

test('повторное сохранение заявки не сбрасывает её статус', async () => {
  const t = rig()
  t.store.commit({ chats: [], statuses: [], unanswered: [], leads: [{ lead_id: 'L1', created_at: 'a', updated_at: 'a', status: 'новая', status_by: '', chat_id: '1', source: 'бот', name: 'А', phone: '1', children: '', questions: '', nudges: '0' }] })
  t.store.commit({ chats: [], leads: [], unanswered: [], statuses: [{ lead_id: 'L1', status: 'в работе', status_by: 'Аня', updated_at: 'b' }] })
  t.store.commit({ chats: [], statuses: [], unanswered: [], leads: [{ lead_id: 'L1', updated_at: 'c', chat_id: '1', source: 'бот', name: 'А2', phone: '1', children: '7 лет', questions: '', nudges: '1' }] })
  const row = t.store.db.prepare('SELECT * FROM leads').get()
  assert.equal(row.status, 'в работе')
  assert.equal(row.name, 'А2')
  assert.equal(row.created_at, 'a')
  t.close()
})

test('упавшая запись откатывается целиком', async () => {
  const t = rig()
  assert.throws(() => t.store.commit({ statuses: [], unanswered: [], chats: [{ chat_id: '9', state: '{}', updated_at: 'x' }], leads: [{ nonexistent_column: 1, lead_id: 'Z' }] }))
  assert.equal(t.store.getChat(9), null, 'состояние осталось после отката')
  t.close()
})

let failed = 0
for (const [name, fn] of tests) {
  try {
    await fn()
    console.log('  ✓', name)
  } catch (e) {
    failed++
    console.log('  ✗', name, '\n     ', String(e.message).split('\n').slice(0, 4).join('\n      '))
  }
}
console.log(failed ? `\nне прошло: ${failed} из ${tests.length}` : `\nвсё прошло: ${tests.length} из ${tests.length}`)
process.exit(failed ? 1 : 0)
