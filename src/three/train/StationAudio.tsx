// @ts-nocheck
/**
 * Station audio: horns, mounted in StationWorld (non-visual).
 * Watches each line's platformStatus and emits:
 *  - horn at approach start + ambient horn ~every 2 min
 *  - brake squeal near approach end
 *  - steam hiss + door chime at boarding start
 *  - door-close chime at departing start
 *  - clock tick once/sec
 *  - footsteps gated by local player speed (via stationSpeedRef)
 */
import { useFrame } from '@react-three/fiber'
import { TRAIN_LINES } from '../../lib/train/lines'
import { platformStatus } from '../../lib/train/schedule'
import {
  horn,
  brakeSqueal,
  steamHiss,
  doorChime,
  clockTick,
  footstep,
  stationSpeedRef,
} from './audio'

let _lastFootstep = 0
let _lastClockTick = 0
const lastHornRef = { current: 0 }
const lastPhaseRef = new Map<number, string>()

export function StationAudio() {
  // tick: footsteps + clock tick
  useFrame((_, dt) => {
    const now = performance.now()
    // footsteps gated by speed (written by StationPlayerController)
    const sp = stationSpeedRef.current
    if (sp > 1.5 && now - _lastFootstep > 350 + Math.random() * 150) {
      footstep()
      _lastFootstep = now
    }
    // clock tick once per second
    if (now - _lastClockTick > 1000) {
      clockTick()
      _lastClockTick = now
    }
  })

  // watch each line's phase transitions
  useFrame(() => {
    const now = Date.now()
    TRAIN_LINES.forEach((line, i) => {
      const st = platformStatus(line, now)
      const prev = lastPhaseRef.get(i) || ''
      const cur = st.phase

      if (prev !== cur) {
        // approaching start → horn
        if (cur === 'approaching' && prev !== 'approaching') {
          horn()
          lastHornRef.current = now
        }
        // approaching end (boarding start) → brake + steam + door open chime
        if (prev === 'approaching' && cur === 'boarding') {
          brakeSqueal()
          steamHiss()
          doorChime(false)
        }
        // boarding end (departing start) → door close chime
        if (prev === 'boarding' && cur === 'departing') {
          doorChime(true)
        }
        lastPhaseRef.set(i, cur)
      }

      // periodic ambient horn while approaching (~every 2 min)
      if (cur === 'approaching' && now - lastHornRef.current > 120_000) {
        horn()
        lastHornRef.current = now
      }
    })
  })

  return null // non-visual
}