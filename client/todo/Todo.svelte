<script lang="ts">
  import { onMount } from 'svelte'
  import { Todo } from '$client/todo/Todo'
  import type { todo } from '$client/types'

  let todos = $state<todo[]>([])
  let input = $state('')
  let loading = $state(false)
  let error = $state<string | null>(null)

  async function loadTodos(): Promise<void> {
    loading = true
    try {
      todos = await Todo.getAll()
    } catch {
      error = 'Failed to load todos'
    } finally {
      loading = false
    }
  }

  async function addTodo(): Promise<void> {
    if (!input.trim()) return
    todos = [await Todo.create(input), ...todos]
    input = ''
  }

  async function toggleTodo(todo: todo): Promise<void> {
    const updated = await Todo.update(todo.id, !todo.done)
    todos = todos.map((t) => (t.id === updated.id ? updated : t))
  }

  async function deleteTodo(id: string): Promise<void> {
    await Todo.remove(id)
    todos = todos.filter((t) => t.id !== id)
  }

  onMount(loadTodos)
</script>

<div>
  <h1>Todos</h1>
  <p class="stack">Svelte 5 · Hono · Drizzle · SQLite</p>

  <form
    onsubmit={(e) => {
      e.preventDefault()
      addTodo()
    }}
  >
    <input bind:value={input} placeholder="What needs to be done?" />
    <button type="submit">Add</button>
  </form>

  {#if loading}
    <p class="hint">Loading…</p>
  {:else if error}
    <p class="hint error">{error}</p>
  {:else if todos.length === 0}
    <p class="hint">No todos yet.</p>
  {:else}
    <ul>
      {#each todos as todo (todo.id)}
        <li class:done={todo.done}>
          <input type="checkbox" checked={todo.done} onchange={() => toggleTodo(todo)} />
          <span>{todo.text}</span>
          <button class="del" onclick={() => deleteTodo(todo.id)}>✕</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  h1 {
    font-size: 2rem;
    margin-bottom: 0.25rem;
  }

  .stack {
    color: #888;
    font-size: 0.8rem;
    margin-bottom: 1.5rem;
  }

  form {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  input:not([type='checkbox']) {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    background: #3b82f6;
    color: white;
    font-size: 1rem;
    cursor: pointer;
  }

  button:hover {
    background: #2563eb;
  }

  .hint {
    color: #888;
    font-style: italic;
  }
  .hint.error {
    color: #dc2626;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.5rem;
    border-bottom: 1px solid #eee;
  }

  li span {
    flex: 1;
  }

  li.done span {
    text-decoration: line-through;
    color: #aaa;
  }

  .del {
    background: transparent;
    color: #999;
    padding: 0.2rem 0.4rem;
    font-size: 0.85rem;
  }

  .del:hover {
    color: #dc2626;
    background: transparent;
  }
</style>
