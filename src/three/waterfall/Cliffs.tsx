import { useMemo } from 'react'
import { BackSide, Color, RepeatWrapping } from 'three'
import { InstancedShape, type ShapeItem } from '../library/Instanced'
import { FALLS, LAKE, VALLEY } from './layout'
import { makeRockTexture } from './textures'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// Natural rock palette: cool greys, warm tans and a few mossy/lichen-tinted stones
// so the cliff face never reads as one flat colour. Picked per instance.
const ROCK_TINTS = ['#8c8478', '#9a9182', '#7c746a', '#a39a88', '#827b6e', '#6f7d5e', '#8a8a72']
function pickTint(rand: () => number, base = new Color()): string {
  base.set(ROCK_TINTS[Math.floor(rand() * ROCK_TINTS.length)])
  const v = 0.85 + rand() * 0.3 // brightness jitter
  base.multiplyScalar(v)
  return '#' + base.getHexString()
}

/** World position on the valley arc at angle `ang`, at radius offset `dr`. */
function onArc(ang: number, dr: number): [number, number] {
  return [VALLEY.cx + Math.sin(ang) * (VALLEY.r + dr), VALLEY.cz + Math.cos(ang) * (VALLEY.r + dr)]
}

// The falls pour through a notch at the north of the arc (ang = π). Chunks skip it.
const NOTCH = Math.atan2(FALLS.width * 0.6, VALLEY.r) // half-angle of the gap

/**
 * The valley that cradles the lake: a curved rock amphitheatre (NOT a flat-walled
 * room) wrapping the north and flanks in a broad arc, open to the south. A smooth
 * leaning rock shell backs it so you never see through to the sky; arc-scattered
 * boulders, a broken crest ridgeline and moss break the silhouette into natural
 * cliff faces. The hero waterfall drops through a notch at the back of the arc,
 * with darker wet rock ringing its plunge pool. Tallest at the back, lower toward
 * the southern opening, so the world feels enclosed but not boxed in.
 */
export function Cliffs({ boulders = 120 }: { boulders?: number }) {
  const rock = useMemo(() => {
    const t = makeRockTexture(8)
    t.wrapS = t.wrapT = RepeatWrapping
    return t
  }, [])
  const rockTall = useMemo(() => {
    const t = makeRockTexture(6, 41)
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(14, 4)
    return t
  }, [])

  // height taper: tall at the back (ang≈π), lower toward the southern opening
  const heightAt = (ang: number) => 0.55 + 0.5 * Math.sin(ang * 0.5)

  // big chunky boulders covering the arc in two depth layers + a broken crest
  // ridgeline, all per-instance tinted with heavy scale/rotation variation.
  const cliffChunks = useMemo<ShapeItem[]>(() => {
    const rand = rng(777)
    const tint = new Color()
    const out: ShapeItem[] = []
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 90; i++) {
        const ang = VALLEY.arcStart + rand() * VALLEY.arcLen
        // skip the falls notch so the water reads as a clean drop through the cliff
        if (Math.abs(ang - Math.PI) < NOTCH && rand() > 0.15) continue
        const dr = (layer === 0 ? 0 : 6) + (rand() - 0.5) * 10
        const [x, z] = onArc(ang, dr)
        const hMax = VALLEY.height * heightAt(ang)
        const y = 1 + rand() * hMax
        const s = 4 + rand() * 10
        // wet/darker stone low and near the falls
        let color = pickTint(rand, tint)
        if (Math.abs(ang - Math.PI) < NOTCH * 2.2 && y < 16 && rand() > 0.4)
          color = '#' + tint.set('#4a5550').multiplyScalar(0.85 + rand() * 0.3).getHexString()
        out.push({
          pos: [x, y, z],
          rot: [(rand() - 0.5) * 0.5, -ang + (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.5],
          scale: [s * (0.8 + rand() * 0.7), s * (1.0 + rand() * 0.9), s * (0.7 + rand() * 0.6)],
          color,
        })
      }
    }
    // broken ridgeline of smaller chunks along the crest to soften the top edge
    for (let i = 0; i < 50; i++) {
      const ang = VALLEY.arcStart + rand() * VALLEY.arcLen
      if (Math.abs(ang - Math.PI) < NOTCH) continue
      const [x, z] = onArc(ang, (rand() - 0.5) * 8)
      const s = 2 + rand() * 5
      out.push({
        pos: [x, VALLEY.height * heightAt(ang) - 2 + rand() * 6, z],
        rot: [(rand() - 0.5) * 0.7, -ang + (rand() - 0.5) * 1.0, (rand() - 0.5) * 0.7],
        scale: [s * (0.9 + rand() * 0.6), s * (0.8 + rand() * 0.7), s * (0.8 + rand() * 0.5)],
        color: pickTint(rand, tint),
      })
    }
    return out
  }, [])

  // smaller scattered slope/shore boulders, each individually tinted
  const slopeRocks = useMemo<ShapeItem[]>(() => {
    const rand = rng(3030)
    const tint = new Color()
    const out: ShapeItem[] = []
    for (let i = 0; i < boulders; i++) {
      const a = rand() * Math.PI * 2
      const rad = LAKE.r + 2 + rand() * 28
      const x = LAKE.cx + Math.cos(a) * rad
      const z = LAKE.cz + Math.sin(a) * rad * 0.9
      const s = 0.5 + rand() * 2.2
      out.push({
        pos: [x, s * 0.4, z],
        rot: [rand() * 0.5, rand() * Math.PI, rand() * 0.5],
        scale: [s * (1 + rand() * 0.6), s * (0.7 + rand() * 0.5), s * (1 + rand() * 0.6)],
        color: pickTint(rand, tint),
      })
    }
    return out
  }, [boulders])

  // green MOSS patches clinging to the lower/flank cliff faces (one cheap draw)
  const mossPatches = useMemo<ShapeItem[]>(() => {
    const rand = rng(5151)
    const tint = new Color()
    const out: ShapeItem[] = []
    for (let i = 0; i < 80; i++) {
      const ang = VALLEY.arcStart + rand() * VALLEY.arcLen
      if (Math.abs(ang - Math.PI) < NOTCH) continue
      const [x, z] = onArc(ang, -3 + rand() * 3)
      const y = 1 + rand() * (VALLEY.height * heightAt(ang) * 0.7)
      const s = 1.2 + rand() * 3
      tint.set(rand() > 0.5 ? '#4d6e3a' : '#5f7d46').multiplyScalar(0.85 + rand() * 0.3)
      out.push({
        pos: [x, y, z],
        rot: [(rand() - 0.5) * 0.4, -ang, (rand() - 0.5) * 0.4],
        scale: [s * (1 + rand() * 0.8), s * 0.45, s * (0.8 + rand() * 0.5)],
        color: '#' + tint.getHexString(),
      })
    }
    return out
  }, [])

  // dark WET rocks ringing the plunge pool where the curtain crashes down
  const wetRocks = useMemo<ShapeItem[]>(() => {
    const rand = rng(9090)
    const out: ShapeItem[] = []
    for (let i = 0; i < 30; i++) {
      const a = -Math.PI * 0.2 + rand() * Math.PI * 1.4 // arc around the north pool
      const rad = FALLS.width * 0.5 + rand() * 7
      const x = FALLS.centerX + Math.cos(a) * rad
      const z = FALLS.poolZ + Math.abs(Math.sin(a)) * 4 - 2
      const s = 0.8 + rand() * 2.2
      out.push({ pos: [x, s * 0.2, z], rot: [rand() * 0.4, rand() * Math.PI, rand() * 0.4], scale: [s * 1.3, s * 0.8, s * 1.2] })
    }
    return out
  }, [])

  return (
    <group>
      {/* smooth leaning rock shell — the solid valley backing (seen from inside, so
          BackSide). Slightly narrower at the top → an enclosing amphitheatre bowl. */}
      <mesh position={[VALLEY.cx, VALLEY.height / 2 - 3, VALLEY.cz]} receiveShadow>
        <cylinderGeometry
          args={[VALLEY.r - 10, VALLEY.r + 4, VALLEY.height + 6, 64, 1, true, VALLEY.arcStart, VALLEY.arcLen]}
        />
        <meshStandardMaterial map={rockTall} color="#8f8678" roughness={1} side={BackSide} />
      </mesh>

      {/* a short solid backing right behind the falls notch so you never see sky
          through the gap where the water pours */}
      <mesh position={[FALLS.centerX, VALLEY.height / 2 - 3, VALLEY.cz + Math.cos(Math.PI) * (VALLEY.r - 2)]} receiveShadow>
        <boxGeometry args={[FALLS.width + 14, VALLEY.height, 6]} />
        <meshStandardMaterial map={rockTall} color="#857c6f" roughness={1} />
      </mesh>

      {/* stepped ledges flanking the falls for the side cascades to break over */}
      {[
        { y: 32, x: -FALLS.width * 0.55 },
        { y: 20, x: FALLS.width * 0.6 },
        { y: 12, x: -FALLS.width * 0.35 },
      ].map((l, i) => (
        <mesh key={i} position={[FALLS.centerX + l.x, l.y, FALLS.wallZ + 5]} rotation={[0.12, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[12, 2.2, 6]} />
          <meshStandardMaterial map={rock} color="#8a8274" roughness={1} />
        </mesh>
      ))}

      {/* base colour white so per-instance tints render true (not multiplied dark) */}
      <InstancedShape items={cliffChunks} map={rock} color="#ffffff" roughness={1} flatShading castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
      </InstancedShape>

      <InstancedShape items={slopeRocks} map={rock} color="#ffffff" roughness={1} flatShading castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
      </InstancedShape>

      {/* moss clinging to the cliff face */}
      <InstancedShape items={mossPatches} color="#ffffff" roughness={1} flatShading receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
      </InstancedShape>

      {/* wet rocks: darker + a touch of specular sheen from the spray */}
      <InstancedShape items={wetRocks} color="#3f4843" roughness={0.32} metalness={0.05} flatShading castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
      </InstancedShape>
    </group>
  )
}
