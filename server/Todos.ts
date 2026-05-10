import { desc, eq } from 'drizzle-orm'
import { todos } from '$db/schema'
import { app, db } from '$server/types'

function init(app: app, db: db): void {
  app.get('/api/todos', (c) => {
    const rows = db.select().from(todos).orderBy(desc(todos.createdAt)).all()
    return c.json(rows)
  })

  app.post('/api/todos', async (c) => {
    const { text } = await c.req.json<{ text: string }>()
    if (!text?.trim()) return c.json({ error: 'text is required' }, 400)
    const row = db.insert(todos).values({ text: text.trim() }).returning().get()
    return c.json(row, 201)
  })

  app.patch('/api/todos/:id', async (c) => {
    const id = c.req.param('id')
    const { done } = await c.req.json<{ done: boolean }>()
    const row = db.update(todos).set({ done }).where(eq(todos.id, id)).returning().get()
    if (!row) return c.json({ error: 'not found' }, 404)
    return c.json(row)
  })

  app.delete('/api/todos/:id', (c) => {
    const id = c.req.param('id')
    db.delete(todos).where(eq(todos.id, id)).run()
    return c.body(null, 204)
  })
}

export const Todos = { init }
