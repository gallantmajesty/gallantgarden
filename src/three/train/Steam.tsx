import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, type Group, type Sprite } from 'three'
import { makePuff } from './textures'
import { platforms, TRAIN_REST_Z } from './layout'
import { glow } from './env'
import { TRAIN_LINES, type TrainLine } from '../../lib/train/lines'
import { platformStatus } from '../../lib/train/schedule'

// Steam drifting up from a berthed locomotive's chimney — small billboard puffs
// rising straight up with a gentle random drift. Only visible while the train is
// at the platform (boarding phase).

const PER_CHIMNEY = 4

function Plume({ x, z, line }: { x: number; z: number; line: TrainLine }) {
  const tex = useMemo(makePuff, [])
  const refs = useRef<(Sprite | null)[]>([])
  const seeds = useMemo(() => Array.from({ length: PER_CHIMNEY }, () => Math.random()), [])

  useFrame((state) => {
    const active = platformStatus(line).phase === 'boarding'
    const t = state.clock.elapsedTime
    refs.current.forEach((s, i) => {
      if (!s) return
      const mat = s.material as any
      if (!active) {
        mat.opacity = 0
        return
      }
      const life = (t * 0.35 + seeds[i]) % 1
      const y = 4.2 + life * 4.0
      const driftX = Math.sin(seeds[i] * 100 + t * 0.2) * life * 0.6
      const driftZ = Math.cos(seeds[i] * 50 + t * 0.15) * life * 0.4
      s.position.set(x + driftX, y, z + driftZ)
      s.scale.setScalar(0.8 + life * 1.8)
      mat.opacity = Math.max(0, 0.28 * (1 - life * life))
    })
  })

  return (
    <>
      {seeds.map((_, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)} position={[x, 4.2, z]}>
          <spriteMaterial map={tex} color={glow.steam} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
        </sprite>
      ))}
    </>
  )
}

export function Steam() {
  const ref = useRef<Group>(null)
  // chimney sits at the very front of the locomotive — at the smokebox end
  const chimneys = useMemo(
    () => platforms().map((p, i) => ({ x: p.trackX, z: TRAIN_REST_Z - 5.0, line: TRAIN_LINES[i] })),
    [],
  )
  return (
    <group ref={ref}>
      {chimneys.map((c, i) => (
        <Plume key={i} x={c.x} z={c.z} line={c.line} />
      ))}
    </group>
  )
}
