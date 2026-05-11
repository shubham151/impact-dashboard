import { Api } from '$lib/core/Api'
import type { impactReport, narrative, rankedEngineer } from '$client/types'

function loadReport(): Promise<impactReport> {
  return Api.get<impactReport>('/api/data')
}

function generateNarrative(e: rankedEngineer): Promise<narrative> {
  return Api.post<narrative>('/api/ai', {
    login: e.login,
    rank: e.rank,
    metrics: e.metrics,
    scores: e.scores,
    topPrTitles: e.topPrTitles
  })
}

export const Dashboard = { loadReport, generateNarrative }
