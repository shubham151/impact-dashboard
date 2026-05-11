import { readFileSync, existsSync } from 'fs'
import type { config } from '$server/types'

function readFile(): { repo: string; bots: string[] } {
  const path = existsSync('config.json') ? 'config.json' : 'config.example.json'
  const raw = readFileSync(path, 'utf-8')
  const parsed = JSON.parse(raw) as { repo?: string; bots?: string[] }
  if (!parsed.repo) throw new Error(`Config: missing "repo" in ${path}`)
  return { repo: parsed.repo, bots: parsed.bots ?? [] }
}

function load(): config {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error(
      'Config: GITHUB_TOKEN env var is required. Copy .env.empty to .env and fill it in.'
    )
  }
  const file = readFile()
  return { token, repo: file.repo, bots: file.bots }
}

export const Config = { load }
