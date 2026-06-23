import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { type Group, type PointLight, RepeatWrapping, type Texture } from 'three'
import { InstancedBoxes, InstancedShape, type BoxItem, type ShapeItem } from '../library/Instanced'
import { CAMPS, type CampDef } from './layout'
import { terraceStairs } from './colliders'
import { makeStoneTexture, makeWoodTexture, makeRockTexture } from './textures'

/**
 * The five campfire camps. Each is a circular platform with a ring of ten log
 * benches facing a central animated campfire — the social heart of the realm.
 * Benches across all camps are batched into a couple of instanced draws; the
 * fires and their flicker lights are per-camp (and the lights are quality-gated).
 */
export function Camps({ fireLights = true, embers = true }: { fireLights?: boolean; embers?: boolean }) {
  const stone = useMemo(() => {
    const t = makeStoneTexture(4)
    t.wrapS = t.wrapT = RepeatWrapping
    return t
  }, [])
  const wood = useMemo(() => makeWoodTexture(3), [])
  const rock = useMemo(() => makeRockTexture(3), [])

  // ---- all bench seats + backrests across every camp → two instanced draws ----
  const { seats, backs } = useMemo(() => {
    const seats: BoxItem[] = []
    const backs: BoxItem[] = []
    for (const camp of CAMPS) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        const x = camp.center[0] + Math.cos(a) * camp.radius
        const z = camp.center[1] + Math.sin(a) * camp.radius
        const yaw = a + Math.PI
        seats.push({ pos: [x, camp.y + 0.34, z], size: [1.7, 0.16, 0.55], rotY: yaw, color: '#7a5230' })
        backs.push({ pos: [x + Math.cos(a) * 0.26, camp.y + 0.62, z + Math.sin(a) * 0.26], size: [1.7, 0.5, 0.12], rotY: yaw, color: '#6b461f' })
      }
    }
    return { seats, backs }
  }, [])

  // ---- fire-ring stones across every camp → one instanced draw ----
  const ringStones = useMemo<ShapeItem[]>(() => {
    const out: ShapeItem[] = []
    for (const camp of CAMPS) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        out.push({
          pos: [camp.center[0] + Math.cos(a) * 1.25, camp.y + 0.12, camp.center[1] + Math.sin(a) * 1.25],
          rot: [0, a, 0],
          scale: [0.42, 0.32, 0.42],
        })
      }
    }
    return out
  }, [])

  // ---- log piles across every camp → one instanced draw ----
  const logs = useMemo<ShapeItem[]>(() => {
    const out: ShapeItem[] = []
    for (const camp of CAMPS) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4
        out.push({
          pos: [camp.center[0] + Math.cos(a) * 0.4, camp.y + 0.28, camp.center[1] + Math.sin(a) * 0.4],
          rot: [Math.PI / 2 - 0.5, a, 0],
          scale: [0.13, 1.4, 0.13],
        })
      }
    }
    return out
  }, [])

  return (
    <group>
      {CAMPS.map((camp) => (
        <CampPlatform key={camp.id} camp={camp} stone={stone} wood={wood} rock={rock} />
      ))}

      <InstancedBoxes items={seats} castShadow receiveShadow roughness={0.85} />
      <InstancedBoxes items={backs} castShadow receiveShadow roughness={0.85} />

      <InstancedShape items={ringStones} color="#8d8578" roughness={1} flatShading castShadow>
        <dodecahedronGeometry args={[1, 0]} />
      </InstancedShape>
      <InstancedShape items={logs} color="#5a3d22" roughness={0.95} castShadow>
        <cylinderGeometry args={[1, 1, 1, 8]} />
      </InstancedShape>

      {CAMPS.map((camp) => (
        <Campfire key={camp.id} camp={camp} light={fireLights} embers={embers} />
      ))}
    </group>
  )
}

function CampPlatform({ camp, stone, wood }: { camp: CampDef; stone: Texture; wood: Texture; rock: Texture }) {
  const [cx, cz] = camp.center
  const top = camp.y
  const mapByKind = camp.kind === 'deck' ? wood : camp.kind === 'earth' ? null : stone
  const colorByKind = camp.kind === 'deck' ? '#9c6a38' : camp.kind === 'earth' ? '#6e5836' : camp.kind === 'islet' ? '#7d8a52' : '#a39b8d'

  return (
    <group>
      {/* the platform disc */}
      <mesh position={[cx, top - 0.15, cz]} receiveShadow castShadow>
        <cylinderGeometry args={[camp.plat, camp.plat + (camp.elevated ? 0.6 : 0.3), camp.elevated ? top + 0.3 : 0.4, 40]} />
        <meshStandardMaterial map={mapByKind ?? undefined} color={colorByKind} roughness={1} />
      </mesh>

      {/* islet gets a grassy crown + a rocky waterline skirt */}
      {camp.kind === 'islet' && (
        <mesh position={[cx, top + 0.02, cz]} receiveShadow>
          <cylinderGeometry args={[camp.plat - 0.4, camp.plat - 0.2, 0.3, 36]} />
          <meshStandardMaterial color="#5f8a3b" roughness={1} />
        </mesh>
      )}

      {/* elevated terrace: render matching stone stair treads */}
      {camp.elevated &&
        terraceStairs().map((s, i) => (
          <mesh key={i} position={[(s.minX + s.maxX) / 2, s.y - 0.21, (s.minZ + s.maxZ) / 2]} receiveShadow castShadow>
            <boxGeometry args={[s.maxX - s.minX, 0.42, s.maxZ - s.minZ]} />
            <meshStandardMaterial map={stone} color="#a39b8d" roughness={1} />
          </mesh>
        ))}
    </group>
  )
}

function Campfire({ camp, light, embers }: { camp: CampDef; light: boolean; embers: boolean }) {
  const flame = useRef<Group>(null)
  const pl = useRef<PointLight>(null)
  const [cx, cz] = camp.center
  const fy = camp.y + 0.45

  useFrame((state) => {
    const t = state.clock.elapsedTime + camp.id * 1.7
    const f = 0.85 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.05
    if (flame.current) {
      flame.current.scale.set(1, f, 1)
      flame.current.rotation.y = t * 0.6
    }
    if (pl.current) pl.current.intensity = (3.2 + f * 1.6) * 1
  })

  return (
    <group position={[cx, fy, cz]}>
      <group ref={flame}>
        <mesh position={[0, 0.45, 0]}>
          <coneGeometry args={[0.45, 1.3, 10]} />
          <meshBasicMaterial color="#ff8a2a" transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.3, 0.9, 10]} />
          <meshBasicMaterial color="#ffd86a" transparent opacity={0.95} />
        </mesh>
      </group>
      {light && <pointLight ref={pl} position={[0, 1.1, 0]} distance={16} decay={2} color="#ff9a44" intensity={3.4} castShadow={false} />}
      {embers && <Sparkles count={14} scale={[1.6, 2.4, 1.6]} position={[0, 1.2, 0]} size={2.2} speed={0.6} color="#ffba66" opacity={0.9} />}
    </group>
  )
}
