// A gate in front of decap-server: the admin may read and write only the
// site's content (src/content) and its photos (public/uploads).
//
// decap-server itself only stops paths that leave the repository. Inside it,
// anything goes: with the admin's password one could rewrite a build script
// (vite.config.ts, scripts/, deploy/cms/), and the next rebuild would run it
// on the server. This gate takes every request to the admin's API, checks
// every path in it, and passes on only those inside the two folders.
//
//   node deploy/cms/cms-guard.mjs        (PORT=8081, UPSTREAM=http://127.0.0.1:8082)

import http from 'node:http'
import path from 'node:path'

const PORT = Number(process.env.PORT || 8081)
const HOST = process.env.BIND_HOST || '127.0.0.1'
const UPSTREAM = new URL(process.env.UPSTREAM || 'http://127.0.0.1:8082')
const ALLOWED = ['src/content', 'public/uploads']
// a photo from a phone, base64: well under this
const MAX_BODY = 40 * 1024 * 1024
// the keys that name a file or a folder in decap-server's requests
const PATH_KEYS = new Set(['path', 'newPath', 'folder', 'mediaFolder'])

export function allowedPath(p) {
  if (typeof p !== 'string' || p === '' || p.includes('\0')) return false
  const norm = path.posix.normalize(p.replace(/\\/g, '/')).replace(/^\.\//, '')
  if (norm.startsWith('/') || norm.startsWith('..')) return false
  return ALLOWED.some((dir) => norm === dir || norm.startsWith(dir + '/'))
}

/** every path named anywhere in a request body */
export function pathsIn(value, out = []) {
  if (Array.isArray(value)) {
    for (const v of value) pathsIn(v, out)
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (PATH_KEYS.has(k) && typeof v === 'string') out.push(v)
      else if (k === 'paths' && Array.isArray(v)) out.push(...v)
      else pathsIn(v, out)
    }
  }
  return out
}

function refuse(res, status, error) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error }))
}

function forward(req, res, body) {
  const up = http.request(
    {
      host: UPSTREAM.hostname,
      port: UPSTREAM.port,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, 'content-length': body ? body.length : 0 },
    },
    (r) => {
      res.writeHead(r.statusCode || 502, r.headers)
      r.pipe(res)
    },
  )
  up.on('error', () => refuse(res, 502, 'админка недоступна'))
  up.end(body)
}

const server = http.createServer((req, res) => {
  if (!req.url.startsWith('/api/v1')) return refuse(res, 404, 'not found')
  // the browser's CORS check when the admin runs locally: carries no paths
  if (req.method === 'OPTIONS') return forward(req, res, null)
  if (req.method !== 'POST') return refuse(res, 404, 'not found')
  const chunks = []
  let size = 0
  req.on('data', (c) => {
    size += c.length
    if (size > MAX_BODY) {
      refuse(res, 413, 'файл слишком большой')
      req.destroy()
    } else chunks.push(c)
  })
  req.on('end', () => {
    if (res.writableEnded) return
    const body = Buffer.concat(chunks)
    let json
    try {
      json = JSON.parse(body.toString('utf8'))
    } catch {
      return refuse(res, 400, 'bad request')
    }
    const bad = pathsIn(json.params).filter((p) => !allowedPath(p))
    if (bad.length) {
      console.warn('отказано:', json.action, bad.slice(0, 3).join(', '))
      return refuse(res, 403, 'админке можно менять только содержимое сайта и фото')
    }
    forward(req, res, body)
  })
})

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cms-guard.mjs')) {
  server.listen(PORT, HOST, () => console.log(`cms-guard на ${HOST}:${PORT} -> ${UPSTREAM.href}`))
}
