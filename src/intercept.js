import https from 'https'
import http from 'http'
import console from './console'
const DISALLOWED_PROXY_HEADERS = [
  'host',
  'connection',
  'origin',
  'accept-encoding',
]
const DISALLOWED_RESPONSE_HEADERS = [
  'transfer-encoding',
  'connection',
  'content-length',
]

function filterObjByKeys(obj, filter) {
  const b = {}
  for (const key in obj) {
    if (filter.includes(key)) continue
    b[key] = obj[key]
  }
  return b
}

/**
 * proxy
 * @param {string} host
 * @param {http.IncomingMessage} sReq
 * @param {http.ServerResponse} sRes
 * @returns {Promise<http.IncomingMessage>}
 */
function proxy(host, sReq, sRes) {
  const headers = filterObjByKeys(sReq.headers, DISALLOWED_PROXY_HEADERS)

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host,
        path: sReq.url,
        method: sReq.method,
        headers,
      },
      (res) => {
        const chunks = []
        res
          .on('error', (e) => reject(e))
          .on('data', (chunk) => chunks.push(chunk))
          .on('end', () => {
            const body = Buffer.concat(chunks)
            res.body = body
            resolve(res)
          })
      }
    )
    if (sReq.method !== 'GET' && sReq.method !== 'HEAD') {
      sReq.pipe(req, {
        end: true,
      })
    } else {
      req.end()
    }
  })
}

/**
 * Apply CORS headers to req/res
 * @param {string} method
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
function applyCors(method, req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (method === 'OPTIONS') {
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers']
    )
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE'
    )
    res.setHeader('Vary', ['Access-Control-Request-Headers'])
    res.statusCode = 204
    res.setHeader('Content-Length', 0)
    res.end()
    return false
  }
  return true
}

const server = http.createServer(async (req, res) => {
  const method =
      req.method && req.method.toUpperCase && req.method.toUpperCase(),
    chunks = []
  if (!applyCors(method, req, res)) return

  if (method === 'POST' && req.url === '/graphql') {
    const pRes = await proxy('auth.blitz.gg', req, res)
    console.log('Proxy sent', pRes.statusCode, pRes.statusMessage)
    res.statusCode = pRes.statusCode
    res.statusMessage = pRes.statusMessage
    for (const key in pRes.headers) {
      if (DISALLOWED_RESPONSE_HEADERS.includes(key)) continue
      res.setHeader(key, pRes.headers[key])
    }
    let resp = pRes.body.toString()
    try {
      const json = JSON.parse(resp)
      if (json && json.data && json.data.me && json.data.me.roles) {
        // repl
        json.data.me.roles.push(
          { code: 'AD_FREE' },
          { code: 'ADMIN' },
          { code: 'TEAM_COACHING' },
          { code: 'PRO_SUBSCRIBER' }
        )
        console.log(json)
        resp = JSON.stringify(json)
      }
    } catch (err) {
      console.error('failed intercept', err)
    } finally {
      res.setHeader('Content-Length', resp.length)
      res.write(resp)
      res.end()
    }
  } else {
    res.write('dunno what to do with this')
    return res.end()
  }
})

server.on('error', (e) => {
  console.error('HTTP server error', e)
})

const PORT_MIN = 1025
const PORT_MAX = 65534
export default function listen() {
  const port = (Math.random() * (PORT_MAX - PORT_MIN) + PORT_MIN) | 0
  server.listen(port, () => {
    console.log('Server listening on port', port)
  })
  return port
}
