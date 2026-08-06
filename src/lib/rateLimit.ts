// Client-side rate limiting: a per-session sliding window per action key.
// The DB RPCs (_limited variants) enforce the same budgets server-side; this
// layer gives instant, friendly feedback without a round-trip and protects
// against accidental multi-click bursts. Session-scoped — resets on reload.

const buckets = new Map<string, { count: number; resetAt: number }>()

export function allow(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  return true
}

export function reset(key: string): void {
  buckets.delete(key)
}

export const RATE_LIMITS = {
  friendRequest: 5,
  message: 30,
  report: 5,
} as const
