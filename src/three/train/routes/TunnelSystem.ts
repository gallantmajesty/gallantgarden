// @ts-nocheck
// TunnelSystem — tunnel spawning and enter/exit events.
// Tunnels appear at route-specific intervals. When the train enters a tunnel:
// 1. Exterior fades to black (0.5s)
// 2. Interior lamps dim to 0.2 intensity
// 3. Window: pitch black
// 4. Sound: echo, rumble intensifies
// 5. Exit: light blooms back (0.5s)
// 6. New scenery appears on the other side
//
// The system tracks tunnel state and provides callbacks for enter/exit events.

import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import type { TunnelConfig } from './RouteManager'
import { useTrain } from '../../../store/train'

export interface TunnelState {
  /** whether the train is currently inside a tunnel */
  inTunnel: boolean
  /** index of the current tunnel (-1 if not in tunnel) */
  tunnelIndex: number
  /** fade progress: 0 = fully outside, 1 = fully inside */
  fadeProgress: number
  /** whether we're in the fade-in or fade-out transition */
  transitioning: boolean
}

/** Hook that tracks tunnel enter/exit based on journey progress */
export function useTunnelSystem(tunnels: TunnelConfig) {
  const stateRef = useRef<TunnelState>({
    inTunnel: false,
    tunnelIndex: -1,
    fadeProgress: 0,
    transitioning: false,
  })
  const prevInTunnel = useRef(false)
  const onEnter = useRef<(() => void) | null>(null)
  const onExit = useRef<(() => void) | null>(null)

  const checkTunnel = useCallback((progress: number): TunnelState => {
    const s = stateRef.current
    let inTunnel = false
    let tunnelIndex = -1

    // Check each tunnel position
    for (let i = 0; i < tunnels.count; i++) {
      const pos = tunnels.positions[i]
      // Tunnel occupies ~1.5% of progress around its position
      const halfRange = 0.0075
      if (progress >= pos - halfRange && progress <= pos + halfRange) {
        inTunnel = true
        tunnelIndex = i
        break
      }
    }

    // Compute fade: ramp up/down over 0.3% of progress at tunnel edges
    const fadeRange = 0.003
    let fadeProgress = 0
    if (inTunnel) {
      fadeProgress = 1
    } else {
      // Check proximity to nearest tunnel
      for (let i = 0; i < tunnels.count; i++) {
        const pos = tunnels.positions[i]
        const dist = Math.abs(progress - pos)
        if (dist < fadeRange + 0.0075) {
          // Near a tunnel — compute fade
          const entryDist = Math.abs(progress - (pos - 0.0075))
          const exitDist = Math.abs(progress - (pos + 0.0075))
          fadeProgress = Math.max(0, 1 - Math.min(entryDist, exitDist) / fadeRange)
        }
      }
    }

    s.inTunnel = inTunnel
    s.tunnelIndex = tunnelIndex
    s.fadeProgress = Math.max(0, Math.min(1, fadeProgress))
    s.transitioning = fadeProgress > 0 && fadeProgress < 1

    // Fire callbacks on transitions
    if (inTunnel && !prevInTunnel.current) {
      onEnter.current?.()
    } else if (!inTunnel && prevInTunnel.current) {
      onExit.current?.()
    }
    prevInTunnel.current = inTunnel

    return { ...s }
  }, [tunnels])

  return {
    stateRef,
    checkTunnel,
    onEnter,
    onExit,
  }
}

/** Pre-tunnel audio cue — plays a muffled sound before entering */
export function tunnelPreCue() {
  // Placeholder — will be wired to audio system
}

/** Tunnel ambient — echo + intensified rumble while inside */
export function tunnelAmbient() {
  // Placeholder — will be wired to audio system
}

/** Tunnel exit bloom — bright flash on exit */
export function tunnelExitBloom() {
  // Placeholder — will be wired to post-processing
}
