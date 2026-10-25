// One incoming Telegram update, start to finish. This is the n8n main workflow
// ("Ключ · Telegram-бот") written as ordinary code, step for step:
//
//   Разобрать апдейт -> Состояние диалога -> Решить -> [Разобрать намерение ->
//   Решить с разбором] -> [Спросить модель -> Ответ модели | Модель недоступна]
//   -> Итог хода -> сохранить -> отправить
//
// Everything that decides anything lives in bot/core/lib.js; this file only
// moves data between it, the database, the model and Telegram.
//
// `deps` are injected so the whole turn can be run in a test with a fake model
// and a fake Telegram (bot/server/test.mjs).

import { devMail, leadLetter } from './mail.mjs'

export function createTurn({ env, lib, store, getKnowledge, llm, send, log, now = () => Date.now() }) {
  const ADMIN = env.ADMIN_CHAT_ID ? String(env.ADMIN_CHAT_ID) : ''
  const useParser = env.BOT_PARSER !== '0'
  const contentOf = (r) => (r && r.choices && r.choices[0] && r.choices[0].message ? r.choices[0].message.content || '' : '')

  // An answer that hit the token limit ends mid-word. Better to give the person
  // the sentences that are complete than a fragment ("...мистическая комедия,").
  function answerText(r) {
    const text = contentOf(r)
    const cut = r && r.choices && r.choices[0] && r.choices[0].finish_reason === 'length'
    if (!cut) return text
    const whole = text.replace(/[^.!?…\n]*$/, '').trim()
    return whole.length > 60 ? whole : text
  }

  // What this turn writes and sends, in one place (the "Итог хода" node).
  function plan(res) {
    const at = new Date(now()).toISOString()
    const p = { chats: [], leads: [], statuses: [], unanswered: [], mail: [], tg: [] }
    // a lead from the chat window on the site runs through the same bot logic,
    // which labels every lead «бот»; the chat id tells where it really came from
    const sourceOf = (lead) => (/^w[a-z0-9]+$/.test(String(lead.chatId)) ? 'чат на сайте' : lead.source || 'бот')
    const letter = (lead, kind) => p.mail.push({ at, ...leadLetter({ ...lead, source: sourceOf(lead) }, kind, at) })
    if (res.answerCallback) p.tg.push({ method: 'answerCallbackQuery', payload: res.answerCallback })
    for (const m of res.out) p.tg.push({ method: 'sendMessage', payload: m })
    if (res.state) p.chats.push({ chat_id: String(res.state.chatId), state: JSON.stringify(res.state), updated_at: at })
    for (const e of res.effects) {
      if (e.type === 'leadSave') {
        const l = e.lead
        const row = {
          lead_id: l.id,
          updated_at: at,
          chat_id: String(l.chatId),
          source: sourceOf(l),
          name: l.name || '',
          phone: l.phone || '',
          children: (l.children || []).join('; '),
          questions: (l.questions || []).join(' | '),
          nudges: String(l.nudges || 0),
          direction: l.direction || '',
          answers: (l.answers || []).join(' | '),
        }
        if (e.isNew) {
          row.created_at = l.createdAt || at
          row.status = 'новая'
          row.status_by = ''
        }
        p.leads.push(row)
        letter(l, e.isNew ? 'new' : /Напоминает/.test(e.notice || '') ? 'nudge' : 'more')
        if (ADMIN) p.tg.push({ method: 'sendMessage', payload: lib.msg(ADMIN, (e.notice ? e.notice + '\n\n' : '') + lib.adminLeadText({ ...l, source: sourceOf(l) }), lib.adminLeadKeyboard(l.id)) })
      } else if (e.type === 'leadCancel') {
        p.statuses.push({ lead_id: e.lead.id, status: 'отменена клиентом', status_by: 'клиент', updated_at: at })
        letter(e.lead, 'cancel')
        if (ADMIN) p.tg.push({ method: 'sendMessage', payload: lib.msg(ADMIN, '❌ Клиент отменил заявку, звонить не нужно\n\n' + lib.adminLeadText(e.lead)) })
      } else if (e.type === 'leadStatus') {
        p.statuses.push({ lead_id: e.leadId, status: e.status, status_by: e.by || '', updated_at: at })
        p.tg.push({ method: 'editMessageText', payload: { chat_id: e.adminChatId, message_id: e.adminMessageId, text: e.text, reply_markup: lib.adminLeadKeyboard(e.leadId) } })
      } else if (e.type === 'unanswered') {
        p.unanswered.push({ asked_at: e.at, chat_id: String(e.chatId), question: e.question })
      } else if (e.type === 'devAlert') {
        p.mail.push(...devMail(store, env, e.text, now()))
        if (ADMIN) p.tg.push({ method: 'sendMessage', payload: lib.msg(ADMIN, '⚠️ ' + lib.esc(e.text)) })
      }
    }
    return p
  }

  // meta.llmBlocked: no model for this turn (the visitor's daily share is used
  // up, see webchat.mjs). The returned plan says how many answers the model gave.
  async function handle(update, meta = {}) {
    const ev = lib.normalizeUpdate(update)
    if (ev.kind === 'ignore') return null

    const knowledge = getKnowledge()
    const saved = store.getChat(ev.chatId)
    let global = store.getKv('usage')
    const cfg = { nowMs: now(), adminChatId: ADMIN, useParser, llmBlocked: Boolean(meta.llmBlocked) }
    let llmCalls = 0

    let res = lib.decide(ev, saved, global, knowledge, cfg)
    if (res.global) { global = res.global; store.putKv('usage', global) }

    // The first pass may only ask for a parse of the message. A failed parse is
    // not fatal: the second pass then gets parsed = null and falls back to the
    // keyword rules, exactly today's behaviour.
    let parsed = null
    if (res.parse) {
      try {
        const raw = await llm(
          {
            model: env.LLM_PARSER_MODEL || env.LLM_MODEL,
            messages: res.parse.messages,
            // gpt-oss thinks before it answers, ~100-400 tokens even for «стоп»;
            // at 200 the thinking ate it all and two parses in three came back empty
            max_tokens: 800,
            temperature: 0,
            response_format: { type: 'json_schema', json_schema: res.parse.schema },
          },
          15000,
        )
        parsed = lib.parseTurnReply(contentOf(raw), res.parse.userText)
      } catch (e) {
        log('разбор намерения не удался:', e.message)
      }
      res = lib.decide(ev, saved, global, knowledge, { ...cfg, useParser: true, parsed })
      if (res.global) { global = res.global; store.putKv('usage', global) }
    }

    if (res.model) {
      llmCalls = 1
      try {
        const raw = await llm(
          {
            model: env.LLM_MODEL,
            messages: res.model.messages.map((m) => ({ role: m.role, content: m.text })),
            max_tokens: 2000,
            temperature: 0.2,
            stream: false,
          },
          50000,
        )
        const fin = lib.afterModel(res, answerText(raw), now(), knowledge)
        res.out = res.out.concat(fin.out)
        res.effects = res.effects.concat(fin.effects)
      } catch (e) {
        log('модель не ответила:', e.message)
        const ctx = res.model.ctx || {}
        // a form's buttons come along even without a reprompt text: in the
        // consent step they are all there is
        const down = { chat_id: res.state.chatId, text: lib.modelDownText(knowledge) }
        if (!ctx.reprompt && ctx.repromptMarkup) down.reply_markup = ctx.repromptMarkup
        res.out.push(down)
        if (ctx.reprompt) res.out.push(Object.assign({ chat_id: res.state.chatId, text: ctx.reprompt }, ctx.repromptMarkup ? { reply_markup: ctx.repromptMarkup } : {}))
        res.effects.push({ type: 'devAlert', text: 'Модель не ответила: ' + String(e.message).slice(0, 300) })
      }
      res.model = null
    }

    // storage first, Telegram last: a message is never sent for a turn whose
    // state failed to save (the person would answer a question the bot forgot)
    const p = plan(res)
    store.commit(p)
    for (const item of p.tg) await send(item)
    p.llmCalls = llmCalls
    return p
  }

  return { handle }
}
