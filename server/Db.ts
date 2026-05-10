import BetterSqlite3 from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '$db/schema'

const sqlite = new BetterSqlite3('data/sqlite.db')
sqlite.exec('PRAGMA journal_mode=WAL')
sqlite.exec('PRAGMA busy_timeout=5000')
const db = drizzle(sqlite, { schema })

function get(): typeof db {
  return db
}

export const Db = { get }
