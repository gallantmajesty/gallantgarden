import { createClient } from '@insforge/sdk'

const projectId = import.meta.env.VITE_INSFORGE_PROJECT_ID
const appKey = import.meta.env.VITE_INSFORGE_APP_KEY
const apiKey = import.meta.env.VITE_INSFORGE_API_KEY

export const supabaseConfigured = Boolean(projectId && apiKey)

if (!supabaseConfigured) {
  console.error(
    '[Focus Lily] Missing InsForge configuration: set VITE_INSFORGE_PROJECT_ID and VITE_INSFORGE_API_KEY in .env.local.',
  )
}

export const insforge = createClient({
  baseUrl: `https://${appKey}.us-east.insforge.app`,
  anonKey: apiKey,
  debug: import.meta.env.DEV,
})
