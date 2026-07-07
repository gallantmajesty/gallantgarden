import { createClient } from '@insforge/sdk'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.error(
    '[Focus Lily] Missing configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
  )
}

export const supabase = createClient({
  baseUrl: supabaseUrl || 'https://unconfigured.invalid',
  anonKey: supabaseAnonKey || 'unconfigured',
})

export { supabase as insforge }
