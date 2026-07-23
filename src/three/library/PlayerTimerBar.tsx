// PlayerTimerBar — a small live progress bar shown above a seated remote player's
// head, displaying their current study session progress. Uses the same <Html>
// overlay pattern as PlayerNameTag3D.

import { useState, useEffect } from 'react'
import { Html } from '@react-three/drei'
import { getTarget } from '../../multiplayer/net'

interface Props {
  playerId: string
  headY?: number
}

export function PlayerTimerBar({ playerId, headY = 2.9 }: Props) {
  const [tick, setTick] = useState(0)

  // Tick every second to update the progress bar
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const target = getTarget(playerId)
  if (!target) return null

  const { timerStartedAt, timerDurationMs } = target
  if (!timerStartedAt || !timerDurationMs) return null

  const now = Date.now()
  const elapsed = now - timerStartedAt
  if (elapsed < 0) return null

  const pct = Math.min(1, Math.max(0, elapsed / timerDurationMs))
  const remainingMs = Math.max(0, timerDurationMs - elapsed)
  const totalSec = Math.round(remainingMs / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')

  // Don't show if timer is effectively done (>99%)
  if (pct >= 0.99) return null

  return (
    <Html
      position={[0, headY, 0]}
      center
      distanceFactor={10}
      zIndexRange={[30, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="ptb-wrap">
        <div className="ptb-track">
          <div
            className="ptb-fill"
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </div>
        <span className="ptb-time">{mm}:{ss}</span>
      </div>
    </Html>
  )
}
