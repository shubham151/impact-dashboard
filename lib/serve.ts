import pc from 'picocolors'
import { createServer } from 'http'
import { createServer as createViteServer } from 'vite'
import { getRequestListener } from '@hono/node-server'
import { readFileSync } from 'fs'
import { serve as honoServe } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import type { app } from '$server/types'

const port = 8080

const startMessage = pc.green('  ➜  ') + pc.bold('Local: ') + pc.cyan(`http://localhost:${port}/`)

function serveProd(app: app): void {
  app.use('/*', serveStatic({ root: './build' }))
  app.get('/*', serveStatic({ path: './build/index.html' }))
  honoServe({ fetch: app.fetch, port }, () => {
    console.log(startMessage)
  })
}

async function serveDev(app: app): Promise<void> {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' })
  const handler = getRequestListener(app.fetch)
  createServer(async (req, res) => {
    vite.middlewares(req, res, async () => {
      if (req.url?.startsWith('/api')) {
        handler(req, res)
      } else {
        const template = readFileSync('root/index.html', 'utf-8')
        const html = await vite.transformIndexHtml(req.url!, template)
        res.setHeader('Content-Type', 'text/html')
        res.end(html)
      }
    })
  }).listen(port, () => {
    console.log(startMessage)
  })
}

export async function serve(app: app): Promise<void> {
  const isDev = process.argv.includes('--dev')
  if (isDev) {
    serveDev(app)
  } else {
    serveProd(app)
  }
}
