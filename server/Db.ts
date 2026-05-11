import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '$db/schema'

type Drizzled = ReturnType<typeof drizzle<typeof schema>>

function get(): Drizzled {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) {
    throw new Error('TURSO_DATABASE_URL is required. Set it in .env (local) and Vercel env vars (prod).')
  }
  if (!authToken && url.startsWith('libsql://')) {
    throw new Error('TURSO_AUTH_TOKEN is required for remote Turso. Run: turso db tokens create <db-name>')
  }
  const client = createClient({ url, authToken })
  return drizzle(client, { schema })
}

export const Db = { get }
