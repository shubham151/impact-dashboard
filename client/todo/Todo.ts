import type { todo } from '$client/types'

async function remove(id: string): Promise<void> {
  await fetch(`/api/todos/${id}`, { method: 'DELETE' })
}

async function update(id: string, done: boolean): Promise<todo> {
  const res = await fetch(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done })
  })
  return res.json()
}

async function create(text: string): Promise<todo> {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })
  return res.json()
}

async function getAll(): Promise<todo[]> {
  const res = await fetch('/api/todos')
  return res.json()
}

export const Todo = { getAll, create, update, remove }
