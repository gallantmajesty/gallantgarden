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

/** Tall bookshelves lining the end walls + window piers, on both floors.
 *
 *  PERFORMANCE: previously every shelf rendered ~10 separate meshes (back panel,
 *  two posts and 7 boards), so ~80 shelves cost ~830 draw calls. Now the frames
 *  for the WHOLE library are drawn as TWO instanced meshes (boards/posts +
 *  backs) and every book is a third — three draws total instead of hundreds. */
export function Bookshelves() {
  const placements = useMemo(() => {
    const ground = groundShelves().map((p, i) => ({ ...p, seed: 200 + i, levels: LEVELS }))
    const upper = upperShelves().map((p, i) => ({ ...p, seed: 900 + i, levels: LEVELS.slice(0, 4) }))
    return [...ground, ...upper]
  }, [])

  // every wooden frame part across the hall, collected into one instanced batch
  const frames = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = []
    for (const p of placements) {
      const [ox, , oz] = p.pos
      const y0 = p.pos[1]
      // back panel
      {
        const [wx, wz] = toWorld(0, -SHELF.d / 2, p.rotY, ox, oz)
        items.push({ pos: [wx, y0 + SHELF.h / 2, wz], size: [SHELF.w, SHELF.h, 0.08], rotY: p.rotY, color: WOOD })
      }
      // side posts
      for (const sx of [-1, 1]) {
        const [wx, wz] = toWorld((sx * SHELF.w) / 2, 0, p.rotY, ox, oz)
        items.push({ pos: [wx, y0 + SHELF.h / 2, wz], size: [0.1, SHELF.h, SHELF.d], rotY: p.rotY, color: WOOD_HI })
      }
      // shelf boards (floor, each level, top)
      for (const y of [0, ...p.levels, SHELF.h]) {
        items.push({ pos: [ox, y0 + y - 0.03, oz], size: [SHELF.w, 0.08, SHELF.d], rotY: p.rotY, color: WOOD_HI })
      }
    }
    return items
  }, [placements])

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
      {/* frames cast shadow (big silhouettes) — but as a single instanced draw it
          stays cheap in the shadow pass too */}
      <InstancedBoxes items={frames} roughness={0.88} castShadow receiveShadow />
      {/* books are tiny: skip shadow-casting to keep the shadow pass light */}
      <InstancedBoxes items={books} roughness={0.6} />
    </group>
  )
}
