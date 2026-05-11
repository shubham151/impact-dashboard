import 'dotenv/config'

import { Ai } from '$server/Ai'
import { Data } from '$server/Data'
import { Db } from '$server/Db'
import { Engineers } from '$server/Engineers'
import { Hono } from 'hono'
import { Pulls } from '$server/Pulls'
import { serve } from '$lib/serve'

const app = new Hono()
const db = Db.get()

Pulls.init(app, db)
Engineers.init(app, db)
Data.init(app, db)
Ai.init(app)

serve(app)
