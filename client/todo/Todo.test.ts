import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Todo } from '$client/todo/Todo'

const mockTodo = { id: '1', text: 'buy milk', done: false, createdAt: '2024-01-01' }

function mockFetch(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve(body),
      status
    })
  )
}

beforeEach(() => vi.unstubAllGlobals())

describe('Todo.getAll', () => {
  it('fetches all todos', async () => {
    mockFetch([mockTodo])
    const result = await Todo.getAll()
    expect(fetch).toHaveBeenCalledWith('/api/todos')
    expect(result).toEqual([mockTodo])
  })
})

describe('Todo.create', () => {
  it('posts text and returns created todo', async () => {
    mockFetch(mockTodo)
    const result = await Todo.create('buy milk')
    expect(fetch).toHaveBeenCalledWith('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'buy milk' })
    })
    expect(result).toEqual(mockTodo)
  })
})

describe('Todo.update', () => {
  it('patches done and returns updated todo', async () => {
    const updated = { ...mockTodo, done: true }
    mockFetch(updated)
    const result = await Todo.update('1', true)
    expect(fetch).toHaveBeenCalledWith('/api/todos/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true })
    })
    expect(result).toEqual(updated)
  })
})

describe('Todo.remove', () => {
  it('sends DELETE and returns nothing', async () => {
    mockFetch(null, 204)
    await Todo.remove('1')
    expect(fetch).toHaveBeenCalledWith('/api/todos/1', { method: 'DELETE' })
  })
})
