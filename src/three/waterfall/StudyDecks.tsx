import { useMemo } from 'react'
import { RepeatWrapping } from 'three'
import { InstancedBoxes, type BoxItem } from '../library/Instanced'
import { STUDY_DECKS, WATER_LEVEL } from './layout'
import { makeWoodTexture } from './textures'

/** Quiet solo-focus decks cantilevered over the water, each with two benches
 *  facing the falls — the seats here are registered in camps.ts so "Press E to
 *  sit" opens the Study Station just like at a campfire. */
export function StudyDecks() {
  const wood = useMemo(() => {
    const t = makeWoodTexture(3)
    t.wrapS = t.wrapT = RepeatWrapping
    return t
  }, [])

  const { seats, backs, posts } = useMemo(() => {
    const seats: BoxItem[] = []
    const backs: BoxItem[] = []
    const posts: BoxItem[] = []
    for (const d of STUDY_DECKS) {
      const yaw = d.faceYaw
      for (const off of [-1, 1]) {
        const x = d.center[0] + Math.cos(yaw + Math.PI / 2) * off * 1.1
        const z = d.center[1] + Math.sin(yaw + Math.PI / 2) * off * 1.1
        seats.push({ pos: [x, d.y + 0.34, z], size: [1.5, 0.16, 0.5], rotY: yaw, color: '#7a5230' })
        backs.push({ pos: [x - Math.sin(yaw) * 0.24, d.y + 0.62, z - Math.cos(yaw) * 0.24], size: [1.5, 0.5, 0.12], rotY: yaw, color: '#6b461f' })
      }
      // support pilings at the four corners
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          posts.push({
            pos: [d.center[0] + (sx * d.size[0]) / 2.4, (WATER_LEVEL + d.y) / 2 - 0.3, d.center[1] + (sz * d.size[1]) / 2.4],
            size: [0.22, d.y + 1.4, 0.22],
            color: '#4d3320',
          })
    }
    return { seats, backs, posts }
  }, [])

  return (
    <group>
      {STUDY_DECKS.map((d, i) => (
        <mesh key={i} position={[d.center[0], d.y - 0.05, d.center[1]]} receiveShadow castShadow>
          <boxGeometry args={[d.size[0], 0.18, d.size[1]]} />
          <meshStandardMaterial map={wood} color="#9c6a38" roughness={0.9} />
        </mesh>
      ))}
      <InstancedBoxes items={posts} color="#4d3320" roughness={0.95} castShadow />
      <InstancedBoxes items={seats} roughness={0.85} castShadow receiveShadow />
      <InstancedBoxes items={backs} roughness={0.85} castShadow receiveShadow />
    </group>
  )
}
