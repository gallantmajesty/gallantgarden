import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, type Group, type Sprite } from 'three'
import { makePuff } from './textures'
import { platforms, TRAIN_REST_Z } from './layout'
import { glow } from './env'

// Soft steam drifting up from each locomotive's chimney + a little ground haze at
// the buffer ends — billboard puffs on the shared radial-puff sprite, rising and
// fading on a loop. Cheap (a handful of sprites per platform) and gated by the
// quality budget's particle flag so it switches off on Low.

const PER_CHIMNEY = 5

function Plume({ x, z }: { x: number; z: number }) {
  const tex = useMemo(makePuff, [])
  const refs = useRef<(Sprite | null)[]>([])
  const seeds = useMemo(() => Array.from({ length: PER_CHIMNEY }, (_, i) => i / PER_CHIMNEY), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.current.forEach((s, i) => {
      if (!s) return
      const life = (t * 0.32 + seeds[i]) % 1 // 0..1
      const y = 3.6 + life * 5.5
      const spread = 0.4 + life * 2.2
      s.position.set(x + Math.sin((t + i) * 0.7) * spread * 0.3, y, z + Math.cos((t + i) * 0.5) * 0.4)
      const scale = 1.2 + life * 3.2
      s.scale.setScalar(scale)
      const mat = s.material as any
      mat.opacity = Math.max(0, 0.32 * (1 - life))
    })
  })

  return (
    <>
      {seeds.map((_, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)} position={[x, 4, z]}>
          <spriteMaterial map={tex} color={glow.steam} transparent opacity={0.25} depthWrite={false} blending={AdditiveBlending} />
        </sprite>
      ))}
    </>
  )
}

export function Steam() {
  const ref = useRef<Group>(null)
  // chimney sits near the south (buffer) end of each berthed engine
  const chimneys = useMemo(
    () => platforms().map((p) => ({ x: p.trackX, z: TRAIN_REST_Z - 2.4 })),
    [],
  )
  return (
    <group ref={ref}>
      {chimneys.map((c, i) => (
        <Plume key={i} x={c.x} z={c.z} />
      ))}
    </group>
  )
}
