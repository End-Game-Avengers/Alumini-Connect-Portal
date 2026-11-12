// Netlify Server entrypoint: hosts the existing Express API on /api/*.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const app = require('../../backend/server.js')

// Requests reach Express through Netlify's proxy; trust it so rate limiting sees real client IPs.
app.set('trust proxy', 1)

export const config = {
  path: '/api/*',
}

export default app
