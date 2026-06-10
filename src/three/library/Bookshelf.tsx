import { useMemo } from 'react'
import { groundShelves, SHELF, upperShelves } from './furniture'
import { InstancedBoxes, type BoxItem } from './Instanced'

const WOOD = '#3f2712'
const WOOD_HI = '#52331a'

const BOOK_COLORS = [
  '#7c2f2f', '#2f5c4a', '#34507a', '#8a6d2f', '#5a3a6e',
  '#a15a2a', '#386b6b', '#7a3050', '#506030', '#2f3a5c',
]

const LEVELS = [0.5, 1.55, 2.6, 3.65, 4.7].slice(0, 5)

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function toWorld(lx: number, lz: number, a: number, ox: number, oz: number): [number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [lx * c + lz * s + ox, -lx * s + lz * c + oz]
}

/** Tall bookshelves lining the end walls + window piers, on both floors. Frames
 *  are per-unit; every book across the whole library is one instanced draw. */
export function Bookshelves() {
  const placements = useMemo(() => {
    const ground = groundShelves().map((p, i) => ({ ...p, seed: 200 + i, levels: LEVELS }))
    const upper = upperShelves().map((p, i) => ({ ...p, seed: 900 + i, levels: LEVELS.slice(0, 4) }))
    return [...ground, ...upper]
  }, [])

  const books = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = []
    for (const p of placements) {
      const rand = rng(p.seed)
      for (const level of p.levels) {
        let lx = -SHELF.w / 2 + 0.2
        while (lx < SHELF.w / 2 - 0.2) {
          const bw = 0.1 + rand() * 0.13
          const bh = 0.36 + rand() * 0.5
          const lean = rand() < 0.07
          const [wx, wz] = toWorld(lx + bw / 2, SHELF.d / 2 - 0.18, p.rotY, p.pos[0], p.pos[2])
          items.push({
            pos: [wx, p.pos[1] + level + bh / 2, wz],
            size: [bw, bh, 0.32],
            rotY: p.rotY + (lean ? 0.18 : 0),
            color: BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)],
          })
          lx += bw + 0.015
        }
      }
    }
    return items
  }, [placements])

  return (
    <group>
      {placements.map((p, i) => (
        <group key={i} position={p.pos} rotation={[0, p.rotY, 0]}>
          <mesh position={[0, SHELF.h / 2, -SHELF.d / 2]} castShadow receiveShadow>
            <boxGeometry args={[SHELF.w, SHELF.h, 0.08]} />
            <meshStandardMaterial color={WOOD} roughness={0.9} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[(sx * SHELF.w) / 2, SHELF.h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.1, SHELF.h, SHELF.d]} />
              <meshStandardMaterial color={WOOD_HI} roughness={0.85} />
            </mesh>
          ))}
          {[0, ...p.levels, SHELF.h].map((y, k) => (
            <mesh key={k} position={[0, y - 0.03, 0]} castShadow receiveShadow>
              <boxGeometry args={[SHELF.w, 0.08, SHELF.d]} />
              <meshStandardMaterial color={WOOD_HI} roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
      <InstancedBoxes items={books} roughness={0.6} castShadow />
    </group>
  )
}
