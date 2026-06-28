import { createClient } from '@insforge/sdk'

const baseUrl = import.meta.env.VITE_INSFORGE_URL
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY

/**
 * True only when both required env vars were present at build time. The app still
 * REQUIRES these — there are deliberately no hardcoded fallback credentials (that
 * was removed in the security pass). But rather than `throw` at module import
 * (which leaves a blank white page with no clue), we surface the misconfiguration:
 * `main.tsx` renders a clear "not configured" screen when this is false, and we
 * log loudly below.
 */
export const insforgeConfigured = Boolean(baseUrl && anonKey)

if (!insforgeConfigured) {
  console.error(
    '[Focus Lily] Missing InsForge configuration: set VITE_INSFORGE_URL and ' +
    "VITE_INSFORGE_ANON_KEY — in .env.local for local dev, or your host's " +
    'environment variables (e.g. Vercel project settings) for production builds.',
  )
}

// Real values when configured; harmless placeholders keep this module import-safe
// when not. No request is ever made with the placeholders — main.tsx shows the
// config screen and never mounts the app while unconfigured.
export const insforge = createClient({
  baseUrl: baseUrl || 'https://unconfigured.invalid',
  anonKey: anonKey || 'unconfigured',
})
