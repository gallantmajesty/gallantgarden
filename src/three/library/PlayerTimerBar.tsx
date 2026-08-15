// PlayerTimerBar — a small live progress bar shown above a player's head. Remote
// players read their network snapshot (so the bar is live even while they're
// mid-session); the local player (`self`) reads the pomodoro store directly.
// Focus sessions fill green, pomodoro breaks fill blue with a coffee marker.
// Uses the same <Html> overlay pattern as PlayerNameTag3D.

import { useState, useEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import { getTarget, useRealmNet } from '../../multiplayer/net'
import { usePomodoro, liveFocusLeaves, formatLiveLeaves } from '../../store/pomodoro'
import { CelebrateBurst, CELEBRATE_MS } from './CelebrateBurst'

interface Props {
  /** Remote player id — omit and pass `self` to render the local player's timer. */
  playerId?: string
  headY?: number
  self?: boolean
}

export function PlayerTimerBar({ playerId, headY = 2.9, self = false }: Props) {
  const [tick, setTick] = useState(0)
  // Break entry anchor — (wall-clock at entry, total break seconds) so the fill
  // sweeps 0→1 across the whole break instead of the whole session.
  const breakAnchor = useRef<{ at: number; total: number } | null>(null)

  // Tick every second to update the progress bar
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  // ---- Local player: read the pomodoro store directly -----------------------
  if (self) {
    const pomo = usePomodoro.getState()
    // Just finished the whole session — show the celebration burst overhead.
    if (pomo.phase === 'finished') {
      return (
        <Html position={[0, headY + 1.15, 0]} center distanceFactor={10} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <CelebrateBurst minutes={pomo.sessionMinutes || 60} />
        </Html>
      )
    }
    const inBreak = pomo.phase === 'break'
    if (pomo.phase !== 'running' && !inBreak) return null

    const focus = !inBreak
    let pct: number
    if (focus) {
      breakAnchor.current = null
      pct = Math.min(1, Math.max(0, 1 - pomo.remaining / (pomo.sessionMinutes * 60)))
    } else {
      if (!breakAnchor.current) breakAnchor.current = { at: Date.now(), total: pomo.remaining }
      const { at, total } = breakAnchor.current
      pct = total > 0 ? Math.min(1, Math.max(0, (Date.now() - at) / (total * 1000))) : 0
    }

    const mm = String(Math.floor(pomo.remaining / 60)).padStart(2, '0')
    const ss = String(pomo.remaining % 60).padStart(2, '0')
    const leaves = liveFocusLeaves(pomo)

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
              className={`ptb-fill ${focus ? '' : 'ptb-fill-break'}`}
              style={{ width: `${Math.round(pct * 100)}%` }}
            />
          </div>
          <span className={`ptb-time ${focus ? '' : 'ptb-time-break'}`}>
            {focus ? `${mm}:${ss}` : `☕ ${mm}:${ss}`}
          </span>
          {focus && formatLiveLeaves(leaves) !== '0' && <span className="ptb-leaves">🍃 {formatLiveLeaves(leaves)}</span>}
        </div>
      </Html>
    )
  }

  // ---- Remote player: read the network snapshot -----------------------------
  if (!playerId) return null
  const target = getTarget(playerId)
  if (!target) return null

  // Completion burst — show for a few seconds after the remote finished.
  const celebrateAt = target.timerCelebrateAt ?? 0
  const timerDurationMs = target.timerDurationMs || 0
  if (celebrateAt && Date.now() - celebrateAt < CELEBRATE_MS) {
    return (
      <Html position={[0, headY + 1.15, 0]} center distanceFactor={10} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
        <CelebrateBurst
          label={useRealmNet.getState().roster[playerId]?.name ? `${useRealmNet.getState().roster[playerId]!.name} finished` : 'finished'}
          minutes={timerDurationMs / 60000}
        />
      </Html>
    )
  }

  const { timerStartedAt } = target
  if (!timerStartedAt || !timerDurationMs) return null

  const now = Date.now()
  const elapsed = now - timerStartedAt
  if (elapsed < 0) return null

  const pct = Math.min(1, Math.max(0, elapsed / timerDurationMs))
  const remainingMs = Math.max(0, timerDurationMs - elapsed)
  const totalSec = Math.round(remainingMs / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  const isBreak = target.timerPhase === 'break'

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
            className={`ptb-fill ${isBreak ? 'ptb-fill-break' : ''}`}
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </div>
        <span className={`ptb-time ${isBreak ? 'ptb-time-break' : ''}`}>
          {isBreak ? `☕ ${mm}:${ss}` : `${mm}:${ss}`}
        </span>
      </div>
    </Html>
  )
}
