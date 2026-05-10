<script lang="ts">
  import { route, navigate } from '$lib/Router'

  const links: any = [
    { label: 'Home', to: 'home' },
    { label: 'Todos', to: 'todos' },
    { label: 'About', to: 'about' }
  ]
</script>

<header>
  <nav>
    {#each links as link}
      <button class:active={$route === link.to} onclick={() => navigate(link.to)}>
        {link.label}
      </button>
    {/each}
  </nav>
</header>

<style>
  header {
    margin-bottom: 2rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.75rem;
  }

  nav {
    display: flex;
    gap: 0.25rem;
  }

  button {
    padding: 0.35rem 0.75rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #555;
    font-size: 0.95rem;
    cursor: pointer;
  }

  button:hover {
    background: #f0f0f0;
    color: #111;
  }

  button.active {
    background: #3b82f6;
    color: white;
  }
</style>
