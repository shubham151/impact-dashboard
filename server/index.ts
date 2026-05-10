import { Db } from '$server/Db'
import { Hono } from 'hono'
import { Todos } from '$server/Todos'
import { serve } from '$lib/serve'

const app = new Hono()
const db = Db.get()

Todos.init(app, db)

serve(app)
