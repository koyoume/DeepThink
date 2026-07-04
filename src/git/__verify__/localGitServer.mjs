// Minimal git smart-HTTP server for local regression tests — wraps the system's
// `git http-backend` CGI so isomorphic-git/http/node can talk to a real bare repo
// over real HTTP, without needing any external network or GitHub credentials.
import { spawn } from 'node:child_process'
import http from 'node:http'

export function startLocalGitServer(projectRoot) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const child = spawn('git', ['http-backend'], {
      env: {
        ...process.env,
        GIT_PROJECT_ROOT: projectRoot,
        GIT_HTTP_EXPORT_ALL: '1',
        PATH_INFO: decodeURIComponent(url.pathname),
        QUERY_STRING: url.search.replace(/^\?/, ''),
        REQUEST_METHOD: req.method ?? 'GET',
        CONTENT_TYPE: req.headers['content-type'] ?? '',
        CONTENT_LENGTH: req.headers['content-length'] ?? '0',
        REMOTE_ADDR: '127.0.0.1',
      },
    })

    const chunks = []
    child.stdout.on('data', (c) => chunks.push(c))
    req.pipe(child.stdin)

    child.on('close', () => {
      const raw = Buffer.concat(chunks)
      const sep = raw.indexOf('\r\n\r\n')
      const headerBlock = raw.subarray(0, sep).toString('utf8')
      const body = raw.subarray(sep + 4)

      let status = 200
      const headers = {}
      for (const line of headerBlock.split('\r\n')) {
        const [key, ...rest] = line.split(':')
        const value = rest.join(':').trim()
        if (/^status$/i.test(key)) status = Number.parseInt(value, 10)
        else if (key) headers[key] = value
      }
      res.writeHead(status, headers)
      res.end(body)
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      })
    })
  })
}
