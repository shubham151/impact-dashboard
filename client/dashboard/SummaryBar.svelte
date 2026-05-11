<script lang="ts">
  import type { impactReport } from '$client/types'

  type Props = { report: impactReport }
  const { report }: Props = $props()

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
</script>

<section class="summary">
  <div class="repo">
    <span class="repo-name">PostHog/posthog</span>
    <span class="window-range">
      {fmtDate(report.windowStart)} → {fmtDate(report.windowEnd)} ({report.windowDays}d)
    </span>
    <span class="generated">generated {fmtDate(report.generatedAt)}</span>
  </div>
  <div class="stats">
    <div class="stat">
      <div class="num">{report.totalEngineers}</div>
      <div class="lbl">engineers</div>
    </div>
    <div class="stat">
      <div class="num">{report.totalPulls.toLocaleString()}</div>
      <div class="lbl">PRs in window</div>
    </div>
    <div class="stat">
      <div class="num">{report.totalReviews.toLocaleString()}</div>
      <div class="lbl">reviews sampled</div>
    </div>
    <div class="stat">
      <div class="num">{report.top5.length}</div>
      <div class="lbl">top engineers shown</div>
    </div>
  </div>
</section>

<style>
  .summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .repo {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .repo-name {
    color: var(--text);
    font-weight: 600;
    font-size: 0.85rem;
  }

  .window-range {
    color: var(--text);
    font-variant-numeric: tabular-nums;
    font-size: 0.78rem;
  }

  .generated {
    color: var(--text-tertiary);
    font-size: 0.7rem;
  }

  .stats {
    display: flex;
    gap: 1.5rem;
  }

  .stat {
    text-align: right;
  }

  .num {
    color: var(--text);
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .lbl {
    color: var(--text-secondary);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
