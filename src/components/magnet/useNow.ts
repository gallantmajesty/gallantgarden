import { useEffect, useState } from 'react'

/**
 * A live-ticking clock for real-time analytics. Returns a fresh `Date` every
 * `intervalMs` so "today", streaks, weekly windows and heatmaps never go stale
 * while the view stays open (e.g. across midnight or after a long idle).
 */
export function useNow(intervalMs = 30000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
