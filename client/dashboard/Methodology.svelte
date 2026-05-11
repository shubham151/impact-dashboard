<script lang="ts">
  type Props = { weights: { delivery: number; collaboration: number; quality: number } }
  const { weights }: Props = $props()

  let open = $state(false)
</script>

<details class="methodology" bind:open>
  <summary>How is impact computed? <span class="hint">{open ? '▲' : '▼'}</span></summary>
  <div class="body">
    <p class="lede">
      Impact is a normalized composite of <strong>three pillars</strong>, weighted Delivery {Math.round(
        weights.delivery * 100
      )}% · Collaboration {Math.round(weights.collaboration * 100)}% · Quality {Math.round(
        weights.quality * 100
      )}%. All metrics are computed over the <strong>last 90 days</strong>, restricted to non-bot
      authors with ≥3 merged PRs. Each engineer's value on a metric is min-max normalized within the
      cohort.
    </p>
    <div class="grid">
      <div class="pillar">
        <h4 class="delivery">Delivery (35%)</h4>
        <ul>
          <li><strong>Merged count</strong> (40%) — shipped PRs in window</li>
          <li><strong>Active weeks</strong> (30%) — distinct ISO weeks with ≥1 merge (max 13)</li>
          <li><strong>Cycle time</strong> (30%, inverse) — median PR open → merge</li>
        </ul>
      </div>
      <div class="pillar">
        <h4 class="collab">Collaboration (35%)</h4>
        <ul>
          <li><strong>Reviews given</strong> (50%) — review submissions</li>
          <li><strong>Authors reviewed</strong> (50%) — distinct PR authors reviewed</li>
        </ul>
      </div>
      <div class="pillar">
        <h4 class="quality">Quality (30%)</h4>
        <ul>
          <li><strong>Follow-through</strong> (60%) — merged / opened ratio</li>
          <li><strong>Reverts</strong> (40%, inverse) — own PRs that were reverted</li>
        </ul>
      </div>
    </div>
    <div class="example">
      <div class="example-title">Worked example — how the composite is computed</div>
      <p class="example-formula">
        <code>composite = 0.35 × Delivery + 0.35 × Collaboration + 0.30 × Quality</code>
      </p>
      <p class="example-body">
        Take <strong>pauldambra</strong> (rank #1): 330 PRs merged across 13 weeks with a 5.2h
        median cycle time → Delivery normalizes to <strong>0.99</strong>. 569 reviews given across
        13 distinct authors → Collaboration <strong>0.96</strong>. Follow-through and revert rates
        score Quality at
        <strong>0.42</strong>. Composite = 0.35 × 0.99 + 0.35 × 0.96 + 0.30 × 0.42 =
        <strong>0.81</strong> → displayed as <strong>81</strong>.
      </p>
      <p class="example-note">
        Every bar value is min-max normalized within the active cohort, so the highest engineer on a
        sub-metric gets 1.0 and the lowest gets 0.0. Cycle time and reverts are inverted (lower raw
        value = higher score).
      </p>
    </div>

    <p class="caveats">
      <strong>What we deliberately don't do:</strong> count lines of code, commits, PR counts, or
      file changes. We don't blame individuals via <code>git blame</code> for downstream bugs. CI cleanliness,
      file blast-radius, and bus-factor are surfaced separately (out of scope for this view). The model
      assumes recent PR activity reflects an engineer's meaningful contribution; engineers on long-running
      infra work may be under-scored — interpret accordingly.
    </p>
  </div>
</details>

<style>
  .methodology {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.55rem 0.85rem;
    font-size: 0.8rem;
  }

  summary {
    cursor: pointer;
    color: var(--text);
    font-weight: 500;
    list-style: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  .hint {
    color: var(--text-secondary);
    font-size: 0.7rem;
  }

  .body {
    padding-top: 0.7rem;
    margin-top: 0.55rem;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .lede {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .lede strong {
    color: var(--text);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.9rem;
  }

  h4 {
    margin: 0 0 0.35rem;
    font-size: 0.78rem;
    font-weight: 600;
  }

  h4.delivery {
    color: #30d158;
  }
  h4.collab {
    color: #bf5af2;
  }
  h4.quality {
    color: #ff9f0a;
  }

  ul {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--text-secondary);
    font-size: 0.72rem;
    line-height: 1.5;
  }

  ul strong {
    color: var(--text);
    font-weight: 500;
  }

  .example {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .example-title {
    color: var(--text);
    font-weight: 600;
    font-size: 0.75rem;
  }

  .example-formula {
    margin: 0;
    text-align: center;
  }

  .example-formula code {
    background: var(--surface);
    padding: 0.25rem 0.55rem;
    border-radius: 5px;
    font-size: 0.72rem;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .example-body {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.74rem;
    line-height: 1.55;
  }

  .example-body strong {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .example-note {
    margin: 0;
    color: var(--text-tertiary);
    font-size: 0.7rem;
    line-height: 1.5;
    font-style: italic;
  }

  .caveats {
    margin: 0;
    padding-top: 0.55rem;
    border-top: 1px solid var(--border);
    color: var(--text-tertiary);
    font-size: 0.72rem;
    line-height: 1.5;
  }

  .caveats code {
    background: var(--surface-raised);
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    font-size: 0.7rem;
  }

  @media (max-width: 800px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
