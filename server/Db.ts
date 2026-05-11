import BetterSqlite3 from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '$db/schema'

const DEFAULT_PATH = 'data/sqlite.db'

type Drizzled = ReturnType<typeof drizzle<typeof schema>>

function openWritable(): Drizzled {
  const sqlite = new BetterSqlite3(DEFAULT_PATH)
  sqlite.exec('PRAGMA journal_mode=WAL')
  sqlite.exec('PRAGMA busy_timeout=5000')
  return drizzle(sqlite, { schema })
}

function openReadonly(filePath: string): Drizzled {
  const sqlite = new BetterSqlite3(filePath, { readonly: true, fileMustExist: true })
  return drizzle(sqlite, { schema })
}

function get(): Drizzled {
  return openWritable()
}

export const Db = { get, openReadonly }
