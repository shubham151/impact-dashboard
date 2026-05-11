<script lang="ts">
  import { Dashboard } from '$client/dashboard/Dashboard'
  import type { engineerCardProps, narrative } from '$client/types'

  const { engineer, highlighted = false }: engineerCardProps = $props()

  let aiResult = $state<narrative | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)

  function initials(login: string): string {
    return login.slice(0, 2).toUpperCase()
  }

  function pct(n: number): string {
    return `${Math.round(n * 100)}`
  }

  function fmtHrs(h: number): string {
    if (h <= 0) return '—'
    if (h < 24) return `${h.toFixed(1)}h`
    return `${(h / 24).toFixed(1)}d`
  }

  async function generate(): Promise<void> {
    loading = true
    error = null
    try {
      aiResult = await Dashboard.generateNarrative(engineer)
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed'
    } finally {
      loading = false
    }
  }
</script>

<article class="card" class:highlighted>
  <header>
    <div class="rank">#{engineer.rank}</div>
    <div class="avatar">{initials(engineer.login)}</div>
    <div class="title">
      <a class="login" href="https://github.com/{engineer.login}" target="_blank" rel="noreferrer"
        >{engineer.login}</a
      >
      <div class="composite">
        <div class="bar-track">
          <div class="bar-fill" style="width: {pct(engineer.scores.composite)}%"></div>
        </div>
        <span class="composite-num">{pct(engineer.scores.composite)}</span>
      </div>
    </div>
  </header>

  <div class="pillars">
    <div class="pillar" title="Delivery: merged PRs × active weeks × cycle-time-adjusted">
      <div class="pillar-label">Delivery</div>
      <div class="bar-track">
        <div class="bar-fill delivery" style="width: {pct(engineer.scores.delivery)}%"></div>
      </div>
      <div class="pillar-num">{pct(engineer.scores.delivery)}</div>
    </div>
    <div class="pillar" title="Collaboration: reviews given × distinct authors reviewed">
      <div class="pillar-label">Collaboration</div>
      <div class="bar-track">
        <div class="bar-fill collab" style="width: {pct(engineer.scores.collaboration)}%"></div>
      </div>
      <div class="pillar-num">{pct(engineer.scores.collaboration)}</div>
    </div>
    <div class="pillar" title="Quality: follow-through rate × inverse revert rate">
      <div class="pillar-label">Quality</div>
      <div class="bar-track">
        <div class="bar-fill quality" style="width: {pct(engineer.scores.quality)}%"></div>
      </div>
      <div class="pillar-num">{pct(engineer.scores.quality)}</div>
    </div>
  </div>

  <div class="stats">
    <span title="Merged PRs in window"><strong>{engineer.metrics.mergedCount}</strong> merged</span>
    <span title="Median open-to-merge">{fmtHrs(engineer.metrics.medianCycleHrs)} cycle</span>
    <span title="Reviews submitted">{engineer.metrics.reviewsGiven} reviews</span>
    <span title="Distinct authors reviewed">{engineer.metrics.authorsReviewed} authors</span>
    <span title="Weeks (of 13) with at least one merge">{engineer.metrics.activeWeeks}/13 wks</span>
  </div>

  <ul class="reasons">
    {#each engineer.reasons as r (r)}
      <li>{r}</li>
    {/each}
  </ul>

  <div class="ai">
    {#if !aiResult && !loading && !error}
      <button class="generate-btn" onclick={generate}>✨ Generate AI summary</button>
    {/if}
    {#if loading}
      <div class="loading">generating with Gemini…</div>
    {/if}
    {#if error}
      <div class="err">{error}</div>
    {/if}
    {#if aiResult}
      <div class="aiResult">
        <p class="summary">{aiResult.summary}</p>
        {#if aiResult.strengths.length > 0}
          <div class="bullets">
            <div class="bul-label good">Strengths</div>
            <ul>
              {#each aiResult.strengths as s (s)}
                <li>{s}</li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if aiResult.concerns.length > 0}
          <div class="bullets">
            <div class="bul-label warn">Concerns</div>
            <ul>
              {#each aiResult.concerns as c (c)}
                <li>{c}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</article>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.85rem 0.95rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .card.highlighted {
    border-color: var(--accent);
    background: linear-gradient(180deg, rgba(10, 132, 255, 0.06), var(--surface));
  }

  header {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 0.6rem;
    align-items: center;
  }

  .rank {
    color: var(--accent);
    font-weight: 700;
    font-size: 0.95rem;
    letter-spacing: -0.02em;
  }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--surface-raised);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.72rem;
  }

  .title {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .login {
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.88rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .login:hover {
    color: var(--accent);
  }

  .composite {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .bar-track {
    flex: 1;
    height: 5px;
    background: var(--surface-raised);
    border-radius: 3px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--accent);
  }

  .composite-num {
    color: var(--text);
    font-size: 0.72rem;
    font-weight: 600;
    min-width: 22px;
    text-align: right;
  }

  .pillars {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .pillar {
    display: grid;
    grid-template-columns: 80px 1fr 26px;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.7rem;
  }

  .pillar-label {
    color: var(--text-secondary);
  }

  .pillar-num {
    color: var(--text);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .bar-fill.delivery {
    background: #30d158;
  }
  .bar-fill.collab {
    background: #bf5af2;
  }
  .bar-fill.quality {
    background: #ff9f0a;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .stats strong {
    color: var(--text);
    font-weight: 600;
  }

  .reasons {
    margin: 0;
    padding-left: 1rem;
    font-size: 0.72rem;
    color: var(--text-secondary);
    line-height: 1.45;
    border-top: 1px solid var(--border);
    padding-top: 0.5rem;
  }

  .reasons li {
    margin-bottom: 0.15rem;
  }

  .ai {
    border-top: 1px solid var(--border);
    padding-top: 0.55rem;
  }

  .generate-btn {
    background: linear-gradient(135deg, #bf5af2, #0a84ff);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.4rem 0.7rem;
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
    transition: opacity 0.15s ease;
  }

  .generate-btn:hover {
    opacity: 0.9;
  }

  .loading {
    color: var(--text-secondary);
    font-size: 0.72rem;
    font-style: italic;
  }

  .err {
    color: var(--danger);
    font-size: 0.72rem;
  }

  .aiResult {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .summary {
    margin: 0;
    font-size: 0.76rem;
    color: var(--text);
    line-height: 1.5;
  }

  .bullets {
    font-size: 0.7rem;
  }

  .bul-label {
    font-weight: 600;
    margin-bottom: 0.15rem;
  }

  .bul-label.good {
    color: #30d158;
  }

  .bul-label.warn {
    color: #ff9f0a;
  }

  .bullets ul {
    margin: 0;
    padding-left: 1rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }
</style>
