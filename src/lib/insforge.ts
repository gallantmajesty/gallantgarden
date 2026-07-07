import { createClient } from '@insforge/sdk'

const insforgeUrl = import.meta.env.VITE_SUPABASE_URL
const insforgeAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(insforgeUrl && insforgeAnonKey)

if (!supabaseConfigured) {
  console.error(
    '[Focus Lily] Missing InsForge configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
  )
}

export const supabase = createClient({
  baseUrl: insforgeUrl || 'https://e29j97zj.us-east.insforge.app',
  anonKey: insforgeAnonKey || '',
})

export { supabase as insforge }
