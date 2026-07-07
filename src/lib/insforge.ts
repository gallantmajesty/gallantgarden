import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.error(
    '[Focus Lily] Missing Supabase configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
  )
}

const client = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Add .database shim so existing code like `insforge.database.from(...)` works
// (Supabase client uses `.from()` directly, not `.database.from()`)
const insforge = Object.assign(client, {
  database: client,
})

export { insforge }
export { insforge as supabase }
