import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.error(
    '[StudyForest] Missing Supabase configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')