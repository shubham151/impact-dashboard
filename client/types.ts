export type impactBreakdown = {
  mergedCount: number
  openedCount: number
  abandonedCount: number
  medianCycleHrs: number
  activeWeeks: number
  followThrough: number
  reviewsGiven: number
  authorsReviewed: number
  revertedCount: number
}

export type pillarScores = {
  delivery: number
  collaboration: number
  quality: number
  composite: number
}

export type rankedEngineer = {
  login: string
  rank: number
  scores: pillarScores
  metrics: impactBreakdown
  reasons: string[]
  topPrTitles: string[]
}

export type narrative = {
  summary: string
  strengths: string[]
  concerns: string[]
}

export type engineerSlim = {
  login: string
  rank: number
  composite: number
  mergedCount: number
  reviewsGiven: number
  activeWeeks: number
}

export type impactReport = {
  windowDays: number
  windowStart: string
  windowEnd: string
  generatedAt: string
  totalPulls: number
  totalEngineers: number
  totalReviews: number
  weights: { delivery: number; collaboration: number; quality: number }
  top5: rankedEngineer[]
  rest: engineerSlim[]
}

export type engineerCardProps = {
  engineer: rankedEngineer
  highlighted?: boolean
}
