<script lang="ts">
  import Dashboard from '$client/dashboard/Dashboard.svelte'
</script>

<Dashboard />

<style>
  :global(:root) {
    color-scheme: dark;
    --bg: #000000;
    --surface: #1c1c1e;
    --surface-raised: #2c2c2e;
    --border: #38383a;
    --text: #f5f5f7;
    --text-secondary: #98989d;
    --text-tertiary: #636366;
    --accent: #0a84ff;
    --success: #30d158;
    --danger: #ff453a;
    --font:
      -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui,
      'Helvetica Neue', Arial, sans-serif;
  }

  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    font-feature-settings: 'kern', 'liga', 'tnum';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(button) {
    font-family: inherit;
  }
</style>
