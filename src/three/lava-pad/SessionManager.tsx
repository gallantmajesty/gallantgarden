// Lava Pad Session Manager — drives the match schedule and gates lava during breaks

import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSessionStore } from './sessionStore'
import { useLavaPadStore } from './store'

export function SessionManager() {
  const sessionStarted = useSessionStore((s) => s.started)
  const sessionFinished = useSessionStore((s) => s.finished)
  const sessionTick = useSessionStore((s) => s.tick)
  const setPhase = useLavaPadStore((s) => s.setPhase)
  const phase = useLavaPadStore((s) => s.phase)

  // Drive session elapsed time each frame while the match is active
  useFrame((_, dt) => {
    if (!sessionStarted || sessionFinished) return
    if (phase !== 'playing' && phase !== 'countdown') return
    // Clamp dt to avoid big jumps on tab refocus
    sessionTick(Math.min(dt, 0.1))
  })

  // When the session ends, finish the match
  useEffect(() => {
    if (sessionFinished && phase !== 'finished' && phase !== 'results') {
      setPhase('finished')
    }
  }, [sessionFinished, phase, setPhase])

  return null
}