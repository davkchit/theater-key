// Loads the bot's logic (bot/core/lib.js) exactly as n8n ran it: the file is a
// plain script full of function declarations, evaluated once in its own
// context. Nothing is copied or rewritten, so the eval (bot/scripts/eval.mjs),
// the simulator and this server all run the very same code.

import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { repoRoot } from '../scripts/env.mjs'

export function loadBotLib() {
  const code = fs.readFileSync(path.join(repoRoot, 'bot/core/lib.js'), 'utf8')
  // setTimeout: callLlm waits out per-minute limits with it
  const ctx = vm.createContext({ Intl, Date, console, setTimeout, clearTimeout })
  vm.runInContext(
    code +
      '\n;globalThis.__lib = { normalizeUpdate, decide, afterModel, parseTurnReply, adminLeadText, adminLeadKeyboard, msg, esc, normPhone, callLlm, modelDownText, CFG };',
    ctx,
  )
  return ctx.__lib
}

// n8n's Code node hands callLlm an object with httpRequest(); this is the same
// shape over fetch, so callLlm in lib.js works unchanged.
export const fetchHelpers = {
  async httpRequest(o) {
    const r = await fetch(o.url, {
      method: o.method || 'GET',
      headers: o.headers,
      body: o.body == null ? undefined : JSON.stringify(o.body),
      signal: AbortSignal.timeout(o.timeout || 30000),
    })
    const body = await r.json().catch(() => ({}))
    return { statusCode: r.status, body }
  },
}
