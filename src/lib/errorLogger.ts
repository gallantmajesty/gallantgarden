// Error monitoring (3.8): zero-config logger — captures window errors and
// unhandled rejections into the Supabase `error_logs` table. No external
// service or DSN required. In dev it only console.logs. Capped at 200 sends
// per session to avoid loops (e.g. an error thrown by the insert itself).

import { supabase } from './supabase'

const MAX_PER_SESSION = 200
let sent = 0

export interface ErrorLogContext {
  [key: string]: unknown
}

export async function logError(
  scope: string,
  message: string,
  context?: ErrorLogContext,
): Promise<void> {
  if (import.meta.env.DEV) {
    console.error(`[errorLogger:${scope}]`, message, context ?? '')
    return
  }
  if (sent >= MAX_PER_SESSION) return
  sent += 1
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from('error_logs').insert([
      {
        scope,
        message: String(message).slice(0, 4000),
        context: context ?? null,
        user_id: user?.id ?? null,
        url: typeof window !== 'undefined' ? window.location.href.slice(0, 500) : null,
        ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      },
    ])
    if (error) console.error('[errorLogger] send failed:', error.message)
  } catch (err) {
    console.error('[errorLogger] send threw:', err)
  }
}

/** Install the global handlers. Call once from main.tsx. */
export function initErrorReporting(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => {
    void logError('window.error', e.error?.message || e.message || String(e.error), {
      stack: e.error?.stack?.slice(0, 4000) ?? null,
      filename: e.filename ?? null,
      line: e.lineno ?? null,
      col: e.colno ?? null,
    })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason
    void logError(
      'unhandledrejection',
      reason instanceof Error ? reason.message : String(reason),
      { stack: reason instanceof Error ? (reason.stack?.slice(0, 4000) ?? null) : null },
    )
  })
}
