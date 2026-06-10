import { createClient } from '@insforge/sdk'

const baseUrl = import.meta.env.VITE_INSFORGE_URL
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY

if (!baseUrl || !anonKey) {
  // Fail loud in dev so a missing .env.local is obvious immediately.
  console.error(
    'Missing VITE_INSFORGE_URL / VITE_INSFORGE_ANON_KEY. Copy .env.example to .env.local.',
  )
}

export const insforge = createClient({ baseUrl, anonKey })
