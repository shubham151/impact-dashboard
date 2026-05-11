import { existsSync } from 'fs'
import path from 'path'
import { Db } from '../server/Db'
import { Impact } from '../server/Impact'

function findDb(): string | null {
  const candidates = [
    path.join(process.cwd(), 'data', 'sqlite.db'),
    path.join('/var/task', 'data', 'sqlite.db'),
    path.resolve(import.meta.dirname ?? '.', '..', 'data', 'sqlite.db')
  ]
  return candidates.find((p) => existsSync(p)) ?? null
}

export default async function handler(): Promise<Response> {
  const dbPath = findDb()
  if (!dbPath) {
    return Response.json(
      { error: 'sqlite.db not found in deployment bundle', cwd: process.cwd() },
      { status: 500 }
    )
  }
  try {
    const db = Db.openReadonly(dbPath)
    const report = Impact.compute(db)
    return Response.json(report, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'compute failed'
    return Response.json({ error: message, dbPath }, { status: 500 })
  }
}
