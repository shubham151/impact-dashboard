import { Config } from '$server/Config'
import type { rawPull, rawReview } from '$server/types'

const API = 'https://api.github.com'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function computeWaitSeconds(res: Response): number {
  const retryAfter = res.headers.get('retry-after')
  if (retryAfter) return parseInt(retryAfter, 10)
  const reset = res.headers.get('x-ratelimit-reset')
  if (reset) return Math.max(1, parseInt(reset, 10) - Math.floor(Date.now() / 1000))
  return 60
}

async function waitForRateLimit(res: Response): Promise<void> {
  const waitSec = computeWaitSeconds(res)
  console.warn(`[github] rate limited, sleeping ${waitSec}s`)
  await sleep(waitSec * 1000)
}

function isRateLimited(res: Response): boolean {
  if (res.status === 429) return true
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') return true
  return false
}

async function request<T>(path: string): Promise<T> {
  const { token } = Config.load()
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'impact-dashboard'
    }
  })
  if (res.status === 200) return (await res.json()) as T
  if (isRateLimited(res)) {
    await waitForRateLimit(res)
    return request<T>(path)
  }
  if (res.status === 401) throw new Error('GitHub: 401 unauthorized — check GITHUB_TOKEN')
  if (res.status === 404) throw new Error(`GitHub: 404 not found for ${path} — check repo config`)
  throw new Error(`GitHub: ${res.status} ${res.statusText} for ${path}`)
}

async function fetchPullsPage(repo: string, page: number, perPage: number): Promise<rawPull[]> {
  const qs = `state=all&sort=updated&direction=desc&per_page=${perPage}&page=${page}`
  return request<rawPull[]>(`/repos/${repo}/pulls?${qs}`)
}

async function fetchReviewsForPull(repo: string, prNumber: number): Promise<rawReview[]> {
  return request<rawReview[]>(`/repos/${repo}/pulls/${prNumber}/reviews?per_page=100`)
}

export const Github = { fetchPullsPage, fetchReviewsForPull }
