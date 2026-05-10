<script lang="ts">
  import { route } from '$lib/Router'
  import Header from '$client/app/Header.svelte'
  import Home from '$client/home/Home.svelte'
  import About from '$client/about/About.svelte'
  import Todo from '$client/todo/Todo.svelte'
</script>

<div id="app">
  <Header />
  {#if $route === 'home'}
    <Home />
  {:else if $route === 'about'}
    <About />
  {:else if $route === 'todos'}
    <Todo />
  {:else}
    <Home />
  {/if}
</div>

<style>
  * {
    box-sizing: border-box;
  }

  #app {
    max-width: 480px;
    margin: 4rem auto;
    font-family: system-ui, sans-serif;
    padding: 0 1rem;
  }
</style>
