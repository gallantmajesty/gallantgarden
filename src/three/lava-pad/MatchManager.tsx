// Lava Pad Match Manager — state machine lifecycle with smooth transitions

import { useEffect } from 'react'
import { useLavaPadStore } from './store'

export function MatchManager() {
  const phase = useLavaPadStore((s) => s.phase)
  const setPhase = useLavaPadStore((s) => s.setPhase)
  const setCountdown = useLavaPadStore((s) => s.setCountdown)

  // Flow: waiting → playersJoining (auto after 1.5s if nobody) → countdown → playing → finished → results
  useEffect(() => {
    if (phase === 'waiting') {
      const timer = setTimeout(() => {
        setPhase('playersJoining')
        setCountdown(3)
        const t2 = setTimeout(() => setPhase('countdown'), 1500)
        return () => clearTimeout(t2)
      }, 800)
      return () => clearTimeout(timer)
    }
    if (phase === 'playersJoining') {
      const timer = setTimeout(() => setPhase('countdown'), 1500)
      return () => clearTimeout(timer)
    }
  }, [phase])

  // Auto-transition finished → results after a brief pause
  useEffect(() => {
    if (phase === 'finished') {
      const timer = setTimeout(() => {
        setPhase('results')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [phase])

  return null
}
