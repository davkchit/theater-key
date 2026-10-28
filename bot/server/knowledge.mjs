// Keeps the bot's knowledge current.
//
// With SITE_URL set (a deployed site) the bot fetches the knowledge.json the
// site's build published, every ten minutes. Without it (a developer machine,
// or the bot living next to the site's source) it builds the same snapshot from
// the site's own content files. Either way a bad copy never replaces a good
// one, and a copy that cannot be refreshed raises one alarm per six hours.

import { buildKnowledge } from '../core/knowledge.mjs'

const REFRESH_MS = 10 * 60 * 1000
const ALARM_EVERY_MS = 6 * 60 * 60 * 1000

// A half-downloaded file or an error page must never overwrite a working copy.
export function looksLikeKnowledge(k) {
  return Boolean(
    k &&
      Array.isArray(k.afisha) &&
      Array.isArray(k.shows) &&
      Array.isArray(k.courses) &&
      Array.isArray(k.faq) &&
      k.faq.some((s) => s.always),
  )
}

export function createKnowledge({ env, repoRoot, store, log, alarm }) {
  let current = buildKnowledge(repoRoot)
  let refreshedAt = Date.now()

  async function refresh() {
    try {
      let next
      if (env.SITE_URL) {
        const r = await fetch(env.SITE_URL.replace(/\/$/, '') + '/knowledge.json', { signal: AbortSignal.timeout(15000) })
        if (!r.ok) throw new Error('сайт ответил ' + r.status)
        next = await r.json()
      } else {
        next = buildKnowledge(repoRoot)
      }
      if (!looksLikeKnowledge(next)) throw new Error('скачанное знание не похоже на знание')
      // builtAt changes on every local rebuild; only a change in content is news
      const same = JSON.stringify({ ...next, builtAt: '' }) === JSON.stringify({ ...current, builtAt: '' })
      if (!same) log('знание обновлено:', next.builtAt, `· показов ${next.afisha.length}`)
      current = next
      refreshedAt = Date.now()
    } catch (e) {
      log('знание не обновилось:', e.message)
      const last = store.getKv('lastAlarm') || 0
      if (Date.now() - last > ALARM_EVERY_MS) {
        store.putKv('lastAlarm', Date.now())
        await alarm('Знание не обновляется с сайта: ' + e.message + '. Отвечаю по последней копии.')
      }
    }
  }

  // the local copy is only as fresh as the last deploy of the bot: catch up
  // with the site right away instead of answering by it for ten minutes
  if (env.SITE_URL) void refresh()
  const timer = setInterval(refresh, REFRESH_MS)
  timer.unref()

  return {
    get: () => current,
    info: () => ({ builtAt: current.builtAt, refreshedAt: new Date(refreshedAt).toISOString(), shows: current.afisha.length }),
    refresh,
  }
}
