import { useMemo } from 'react'
import { InstancedBoxes, type BoxItem } from '../library/Instanced'
import { BRIDGES, WATER_LEVEL } from './layout'

/** Wooden plank bridges — the dry route to the Lake Islet and across the river
 *  outflow. Planks + rope-post rails are batched into instanced draws. */
export function Bridges() {
  const { planks, posts, rails, beams } = useMemo(() => {
    const planks: BoxItem[] = []
    const posts: BoxItem[] = []
    const rails: BoxItem[] = []
    const beams: BoxItem[] = []
    for (const b of BRIDGES) {
      const dx = b.b[0] - b.a[0]
      const dz = b.b[1] - b.a[1]
      const len = Math.hypot(dx, dz)
      const yaw = Math.atan2(dx, dz)
      const cx = (b.a[0] + b.b[0]) / 2
      const cz = (b.a[1] + b.b[1]) / 2
      // deck beams (two stringers)
      beams.push({ pos: [cx, b.y - 0.12, cz], size: [b.width, 0.18, len], rotY: yaw, color: '#6b461f' })
      // cross planks
      const n = Math.max(2, Math.floor(len / 0.5))
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const px = b.a[0] + dx * t
        const pz = b.a[1] + dz * t
        planks.push({ pos: [px, b.y, pz], size: [b.width, 0.1, 0.4], rotY: yaw, color: i % 2 ? '#8a5a30' : '#9c6a38' })
      }
      // rail posts + top rail on both sides
      for (const side of [-1, 1]) {
        const ox = Math.cos(yaw) * side * (b.width / 2)
        const oz = -Math.sin(yaw) * side * (b.width / 2)
        const np = Math.max(2, Math.floor(len / 2))
        for (let i = 0; i <= np; i++) {
          const t = i / np
          posts.push({ pos: [b.a[0] + dx * t + ox, b.y + 0.45, b.a[1] + dz * t + oz], size: [0.12, 0.9, 0.12], color: '#5a3d22' })
        }
        rails.push({ pos: [cx + ox, b.y + 0.85, cz + oz], size: [0.08, 0.08, len], rotY: yaw, color: '#6b461f' })
      }
      // support pilings down into the water
      for (let i = 0; i <= 2; i++) {
        const t = i / 2
        posts.push({ pos: [b.a[0] + dx * t, (WATER_LEVEL + b.y) / 2 - 0.3, b.a[1] + dz * t], size: [0.22, b.y + 1.6, 0.22], color: '#4d3320' })
      }
    }
    return { planks, posts, rails, beams }
  }, [])

  return (
    <group>
      <InstancedBoxes items={beams} color="#6b461f" roughness={0.9} castShadow receiveShadow />
      <InstancedBoxes items={planks} roughness={0.9} castShadow receiveShadow />
      <InstancedBoxes items={posts} color="#5a3d22" roughness={0.95} castShadow />
      <InstancedBoxes items={rails} color="#6b461f" roughness={0.9} castShadow />
    </group>
  )
}
