import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import routes from './routes/index.js'
import dbConnect from './lib/database.js'
import { errorMiddleware } from './middlewares/error.middleware.js'

const app = new Hono()

// Connect to the database
dbConnect()

// Error middleware
app.onError(errorMiddleware)

for (const route of routes) {
  app.route('/api/', route)
}

const port = 3000
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
