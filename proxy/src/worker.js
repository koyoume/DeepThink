/**
 * 투명 CORS 릴레이 프록시 (isomorphic-git 전용). git 로직에는 관여하지 않고
 * 요청 바이트를 그대로 대상 git 호스트로 전달한 뒤, 응답에 CORS 헤더만 추가한다.
 * PAT는 Authorization 헤더에 담겨 그대로 지나갈 뿐, 이 워커가 저장/열람하지 않는다.
 *
 * URL 규칙 (isomorphic-git의 corsProxy 관례): 이 워커의 경로 부분을
 * "https://" + <path> 로 재구성해 그대로 요청한다.
 *   예) https://<worker>.workers.dev/github.com/user/repo.git/info/refs?service=git-upload-pack
 *    → https://github.com/user/repo.git/info/refs?service=git-upload-pack
 *
 * ALLOWED_HOSTS(env, comma-separated)로 프록시 가능한 git 호스트를 제한해
 * 오픈 릴레이가 되지 않도록 한다.
 */

const DEFAULT_ALLOWED_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org']

// git smart-HTTP 프로토콜에 필요한 헤더만 통과시킨다 (그 외 브라우저 헤더는 버림)
const FORWARD_REQUEST_HEADERS = [
  'authorization',
  'content-type',
  'accept',
  'accept-encoding',
  'user-agent',
  'git-protocol',
]

const EXPOSE_RESPONSE_HEADERS = ['content-type', 'content-length']

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': FORWARD_REQUEST_HEADERS.join(', '),
    'Access-Control-Expose-Headers': EXPOSE_RESPONSE_HEADERS.join(', '),
    'Access-Control-Max-Age': '86400',
  }
}

function allowedHosts(env) {
  const raw = env.ALLOWED_HOSTS
  if (!raw) return DEFAULT_ALLOWED_HOSTS
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
}

export default {
  /** @param {Request} request @param {{ALLOWED_HOSTS?: string}} env */
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)
    const targetPath = url.pathname.replace(/^\//, '') + url.search
    const targetHostMatch = targetPath.match(/^([^/]+)/)
    const targetHost = targetHostMatch ? targetHostMatch[1].toLowerCase() : ''

    if (!targetHost || !allowedHosts(env).includes(targetHost)) {
      return new Response(`host not allowed: ${targetHost}`, { status: 403, headers: cors })
    }

    const targetUrl = `https://${targetPath}`

    const forwardHeaders = new Headers()
    for (const name of FORWARD_REQUEST_HEADERS) {
      const value = request.headers.get(name)
      if (value) forwardHeaders.set(name, value)
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: request.method === 'POST' ? request.body : undefined,
      // @ts-expect-error Cloudflare Workers-specific fetch option
      duplex: request.method === 'POST' ? 'half' : undefined,
    })

    const responseHeaders = new Headers(cors)
    for (const name of EXPOSE_RESPONSE_HEADERS) {
      const value = upstreamResponse.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  },
}
