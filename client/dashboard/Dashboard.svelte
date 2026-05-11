<script lang="ts">
  import { Dashboard } from '$client/dashboard/Dashboard'
  import EngineerCard from '$client/dashboard/EngineerCard.svelte'
  import SummaryBar from '$client/dashboard/SummaryBar.svelte'
  import Methodology from '$client/dashboard/Methodology.svelte'
  import type { impactReport } from '$client/types'
  import { onMount } from 'svelte'

  let report = $state<impactReport | null>(null)
  let error = $state<string | null>(null)

  async function load(): Promise<void> {
    try {
      report = await Dashboard.loadReport()
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed to load'
    }
  }

  onMount(load)
</script>

<main class="page">
  <header class="hero">
    <h1>Who's having the most impact at PostHog?</h1>
    <p class="sub">
      Ranked by a transparent composite of <span class="d">delivery</span>,
      <span class="c">collaboration</span>, and
      <span class="q">quality</span> — never lines of code, commits, or raw PR counts.
    </p>
  </header>

  {#if error}
    <p class="err">{error}</p>
  {:else if !report}
    <p class="muted">loading…</p>
  {:else}
    <SummaryBar {report} />

    <section class="top5">
      <h2>Top 5 most impactful engineers (last 90 days)</h2>
      <div class="grid">
        {#each report.top5 as engineer (engineer.login)}
          <EngineerCard {engineer} highlighted={engineer.rank === 1} />
        {/each}
      </div>
    </section>

    <Methodology weights={report.weights} />

    {#if report.rest.length > 0}
      <details class="rest">
        <summary>Show all {report.totalEngineers} ranked engineers ▼</summary>
        <div class="rest-list">
          {#each report.rest as e (e.login)}
            <div class="row">
              <span class="r-rank">#{e.rank}</span>
              <a
                class="r-login"
                href="https://github.com/{e.login}"
                target="_blank"
                rel="noreferrer">{e.login}</a
              >
              <span class="r-score">{Math.round(e.composite * 100)}</span>
              <span class="r-meta"
                >{e.mergedCount} merged · {e.reviewsGiven} reviews · {e.activeWeeks}/13 wks</span
              >
            </div>
          {/each}
        </div>
      </details>
    {/if}
  {/if}
</main>

<style>
  .page {
    max-width: 1240px;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    min-height: 100vh;
  }

  .hero h1 {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    margin: 0 0 0.3rem;
  }

  .hero .sub {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.85rem;
    max-width: 720px;
    line-height: 1.5;
  }

  .sub .d {
    color: #30d158;
  }
  .sub .c {
    color: #bf5af2;
  }
  .sub .q {
    color: #ff9f0a;
  }

  .muted {
    color: var(--text-secondary);
  }

  .err {
    color: var(--danger);
  }

  .top5 h2 {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin: 0 0 0.55rem;
    font-weight: 600;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.8rem;
  }

  @media (max-width: 1100px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 720px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .rest {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.55rem 0.85rem;
    font-size: 0.78rem;
  }

  .rest summary {
    cursor: pointer;
    color: var(--text-secondary);
    list-style: none;
  }

  .rest summary::-webkit-details-marker {
    display: none;
  }

  .rest-list {
    margin-top: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .row {
    display: grid;
    grid-template-columns: 36px 160px 36px 1fr;
    gap: 0.6rem;
    align-items: center;
    padding: 0.25rem 0;
    font-size: 0.75rem;
    border-top: 1px solid var(--border);
  }

  .row:first-child {
    border-top: none;
  }

  .r-rank {
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .r-login {
    color: var(--text);
    text-decoration: none;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .r-login:hover {
    color: var(--accent);
  }

  .r-score {
    color: var(--accent);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .r-meta {
    color: var(--text-secondary);
  }
</style>
