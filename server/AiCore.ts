import { GoogleGenAI, Type } from '@google/genai'

export type aiMetrics = {
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

export type aiScores = {
  delivery: number
  collaboration: number
  quality: number
  composite: number
}

export type aiRequest = {
  login: string
  rank: number
  metrics: aiMetrics
  scores: aiScores
  topPrTitles: string[]
}

export type aiNarrative = {
  summary: string
  strengths: string[]
  concerns: string[]
}

const MODEL = 'gemini-2.5-flash'

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: '1-2 short sentences (under 35 words) on impact, citing concrete numbers'
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2-3 bullets, each under 18 words'
    },
    concerns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Empty array if no concerns; otherwise 1-2 bullets under 18 words each'
    }
  },
  required: ['summary', 'strengths', 'concerns']
}

function buildPrompt(b: aiRequest): string {
  return `You are helping a busy engineering leader understand the impact of one engineer over the past 90 days at PostHog, based ONLY on the data below. Do NOT invent metrics that aren't provided. Cite PR numbers from the list when relevant. Be concise.

Engineer: ${b.login} (rank #${b.rank} on composite impact)
Composite: ${b.scores.composite.toFixed(2)} (Delivery ${b.scores.delivery.toFixed(2)} / Collaboration ${b.scores.collaboration.toFixed(2)} / Quality ${b.scores.quality.toFixed(2)})

Metrics over last 90 days:
- Merged PRs: ${b.metrics.mergedCount}
- Opened (incl. unmerged): ${b.metrics.openedCount}
- Abandoned (closed unmerged): ${b.metrics.abandonedCount}
- Follow-through rate: ${(b.metrics.followThrough * 100).toFixed(0)}%
- Median cycle time (open → merge): ${b.metrics.medianCycleHrs.toFixed(1)} hours
- Active weeks (with at least one merged PR): ${b.metrics.activeWeeks} / 13
- Reviews given: ${b.metrics.reviewsGiven}
- Distinct authors reviewed: ${b.metrics.authorsReviewed}
- Reverts of their own PRs: ${b.metrics.revertedCount}

Their 5 most recent merged PR titles:
${b.topPrTitles.map((t) => `- ${t}`).join('\n')}`
}

export async function generateNarrative(b: aiRequest): Promise<aiNarrative> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(b),
    config: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA
    }
  })
  const raw = response.text ?? '{}'
  const parsed = JSON.parse(raw) as aiNarrative
  return {
    summary: parsed.summary ?? '',
    strengths: parsed.strengths ?? [],
    concerns: parsed.concerns ?? []
  }
}
