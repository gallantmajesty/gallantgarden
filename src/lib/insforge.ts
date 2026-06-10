import { createClient } from '@insforge/sdk'

// Public client-side credentials for the InsForge backend. These are safe to
// ship in the browser bundle (the anon key is the public anonymous role, like a
// Supabase anon key). They are used as fallbacks so production builds work even
// when the VITE_* env vars are not configured on the host (e.g. Vercel) — and
// to stop the SDK from silently defaulting to http://localhost:7130, which
// causes "Failed to fetch" on a deployed HTTPS site.
const FALLBACK_INSFORGE_URL = 'https://e29j97zj.us-east.insforge.app'
const FALLBACK_INSFORGE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzE5NDd9.-u5Sz4V1KWdXX_T3cFD0pArC0dCzBR1vbXn0xAHT5rE'

const baseUrl = import.meta.env.VITE_INSFORGE_URL || FALLBACK_INSFORGE_URL
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || FALLBACK_INSFORGE_ANON_KEY

if (!import.meta.env.VITE_INSFORGE_URL || !import.meta.env.VITE_INSFORGE_ANON_KEY) {
  // Not fatal anymore (fallbacks cover it), but warn so misconfig is visible.
  console.warn(
    'VITE_INSFORGE_URL / VITE_INSFORGE_ANON_KEY not set; using built-in fallback credentials.',
  )
}

export const insforge = createClient({ baseUrl, anonKey })
