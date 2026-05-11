import type { Hono } from 'hono'
import type { Db } from '$server/Db'

export type db = ReturnType<typeof Db.get>

export type app = Hono

export type config = {
  token: string
  repo: string
  bots: string[]
}

export type rawReview = {
  node_id: string
  user: { login: string } | null
  state: string
  submitted_at: string | null
}

export type rawPull = {
  node_id: string
  number: number
  title: string
  state: string
  user: { login: string; type: string } | null
  body: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  merged_at: string | null
  draft: boolean
  merged_by: { login: string } | null
  base: { ref: string }
  head: { ref: string }
  labels: { name: string }[]
}
