import { useMemo } from 'react'
import { groundShelves, SHELF, upperShelves } from './furniture'
import { InstancedBoxes, type BoxItem } from './Instanced'

const WOOD = '#3f2712'
const WOOD_HI = '#52331a'

const BOOK_COLORS = [
  '#7c2f2f', '#2f5c4a', '#34507a', '#8a6d2f', '#5a3a6e',
  '#a15a2a', '#386b6b', '#7a3050', '#506030', '#2f3a5c',
  '#9c3b3b', '#274d6b', '#caa84a', '#3f7a55', '#6b3a7a',
]

/** Apply a small brightness jitter to a hex colour so no two books on a shelf
 *  look mechanically identical — the core of a "real library" shelf read. */
function jitter(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const f = 1 + (amt - 0.5) * 0.5
  r = Math.max(0, Math.min(255, Math.round(r * f)))
  g = Math.max(0, Math.min(255, Math.round(g * f)))
  b = Math.max(0, Math.min(255, Math.round(b * f)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

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

  const { books, bookFoils } = useMemo<{ books: BoxItem[]; bookFoils: BoxItem[] }>(() => {
    const items: BoxItem[] = []
    const foils: BoxItem[] = []
    for (const p of placements) {
      const rand = rng(p.seed)
      for (const level of p.levels) {
        let lx = -SHELF.w / 2 + 0.2
        while (lx < SHELF.w / 2 - 0.2) {
          const bw = 0.1 + rand() * 0.13
          // PERF: skip ~1 in 3 book slots (~30% fewer books per shelf). Reads as
          // a lightly used shelf instead of a mechanical line, and cuts the
          // biggest instanced-draw instance count in the hall.
          if (rand() < 0.3) {
            lx += bw + 0.07
            continue
          }
          const bh = 0.36 + rand() * 0.5
          const lean = rand() < 0.12
          const baseColor = BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)]
          const [wx, wz] = toWorld(lx + bw / 2, SHELF.d / 2 - 0.18, p.rotY, p.pos[0], p.pos[2])
          const rotY = p.rotY + (lean ? 0.18 : 0)
          items.push({
            pos: [wx, p.pos[1] + level + bh / 2, wz],
            size: [bw, bh, 0.32],
            rotY,
            color: jitter(baseColor, rand()),
          })
          // gold foil title band on ~45% of books — a thin strip near the top
          // of the spine, nudged outward so it sits on the visible face.
          if (rand() < 0.45) {
            const [fx, fz] = toWorld(lx + bw / 2, SHELF.d / 2 - 0.1, p.rotY, p.pos[0], p.pos[2])
            foils.push({
              pos: [fx, p.pos[1] + level + bh - 0.06, fz],
              size: [bw * 0.82, 0.05, 0.34],
              rotY,
              color: rand() < 0.5 ? '#caa84a' : '#e7c45f',
            })
          }
          lx += bw + 0.015
        }
      }
    }
    return { books: items, bookFoils: foils }
  }, [placements])

  return (
    <group>
      {/* frames cast shadow (big silhouettes) — but as a single instanced draw it
           stays cheap in the shadow pass too */}
      <InstancedBoxes items={frames} roughness={0.88} castShadow receiveShadow />
      {/* books are tiny: skip shadow-casting to keep the shadow pass light */}
      <InstancedBoxes items={books} roughness={0.6} />
      {/* gold foil title bands — a touch of metallic sheen on the spines */}
      <InstancedBoxes items={bookFoils} roughness={0.35} metalness={0.7} />
    </group>
  )
}
