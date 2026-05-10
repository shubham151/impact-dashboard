import type { Hono } from 'hono'
import type { Db } from '$server/Db'

export type db = ReturnType<typeof Db.get>

export type app = Hono
