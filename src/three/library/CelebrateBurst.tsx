// CelebrateBurst — a short leaf burst shown above a player or NPC right after
// they finish a focus session. `minutes` (session length) scales the number /
// size / spread of the leaves; `power` (0..1) overrides it directly. The burst
// fades out and UNMOUNTS itself after CELEBRATE_MS so it never lingers overhead.

import { useState, useEffect } from 'react'
import { GREEN_LEAF_ICON } from '../../lib/leafIcons'

/** How long (ms) a completion burst stays visible above a head. */
export const CELEBRATE_MS = 4000

/** Power of a completion burst, 0..1 — scales with the finished session's
 *  length so longer / more powerful timers get a bigger overhead celebration. */
function burstPower(minutes: number): number {
  return Math.min(1, Math.max(0, minutes / 150))
}

export function CelebrateBurst({ label, minutes, power }: { label?: string; minutes?: number; power?: number }) {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), CELEBRATE_MS)
    return () => window.clearTimeout(t)
  }, [])
  if (gone) return null
  const p = power ?? burstPower(minutes ?? 60)
  const count = 8 + Math.round(p * 14) // 8..22 leaves
  return (
    <div className="ptb-celebrate" style={{ ['--power' as string]: p }}>
      {Array.from({ length: count }).map((_, i) => (
        <img
          key={i}
          className="ptb-leaf"
          src={GREEN_LEAF_ICON}
          alt=""
          draggable={false}
          style={{ ['--i' as string]: i }}
        />
      ))}
      <span className="ptb-done">{label ?? 'Done'}</span>
    </div>
  )
}