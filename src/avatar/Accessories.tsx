// @ts-nocheck
// 3D accessory props for the avatar's desk / the studio dining table. Each
// AccessoryModel is a small, detailed procedural object (no GLB assets) that
// reads as a real item. BigDiningTable is the circular studio table used in the
// Avatar Creator's Accessories step — the single chosen accessory sits on top.
// AccessoryTray is the little desk that travels with the avatar (library hall).
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, Text } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector3,
  type WebGLRenderer,
} from 'three'
import {
  type Color,
  boxGeo,
  capsuleGeo,
  circleGeo,
  cylinderGeo,
  domeGeo,
  glowMaterial,
  latheGeo,
  sphereGeo,
  taperGeo,
  torusGeo,
  sharedMaterial,
  texturedMaterial,
} from './config'
import { leatherBoard, foreEdge, brushedGold, pageTex, paperFibre, marbledPaper, headBand, oakWood, dustDecals } from './bookTextures'
import { ACCESSORIES, type AccessoryId } from './config'
import { appleBackLogoTex, phoneHomeScreenTex, sandGrainTex } from './logoTextures'
import { usePomodoro } from '../store/pomodoro'

const m = (hex: string, rough = 0.6, metal = 0) => sharedMaterial(hex, rough, metal)

// Brushed-aluminum finish: MeshPhysicalMaterial + clearcoat so the laptop lid,
// palm rest and unibody read as anodized metal instead of flat plastic.
// Cached so every laptop instance shares one material.
const physMatCache = new Map<string, MeshPhysicalMaterial>()
function pm(hex: string, rough = 0.3, metal = 0.9, clearcoat = 1): MeshPhysicalMaterial {
  const key = `pm|${hex}|${rough}|${metal}|${clearcoat}`
  let mat = physMatCache.get(key)
  if (!mat) {
    mat = new MeshPhysicalMaterial({
      color: hex,
      roughness: rough,
      metalness: metal,
      clearcoat,
      clearcoatRoughness: 0.35,
    })
    physMatCache.set(key, mat)
  }
  return mat
}

// Soft glass glare streaks for the laptop screen — one shared translucent white.
const screenGlareMat = new MeshPhysicalMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.06,
  roughness: 0.05,
  metalness: 0,
  depthWrite: false,
})

/** Rounded-rect slab (chamfered lid / deck edges) — extruded in Z, centred. */
function roundedBoxGeo(w: number, h: number, d: number, r: number): BufferGeometry {
  const key = `rb|${w}|${h}|${d}|${r}`
  return cachedCustomGeo(key, () => {
    const s = new Shape()
    const x = w / 2
    const y = h / 2
    s.moveTo(-x + r, -y)
    s.lineTo(x - r, -y)
    s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false)
    s.lineTo(x, y - r)
    s.absarc(x - r, y - r, r, 0, Math.PI / 2, false)
    s.lineTo(-x + r, y)
    s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false)
    s.lineTo(-x, -y + r)
    s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false)
    const geo = new ExtrudeGeometry(s, {
      depth: d,
      bevelEnabled: true,
      bevelThickness: r * 0.5,
      bevelSize: r * 0.8,
      bevelSegments: 3,
    })
    geo.center()
    return geo
  })
}

// ── Open-book geometry helpers ────────────────────────────────────────────────
// A lofted slab: top and bottom surfaces are arbitrary functions of grid
// coordinates (u: 0→1 across width, v: 0→1 across depth) so a board can be
// slightly warped and rounded. The four side walls close the solid. UVs put the
// face textures on top/bottom; the side walls sample a thin band so the leather
// grain reads as continuous around the edge.
function slabGeo(
  w: number,
  d: number,
  nx: number,
  nz: number,
  top: (u: number, v: number) => number,
  bottom: (u: number, v: number) => number,
  opts?: { uvTop?: (u: number, v: number) => [number, number]; uvSide?: (s: number, f: number) => [number, number]; baseX?: number; baseZ?: number; baseY?: number },
): BufferGeometry {
  const bx = opts?.baseX ?? 0
  const bz = opts?.baseZ ?? 0
  const by = opts?.baseY ?? 0
  const uvT = opts?.uvTop ?? ((u, _v) => [u, _v])
  const uvS = opts?.uvSide ?? ((s, f) => [s, f])
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const topY = (u: number, v: number) => by + top(u, v)
  const botY = (u: number, v: number) => by + bottom(u, v)
  for (let j = 0; j <= nz; j++) {
    const v = j / nz
    const z = bz + (v - 0.5) * d
    for (let i = 0; i <= nx; i++) {
      const u = i / nx
      const x = bx + (u - 0.5) * w
      const [tu, tv] = uvT(u, v)
      pos.push(x, topY(u, v), z)
      uv.push(tu, tv)
    }
  }
  for (let j = 0; j <= nz; j++) {
    const v = j / nz
    const z = bz + (v - 0.5) * d
    for (let i = 0; i <= nx; i++) {
      const u = i / nx
      const x = bx + (u - 0.5) * w
      const [tu, tv] = uvT(u, v)
      pos.push(x, botY(u, v), z)
      uv.push(tu, tv)
    }
  }
  const topCount = (nx + 1) * (nz + 1)
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i
      const b = a + 1
      const c = a + (nx + 1)
      const e = c + 1
      idx.push(a, c, b, b, c, e)
    }
  }
  const botOff = topCount
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = botOff + j * (nx + 1) + i
      const b = a + 1
      const c = a + (nx + 1)
      const e = c + 1
      idx.push(a, b, c, b, e, c)
    }
  }
  // side walls
  const pushSide = (line: Array<[number, number, number]>, sUv: (t: number) => [number, number]) => {
    const start = pos.length / 3
    for (let t = 0; t <= line.length - 1; t++) {
      const [x, y, z] = line[t]
      const [su, sv] = sUv(t / (line.length - 1))
      pos.push(x, y, z)
      uv.push(su, sv)
    }
    for (let t = 0; t < line.length - 1; t++) {
      const a = start + t
      idx.push(a, a + 1, a + (line.length), a + 1, a + (line.length) + 1, a + (line.length))
    }
  }
  // front (v=0) and back (v=1) edges run along u
  for (const [v, dir] of [[0, 1], [1, -1]] as Array<[number, number]>) {
    const z = bz + (v - 0.5) * d
    const line: Array<[number, number, number]> = []
    for (let i = 0; i <= nx; i++) {
      const u = i / nx
      const x = bx + (u - 0.5) * w
      line.push([x, topY(u, v), z])
    }
    for (let i = nx; i >= 0; i--) {
      const u = i / nx
      const x = bx + (u - 0.5) * w
      line.push([x, botY(u, v), z])
    }
    pushSide(line, (t) => uvS(t, v))
    void dir
  }
  // left (u=0) and right (u=1) edges run along v
  for (const [u, dir] of [[0, 1], [1, -1]] as Array<[number, number]>) {
    const x = bx + (u - 0.5) * w
    const line: Array<[number, number, number]> = []
    for (let j = 0; j <= nz; j++) {
      const v = j / nz
      const z = bz + (v - 0.5) * d
      line.push([x, topY(u, v), z])
    }
    for (let j = nz; j >= 0; j--) {
      const v = j / nz
      const z = bz + (v - 0.5) * d
      line.push([x, botY(u, v), z])
    }
    pushSide(line, (t) => uvS(t, u))
    void dir
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// A flat ribbon (bookmark) following a 3D path with a given width, built as a
// triangle strip with both faces so it reads from any angle.
function ribbonGeo(path: Vector3[], width: number): BufferGeometry {
  const curve = new CatmullRomCurve3(path)
  const N = 40
  const pts = curve.getPoints(N)
  const tan: Vector3[] = []
  for (let i = 0; i <= N; i++) {
    const t = Math.min(1, i / N)
    tan.push(curve.getTangentAt(t).normalize())
  }
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const up = new Vector3(0, 1, 0)
  for (let i = 0; i <= N; i++) {
    const t = tan[i]
    const n = new Vector3().crossVectors(t, up).normalize()
    const p = pts[i]
    const w = width * (1 - 0.25 * (i / N))
    pos.push(p.x - n.x * w, p.y - n.y * w, p.z - n.z * w)
    pos.push(p.x + n.x * w, p.y + n.y * w, p.z + n.z * w)
    uv.push(0, i / N, 1, i / N)
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// Warm, tactile material: procedural texture (wood/ceramic/leather/paper) tinted
// by a coffee-toned hex so everything reads as a real, cozy study object.
const tm = (
  hex: string,
  rough = 0.85,
  metal = 0,
  kind: 'wood' | 'ceramic' | 'leather' | 'paper' = 'wood',
  rx = 1,
  ry = 1,
) => texturedMaterial(hex, kind, rough, metal, rx, ry)

// ── Procedural laptop-realism helpers ─────────────────────────────────────
// Cached CanvasTextures + materials so the gaming laptop reads as machined
// metal instead of flat grey: brushed-anodized grain, fingerprint smudges,
// sculpted keycap dishes, RGB light bleed falloff, and screen-glass scratches.

const laptopTexCache = new Map<string, CanvasTexture>()

function laptopCanvasTexture(
  key: string,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 256,
  h = 256,
): CanvasTexture {
  let t = laptopTexCache.get(key)
  if (t) return t
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx, w, h)
  t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  laptopTexCache.set(key, t)
  return t
}

/** Brushed-anodized metal: fine horizontal grain + faint fingerprint smudges. */
function brushedMetalTex(): CanvasTexture {
  return laptopCanvasTexture('laptop-brush', (ctx, w, h) => {
    ctx.fillStyle = '#7d7d7d'
    ctx.fillRect(0, 0, w, h)
    // fine horizontal brush lines (anodized aluminium)
    for (let i = 0; i < 420; i++) {
      const y = Math.random() * h
      const tone = Math.random() > 0.5 ? 235 : 70
      ctx.fillStyle = `rgba(${tone},${tone},${tone},${0.05 + Math.random() * 0.07})`
      ctx.fillRect(0, y, w, 0.6 + Math.random() * 1.2)
    }
    // long thin scratches
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.1})`
      ctx.lineWidth = 0.5 + Math.random()
      ctx.beginPath()
      const y = Math.random() * h
      ctx.moveTo(Math.random() * w * 0.2, y)
      ctx.lineTo(Math.random() * w * 0.3 + w * 0.7, y + (Math.random() - 0.5) * 8)
      ctx.stroke()
    }
    // faint fingerprint smudges
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const r = 24 + Math.random() * 34
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(180,180,190,0.05)')
      g.addColorStop(1, 'rgba(180,180,190,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
  })
}

/** Radial dish shading for keycaps — lighter centre, darker rim (concave top). */
function keycapDishTex(): CanvasTexture {
  return laptopCanvasTexture('keycap-dish', (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.05, w / 2, h / 2, w * 0.62)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.18)')
    g.addColorStop(1, 'rgba(0,0,0,0.42)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
}

/** Soft radial glow falloff for additive light-bleed planes. */
function glowFalloffTex(): CanvasTexture {
  return laptopCanvasTexture('glow-falloff', (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.02, w / 2, h / 2, w * 0.5)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
}

/** Fine micro-scratches for the screen-glass roughness map. */
function scratchRoughnessTex(): CanvasTexture {
  return laptopCanvasTexture('screen-scratches', (ctx, w, h) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? 0 : 255},255,255,${0.25 + Math.random() * 0.5})`
      ctx.lineWidth = 0.4 + Math.random() * 0.8
      ctx.beginPath()
      const y = Math.random() * h
      ctx.moveTo(0, y)
      ctx.lineTo(w, y + (Math.random() - 0.5) * 6)
      ctx.stroke()
    }
  })
}

const laptopMatCache = new Map<string, any>()

// Screen-curvature vignette - radial darkening toward the panel corners so
// the glass reads as slightly curved instead of a flat decal.
function screenVignetteTex(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 48, 128, 128, 185)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.7, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.62)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function laptopMaterial(key: string, make: () => any): any {
  let mat = laptopMatCache.get(key)
  if (!mat) {
    mat = make()
    laptopMatCache.set(key, mat)
  }
  return mat
}

/** Brushed-anodized metal material (gaming chassis). */
function brushedMetalMaterial(hex: string, rough: number, metal: number, rx: number, ry: number) {
  return laptopMaterial(`brush:${hex}:${rough}:${metal}:${rx}:${ry}`, () => {
    // Clone the shared grain texture per material so each chassis part keeps
    // its own repeat — mutating the cached texture would clobber all parts.
    const t = brushedMetalTex().clone()
    t.needsUpdate = true
    t.repeat.set(rx, ry)
    return new MeshStandardMaterial({ color: hex, map: t, roughness: rough, metalness: metal })
  })
}

/** Additive light-bleed material with soft radial falloff. */
function additiveGlow(hex: string, opacity: number) {
  return laptopMaterial(`add:${hex}:${opacity}`, () =>
    new MeshBasicMaterial({
      color: hex,
      map: glowFalloffTex(),
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  )
}

// Warm "coffee glow" palette — replaces the old rainbow RGB so the gaming laptop
// reads as a cozy amber-lit machine rather than a sci-fi neon slab.
const WARM_GLOW = ['#7a4a2b', '#a06a3a', '#c9924a', '#e0b878', '#9a6a3f', '#5b3a22']

function makeRgbGamingPalette() {
  const idx = Math.floor(Date.now() / 1000) % WARM_GLOW.length
  const base = WARM_GLOW[idx]
  const compliment = WARM_GLOW[(idx + 3) % WARM_GLOW.length]
  return {
    base,
    compliment,
    glowSoft: m(base, 0.5, 0.1),
    glowMid: m(base, 0.4, 0.2),
    glowHard: m(base, 0.35, 0.2),
    glowUltra: m(base, 0.3, 0.15),
    complimentGlowSoft: m(compliment, 0.5, 0.1),
    complimentGlowMid: m(compliment, 0.4, 0.2),
    rgb: WARM_GLOW,
  }
}

// Cached custom geometry for the curved accessory parts (headbands, arcs, tubes)
// that don't map onto the shared box/taper/lathe primitives. Built once, reused
// across every avatar so the accessory layer stays allocation-free.
const customGeoCache = new Map<string, BufferGeometry>()

function cachedCustomGeo(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = customGeoCache.get(key)
  if (!g) {
    g = make()
    customGeoCache.set(key, g)
  }
  return g
}

/** Top half of a ring in the XY plane (arc from angle 0..PI), radius `r`, tube `t`.
 *  Used for headphone headbands — ends sit at (∓r, 0) so cups mount cleanly. */
function arcBandGeo(r: number, t: number): BufferGeometry {
  const key = `arc:${r}:${t}`
  return cachedCustomGeo(key, () => {
    const seg = 24
    const pts: Vector3[] = []
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI
      pts.push(new Vector3(Math.cos(a) * r, Math.sin(a) * r, 0))
    }
    return new TubeGeometry(new CatmullRomCurve3(pts), seg, t, 12, false)
  })
}

/** Curved plant stem — a smooth tube through `pts` with radius `r`. Each stem
 *  bakes its own curve, so every branch leans its own natural way. */
function stemGeo(pts: [number, number, number][], r: number): BufferGeometry {
  const key = `stem:${r}:${pts.map((p) => p.join(',')).join(';')}`
  return cachedCustomGeo(key, () => {
    const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)))
    return new TubeGeometry(curve, 18, r, 8, false)
  })
}

/** Flat teardrop leaf in the XY plane — stem end at -X, pointed tip at +X.
 *  Doubles as the daisy petal outline. */
function leafGeo(len: number, wd: number): BufferGeometry {
  const key = `leaf:${len.toFixed(3)}:${wd.toFixed(3)}`
  return cachedCustomGeo(key, () => {
    const s = new Shape()
    const h = len / 2
    s.moveTo(-h, 0)
    s.bezierCurveTo(-h * 0.45, wd * 0.55, -h * 0.1, wd * 0.55, h * 0.45, wd * 0.28)
    s.bezierCurveTo(h * 0.8, wd * 0.12, h * 0.95, wd * 0.04, h, 0)
    s.bezierCurveTo(h * 0.95, -wd * 0.04, h * 0.8, -wd * 0.12, h * 0.45, -wd * 0.28)
    s.bezierCurveTo(-h * 0.1, -wd * 0.55, -h * 0.45, -wd * 0.55, -h, 0)
    return new ShapeGeometry(s, 12)
  })
}

// Double-sided material cache — flat leaves need to stay visible from both
// sides when they rotate away from the camera (sharedMaterial culls backs).
const dsMatCache = new Map<string, MeshStandardMaterial>()

function dsMat(hex: string, rough = 0.55): MeshStandardMaterial {
  const key = `ds:${hex}:${rough}`
  let mm = dsMatCache.get(key)
  if (!mm) {
    mm = new MeshStandardMaterial({ color: hex, roughness: rough, side: DoubleSide })
    dsMatCache.set(key, mm)
  }
  return mm
}

function BalloonProp() {
  const ref = useRef<any>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = 0.25 + Math.sin(t * 2) * 0.06
    ref.current.rotation.z = Math.sin(t * 1.5) * 0.12
    ref.current.rotation.x = Math.cos(t * 1.2) * 0.08
  })
  return (
    <group ref={ref}>
      {/* String */}
      <mesh geometry={boxGeo(0.003, 0.35, 0.003)} material={m('#cccccc', 0.8)} position={[0, 0.17, 0]} />
      {/* Balloon sphere */}
      <mesh geometry={sphereGeo(0.12)} material={m('#e85d75', 0.4, 0.2)} position={[0, 0.38, 0]} scale={[1, 1.25, 1]} />
      {/* Knot */}
      <mesh geometry={sphereGeo(0.018)} material={m('#c73e54', 0.5)} position={[0, 0.27, 0]} />
    </group>
  )
}

/* ================================================ POTTED PLANT ================================================ */

// Dew drops — a single shared translucent droplet material for the leaves.
const dropletMat = new MeshPhysicalMaterial({
  color: '#cfeaff',
  roughness: 0.05,
  metalness: 0,
  transparent: true,
  opacity: 0.5,
})

/** One leaf: positioned at `pos`, fanned out by azimuth `az` (radians around the
 *  pot), then drooped by `droop` (0 = flat, 1.57 = hanging straight down, negative
 *  = pointing up) with an optional sideways `tilt`. Colours come from `mat`. */
function Leaf({
  pos,
  az,
  droop = 1.25,
  tilt = 0,
  len = 0.07,
  wd = 0.032,
  mat,
}: {
  pos: [number, number, number]
  az: number
  droop?: number
  tilt?: number
  len?: number
  wd?: number
  mat: MeshStandardMaterial
}) {
  return (
    <group position={pos} rotation={[0, az, 0]}>
      <group rotation={[tilt, 0, -droop]}>
        <mesh geometry={leafGeo(len, wd)} material={mat} castShadow />
        <mesh geometry={boxGeo(len * 0.09, wd * 0.16, 0.0016)} material={m('#274d2c', 0.6)} position={[0, 0, 0.001]} />
      </group>
    </group>
  )
}

/** The plant's whole green mass — 6 curved stems with 20+ leaves in three green
 *  shades, a daisy bloom, dew drops and a ladybug. The group gently sways on a
 *  slow breeze so the plant reads alive, not posed. */
function PlantFoliage() {
  const ref = useRef<any>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.rotation.z = Math.sin(t * 0.5) * 0.018
    ref.current.rotation.x = Math.cos(t * 0.42) * 0.012
  })

  const stemM = m('#4d6b34', 0.7)
  const stemDark = m('#3f5a2b', 0.72)
  const leafDark = dsMat('#2f6f3b', 0.55)
  const leafMid = dsMat('#41894a', 0.5)
  const leafLight = dsMat('#5cb25c', 0.45)
  const leafShades = [leafDark, leafMid, leafLight]
  const petalWhite = dsMat('#f6eef0', 0.4)
  const petalPink = dsMat('#eba3b9', 0.4)
  const core = m('#e8b94a', 0.45)
  const calyx = m('#3f7d45', 0.55)
  const ladyM = m('#d9302c', 0.45)
  const ladyHead = m('#14151a', 0.6)

  const stems: { pts: [number, number, number][]; r: number }[] = [
    // center — tallest, gentle S-curve
    { pts: [[0, 0.13, 0], [0.01, 0.22, 0.006], [0.005, 0.3, 0.01], [-0.008, 0.37, 0.004], [0, 0.43, 0]], r: 0.0045 },
    // lean left + back
    { pts: [[0, 0.13, 0], [-0.035, 0.2, 0.012], [-0.07, 0.27, 0.006], [-0.1, 0.33, -0.005]], r: 0.004 },
    // lean right + back
    { pts: [[0, 0.13, 0], [0.035, 0.19, -0.012], [0.07, 0.26, -0.01], [0.1, 0.32, 0]], r: 0.004 },
    // front-left, short
    { pts: [[0, 0.13, 0], [-0.02, 0.17, 0.028], [-0.045, 0.2, 0.045], [-0.065, 0.23, 0.05]], r: 0.0036 },
    // front-right, short
    { pts: [[0, 0.13, 0], [0.02, 0.17, 0.03], [0.05, 0.2, 0.05], [0.07, 0.235, 0.045]], r: 0.0036 },
    // back — carries the flower
    { pts: [[0, 0.13, 0], [0.005, 0.24, -0.012], [0, 0.31, -0.018], [0.01, 0.37, -0.01], [0, 0.42, 0]], r: 0.0038 },
  ]

  const leaves: { pos: [number, number, number]; az: number; droop: number; len: number; wd: number; c: number }[] = [
    // center stem
    { pos: [0, 0.3, 0.012], az: 0.85, droop: 1.25, len: 0.07, wd: 0.032, c: 0 },
    { pos: [0, 0.3, 0.012], az: -0.85, droop: 1.25, len: 0.062, wd: 0.029, c: 1 },
    { pos: [0.004, 0.37, 0.005], az: 0.35, droop: 1.15, len: 0.056, wd: 0.027, c: 2 },
    { pos: [-0.004, 0.37, 0.005], az: -0.35, droop: 1.15, len: 0.05, wd: 0.025, c: 0 },
    { pos: [0, 0.43, 0], az: 0, droop: -0.75, len: 0.065, wd: 0.03, c: 1 },
    // left lean
    { pos: [-0.05, 0.25, 0.009], az: -1.6, droop: 1.3, len: 0.06, wd: 0.029, c: 1 },
    { pos: [-0.09, 0.31, -0.004], az: -2.2, droop: 1.2, len: 0.052, wd: 0.026, c: 0 },
    { pos: [-0.03, 0.19, 0.01], az: -0.9, droop: 1.45, len: 0.055, wd: 0.027, c: 2 },
    // right lean
    { pos: [0.05, 0.24, -0.01], az: 1.6, droop: 1.3, len: 0.06, wd: 0.029, c: 2 },
    { pos: [0.09, 0.3, 0.002], az: 2.2, droop: 1.2, len: 0.052, wd: 0.026, c: 1 },
    { pos: [0.03, 0.185, -0.01], az: 0.9, droop: 1.45, len: 0.055, wd: 0.027, c: 0 },
    // front-left
    { pos: [-0.035, 0.2, 0.038], az: -0.5, droop: 1.35, len: 0.05, wd: 0.025, c: 1 },
    { pos: [-0.06, 0.225, 0.048], az: -1.1, droop: 1.3, len: 0.045, wd: 0.023, c: 0 },
    // front-right
    { pos: [0.04, 0.195, 0.042], az: 0.5, droop: 1.35, len: 0.05, wd: 0.025, c: 2 },
    { pos: [0.062, 0.225, 0.04], az: 1.1, droop: 1.3, len: 0.045, wd: 0.023, c: 0 },
    // flower stem
    { pos: [0.005, 0.28, -0.014], az: 2.9, droop: 1.2, len: 0.05, wd: 0.025, c: 1 },
    { pos: [0.008, 0.34, -0.011], az: 3.3, droop: 1.1, len: 0.045, wd: 0.023, c: 2 },
    // basal leaves spilling over the rim
    { pos: [0.045, 0.148, 0.04], az: 0.75, droop: 1.7, len: 0.055, wd: 0.027, c: 2 },
    { pos: [-0.045, 0.148, 0.035], az: -0.75, droop: 1.7, len: 0.05, wd: 0.025, c: 1 },
    { pos: [0.04, 0.148, -0.045], az: 2.3, droop: 1.7, len: 0.05, wd: 0.025, c: 0 },
    { pos: [-0.04, 0.148, -0.04], az: -2.3, droop: 1.7, len: 0.045, wd: 0.023, c: 2 },
  ]

  return (
    <group ref={ref}>
      {stems.map((s, i) => (
        <mesh key={`st${i}`} geometry={stemGeo(s.pts, s.r)} material={i % 2 ? stemDark : stemM} castShadow />
      ))}
      {leaves.map((l, i) => (
        <Leaf key={`lf${i}`} pos={l.pos} az={l.az} droop={l.droop} len={l.len} wd={l.wd} mat={leafShades[l.c]} />
      ))}

      {/* daisy bloom on the back stem */}
      <group position={[0, 0.42, 0]} rotation={[0.1, 0, -0.35]}>
        <mesh geometry={sphereGeo(0.008)} material={calyx} position={[0, -0.008, 0]} />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2
          return (
            <mesh
              key={`pt${i}`}
              geometry={sphereGeo(1)}
              material={i % 2 ? petalPink : petalWhite}
              scale={[0.01, 0.024, 0.014]}
              position={[Math.sin(a) * 0.02, Math.cos(a) * 0.02, 0]}
              rotation={[0, 0, a]}
            />
          )
        })}
        <mesh geometry={sphereGeo(0.009)} material={core} position={[0, 0.002, 0]} />
      </group>

      {/* dew drops caught on the leaves */}
      <mesh geometry={sphereGeo(0.0032)} material={dropletMat} position={[0.012, 0.315, 0.012]} />
      <mesh geometry={sphereGeo(0.0026)} material={dropletMat} position={[0.05, 0.24, -0.012]} />
      <mesh geometry={sphereGeo(0.0022)} material={dropletMat} position={[-0.085, 0.305, -0.004]} />

      {/* a tiny ladybug resting on a leaf */}
      <group position={[-0.045, 0.21, 0.045]} rotation={[0.4, 0, 0]}>
        <mesh geometry={sphereGeo(0.0055)} material={ladyM} scale={[1, 0.75, 1.2]} />
        <mesh geometry={sphereGeo(0.0028)} material={ladyHead} position={[0.0025, 0, 0.004]} />
      </group>
    </group>
  )
}

// ── Trading-terminal screen UI (shared by trading_laptop + trading_desktop_3side) ──
// TradingView-style: dark OLED panels, thin dense candlesticks with full wicks,
// price axis on the RIGHT, time axis on the bottom, small flat volume bars,
// one thin amber MA, BUY/SELL buttons and a thin-line order book. Screen pixels
// are emissive so the panels read as lit displays. Green = up / red = down.
const TRD_C = {
  body: '#1a1e2e',
  deck: '#161a28',
  metal: '#2a2f3f',
  key: '#1c1f26',
  backlight: '#4a5568',
  up: '#26a69a',
  down: '#ef5350',
  ma: '#f0b90b',
  text: '#d1d4dc',
  dim: '#787b86',
  grid: '#232733',
  bg: '#0d1117',
  panel: '#1b1f2b',
}
const TRD_UP = glowMaterial(TRD_C.up, 1.2)
const TRD_DOWN = glowMaterial(TRD_C.down, 1.2)
const TRD_MA = glowMaterial(TRD_C.ma, 1.1)
const TRD_GRID = m(TRD_C.grid, 0.6)
const TRD_PANEL = m(TRD_C.panel, 0.7)
const TRD_ASK_FILL = glowMaterial(TRD_C.down, 0.3)
const TRD_BID_FILL = glowMaterial(TRD_C.up, 0.3)
const TRD_SCREEN = glowMaterial(TRD_C.bg, 0.6)
const TRD_BODY = m(TRD_C.body, 0.35, 0.65)
const TRD_DECK = m(TRD_C.deck, 0.4, 0.6)
const TRD_METAL = m(TRD_C.metal, 0.4, 0.6)
const TRD_KEY = m(TRD_C.key, 0.55, 0.35)
const TRD_BACKLIGHT = glowMaterial('#8a93a8', 0.7)

// Deterministic candle series (seeded, stable across renders):
// [open, close, high, low, volume] all in 0..1 units.
function trdSeries(seed: number, n: number, drift: number, vol: number): number[][] {
  let s = seed >>> 0
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  const out: number[][] = []
  let p = 0.5
  for (let i = 0; i < n; i++) {
    const o = p
    const c = Math.min(0.92, Math.max(0.08, p + (rnd() - 0.44) * drift))
    out.push([o, c, Math.max(o, c) + rnd() * vol, Math.min(o, c) - rnd() * vol, rnd()])
    p = c
  }
  return out
}
const TRD_MAIN = trdSeries(42, 34, 0.055, 0.028)
const TRD_DENSE = trdSeries(7, 96, 0.045, 0.016)

const trdFmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const trdPrice = (f: number) => Math.round(41800 + f * 360)

/** Primary screen: TradingView-style chart — header bar with timeframes and
 *  BUY/SELL, thin dense candlesticks with full wicks, right price axis, bottom
 *  time axis, flat volume, one thin amber MA and a thin-line order book strip
 *  on the right side. */
function TradingChartUI({ cx = 0, cy = 0.16, w = 0.41, h = 0.25, depth = 0.012 }: { cx?: number; cy?: number; w?: number; h?: number; depth?: number }) {
  const k = Math.max(w / 0.41, 0.85)
  const fs = 0.0045 * k
  const L = cx - w / 2
  const R = cx + w / 2
  const top = cy + h / 2
  const bottom = cy - h / 2
  const headerY = top - 0.0125
  const chartL = L + 0.012
  const chartR = R - w * 0.315 + 0.004
  const bookL = chartR + 0.009
  const bookR = R - 0.008
  const chartT = top - 0.028
  const chartB = bottom + 0.028
  const minL = Math.min(...TRD_MAIN.map((d) => d[3]))
  const maxH = Math.max(...TRD_MAIN.map((d) => d[2]))
  const span = maxH - minL || 1
  const y = (v: number) => chartB + ((v - minL) / span) * (chartT - chartB)
  const pts = TRD_MAIN.map((d) => ({ o: y(d[0]), c: y(d[1]), h: y(d[2]), l: y(d[3]), v: d[4] }))
  const midY = (chartB + chartT) / 2
  const stepX = (chartR - chartL - 0.008) / (pts.length - 1)
  const maPts: [number, number][] = []
  for (let i = 4; i < pts.length; i++) {
    const avg = (pts[i].c + pts[i - 1].c + pts[i - 2].c + pts[i - 3].c + pts[i - 4].c) / 5
    maPts.push([chartL + (i - 2) * stepX, avg])
  }
  const base = trdPrice((midY - chartB) / (chartT - chartB))
  return (
    <group>
      {/* header band */}
      <mesh geometry={boxGeo(w - 0.02, 0.016, 0.001)} material={TRD_PANEL} position={[cx, headerY, depth]} />
      <Text fontSize={0.0052 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.01, headerY, depth + 0.002]}>
        BTC/USDT
      </Text>
      <Text fontSize={0.0042 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.062, headerY, depth + 0.002]}>
        1m 5m
      </Text>
      <Text fontSize={0.0042 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.092, headerY, depth + 0.002]}>
        15m
      </Text>
      <Text fontSize={0.0042 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.118, headerY, depth + 0.002]}>
        1H 4H 1D
      </Text>
      {/* BUY / SELL buttons */}
      <mesh geometry={boxGeo(0.032, 0.013, 0.001)} material={TRD_UP} position={[R - 0.026, headerY, depth]} />
      <Text fontSize={0.0038 * k} color="#ffffff" anchorX="center" anchorY="middle" position={[R - 0.026, headerY, depth + 0.002]}>
        BUY
      </Text>
      <mesh geometry={boxGeo(0.032, 0.013, 0.001)} material={TRD_DOWN} position={[R - 0.064, headerY, depth]} />
      <Text fontSize={0.0038 * k} color="#ffffff" anchorX="center" anchorY="middle" position={[R - 0.064, headerY, depth + 0.002]}>
        SELL
      </Text>

      {/* chart gridlines */}
      {[0, 1, 2, 3].map((j) => (
        <mesh key={`g${j}`} geometry={boxGeo(chartR - chartL, 0.001, 0.001)} material={TRD_GRID} position={[(chartL + chartR) / 2, chartB + (j * (chartT - chartB)) / 3, depth]} />
      ))}

      {/* thin candles with full-height wicks + flat volume */}
      {pts.map((p, i) => {
        const x = chartL + i * stepX
        const body = Math.max(Math.abs(p.c - p.o), 0.0012)
        const up = p.c >= p.o
        return (
          <group key={`c${i}`}>
            <mesh geometry={boxGeo(0.0008, p.h - p.l, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, (p.h + p.l) / 2, depth + 0.001]} />
            <mesh geometry={boxGeo(0.003, body, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, (p.o + p.c) / 2, depth + 0.002]} />
            <mesh geometry={boxGeo(0.0025, 0.0022 + p.v * 0.0026, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, chartB - 0.008 - (0.0022 + p.v * 0.0026) / 2, depth + 0.001]} />
          </group>
        )
      })}

      {/* one thin amber MA(5) curve */}
      {maPts.slice(0, -1).map(([x1, y1], i) => {
        const [x2, y2] = maPts[i + 1]
        const dx = x2 - x1
        const dy = y2 - y1
        return (
          <mesh key={`ma${i}`} geometry={boxGeo(Math.hypot(dx, dy), 0.0015, 0.001)} material={TRD_MA} position={[(x1 + x2) / 2, (y1 + y2) / 2, depth + 0.003]} rotation={[0, 0, Math.atan2(dy, dx)]} />
        )
      })}

      {/* price labels on the RIGHT edge */}
      {[0, 1, 2, 3].map((j) => {
        const ly = chartB + (j * (chartT - chartB)) / 3
        return (
          <Text key={`p${j}`} fontSize={fs * 0.9} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[chartR - 0.014, ly, depth + 0.002]}>
            {trdFmt(trdPrice((ly - chartB) / (chartT - chartB)))}
          </Text>
        )
      })}

      {/* time axis on the bottom */}
      <mesh geometry={boxGeo(chartR - chartL, 0.001, 0.001)} material={TRD_GRID} position={[(chartL + chartR) / 2, chartB - 0.013, depth]} />
      {[0, 1, 2].map((i) => (
        <Text key={`t${i}`} fontSize={fs * 0.9} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[chartL + (i * (chartR - chartL)) / 2, bottom + 0.006, depth + 0.002]}>
          {['14:00', '14:30', '15:00'][i]}
        </Text>
      ))}

      {/* order book strip — thin lines, tiny numbers */}
      <mesh geometry={boxGeo(bookR - bookL, 0.001, 0.001)} material={TRD_GRID} position={[(bookL + bookR) / 2, chartT, depth]} />
      {[0, 1, 2, 3].map((i) => {
        const ay = midY + 0.014 + i * 0.014
        const by = midY - 0.014 - i * 0.014
        return (
          <group key={`b${i}`}>
            <mesh geometry={boxGeo(bookR - bookL, 0.003, 0.001)} material={TRD_ASK_FILL} position={[(bookL + bookR) / 2, ay, depth]} />
            <Text fontSize={fs * 0.85} color="#ff8a80" anchorX="right" anchorY="middle" position={[bookR, ay, depth + 0.002]}>
              {trdFmt(base + (i + 1) * 1.5)}
            </Text>
            <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[bookL + 0.002, ay, depth + 0.002]}>
              {(0.8 - i * 0.15).toFixed(2)}
            </Text>
            <mesh geometry={boxGeo(bookR - bookL, 0.003, 0.001)} material={TRD_BID_FILL} position={[(bookL + bookR) / 2, by, depth]} />
            <Text fontSize={fs * 0.85} color="#80e0d0" anchorX="right" anchorY="middle" position={[bookR, by, depth + 0.002]}>
              {trdFmt(base - (i + 1) * 1.5)}
            </Text>
            <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[bookL + 0.002, by, depth + 0.002]}>
              {(0.6 + i * 0.18).toFixed(2)}
            </Text>
          </group>
        )
      })}
      {/* mid price */}
      <mesh geometry={boxGeo(bookR - bookL, 0.004, 0.001)} material={TRD_BID_FILL} position={[(bookL + bookR) / 2, midY, depth]} />
      <Text fontSize={fs * 0.95} color={TRD_C.text} anchorX="center" anchorY="middle" position={[(bookL + bookR) / 2, midY, depth + 0.002]}>
        {trdFmt(base)}
      </Text>
    </group>
  )
}

/** Secondary panel: thin-line order book — red asks on top, green bids below,
 *  mid-price band, tiny numbers, depth as faint tinted rows (not thick bars). */
function OrderBookUI({ cx = 0, cy = 0.14, w = 0.22, h = 0.24, depth = 0.004 }: { cx?: number; cy?: number; w?: number; h?: number; depth?: number }) {
  const k = Math.max(w / 0.41, 0.85)
  const fs = 0.0042 * k
  const L = cx - w / 2
  const R = cx + w / 2
  const top = cy + h / 2
  const bottom = cy - h / 2
  const headerY = top - 0.011
  const midY = cy
  const rowW = w - 0.02
  const asks = [42185.5, 42184, 42182.5, 42180, 42178.5, 42176]
  const bids = [42174, 42172.5, 42170, 42168.5, 42166, 42164]
  return (
    <group>
      <mesh geometry={boxGeo(rowW, 0.014, 0.001)} material={TRD_PANEL} position={[cx, headerY, depth]} />
      <Text fontSize={0.0046 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.008, headerY, depth + 0.002]}>
        ORDER BOOK
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[R - 0.006, headerY, depth + 0.002]}>
        BTC/USDT
      </Text>
      {asks.map((p, i) => {
        const ry = midY + 0.05 - i * 0.0155
        return (
          <group key={`a${i}`}>
            <mesh geometry={boxGeo(rowW, 0.0028, 0.001)} material={TRD_ASK_FILL} position={[cx, ry, depth]} />
            <Text fontSize={fs * 0.85} color="#ff8a80" anchorX="right" anchorY="middle" position={[R - 0.006, ry, depth + 0.002]}>
              {trdFmt(p)}
            </Text>
            <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.008, ry, depth + 0.002]}>
              {(0.64 - i * 0.07).toFixed(2)}
            </Text>
          </group>
        )
      })}
      <mesh geometry={boxGeo(rowW, 0.0036, 0.001)} material={TRD_BID_FILL} position={[cx, midY, depth]} />
      <Text fontSize={fs * 0.95} color={TRD_C.text} anchorX="center" anchorY="middle" position={[cx, midY, depth + 0.002]}>
        42,180.5
      </Text>
      {bids.map((p, i) => {
        const ry = midY - 0.05 + i * 0.0155
        return (
          <group key={`b${i}`}>
            <mesh geometry={boxGeo(rowW, 0.0028, 0.001)} material={TRD_BID_FILL} position={[cx, ry, depth]} />
            <Text fontSize={fs * 0.85} color="#80e0d0" anchorX="right" anchorY="middle" position={[R - 0.006, ry, depth + 0.002]}>
              {trdFmt(p)}
            </Text>
            <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.008, ry, depth + 0.002]}>
              {(0.5 + i * 0.08).toFixed(2)}
            </Text>
          </group>
        )
      })}
      <mesh geometry={boxGeo(rowW, 0.001, 0.001)} material={TRD_GRID} position={[cx, bottom + 0.02, depth]} />
      <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="center" anchorY="middle" position={[cx, bottom + 0.01, depth + 0.002]}>
        SPREAD 1.5 · DEPTH 8.2K
      </Text>
    </group>
  )
}

/** Dense zoomed-out chart for the side screen: 52 thin candles, tiny flat
 *  volume, thin MA(7), header with symbol + timeframe. */
function DenseChartUI({ cx = 0, cy = 0.14, w = 0.22, h = 0.24, depth = 0.004 }: { cx?: number; cy?: number; w?: number; h?: number; depth?: number }) {
  const k = Math.max(w / 0.41, 0.85)
  const fs = 0.0042 * k
  const L = cx - w / 2
  const R = cx + w / 2
  const top = cy + h / 2
  const bottom = cy - h / 2
  const headerY = top - 0.011
  const chartL = L + 0.01
  const chartR = R - 0.014
  const chartT = top - 0.024
  const chartB = bottom + 0.024
  const minL = Math.min(...TRD_DENSE.map((d) => d[3]))
  const maxH = Math.max(...TRD_DENSE.map((d) => d[2]))
  const span = maxH - minL || 1
  const y = (v: number) => chartB + ((v - minL) / span) * (chartT - chartB)
  const pts = TRD_DENSE.map((d) => ({ o: y(d[0]), c: y(d[1]), h: y(d[2]), l: y(d[3]), v: d[4] }))
  const stepX = (chartR - chartL - 0.004) / (pts.length - 1)
  const maPts: [number, number][] = []
  for (let i = 6; i < pts.length; i++) {
    const avg = (pts[i].c + pts[i - 1].c + pts[i - 2].c + pts[i - 3].c + pts[i - 4].c + pts[i - 5].c + pts[i - 6].c) / 7
    maPts.push([chartL + (i - 3) * stepX, avg])
  }
  return (
    <group>
      <mesh geometry={boxGeo(w - 0.016, 0.014, 0.001)} material={TRD_PANEL} position={[cx, headerY, depth]} />
      <Text fontSize={0.0046 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.008, headerY, depth + 0.002]}>
        BTC/USD · 1D
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[R - 0.006, headerY, depth + 0.002]}>
        MA(7)
      </Text>
      {[0, 1, 2].map((j) => (
        <mesh key={`g${j}`} geometry={boxGeo(chartR - chartL, 0.0008, 0.001)} material={TRD_GRID} position={[(chartL + chartR) / 2, chartB + (j * (chartT - chartB)) / 2, depth]} />
      ))}
      {pts.map((p, i) => {
        const x = chartL + i * stepX
        const body = Math.max(Math.abs(p.c - p.o), 0.001)
        const up = p.c >= p.o
        return (
          <group key={`c${i}`}>
            <mesh geometry={boxGeo(0.0007, p.h - p.l, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, (p.h + p.l) / 2, depth + 0.001]} />
            <mesh geometry={boxGeo(0.0018, body, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, (p.o + p.c) / 2, depth + 0.002]} />
            <mesh geometry={boxGeo(0.0012, 0.002 + p.v * 0.0025, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, chartB - 0.006 - (0.002 + p.v * 0.0025) / 2, depth + 0.001]} />
          </group>
        )
      })}
      {maPts.slice(0, -1).map(([x1, y1], i) => {
        const [x2, y2] = maPts[i + 1]
        const dx = x2 - x1
        const dy = y2 - y1
        return (
          <mesh key={`ma${i}`} geometry={boxGeo(Math.hypot(dx, dy), 0.001, 0.001)} material={TRD_MA} position={[(x1 + x2) / 2, (y1 + y2) / 2, depth + 0.003]} rotation={[0, 0, Math.atan2(dy, dx)]} />
        )
      })}
      {[0, 1, 2].map((j) => {
        const ly = chartB + (j * (chartT - chartB)) / 2
        return (
          <Text key={`p${j}`} fontSize={fs * 0.9} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[chartR - 0.003, ly, depth + 0.002]}>
            {trdFmt(trdPrice((ly - chartB) / (chartT - chartB)))}
          </Text>
        )
      })}
      <mesh geometry={boxGeo(chartR - chartL, 0.0008, 0.001)} material={TRD_GRID} position={[(chartL + chartR) / 2, chartB - 0.01, depth]} />
      {[0, 1, 2].map((i) => (
        <Text key={`t${i}`} fontSize={fs * 0.9} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[chartL + (i * (chartR - chartL)) / 2, bottom + 0.006, depth + 0.002]}>
          {['Jan', 'Jul', 'Dec'][i]}
        </Text>
      ))}
    </group>
  )
}

/** Secondary panel: portfolio view — pair, qty, entry, live P&L with thin
 *  heat-style bars and an equity footer. */
function PositionsUI({ cx = 0, cy = 0.14, w = 0.22, h = 0.24, depth = 0.004 }: { cx?: number; cy?: number; w?: number; h?: number; depth?: number }) {
  const k = Math.max(w / 0.41, 0.85)
  const fs = 0.0042 * k
  const L = cx - w / 2
  const R = cx + w / 2
  const top = cy + h / 2
  const bottom = cy - h / 2
  const headerY = top - 0.011
  const rowW = w - 0.02
  const rows = [
    { sym: 'BTC', qty: '0.52', entry: '40,120', pnl: '+2.6%', up: true },
    { sym: 'ETH', qty: '4.20', entry: '2,410', pnl: '-1.1%', up: false },
    { sym: 'SOL', qty: '12.0', entry: '168.4', pnl: '+4.8%', up: true },
    { sym: 'ADA', qty: '900', entry: '1.12', pnl: '-0.4%', up: false },
  ]
  return (
    <group>
      <mesh geometry={boxGeo(rowW, 0.014, 0.001)} material={TRD_PANEL} position={[cx, headerY, depth]} />
      <Text fontSize={0.0046 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.008, headerY, depth + 0.002]}>
        PORTFOLIO
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.008, headerY - 0.017, depth + 0.002]}>
        SYM
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.055, headerY - 0.017, depth + 0.002]}>
        QTY
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[cx - 0.005, headerY - 0.017, depth + 0.002]}>
        ENTRY
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[R - 0.006, headerY - 0.017, depth + 0.002]}>
        P&L
      </Text>
      {rows.map((row, i) => {
        const ry = headerY - 0.032 - i * 0.031
        return (
          <group key={row.sym}>
            <mesh geometry={boxGeo(0.028, 0.0028, 0.001)} material={row.up ? TRD_BID_FILL : TRD_ASK_FILL} position={[L + 0.014, ry, depth]} />
            <Text fontSize={fs} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.008, ry, depth + 0.002]}>
              {row.sym}
            </Text>
            <Text fontSize={fs * 0.85} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.055, ry, depth + 0.002]}>
              {row.qty}
            </Text>
            <Text fontSize={fs * 0.85} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[cx - 0.005, ry, depth + 0.002]}>
              {row.entry}
            </Text>
            <Text fontSize={fs} color={row.up ? TRD_C.up : TRD_C.down} anchorX="right" anchorY="middle" position={[R - 0.006, ry, depth + 0.002]}>
              {row.pnl}
            </Text>
          </group>
        )
      })}
      <mesh geometry={boxGeo(rowW, 0.001, 0.001)} material={TRD_GRID} position={[cx, bottom + 0.034, depth]} />
      <Text fontSize={fs * 0.85} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.008, bottom + 0.022, depth + 0.002]}>
        TOTAL EQUITY
      </Text>
      <Text fontSize={fs} color={TRD_C.text} anchorX="right" anchorY="middle" position={[R - 0.006, bottom + 0.022, depth + 0.002]}>
        18,420.50
      </Text>
      <Text fontSize={fs * 0.85} color={TRD_C.up} anchorX="right" anchorY="middle" position={[R - 0.006, bottom + 0.01, depth + 0.002]}>
        +214.50
      </Text>
    </group>
  )
}

// ── Phone: iPhone 16-style handset lying face-up on the table ──
// Screen material: wallpaper texture lit by a subtle emissive map so the screen
// reads as a bright display without glowing like a lamp.
let phoneScreenMatCache: MeshStandardMaterial | null = null
function phoneScreenMat(): MeshStandardMaterial {
  if (!phoneScreenMatCache) {
    const tex = phoneHomeScreenTex()
    tex.colorSpace = SRGBColorSpace
    phoneScreenMatCache = new MeshStandardMaterial({
      map: tex,
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.05,
    })
  }
  return phoneScreenMatCache
}

// Polished silver apple logo for the back panel — slight emissive so it catches
// the room light like machined metal.
let phoneBackLogoMatCache: MeshStandardMaterial | null = null
function phoneBackLogoMat(): MeshStandardMaterial {
  if (!phoneBackLogoMatCache) {
    const tex = appleBackLogoTex()
    tex.colorSpace = SRGBColorSpace
    phoneBackLogoMatCache = new MeshStandardMaterial({
      map: tex,
      color: '#ffffff',
      transparent: true,
      emissive: '#c8c8d0',
      emissiveMap: tex,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.9,
    })
  }
  return phoneBackLogoMatCache
}

/** One accessory model, centred on X/Z, base sitting at y = 0. Detailed. */
export function AccessoryModel({ id }: { id: AccessoryId }) {
  switch (id) {
  case 'laptop':
  case 'gaming_laptop': {
    const isGaming = id === 'gaming_laptop'
    // ── RULE — every accessory is an INDEPENDENT build ──
    // These two laptops share this code path for keyboard/screen helpers, but
    // each id has its OWN chassis parameters below. The study laptop is a slim
    // compact unibody; the gaming machine is a wider, thicker behemoth with
    // intake grilles + rear exhaust. Editing one id's numbers can never change
    // the other machine's geometry. Never merge these ids into one build.
    const CH = isGaming
      ? { w: 0.50, d: 0.31, h: 0.016, halfX: 0.25 } // gaming: wider, thicker chassis
      : { w: 0.48, d: 0.30, h: 0.012, halfX: 0.24 } // study: slim compact unibody
    const deckY = CH.h - 0.004 // deck surface sits flush on top of the body
    const sideY = CH.h / 2
    const portY = CH.h - 0.001
    // Premium aluminum materials with proper PBR values — the study laptop's
    // body/palm rest get a clearcoat layer so they read as anodized metal.
    const aluminumBody = pm('#b8c0c8', 0.25, 0.9, 1) // brushed aluminum body
    const aluminumDeck = pm('#c8d0d8', 0.3, 0.85, 1) // lighter palm rest area
    const keyCapMat = m('#1a1a1c', 0.75, 0.08) // matte black keycaps
    // Brushed-anodized body — procedural grain + smudges so the chassis reads
    // as machined metal, not flat dark grey.
    const shell = isGaming ? brushedMetalMaterial('#16161c', 0.32, 0.72, 6, 3) : aluminumBody
    const palmRest = isGaming ? brushedMetalMaterial('#17171d', 0.36, 0.66, 6, 2) : aluminumDeck
    const keyMat = !isGaming ? keyCapMat : null

    // Real gaming palette: near-black body (#0a0a0f), gunmetal edges (#2a2a2a),
    // matte black keys (#1c1c1c) with cyan/magenta per-key RGB backlight.
    const DARK_BODY = m('#0a0a0f', 0.35, 0.6)
    const GUNMETAL = m('#2a2a2a', 0.4, 0.7)
    const KEY_MATTE = m('#1c1c1c', 0.85, 0.05)
    const RGB_CYAN = glowMaterial('#00ffff', 1.4)
    const RGB_MAGENTA = glowMaterial('#ff00ff', 1.4)
    const RGB_BLUE = glowMaterial('#4466ff', 1.1)
    const RGB_WAVE = [RGB_CYAN, RGB_MAGENTA, RGB_BLUE]

    const screenBg = glowMaterial('#0a0c12', 0.35) // self-lit OLED panel glow
    const screenGloss = m('#0a0d14', 0.32, 0.12) // glossy-but-not-mirror screen surface
    const bezelMat = m('#1a1a1c', 0.8, 0.15) // thin black bezel
    const logo = isGaming ? glowMaterial('#00e5ff', 1.6) : m('#a8b0b8', 0.25, 0.85)

    // Glass layer: clearcoat + micro-scratch roughness so the screen catches
    // Fresnel-style reflections instead of reading as a flat decal.
    const screenGlass = laptopMaterial('screen-glass', () => {
      const g = new MeshPhysicalMaterial({
        color: '#0a0d14',
        metalness: 0.1,
        roughness: 0.28,
        clearcoat: 0.4,
        clearcoatRoughness: 0.4,
        envMapIntensity: 0.5,
        transparent: true,
        opacity: 0.16,
        side: FrontSide,
      })
      g.roughnessMap = scratchRoughnessTex()
      return g
    })
    const screenVignette = laptopMaterial('screen-vignette', () => {
      const mat = new MeshBasicMaterial({ map: screenVignetteTex(), transparent: true, depthWrite: false })
      mat.color.set('#0a0d14')
      return mat
    })
    // Tiny dust motes — additively blended so they read as lit air particles.
    const dustMat = laptopMaterial('dust-mat', () =>
      new MeshBasicMaterial({
        color: '#ffe9c8',
        transparent: true,
        opacity: 0.35,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )

    const keys = []
    // Seat the caps on the deck (deck top is y=0.014) instead of floating above it.
    const keyY = isGaming ? 0.019 : 0.021

    if (isGaming) {
      // Full-size gaming deck — same ANSI anatomy as the study laptop (Esc +
      // F1–F12 + power, wide enter/shift/space, 2×2 arrows) but with matte
      // black caps, bright labels, a per-key RGB wave, and a magenta-glow WASD
      // cluster (the classic gaming-laptop signature).
      const kSp = 0.0268 // column pitch
      const capD = 0.019
      const capH = 0.007 // low-profile mech-style caps
      const kZ = (r: number) => -0.08 + r * 0.0255
      // Sculpted dish material shared by every cap (concave radial shading).
      const keyDishMat = laptopMaterial('keycap-dish-mat', () => {
        const mat = new MeshStandardMaterial({ map: keycapDishTex(), roughness: 0.72, metalness: 0.05 })
        mat.color.set('#e8e8ea')
        return mat
      })
      const kRows: { l: string; w: number; sp?: 'power' | 'space' | 'arrow' }[][] = [
        // function row
        [
          { l: 'Esc', w: 1.5 }, { l: 'F1', w: 1 }, { l: 'F2', w: 1 }, { l: 'F3', w: 1 }, { l: 'F4', w: 1 },
          { l: 'F5', w: 1 }, { l: 'F6', w: 1 }, { l: 'F7', w: 1 }, { l: 'F8', w: 1 }, { l: 'F9', w: 1 },
          { l: 'F10', w: 1 }, { l: 'F11', w: 1 }, { l: 'F12', w: 1 }, { l: '', w: 1.5, sp: 'power' },
        ],
        // number row
        [
          { l: '`', w: 1 }, { l: '1', w: 1 }, { l: '2', w: 1 }, { l: '3', w: 1 }, { l: '4', w: 1 },
          { l: '5', w: 1 }, { l: '6', w: 1 }, { l: '7', w: 1 }, { l: '8', w: 1 }, { l: '9', w: 1 },
          { l: '0', w: 1 }, { l: '-', w: 1 }, { l: '=', w: 1 }, { l: 'Bksp', w: 2 },
        ],
        // qwerty row
        [
          { l: 'Tab', w: 1.5 }, { l: 'q', w: 1 }, { l: 'w', w: 1 }, { l: 'e', w: 1 }, { l: 'r', w: 1 },
          { l: 't', w: 1 }, { l: 'y', w: 1 }, { l: 'u', w: 1 }, { l: 'i', w: 1 }, { l: 'o', w: 1 },
          { l: 'p', w: 1 }, { l: '[', w: 1 }, { l: ']', w: 1 }, { l: '\\', w: 1.5 },
        ],
        // asdf row
        [
          { l: 'Caps', w: 1.75 }, { l: 'a', w: 1 }, { l: 's', w: 1 }, { l: 'd', w: 1 }, { l: 'f', w: 1 },
          { l: 'g', w: 1 }, { l: 'h', w: 1 }, { l: 'j', w: 1 }, { l: 'k', w: 1 }, { l: 'l', w: 1 },
          { l: ';', w: 1 }, { l: "'", w: 1 }, { l: 'Enter', w: 2.25 },
        ],
        // zxcv row + ▲
        [
          { l: 'Shift', w: 2.0 }, { l: 'z', w: 1 }, { l: 'x', w: 1 }, { l: 'c', w: 1 }, { l: 'v', w: 1 },
          { l: 'b', w: 1 }, { l: 'n', w: 1 }, { l: 'm', w: 1 }, { l: ',', w: 1 }, { l: '.', w: 1 },
          { l: '/', w: 1 }, { l: 'Shift', w: 1.0 }, { l: '▲', w: 1, sp: 'arrow' },
        ],
        // bottom row + ◄ ▼ ►
        [
          { l: 'Ctrl', w: 1.25 }, { l: 'Win', w: 1 }, { l: 'Alt', w: 1.25 }, { l: '', w: 6.25, sp: 'space' },
          { l: 'Alt', w: 1.25 }, { l: 'Fn', w: 1 }, { l: '◄', w: 1, sp: 'arrow' }, { l: '▼', w: 1, sp: 'arrow' }, { l: '►', w: 1, sp: 'arrow' },
        ],
      ]
      kRows.forEach((row, r) => {
        const total = row.reduce((s, k) => s + k.w, 0)
        const startX = -(total * kSp) / 2
        let cum = 0
        row.forEach((k, c) => {
          const kw = k.w * kSp - 0.0036
          const kx = startX + cum * kSp + kw / 2
          cum += k.w
          const kz = kZ(r)
          const label = k.l
          const isWide = k.w > 1.4
          const isArrow = k.sp === 'arrow'
          const isPower = k.sp === 'power'
          const isSpace = k.sp === 'space'
          const isWASD = ['w', 'a', 's', 'd'].includes(label)
          // RGB hot-spots: each cap's backlight differs slightly (real RGB
          // boards have per-LED variance + light falloff toward the edges).
          const hot = 1.05 + ((c * 31 + r * 17) % 7) * 0.13
          const keyUnderGlow = isWASD
            ? RGB_MAGENTA
            : glowMaterial(['#00ffff', '#ff00ff', '#4466ff'][(c + r * 2) % 3], 1.1 + hot)
          if (isSpace) {
            keys.push(
              <group key={`gsp${r}`} position={[kx, keyY, kz]}>
                <mesh geometry={boxGeo(kw, capH, capD)} material={KEY_MATTE} castShadow />
                <mesh geometry={boxGeo(kw * 0.94, capH * 0.4, capD * 0.92)} material={m('#2a2a2e', 0.7, 0.05)} position={[0, capH / 2 + 0.0005, 0]} />
                <mesh geometry={boxGeo(kw * 0.86, capH * 0.22, capD * 0.82)} material={keyDishMat} position={[0, capH / 2 + 0.0009, 0]} />
                <mesh geometry={boxGeo(kw - 0.001, 0.0025, capD - 0.001)} material={glowMaterial('#00ffff', 1.1 + hot)} position={[0, -capH / 2 - 0.0008, 0]} />
              </group>,
            )
            return
          }
          keys.push(
            <group key={`gk${r}-${c}`} position={[kx, keyY, kz]}>
              {/* matte black cap */}
              <mesh geometry={boxGeo(kw, capH, capD)} material={isPower ? m('#3a4046', 0.5, 0.3) : KEY_MATTE} castShadow />
              {/* top surface for bevel */}
              <mesh geometry={boxGeo(kw * 0.92, capH * 0.4, capD * 0.9)} material={m('#2a2a2e', 0.7, 0.05)} position={[0, capH / 2 + 0.0005, 0]} />
              {/* sculpted dish — concave keycap top with radial shading */}
              <mesh geometry={boxGeo(kw * 0.84, capH * 0.22, capD * 0.8)} material={keyDishMat} position={[0, capH / 2 + 0.0009, 0]} />
              {/* per-key RGB underglow — magenta on WASD, hot-spot variance elsewhere */}
              <mesh geometry={boxGeo(kw - 0.001, 0.0025, capD - 0.001)} material={keyUnderGlow} position={[0, -capH / 2 - 0.0008, 0]} />
              {isPower ? (
                <group position={[0, capH / 2 + 0.0012, 0]}>
                  <mesh geometry={torusGeo(0.004, 0.001)} material={m('#c8ccd2', 0.4, 0.5)} rotation={[-Math.PI / 2, 0, 0]} />
                  <mesh geometry={boxGeo(0.0012, 0.005, 0.0012)} material={m('#c8ccd2', 0.4, 0.5)} position={[0, 0.0015, 0]} />
                </group>
              ) : label ? (
                <Text
                  fontSize={isArrow ? 0.006 : isWide ? 0.0042 : 0.0052}
                  color={isArrow ? '#9ff3ff' : isWASD ? '#ffffff' : '#dfe8f2'}
                  anchorX="center"
                  anchorY="middle"
                  position={[0, capH / 2 + 0.001, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  {label}
                </Text>
              ) : null}
            </group>,
          )
        })
      })
    } else {
      // Full-size study keyboard: function row (Esc + F1–F12 + power button),
      // QWERTY block with proper spacing, wide enter/shift/space, and a 2×2
      // arrow cluster (▲ / ◄ ▼ ►) at the bottom right — like a real 15" deck.
      const kSp = 0.0268 // column pitch
      const capD = 0.02
      const capH = 0.012
      const kZ = (r: number) => -0.08 + r * 0.0255
      const kRows: { l: string; w: number; sp?: 'power' | 'space' | 'arrow' }[][] = [
        // function row
        [
          { l: 'Esc', w: 1.5 }, { l: 'F1', w: 1 }, { l: 'F2', w: 1 }, { l: 'F3', w: 1 }, { l: 'F4', w: 1 },
          { l: 'F5', w: 1 }, { l: 'F6', w: 1 }, { l: 'F7', w: 1 }, { l: 'F8', w: 1 }, { l: 'F9', w: 1 },
          { l: 'F10', w: 1 }, { l: 'F11', w: 1 }, { l: 'F12', w: 1 }, { l: '', w: 1.5, sp: 'power' },
        ],
        // number row
        [
          { l: '`', w: 1 }, { l: '1', w: 1 }, { l: '2', w: 1 }, { l: '3', w: 1 }, { l: '4', w: 1 },
          { l: '5', w: 1 }, { l: '6', w: 1 }, { l: '7', w: 1 }, { l: '8', w: 1 }, { l: '9', w: 1 },
          { l: '0', w: 1 }, { l: '-', w: 1 }, { l: '=', w: 1 }, { l: 'Bksp', w: 2 },
        ],
        // qwerty row
        [
          { l: 'Tab', w: 1.5 }, { l: 'q', w: 1 }, { l: 'w', w: 1 }, { l: 'e', w: 1 }, { l: 'r', w: 1 },
          { l: 't', w: 1 }, { l: 'y', w: 1 }, { l: 'u', w: 1 }, { l: 'i', w: 1 }, { l: 'o', w: 1 },
          { l: 'p', w: 1 }, { l: '[', w: 1 }, { l: ']', w: 1 }, { l: '\\', w: 1.5 },
        ],
        // asdf row
        [
          { l: 'Caps', w: 1.75 }, { l: 'a', w: 1 }, { l: 's', w: 1 }, { l: 'd', w: 1 }, { l: 'f', w: 1 },
          { l: 'g', w: 1 }, { l: 'h', w: 1 }, { l: 'j', w: 1 }, { l: 'k', w: 1 }, { l: 'l', w: 1 },
          { l: ';', w: 1 }, { l: "'", w: 1 }, { l: 'Enter', w: 2.25 },
        ],
        // zxcv row + ▲ (up arrow above ▼ with the natural half-key stagger —
        // real laptop arrow clusters sit off the letter grid)
        [
          { l: 'Shift', w: 2.0 }, { l: 'z', w: 1 }, { l: 'x', w: 1 }, { l: 'c', w: 1 }, { l: 'v', w: 1 },
          { l: 'b', w: 1 }, { l: 'n', w: 1 }, { l: 'm', w: 1 }, { l: ',', w: 1 }, { l: '.', w: 1 },
          { l: '/', w: 1 }, { l: 'Shift', w: 1.0 }, { l: '▲', w: 1, sp: 'arrow' },
        ],
        // bottom row + ◄ ▼ ►
        [
          { l: 'Ctrl', w: 1.25 }, { l: 'Win', w: 1 }, { l: 'Alt', w: 1.25 }, { l: '', w: 6.25, sp: 'space' },
          { l: 'Alt', w: 1.25 }, { l: 'Fn', w: 1 }, { l: '◄', w: 1, sp: 'arrow' }, { l: '▼', w: 1, sp: 'arrow' }, { l: '►', w: 1, sp: 'arrow' },
        ],
      ]
      kRows.forEach((row, r) => {
        const total = row.reduce((s, k) => s + k.w, 0)
        const startX = -(total * kSp) / 2
        let cum = 0
        row.forEach((k, c) => {
          const kw = k.w * kSp - 0.0036
          const kx = startX + cum * kSp + kw / 2
          cum += k.w
          const kz = kZ(r)
          const label = k.l
          const isWide = k.w > 1.4
          const isArrow = k.sp === 'arrow'
          const isPower = k.sp === 'power'
          const isSpace = k.sp === 'space'
          if (isSpace) {
            keys.push(
              <group key={`sp${r}`} position={[kx, keyY, kz]}>
                <mesh geometry={boxGeo(kw, capH, capD)} material={keyMat} castShadow />
                <mesh geometry={boxGeo(kw * 0.94, capH * 0.4, capD * 0.92)} material={m('#3a3a3c', 0.65, 0.08)} position={[0, capH / 2 + 0.0005, 0]} />
              </group>,
            )
            return
          }
          keys.push(
            <group key={`k${r}-${c}`} position={[kx, keyY, kz]}>
              {/* Key cap with subtle bevel */}
              <mesh geometry={boxGeo(kw, capH, capD)} material={isPower ? m('#3a4046', 0.5, 0.3) : keyMat ? keyMat : m('#2a2a2c', 0.7, 0.05)} castShadow />
              {/* Top surface slightly lighter for bevel effect */}
              <mesh geometry={boxGeo(kw * 0.92, capH * 0.4, capD * 0.9)} material={m('#3a3a3c', 0.65, 0.08)} position={[0, capH / 2 + 0.0005, 0]} />
              {isPower ? (
                /* power icon: ring + stem drawn as geometry */
                <group position={[0, capH / 2 + 0.0012, 0]}>
                  <mesh geometry={torusGeo(0.004, 0.001)} material={m('#c8ccd2', 0.4, 0.5)} rotation={[-Math.PI / 2, 0, 0]} />
                  <mesh geometry={boxGeo(0.0012, 0.005, 0.0012)} material={m('#c8ccd2', 0.4, 0.5)} position={[0, 0.0015, 0]} />
                </group>
              ) : label ? (
                <Text
                  fontSize={isArrow ? 0.0065 : isWide ? 0.0045 : 0.0055}
                  color={isArrow ? '#9fc0e8' : '#c0c8d0'}
                  anchorX="center"
                  anchorY="middle"
                  position={[0, capH / 2 + 0.001, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  {label}
                </Text>
              ) : null}
            </group>,
          )
        })
      })
    }

    // Animated RGB wallpaper (gaming) — dedicated materials so the hue cycle
    // can't leak into the cached glowMaterial palette, plus a drifting scanline.
    const wallAnimMat = laptopMaterial('gaming-wall-anim', () => {
      const mat = new MeshStandardMaterial({ color: '#05060c', roughness: 0.9 })
      mat.emissive.set('#0d1020')
      mat.emissiveIntensity = 1.4
      return mat
    })
    const wallAccentMat = laptopMaterial('gaming-wall-accent', () => {
      const mat = new MeshStandardMaterial({ color: '#07080f', roughness: 0.9 })
      mat.emissive.set('#151a30')
      mat.emissiveIntensity = 1.2
      return mat
    })
    const scanMat = laptopMaterial('gaming-scan', () =>
      new MeshBasicMaterial({
        color: '#7ff3ff',
        transparent: true,
        opacity: 0.16,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    const wallRef = useRef<any>(null)
    const wallAccentRef = useRef<any>(null)
    const scanRef = useRef<any>(null)

    // The panel was widened to match the base (CH.w); scale the on-screen UI to
    // fill the larger panel so it doesn't float in a wide black border.
    const screenScale = (CH.w - 0.02) / 0.42
    // On-screen content: a code editor for the study laptop, a neon game HUD +
    // dark gaming wallpaper for the gaming laptop (flat pixel UI bars, no 3D
    // blocks). Everything is emissive so the panel actually glows, not painted.
    const screenContent = isGaming ? (
      // Realistic gaming desktop: dark RGB wallpaper, a GameHub launcher window
      // with hero banner + game tiles, and an RGB taskbar with app icons.
      <group position={[0, 0.148, 0.004]}>
        {/* Animated RGB wallpaper - hue-cycling panel + drifting scanline */}
        <mesh ref={wallRef} geometry={boxGeo(0.42, 0.21, 0.0005)} material={wallAnimMat} position={[0, -0.01, -0.0004]} />
        <mesh ref={wallAccentRef} geometry={boxGeo(0.42, 0.1, 0.0005)} material={wallAccentMat} position={[0, -0.06, -0.0003]} />
        {/* scanline sweeping the wallpaper */}
        <mesh ref={scanRef} geometry={boxGeo(0.42, 0.003, 0.0005)} material={scanMat} position={[0, -0.115, -0.0002]} />
        {/* soft cyan/magenta bloom behind the launcher */}
        <mesh geometry={circleGeo(0.05)} material={glowMaterial('#00e5ff', 0.2)} position={[-0.05, 0.05, 0.0011]} />
        <mesh geometry={circleGeo(0.04)} material={glowMaterial('#ff2ed1', 0.16)} position={[0.12, 0.04, 0.0011]} />

        {/* Top status bar - dark with RGB clock */}
        <mesh geometry={boxGeo(0.42, 0.012, 0.001)} material={glowMaterial('#0a0c14', 0.6)} position={[0, 0.088, 0.0005]} />
        <Text fontSize={0.0036} color="#7ff3ff" anchorX="left" anchorY="middle" position={[-0.19, 0.088, 0.0015]}>
          GAMEHUB
        </Text>
        <Text fontSize={0.0032} color="#8a93a8" anchorX="left" anchorY="middle" position={[-0.115, 0.088, 0.0015]}>
          Store  Library
        </Text>
        <Text fontSize={0.0032} color="#c0c8d4" anchorX="right" anchorY="middle" position={[0.19, 0.088, 0.0015]}>
          FPS 144
        </Text>

        {/* Game launcher window - main element */}
        <group position={[-0.03, 0, 0]}>
          <mesh geometry={boxGeo(0.3, 0.16, 0.001)} material={glowMaterial('#141824', 0.55)} position={[0, 0, 0.0005]} />
          {/* Title bar */}
          <mesh geometry={boxGeo(0.3, 0.012, 0.001)} material={glowMaterial('#1c2230', 0.6)} position={[0, 0.074, 0.001]} />
          {/* Window controls (close/min/max) */}
          {[-0.138, -0.125, -0.112].map((dx, i) => (
            <mesh key={`gw${i}`} geometry={sphereGeo(0.0028)} material={glowMaterial(['#ff5f57', '#febc2e', '#28c840'][i], 0.9)} position={[dx, 0.074, 0.002]} />
          ))}
          {/* Search bar */}
          <mesh geometry={boxGeo(0.27, 0.0095, 0.001)} material={glowMaterial('#0e1220', 0.6)} position={[0, 0.059, 0.001]} />
          <Text fontSize={0.0028} color="#5f6b7d" anchorX="left" anchorY="middle" position={[-0.125, 0.059, 0.002]}>
            Search games…
          </Text>
          {/* Hero banner with gradient + play button */}
          <mesh geometry={boxGeo(0.27, 0.055, 0.001)} material={glowMaterial('#1a2440', 0.55)} position={[-0.01, 0.028, 0.001]} />
          <mesh geometry={boxGeo(0.27, 0.004, 0.001)} material={glowMaterial('#00e5ff', 0.9)} position={[-0.01, 0.0535, 0.002]} />
          <mesh geometry={boxGeo(0.27, 0.004, 0.001)} material={glowMaterial('#ff2ed1', 0.9)} position={[-0.01, 0.0005, 0.002]} />
          <Text fontSize={0.005} color="#e8f6ff" anchorX="left" anchorY="middle" position={[-0.13, 0.03, 0.002]}>
            NEON RUSH
          </Text>
          <Text fontSize={0.0028} color="#8a93a8" anchorX="left" anchorY="middle" position={[-0.13, 0.02, 0.002]}>
            Open-world racing
          </Text>
          {/* Play button */}
          <mesh geometry={boxGeo(0.05, 0.014, 0.001)} material={glowMaterial('#00e5ff', 1.1)} position={[0.1, 0.012, 0.002]} />
          <Text fontSize={0.003} color="#061018" anchorX="center" anchorY="middle" position={[0.1, 0.012, 0.0025]}>
            ▶ PLAY
          </Text>
          {/* Game tiles row */}
          {[-0.1, -0.03, 0.04, 0.11].map((tx, i) => (
            <mesh
              key={`gt${i}`}
              geometry={boxGeo(0.06, 0.05, 0.001)}
              material={glowMaterial(['#2a3a5e', '#3a2a5e', '#5e2a3a', '#2a5e4a'][i], 0.7)}
              position={[tx, -0.055, 0.001]}
            />
          ))}
        </group>

        {/* Bottom taskbar with RGB app icons */}
        <mesh geometry={boxGeo(0.42, 0.02, 0.001)} material={glowMaterial('#0a0c14', 0.6)} position={[0, -0.103, 0.001]} />
        {[-0.1, -0.06, -0.02, 0.02, 0.06, 0.1].map((dx, i) => (
          <mesh
            key={`dk${i}`}
            geometry={boxGeo(0.012, 0.012, 0.001)}
            material={glowMaterial(['#00e5ff', '#ff2ed1', '#4466ff', '#00ff88', '#ff9900', '#ff2255'][i], 0.9)}
            position={[dx, -0.103, 0.002]}
          />
        ))}
        {/* RGB glow strip above taskbar */}
        <mesh geometry={boxGeo(0.42, 0.002, 0.001)} material={glowMaterial('#00e5ff', 0.5)} position={[0, -0.092, 0.002]} />
      </group>
    ) : (
      // Realistic desktop OS: wallpaper, top menu bar, browser window with tabs
      // + address bar, a code editor, and a dock with app icons.
      <group position={[0, 0.148, 0.004]}>
        {/* Desktop wallpaper - deep blue with a soft glow, sized to sit below the top bezel */}
        <mesh geometry={boxGeo(0.42, 0.21, 0.0005)} material={glowMaterial('#1a2430', 0.5)} position={[0, -0.01, -0.0004]} />
        <mesh geometry={boxGeo(0.42, 0.1, 0.0005)} material={glowMaterial('#24343f', 0.45)} position={[0, -0.06, -0.0003]} />
        {/* soft light bloom - a subtle glow that reads through the window gaps */}
        <mesh geometry={circleGeo(0.05)} material={glowMaterial('#7fb0ff', 0.18)} position={[-0.05, 0.05, 0.0011]} />

        {/* Top menu bar - tucked just below the top bezel */}
        <mesh geometry={boxGeo(0.42, 0.012, 0.001)} material={glowMaterial('#141a22', 0.6)} position={[0, 0.088, 0.0005]} />
        <Text fontSize={0.0036} color="#c8d2dc" anchorX="left" anchorY="middle" position={[-0.19, 0.088, 0.0015]}>
          StudyForest
        </Text>
        <Text fontSize={0.0032} color="#9fb0c0" anchorX="left" anchorY="middle" position={[-0.11, 0.088, 0.0015]}>
          File Edit View
        </Text>
        <Text fontSize={0.0032} color="#9fb0c0" anchorX="right" anchorY="middle" position={[0.19, 0.088, 0.0015]}>
          5:54 PM
        </Text>

        {/* Browser window - main element */}
        <group position={[-0.03, 0, 0]}>
          <mesh geometry={boxGeo(0.3, 0.16, 0.001)} material={glowMaterial('#22282f', 0.55)} position={[0, 0, 0.0005]} />
          {/* Title bar */}
          <mesh geometry={boxGeo(0.3, 0.012, 0.001)} material={glowMaterial('#2a323c', 0.6)} position={[0, 0.074, 0.001]} />
          {/* Traffic lights (close/min/max) */}
          {[-0.138, -0.125, -0.112].map((dx, i) => (
            <mesh key={`wc${i}`} geometry={sphereGeo(0.0028)} material={glowMaterial(['#ff5f57', '#febc2e', '#28c840'][i], 0.9)} position={[dx, 0.074, 0.002]} />
          ))}
          {/* Tab strip */}
          <mesh geometry={boxGeo(0.07, 0.009, 0.001)} material={glowMaterial('#1a2028', 0.6)} position={[-0.04, 0.074, 0.002]} />
          <Text fontSize={0.0028} color="#c8d2dc" anchorX="center" anchorY="middle" position={[-0.04, 0.074, 0.0025]}>
            studyforest
          </Text>
          <mesh geometry={boxGeo(0.05, 0.009, 0.001)} material={glowMaterial('#2a323c', 0.6)} position={[0.02, 0.074, 0.002]} />
          {/* Address bar with lock icon + URL */}
          <mesh geometry={boxGeo(0.27, 0.0095, 0.001)} material={glowMaterial('#161c24', 0.6)} position={[0, 0.059, 0.001]} />
          <mesh geometry={sphereGeo(0.0018)} material={glowMaterial('#3ddc5f', 1.2)} position={[-0.118, 0.059, 0.002]} />
          <Text fontSize={0.003} color="#a9bccd" anchorX="left" anchorY="middle" position={[-0.108, 0.059, 0.002]}>
            studyforest.app
          </Text>
          {/* Page content: headline, hero, text, button */}
          <mesh geometry={boxGeo(0.2, 0.012, 0.001)} material={glowMaterial('#e8eef4', 0.6)} position={[-0.09, 0.04, 0.001]} />
          <mesh geometry={boxGeo(0.13, 0.05, 0.001)} material={glowMaterial('#3d4f61', 0.6)} position={[0.08, 0.018, 0.001]} />
          <mesh geometry={boxGeo(0.14, 0.004, 0.001)} material={glowMaterial('#5b6c7c', 0.55)} position={[-0.1, -0.002, 0.001]} />
          <mesh geometry={boxGeo(0.11, 0.004, 0.001)} material={glowMaterial('#4a5a6a', 0.55)} position={[-0.1, -0.012, 0.001]} />
          <mesh geometry={boxGeo(0.12, 0.004, 0.001)} material={glowMaterial('#5b6c7c', 0.55)} position={[-0.1, -0.022, 0.001]} />
          <mesh geometry={boxGeo(0.05, 0.011, 0.001)} material={glowMaterial('#5294e2', 0.9)} position={[-0.1, -0.04, 0.001]} />
          <Text fontSize={0.003} color="#ffffff" anchorX="center" anchorY="middle" position={[-0.1, -0.04, 0.002]}>
            Open
          </Text>
        </group>

        {/* Code editor window - partially behind the browser */}
        <group position={[0.115, 0.01, -0.0002]}>
          <mesh geometry={boxGeo(0.14, 0.13, 0.001)} material={glowMaterial('#1b2129', 0.55)} position={[0, 0, 0]} />
          <mesh geometry={boxGeo(0.14, 0.01, 0.001)} material={glowMaterial('#2a323c', 0.6)} position={[0, 0.06, 0.001]} />
          <Text fontSize={0.0028} color="#c8d2dc" anchorX="left" anchorY="middle" position={[-0.06, 0.06, 0.002]}>
            main.ts
          </Text>
          {/* Editor gutter + code lines with syntax colors */}
          <mesh geometry={boxGeo(0.012, 0.1, 0.001)} material={glowMaterial('#151a22', 0.55)} position={[-0.062, -0.01, 0.001]} />
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh
              key={`cl${i}`}
              geometry={boxGeo([0.08, 0.05, 0.07, 0.04, 0.06, 0.03, 0.05][i], 0.0035, 0.001)}
              material={glowMaterial(['#c792ea', '#82aaff', '#89ddff', '#c792ea', '#ffcb6b', '#f78c6c', '#82aaff'][i], 0.8)}
              position={[-0.02 + [0, 0.01, 0, 0.015, 0.005, 0.02, 0.008][i], 0.045 - i * 0.015, 0.002]}
            />
          ))}
        </group>

        {/* Bottom dock with app icons */}
        <mesh geometry={boxGeo(0.26, 0.02, 0.001)} material={glowMaterial('#141a22', 0.6)} position={[0, -0.103, 0.001]} />
        {[-0.1, -0.06, -0.02, 0.02, 0.06, 0.1].map((dx, i) => (
          <mesh
            key={`dk${i}`}
            geometry={boxGeo(0.012, 0.012, 0.001)}
            material={glowMaterial(['#4a90e2', '#e85d4a', '#5cb85c', '#f0ad4e', '#c471ed', '#5bc0de'][i], 0.8)}
            position={[dx, -0.103, 0.002]}
          />
        ))}
      </group>
    )

    // No opening animation — the lid is simply mounted at the open typing angle
    // (-0.55 rad). Only the charging LED breathes, so nothing moves on mount.
    const ledRef = useRef<any>(null)
    // Dedicated (non-shared) emissive material so the breathing intensity
    // can't leak into the cached glowMaterial used elsewhere.
    const ledMat = new MeshStandardMaterial({
      color: isGaming ? '#27ff8a' : '#3ddc5f',
      emissive: isGaming ? '#27ff8a' : '#3ddc5f',
      emissiveIntensity: 1,
      roughness: 0.3,
      metalness: 0.1,
    })
    const dustRef = useRef<any>(null)
    useFrame((state) => {
      if (dustRef.current) {
        const t = state.clock.elapsedTime
        // drift the dust motes very slowly so the air around the laptop breathes
        dustRef.current.rotation.y = Math.sin(t * 0.05) * 0.2
        dustRef.current.position.y = Math.sin(t * 0.12) * 0.005
      }
      if (ledRef.current) {
        const t = state.clock.elapsedTime
        // breathe between dim and bright so the power LED reads as "charging"
        ledRef.current.material.emissiveIntensity = 0.55 + Math.sin(t * 2.2) * 0.45
      }
      if (wallRef.current) {
        const t = state.clock.elapsedTime
        // slow RGB hue cycle across the wallpaper — a living neon desktop
        wallRef.current.material.emissive.setHSL((t * 0.02) % 1, 0.65, 0.32)
        wallRef.current.material.emissiveIntensity = 1.2 + Math.sin(t * 1.5) * 0.3
        wallAccentRef.current.material.emissive.setHSL((t * 0.02 + 0.5) % 1, 0.6, 0.3)
        wallAccentRef.current.material.emissiveIntensity = 1.1 + Math.sin(t * 1.1 + 2) * 0.25
        // scanline drifts down the panel, then loops
        scanRef.current.position.y = -0.115 + ((t * 0.05) % 0.23)
      }
    })

    return (
      <group>
        {/* Soft studio environment — procedural light panels give the anodized
            body realistic reflections (no network fetch) */}
        {isGaming && (
          <Environment resolution={128} frames={1}>
            <Lightformer intensity={0.7} position={[0, 1.6, 2.4]} scale={[3, 1.4, 1]} color="#ffd9a0" />
            <Lightformer intensity={0.45} position={[0, 0.6, -2.4]} scale={[3, 1.4, 1]} color="#6ee7ff" />
            <Lightformer intensity={0.4} position={[-2.4, 1.1, 0.4]} rotation-y={Math.PI / 2} scale={[2, 1.4, 1]} color="#ffffff" />
            <Lightformer intensity={0.35} position={[2.4, 0.9, 0.6]} rotation-y={-Math.PI / 2} scale={[2, 1.4, 1]} color="#ffb066" />
          </Environment>
        )}

        {/* ==================== BASE CONSTRUCTION ==================== */}

        {/* Breathing charging / power LED on the front-right corner */}
        <mesh ref={ledRef} geometry={sphereGeo(0.004)} material={ledMat} position={[0.205, 0.011, 0.15]} />
        {/* Status LEDs (gaming) - battery / drive / wifi indicators on the lip */}
        {isGaming && (
          <group position={[0, CH.h - 0.0035, CH.d / 2 - 0.003]}>
            <mesh geometry={sphereGeo(0.0016)} material={glowMaterial('#ffb84d', 1.2)} position={[0.165, 0, 0]} />
            <mesh geometry={sphereGeo(0.0016)} material={glowMaterial('#4dd2ff', 1.2)} position={[0.142, 0, 0]} />
            <mesh geometry={sphereGeo(0.0016)} material={glowMaterial('#4dff7a', 1.0)} position={[0.119, 0, 0]} />
          </group>
        )}

        {/* Bottom case - unibody (per-id chassis dimensions: study slim, gaming wide) */}
        <mesh geometry={boxGeo(CH.w, CH.h, CH.d)} material={shell} position={[0, CH.h / 2, 0]} castShadow receiveShadow />
        {/* Front lip */}
        <mesh geometry={boxGeo(CH.w, 0.008, 0.006)} material={isGaming ? m('#1c1c20', 0.4, 0.6) : m('#7a8288', 0.35, 0.85)} position={[0, CH.h - 0.008, CH.d / 2 - 0.002]} />
        {/* Rubber feet */}
        {[
          <mesh key="f1" geometry={sphereGeo(0.007)} material={m('#1a1a1c', 0.95, 0.05)} position={[-(CH.halfX - 0.03), 0.002, -0.13]} />,
          <mesh key="f2" geometry={sphereGeo(0.007)} material={m('#1a1a1c', 0.95, 0.05)} position={[CH.halfX - 0.03, 0.002, -0.13]} />,
          <mesh key="f3" geometry={sphereGeo(0.007)} material={m('#1a1a1c', 0.95, 0.05)} position={[-(CH.halfX - 0.03), 0.002, 0.13]} />,
          <mesh key="f4" geometry={sphereGeo(0.007)} material={m('#1a1a1c', 0.95, 0.05)} position={[CH.halfX - 0.03, 0.002, 0.13]} />,
        ]}
        
        {/* Keyboard deck */}
        <mesh geometry={boxGeo(CH.w - 0.02, 0.004, 0.20)} material={isGaming ? brushedMetalMaterial('#14141a', 0.4, 0.6, 5, 3) : m('#9aa2aa', 0.3, 0.83)} position={[0, deckY, -0.02]} />
        
        {/* Palm rest */}
        <mesh geometry={boxGeo(CH.w - 0.02, 0.003, 0.055)} material={palmRest} position={[0, deckY + 0.001, 0.105]} receiveShadow />
        
        {/* Trackpad — distinct recessed well with engraved stepped border so it
            doesn't blend into the palm rest */}
        <mesh geometry={boxGeo(0.12, 0.002, 0.056)} material={isGaming ? m('#3a3a44', 0.5, 0.6) : m('#8a9298', 0.35, 0.8)} position={[0, deckY, 0.105]} />
        <mesh geometry={boxGeo(0.118, 0.0016, 0.054)} material={isGaming ? m('#131318', 0.6, 0.5) : m('#43494f', 0.5, 0.6)} position={[0, deckY + 0.0002, 0.105]} />
        <mesh geometry={boxGeo(0.113, 0.0014, 0.05)} material={isGaming ? m('#26262e', 0.5, 0.55) : m('#555d63', 0.4, 0.7)} position={[0, deckY + 0.0006, 0.105]} />
        {/* glass surface */}
        <mesh geometry={boxGeo(0.107, 0.0011, 0.043)} material={m(isGaming ? '#1c1c26' : '#151a1e', isGaming ? 0.5 : 0.15, 0.95)} position={[0, deckY + 0.0013, 0.105]} />
        {/* precision groove + tap zone */}
        <mesh geometry={boxGeo(0.05, 0.0004, 0.0008)} material={m('#3a3a44', 0.5, 0.6)} position={[0, deckY + 0.0019, 0.105]} />
        {/* Trackpad separator line */}
        <mesh geometry={boxGeo(0.105, 0.0005, 0.001)} material={isGaming ? glowMaterial('#00e5ff', 1.0) : m('#0a0a0c', 0.9)} position={[0, deckY + 0.002, 0.078]} />
        {/* RGB edge glow around the trackpad (gaming) */}
        {isGaming && [
          <mesh key="tg1" geometry={boxGeo(0.107, 0.001, 0.002)} material={glowMaterial('#ff2ed1', 0.9)} position={[0, deckY + 0.0022, 0.078]} />,
          <mesh key="tg2" geometry={boxGeo(0.107, 0.001, 0.002)} material={glowMaterial('#ff2ed1', 0.9)} position={[0, deckY + 0.0022, 0.132]} />,
        ]}
        
        {/* Keyboard base plate - one solid surface under the caps so the key
            well reads as a single machined plate with clean cap gaps */}
        <mesh geometry={boxGeo(isGaming ? 0.44 : 0.42, 0.0012, 0.168)} material={isGaming ? m('#0e0e12', 0.6, 0.3) : m('#2a2a2c', 0.6, 0.2)} position={[0, deckY + 0.0018, -0.02]} />

        {/* ==================== INDIVIDUAL KEYCAPS ==================== */}
        {keys}

        {/* RGB bleed (gaming) — soft additive glow across the key well so the
            backlight reads as keycap leakage + light falloff, not flat strips */}
        {isGaming && (
          <group>
            <mesh geometry={boxGeo(0.42, 0.0016, 0.15)} material={additiveGlow('#00ffff', 0.14)} position={[0, deckY + 0.004, -0.02]} />
            <mesh geometry={boxGeo(0.42, 0.0012, 0.15)} material={additiveGlow('#ff00ff', 0.09)} position={[0, deckY + 0.0046, -0.02]} />
          </group>
        )}
        
        {/* White keyboard backlight (non-gaming) — soft under-glow that bleeds
            between the caps plus thin emissive strips under each row */}
        {!isGaming && (
          <group>
            <mesh geometry={boxGeo(0.4, 0.0012, 0.13)} material={glowMaterial('#cfe0f2', 0.3)} position={[0, deckY + 0.0022, -0.02]} />
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={`wbl${i}`} geometry={boxGeo(0.4, 0.0012, 0.002)} material={glowMaterial('#e8f2ff', 0.5)} position={[0, deckY + 0.0026, -0.08 + i * 0.0255]} />
            ))}
          </group>
        )}
        
        {isGaming && (
          <group>
            {/* RGB underglow at front edge */}
            <group position={[0, CH.h * 0.25, CH.d / 2 + 0.003]}>
              <mesh geometry={boxGeo(0.4, 0.0025, 0.003)} material={RGB_CYAN} />
              <mesh geometry={boxGeo(0.32, 0.0025, 0.003)} material={RGB_MAGENTA} position={[0.015, 0.001, 0.002]} />
            </group>
            {/* RGB backlight between key rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={`bl${i}`} geometry={boxGeo(0.4, 0.002, 0.0025)} material={RGB_WAVE[i % RGB_WAVE.length]} position={[0, deckY + 0.0022, -0.08 + i * 0.0255]} />
            ))}
          </group>
        )}
        
        {/* Side rails — flush with body (per-id height, no vertical strips) */}
        <mesh geometry={boxGeo(0.006, CH.h, CH.d)} material={m('#6e767c', 0.35, 0.85)} position={[-(CH.halfX - 0.003), sideY, 0]} />
        <mesh geometry={boxGeo(0.006, CH.h, CH.d)} material={m('#6e767c', 0.35, 0.85)} position={[CH.halfX - 0.003, sideY, 0]} />
        {/* Side intake grilles (gaming) — thin slots near the hinge for airflow */}
        {isGaming && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={`intL${i}`} geometry={boxGeo(0.006, 0.0018, 0.0006)} material={m('#050508', 0.7, 0.4)} position={[-(CH.halfX - 0.003), CH.h - 0.006, -0.115 + i * 0.009]} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={`intR${i}`} geometry={boxGeo(0.006, 0.0018, 0.0006)} material={m('#050508', 0.7, 0.4)} position={[CH.halfX - 0.003, CH.h - 0.006, -0.115 + i * 0.009]} />
            ))}
          </>
        )}
        
        {/* Left ports */}
        {[
          <mesh key="usbc1" geometry={boxGeo(0.005, 0.012, 0.004)} material={m('#2a2a2c', 0.6)} position={[-(CH.halfX - 0.002), portY, 0.04]} />,
          <mesh key="usbc2" geometry={boxGeo(0.005, 0.012, 0.004)} material={m('#2a2a2c', 0.6)} position={[-(CH.halfX - 0.002), portY, 0]} />,
          <mesh key="audio" geometry={sphereGeo(0.004)} material={m('#c0392b', 0.6)} position={[-(CH.halfX - 0.002), portY, -0.04]} />,
        ]}
        
        {/* Right ports */}
        {[
          <mesh key="usba" geometry={boxGeo(0.005, 0.014, 0.006)} material={m('#2a5a8a', 0.75)} position={[CH.halfX - 0.002, portY, 0.04]} />,
          <mesh key="hdmi" geometry={boxGeo(0.005, 0.008, 0.005)} material={m('#1a1a1c', 0.7)} position={[CH.halfX - 0.002, portY, 0]} />,
          <mesh key="sd" geometry={boxGeo(0.005, 0.005, 0.006)} material={m('#5a5a5c', 0.7)} position={[CH.halfX - 0.002, portY, -0.04]} />,
        ]}
        
        {/* Speaker grilles flanking the trackpad */}
        {[-0.2, 0.2].map((sx, i) => (
          <group key={`spk${i}`} position={[sx, deckY + 0.002, 0.105]}>
            {Array.from({ length: 8 }).map((_, d) => (
              <mesh key={`h${d}`} geometry={boxGeo(0.055, 0.0008, 0.0015)} material={isGaming ? glowMaterial('#4466ff', 0.5) : m('#1a1a1c', 0.8)} position={[0, 0, -0.022 + d * 0.006]} />
            ))}
          </group>
        ))}
        
        {/* Gaming laptop rear exhaust - recessed horizontal slots (flat copper
            slats stacked in Y like a real chassis vent, not vertical fins) */}
        {isGaming && (
          <group position={[0, deckY + 0.002, -0.125]}>
            {/* recessed dark cavity inset into the body */}
            <mesh geometry={boxGeo(CH.w - 0.06, 0.02, 0.004)} material={m('#050508', 0.5, 0.4)} />
            {Array.from({ length: 8 }).map((_, i) => (
              <mesh key={`fin${i}`} geometry={boxGeo(CH.w - 0.1, 0.0018, 0.007)} material={m('#c07a3e', 0.35, 0.75)} position={[0, -0.0075 + i * 0.0021, 0.0025]} />
            ))}
          </group>
        )}
        
        {/* ==================== SCREEN ASSEMBLY ==================== */}
        <group position={[0, CH.h - 0.008, -CH.d / 2 + 0.015]} rotation={[-0.55, 0, 0]}>
          {/* Hinge mechanism — full-width bar (per-id width) */}
          <mesh geometry={boxGeo(CH.w, 0.014, 0.02)} material={m('#5a6268', 0.4, 0.78)} position={[0, 0.008, 0.007]} castShadow />
          {[-0.2, 0.2].map((hx, i) => (
            <group key={`h${i}`}>
              <mesh geometry={boxGeo(0.04, 0.02, 0.024)} material={m('#4a5258', 0.35, 0.82)} position={[hx, 0.008, 0.011]} />
              {/* hinge screws */}
              <mesh geometry={sphereGeo(0.0014)} material={m('#2a2e32', 0.5, 0.7)} position={[hx - 0.01, 0.012, 0.022]} />
              <mesh geometry={sphereGeo(0.0014)} material={m('#2a2e32', 0.5, 0.7)} position={[hx + 0.01, 0.012, 0.022]} />
            </group>
          ))}
          {/* Brand text on bottom bezel */}
          <Text fontSize={0.004} color={isGaming ? '#7ff3ff' : '#5a6368'} anchorX="center" anchorY="middle" position={[0, 0.038, 0.002]}>
            {isGaming ? 'GAMING' : 'StudyForest'}
          </Text>
          
          {/* Lid back — rounded aluminum slab matching the bezel footprint
              exactly (0.44×0.24) and tucked directly behind it, so no edge
              pokes out around the screen. (The old oversized 0.48×0.28 slab
              floated at z=-0.04 and read as a detached box behind the panel.) */}
          <mesh geometry={roundedBoxGeo(CH.w, 0.24, 0.02, 0.008)} material={shell} position={[0, 0.148, -0.012]} castShadow receiveShadow />
          
          {/* Bezel frame */}
          <mesh geometry={boxGeo(CH.w, 0.24, 0.003)} material={bezelMat} position={[0, 0.148, 0.001]} />
          <mesh geometry={boxGeo(CH.w, 0.024, 0.004)} material={bezelMat} position={[0, 0.254, 0.0045]} />
          
          {/* OLED screen */}
          <mesh geometry={boxGeo(CH.w - 0.02, 0.23, 0.001)} material={screenBg} position={[0, 0.148, 0.003]} />
          <mesh geometry={boxGeo(CH.w - 0.02, 0.23, 0.0005)} material={screenGloss} position={[0, 0.148, 0.0035]} />
          
          {/* Screen content — scaled to fill the widened panel */}
          <group scale={[screenScale, 1, 1]}>{screenContent}</group>

          {/* Glass layer — clearcoat + micro-scratches above the content so it
              catches env reflections like real screen glass */}
          {isGaming && <mesh geometry={boxGeo(CH.w - 0.02, 0.23, 0.0006)} material={screenGlass} position={[0, 0.148, 0.0042]} />}
          {/* subtle curvature vignette over the whole panel */}
          {isGaming && <mesh geometry={boxGeo(CH.w - 0.02, 0.23, 0.0004)} material={screenVignette} position={[0, 0.148, 0.0046]} />}
          {/* Volumetric halo: stacked additive planes fading forward off the screen */}
          {isGaming && (
            <group>
              <mesh geometry={boxGeo(CH.w - 0.02, 0.23, 0.0008)} material={additiveGlow('#00e5ff', 0.1)} position={[0, 0.148, 0.006]} />
              <mesh geometry={boxGeo(CH.w - 0.10, 0.19, 0.001)} material={additiveGlow('#00e5ff', 0.06)} position={[0, 0.148, 0.008]} />
            </group>
          )}

          {/* Glass glare streaks — static diagonal reflections on the panel */}
          <mesh geometry={boxGeo(0.18, 0.004, 0.0005)} material={screenGlareMat} position={[-0.09, 0.06, 0.0075]} rotation={[0, 0, 0.5]} />
          <mesh geometry={boxGeo(0.11, 0.0025, 0.0005)} material={screenGlareMat} position={[0.13, 0.19, 0.0075]} rotation={[0, 0, -0.4]} />

          {/* Screen light spill — faint emissive strip along the bottom bezel so
              the glow visibly spills onto the deck below */}
          <mesh geometry={boxGeo(CH.w - 0.02, 0.002, 0.0005)} material={glowMaterial('#bfdcff', 0.9)} position={[0, 0.031, 0.0045]} />
          {/* RGB light bleed - thin glow strips where the panel meets the bezel */}
          {isGaming && (
            <>
              <mesh geometry={boxGeo(CH.w - 0.02, 0.001, 0.0005)} material={glowMaterial('#00e5ff', 0.75)} position={[0, 0.259, 0.0048]} />
              <mesh geometry={boxGeo(CH.w - 0.02, 0.001, 0.0005)} material={glowMaterial('#ff2ed1', 0.65)} position={[0, 0.037, 0.0048]} />
              <mesh geometry={boxGeo(0.001, 0.23, 0.0005)} material={glowMaterial('#00e5ff', 0.5)} position={[-(CH.w - 0.02) / 2, 0.148, 0.0048]} />
              <mesh geometry={boxGeo(0.001, 0.23, 0.0005)} material={glowMaterial('#00e5ff', 0.5)} position={[(CH.w - 0.02) / 2, 0.148, 0.0048]} />
            </>
          )}
          
          {/* Webcam */}
          <mesh geometry={sphereGeo(0.0035)} material={m('#0a0a0c', 0.3)} position={[0, 0.262, 0.007]} />
          <mesh geometry={torusGeo(0.005, 0.0012)} material={m('#2a2a2c', 0.5)} position={[0, 0.262, 0.007]} />
          <mesh geometry={sphereGeo(0.0012)} material={glowMaterial(isGaming ? '#ff2244' : '#3ddc5f', 1.4)} position={[0.016, 0.262, 0.007]} />
          
          {/* Embossed logo badge - half-embedded dome + raised ring machined
              into the lid surface (no floating decal) */}
          <mesh geometry={sphereGeo(isGaming ? 0.015 : 0.009)} material={logo} position={[0, 0.075, -0.024]} scale={[1, 0.45, 0.6]} />
          {!isGaming && (
            <mesh geometry={torusGeo(0.0105, 0.0016)} material={m('#9aa2aa', 0.3, 0.83)} position={[0, 0.075, -0.0248]} />
          )}
          {isGaming && (
            <mesh geometry={torusGeo(0.0195, 0.0026)} material={GUNMETAL} position={[0, 0.075, -0.0248]} />
          )}
        </group>
        
        {/* ==================== LIGHTING & SHADOWS ==================== */}
        
        {/* Soft screen glow reflecting on keyboard */}
        {!isGaming && (
          <pointLight position={[0, 0.18, -0.12]} color="#e8f0f8" intensity={0.4} distance={0.5} decay={2} />
        )}
        {isGaming && (
          <>
            {/* cyan screen glow + warm fill cast from the display */}
            <pointLight position={[0, 0.2, -0.14]} color="#6ee7ff" intensity={0.9} distance={0.8} />
            <pointLight position={[0, 0.03, 0.06]} color="#ffb066" intensity={0.35} distance={0.5} />
            {/* warm screen light spilling onto the table in front of the laptop */}
            <mesh geometry={boxGeo(0.5, 0.0015, 0.2)} material={additiveGlow('#ffb066', 0.14)} position={[0, -0.0005, 0.22]} />
            {/* amber bleed across the palm rest from the screen */}
            <mesh geometry={boxGeo(CH.w - 0.04, 0.0012, 0.05)} material={additiveGlow('#ffb066', 0.18)} position={[0, deckY + 0.0026, 0.105]} />
            {/* dust motes drifting in the air — life + scale for the shot */}
            <group ref={dustRef}>
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i / 12) * Math.PI * 2
                return (
                  <mesh
                    key={`dust${i}`}
                    geometry={sphereGeo(0.0008 + (i % 3) * 0.0004)}
                    material={dustMat}
                    position={[Math.cos(a) * (0.3 + (i % 4) * 0.05), 0.12 + (i % 5) * 0.04, Math.sin(a) * (0.3 + (i % 3) * 0.06)]}
                  />
                )
              })}
            </group>
          </>
        )}
        
        {/* Contact shadow on table surface — sized to this machine's chassis.
            The slab is already flat (thin in Y); do NOT rotate it or it stands
            up into a vertical wall across the keyboard. */}
        <mesh geometry={boxGeo(CH.w + 0.02, 0.001, CH.d + 0.02)} material={m('#000000', 0.25)} position={[0, -0.001, 0]} receiveShadow />
      </group>
    )
  }
    case 'phone': {
      // iPhone 16 Pro-style handset — titanium frame, near-edge-to-edge OLED,
      // dynamic island with front camera + Face ID, mute switch + volume on the
      // left, power on the right, chamfered polished edges, triple-lens rear
      // camera in a square titanium module.
      const frame = m('#6d6d74', 0.3, 0.9)          // titanium chassis
      const polished = m('#e0e0e6', 0.22, 1)        // chamfered bright rim
      const buttonDark = m('#5d5d63', 0.4, 0.8)     // side buttons
      const island = m('#050507', 0.3, 0.1)
      const lensRing = m('#2c2c30', 0.35, 0.8)
      const lensGlass = m('#0c0e14', 0.15, 0.9)
      const flash = m('#fff3c0', 0.3, 0.2)
      const camBump = m('#3a3a3c', 0.45, 0.6)
      return (
        // lies FLAT on the table (face up) — not standing
        <group position={[0, 0.012, 0.14]} scale={1.35}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            {/* body — 15×7 cm, 8 mm thin, titanium frame */}
            <mesh geometry={boxGeo(0.07, 0.15, 0.008)} material={frame} castShadow />
            {/* polished chamfered rim around the perimeter — reads as the
                rounded titanium edge catch-light of an iPhone 16 */}
            <mesh geometry={boxGeo(0.07, 0.002, 0.008)} material={polished} position={[0, 0.074, 0]} />
            <mesh geometry={boxGeo(0.07, 0.002, 0.008)} material={polished} position={[0, -0.074, 0]} />
            <mesh geometry={boxGeo(0.002, 0.146, 0.008)} material={polished} position={[0.034, 0, 0]} />
            <mesh geometry={boxGeo(0.002, 0.146, 0.008)} material={polished} position={[-0.034, 0, 0]} />
            {/* edge-to-edge OLED screen (1.5 mm bezels) with live wallpaper */}
            <mesh geometry={boxGeo(0.067, 0.147, 0.0035)} material={phoneScreenMat()} position={[0, 0, 0.0055]} />
            {/* dynamic island — capsule cutout, front camera + Face ID dot */}
            <mesh geometry={capsuleGeo(0.0032, 0.017)} material={island} position={[0, 0.0685, 0.0085]} rotation={[0, 0, Math.PI / 2]} />
            <mesh geometry={sphereGeo(0.0013)} material={m('#0a0a0c', 0.3, 0.6)} position={[-0.0045, 0.0685, 0.0106]} />
            <mesh geometry={sphereGeo(0.0009)} material={m('#101014', 0.4, 0.5)} position={[0.0045, 0.0685, 0.0106]} />
            {/* side buttons — mute switch + volume up/down left, power right */}
            <mesh geometry={boxGeo(0.0014, 0.007, 0.004)} material={buttonDark} position={[-0.0356, 0.045, 0]} />
            <mesh geometry={boxGeo(0.0016, 0.013, 0.0045)} material={buttonDark} position={[-0.0356, 0.025, 0]} />
            <mesh geometry={boxGeo(0.0016, 0.013, 0.0045)} material={buttonDark} position={[-0.0356, 0.01, 0]} />
            <mesh geometry={boxGeo(0.0016, 0.022, 0.0045)} material={buttonDark} position={[0.0356, 0.025, 0]} />
            {/* screen emits a soft white/blue light upward */}
            <pointLight position={[0, 0, 0.03]} color="#cdd9ff" intensity={0.08} distance={0.4} />
            {/* back — matte titanium plate (visible when orbiting below table level) */}
            <mesh geometry={boxGeo(0.066, 0.146, 0.0012)} material={m('#4a4a50', 0.55, 0.6)} position={[0, 0, -0.0044]} />
            {/* polished silver apple logo, centred on the back */}
            <mesh geometry={circleGeo(0.0135, 64)} material={phoneBackLogoMat()} position={[0, -0.02, -0.0052]} rotation={[0, Math.PI, 0]} />
            {/* rear camera module — square titanium ring in the TOP-LEFT corner,
                triple-lens triangle + flash + LiDAR dot, iPhone 16 Pro style */}
            <mesh geometry={boxGeo(0.03, 0.03, 0.003)} material={polished} position={[-0.024, 0.046, -0.0055]} />
            <mesh geometry={boxGeo(0.026, 0.026, 0.0025)} material={camBump} position={[-0.024, 0.046, -0.0053]} />
            {[[-0.007, -0.005], [0.007, -0.005], [0, 0.008]].map(([lx, ly], i) => (
              <group key={`l${i}`} position={[lx - 0.024, 0.046 + ly, -0.0075]}>
                <mesh geometry={torusGeo(0.005, 0.0016)} material={lensRing} rotation={[0, Math.PI, 0]} />
                <mesh geometry={circleGeo(0.0048)} material={lensGlass} rotation={[0, Math.PI, 0]} />
              </group>
            ))}
            {/* flash + LiDAR inside the module corners */}
            <mesh geometry={sphereGeo(0.0022)} material={flash} position={[-0.009, 0.0575, -0.0065]} />
            <mesh geometry={sphereGeo(0.0018)} material={m('#0a0a0c', 0.3, 0.5)} position={[0.009, 0.0345, -0.0065]} />
            {/* small "FocusLily" engraved text line under the logo */}
            <mesh geometry={boxGeo(0.03, 0.0009, 0.0009)} material={m('#6e6e76', 0.35, 0.9)} position={[0, -0.045, -0.0052]} />
          </group>
        </group>
      )
    }
    case 'book': {
      // ── OPEN BOOK ────────────────────────────────────────────────────────────
      // Two cover boards lying near-flat on the table, splayed open at a shallow
      // V, with a real page block rising from the gutter, a printed/illustrated
      // spread, a tooled leather spine, gilt metal furniture (corner bosses, a
      // working clasp, spine bands), marbled endpapers and a hanging ribbon.
      const leather = leatherBoard()
      const fore = foreEdge()
      const goldT = brushedGold()
      const fibre = paperFibre()
      const marble = marbledPaper()
      const band = headBand()

      const leatherMat = new MeshStandardMaterial({
        color: '#7a3b22',
        map: leather.map,
        normalMap: leather.normal,
        roughnessMap: leather.rough,
        roughness: 0.78,
        metalness: 0,
      })
      const goldMat = new MeshStandardMaterial({
        color: '#caa24a',
        map: goldT.map,
        normalMap: goldT.normal,
        roughnessMap: goldT.rough,
        roughness: 0.32,
        metalness: 1,
      })
      const ribbonMat = new MeshStandardMaterial({ color: '#9c2b22', roughness: 0.55, metalness: 0.05, side: DoubleSide })
      const endpaperMat = new MeshStandardMaterial({ map: marble, roughness: 0.7, metalness: 0 })

      // book metrics (metres)
      const coverW = 0.24 // half-book = one board
      const coverD = 0.30
      const baseY = 0.001 // board rests just above the table
      const tilt = 0.07 // outward tilt of the board from the gutter
      const boardThick = 0.011
      const edgeRound = 0.012
      const gutW = 0.024 // half-width of the spine valley
      const overhang = 0.01 // page block inset from the board edge
      const blockTop = 0.0095 + boardThick

      const smooth = (a: number, b: number, x: number) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
        return t * t * (3 - 2 * t)
      }
      // rounded board: top dips toward the border, bottom rises toward the border
      const rEdge = (u: number, v: number) => Math.max(smooth(0, edgeRound, u), smooth(1 - edgeRound, 1, u), smooth(0, edgeRound, v), smooth(1 - edgeRound, 1, v))
      const topY = (u: number, v: number) => {
        const r = rEdge(u, v)
        const flat = 0.009 + 0.004 * Math.sin(v * Math.PI) // slight crown bow
        return baseY + boardThick + (flat - boardThick) * r
      }
      const botY = (u: number, v: number) => {
        const r = rEdge(u, v)
        return baseY + 0 * (1 - r)
      }
      const coverGeo = slabGeo(coverW, coverD, 24, 28, topY, botY, {
        uvTop: (u, v) => [u, 1 - v],
        uvSide: (s) => [s, 0.5],
      })

      // page block (one half), rises from the gutter
      const bTop = (u: number, v: number) => {
        const g = Math.max(0, gutW - u) / gutW // 1 at gutter → 0 away
        const dip = 0.012 * Math.pow(g, 1.4)
        const bow = 0.004 * Math.sin(v * Math.PI)
        const ripple = 0.0008 * Math.sin(u * 60)
        return blockTop + 0.022 * smooth(gutW, coverW - 0.02, u) + bow + ripple - dip
      }
      const bBot = (u: number, v: number) => {
        const g = Math.max(0, gutW - u) / gutW
        const ridge = boardThick * 0.35 + 0.0025 * smooth(gutW, coverW - 0.02, u)
        return blockTop + ridge - 0.01 * Math.pow(Math.max(0, gutW - u) / gutW, 1.4)
      }
      const pageGeo = slabGeo(coverW - overhang, coverD - overhang * 2, 30, 40, bTop, bBot, {
        baseX: -overhang / 2,
        baseZ: 0,
        baseY: 0,
        uvTop: (u, v) => [u, 1 - v],
        uvSide: (s, f) => [s, f],
      })

      // printed page: a thin sheet just above the block top, inset a touch
      const pTop = (u: number, v: number) => {
        const g = Math.max(0, gutW - 0.005 - u) / (gutW - 0.005)
        const dip = 0.011 * Math.pow(Math.max(0, g), 1.4)
        const bow = 0.004 * Math.sin(v * Math.PI)
        const ripple = 0.0008 * Math.sin(u * 60)
        return blockTop + 0.022 * smooth(gutW - 0.005, coverW - 0.03, u) + bow + ripple - dip + 0.0012
      }
      const printGeo = slabGeo(coverW - overhang - 0.006, coverD - overhang * 2 - 0.012, 30, 40, pTop, pTop, {
        baseX: -overhang / 2,
        baseZ: 0,
        baseY: 0,
        uvTop: (u, v) => [u, 1 - v],
      })

      // spine piece sitting in the gutter valley, arched up at the centre
      const spineTop = (u: number, v: number) => {
        // u here is 0..1 across the gutter width (full 2*gutW)
        const c = Math.abs(u - 0.5) / 0.5
        const arch = 0.006 + 0.001 * (1 - c)
        const bow = 0.003 * Math.sin(v * Math.PI)
        return 0.005 + arch + bow
      }
      const spineBot = () => 0.0
      const spineGeo = slabGeo(gutW * 2 + 0.004, coverD, 8, 28, spineTop, spineBot, {
        baseX: 0,
        baseY: baseY,
        uvTop: (u, v) => [u, 1 - v],
      })

      // ── ONE HALF (right board + its pages) — we mirror with rotation for left ──
      const rightHalf = (
        <group>
          {/* cover board (leather) */}
          <mesh geometry={coverGeo} material={leatherMat} castShadow receiveShadow />
          {/* marbled endpaper inset on the inner face */}
          <mesh
            geometry={boxGeo(coverW - 0.03, 0.002, coverD - 0.03)}
            material={endpaperMat}
            position={[coverW / 2, baseY + boardThick + 0.003, 0]}
          />
          {/* gilt dentelle frame on the turn-in (thin border) */}
          <mesh geometry={boxGeo(coverW - 0.012, 0.003, 0.006)} material={goldMat} position={[coverW / 2, baseY + boardThick + 0.004, coverD / 2 - 0.02]} />
          <mesh geometry={boxGeo(coverW - 0.012, 0.003, 0.006)} material={goldMat} position={[coverW / 2, baseY + boardThick + 0.004, -coverD / 2 + 0.02]} />
          {/* page block */}
          <mesh geometry={pageGeo} material={new MeshStandardMaterial({ color: '#efe6cf', map: fore.map, normalMap: fore.normal, roughness: 0.9, metalness: 0 })} castShadow receiveShadow />
          {/* printed spread */}
          <mesh geometry={printGeo}>
            <meshStandardMaterial map={pageTex('right')} normalMap={fibre} normalScale={[0.4, 0.4] as any} roughness={0.92} metalness={0} />
          </mesh>
        </group>
      )

      // ── mirrored LEFT half (rotate 180° about Y so the gutter faces centre) ──
      const leftHalf = (
        <group rotation={[0, Math.PI, 0]}>
          <mesh geometry={coverGeo} material={leatherMat} castShadow receiveShadow />
          <mesh geometry={boxGeo(coverW - 0.03, 0.002, coverD - 0.03)} material={endpaperMat} position={[coverW / 2, baseY + boardThick + 0.003, 0]} />
          <mesh geometry={boxGeo(coverW - 0.012, 0.003, 0.006)} material={goldMat} position={[coverW / 2, baseY + boardThick + 0.004, coverD / 2 - 0.02]} />
          <mesh geometry={boxGeo(coverW - 0.012, 0.003, 0.006)} material={goldMat} position={[coverW / 2, baseY + boardThick + 0.004, -coverD / 2 + 0.02]} />
          <mesh geometry={pageGeo} material={new MeshStandardMaterial({ color: '#efe6cf', map: fore.map, normalMap: fore.normal, roughness: 0.9, metalness: 0 })} castShadow receiveShadow />
          <mesh geometry={printGeo}>
            <meshStandardMaterial map={pageTex('left')} normalMap={fibre} normalScale={[0.4, 0.4] as any} roughness={0.92} metalness={0} />
          </mesh>
        </group>
      )

      // spine gilt bands + leather
      const spineBands = [-1, 1].map((s) => (
        <mesh key={`sb${s}`} geometry={boxGeo(0.03, 0.006, 0.012)} material={goldMat} position={[0, 0.0085, s * (coverD / 2 - 0.03)]} castShadow />
      ))

      // corner bosses (one set, mirrored with each half): small beveled metal Ls
      const cornerGeo = (() => {
        const s = new Shape()
        s.moveTo(0, 0)
        s.lineTo(0.05, 0)
        s.lineTo(0.05, 0.012)
        s.lineTo(0.012, 0.012)
        s.lineTo(0.012, 0.05)
        s.lineTo(0, 0.05)
        s.closePath()
        const g = new ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 })
        g.center()
        return g
      })()
      const corners = ([
        [coverW - 0.028, coverD / 2 - 0.028],
        [coverW - 0.028, -coverD / 2 + 0.028],
      ] as Array<[number, number]>).map(([cx, cz], i) => (
        <mesh key={`cb${i}`} geometry={cornerGeo} material={goldMat} position={[cx, baseY + boardThick + 0.004, cz]} castShadow />
      ))

      // headbands at the spine ends (striped, sitting in the gutter)
      const headbands = [-1, 1].map((s) => (
        <mesh key={`hb${s}`} geometry={cylinderGeo(0.008, 0.008, gutW * 2 + 0.01)} material={new MeshStandardMaterial({ map: band, roughness: 0.6, metalness: 0.1 })} rotation={[0, 0, Math.PI / 2]} position={[0, 0.013, s * (coverD / 2 - 0.006)]} />
      ))

      // ribbon bookmark — rises from the gutter, drapes over the right page and
      // hangs off the fore-edge of the table
      const ribbon = (
        <mesh
          geometry={ribbonGeo(
            [
              new Vector3(0.0, 0.012, -coverD / 2 + 0.04),
              new Vector3(0.03, 0.03, -0.02),
              new Vector3(0.08, 0.04, 0.02),
              new Vector3(0.12, 0.035, 0.06),
              new Vector3(0.16, 0.02, 0.1),
              new Vector3(0.195, 0.002, 0.12),
              new Vector3(0.205, -0.05, 0.13),
            ],
            0.014,
          )}
          material={ribbonMat}
          castShadow
        />
      )

      // clasp: leather strap on the left board's fore-edge + metal catch plate,
      // with a pin on the right board (open book → strap lies flat across pages)
      const clasp = (
        <group>
          <mesh geometry={boxGeo(0.05, 0.006, 0.02)} material={leatherMat} position={[-0.2, baseY + boardThick + 0.003, coverD / 2 - 0.05]} />
          <mesh geometry={boxGeo(0.022, 0.008, 0.03)} material={goldMat} position={[-0.205, baseY + boardThick + 0.006, coverD / 2 - 0.05]} castShadow />
          <mesh geometry={boxGeo(0.006, 0.006, 0.006)} material={goldMat} position={[-0.205, baseY + boardThick + 0.012, coverD / 2 - 0.058]} />
          <mesh geometry={boxGeo(0.006, 0.006, 0.006)} material={goldMat} position={[-0.205, baseY + boardThick + 0.012, coverD / 2 - 0.042]} />
          <mesh geometry={capsuleGeo(0.004, 0.02)} material={goldMat} rotation={[0, 0, Math.PI / 2]} position={[0.205, baseY + boardThick + 0.008, 0]} />
        </group>
      )

      // soft contact AO in the gutter valley + a thin self-shadow patch under all
      return (
        <group>
          {/* right + left halves */}
          {rightHalf}
          {leftHalf}
          {/* spine */}
          <mesh geometry={spineGeo} material={leatherMat} castShadow receiveShadow />
          {spineBands}
          {headbands}
          {/* corners belong to each board; draw on both halves */}
          <group>{corners}</group>
          <group rotation={[0, Math.PI, 0]}>{corners}</group>
          {ribbon}
          {clasp}
          {/* gutter occlusion strip (very dark, sits in the valley) */}
          <mesh geometry={boxGeo(0.03, 0.002, coverD - 0.04)} material={m('#1a120a', 0.95)} position={[0, 0.009, 0]} />
          {/* ambient occlusion patch under the whole book on the table */}
          <mesh geometry={circleGeo(coverW + 0.06)} material={m('#140c04', 0.6)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0009, 0]} />
        </group>
      )
    }
  case 'piano': {
    const body = tm('#3a241a', 0.5, 0, 'wood')
    const bodyLight = tm('#4a2e1d', 0.45, 0, 'wood')
    const bodyDark = tm('#241510', 0.6, 0, 'wood')
    const whiteKey = m('#f3ead9', 0.35)
    const blackKey = m('#1a1109', 0.32)
    const goldAccent = m('#caa24a', 0.3, 0.35)
    const redFelt = m('#7a2e22', 0.9)
    const musicStandWood = tm('#2a1810', 0.6, 0, 'wood')

    const keys = []
    const nWhite = 24
    const wkW = 0.023
    const x0 = -((nWhite - 1) * wkW) / 2
    // white keys
    for (let i = 0; i < nWhite; i++) {
      keys.push(<mesh key={`wk${i}`} geometry={boxGeo(wkW * 0.92, 0.012, 0.09)} material={whiteKey} position={[x0 + i * wkW, 0.063, 0.02]} />)
    }
    // black keys pattern (2-3-2 over 7-octave stretch)
    const blackPattern = [1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23]
    for (const i of blackPattern) {
      if (i >= nWhite) continue
      keys.push(
        <mesh
          key={`bk${i}`}
          geometry={boxGeo(wkW * 0.52, 0.018, 0.05)}
          material={blackKey}
          position={[x0 + i * wkW + wkW / 2, 0.07, 0.022]}
        />,
      )
    }

    return (
      <group>
        {/* ---- Upright piano body (lathe + boxes) ---- */}
        {/* Main box body behind keys */}
        <mesh geometry={boxGeo(0.74, 0.38, 0.34)} material={body} position={[0, 0.24, -0.06]} castShadow />
        {/* Front panel where keys sit */}
        <mesh geometry={boxGeo(0.72, 0.05, 0.16)} material={bodyLight} position={[0, 0.06, 0.1]} />
        {/* Lower cabinet */}
        <mesh geometry={boxGeo(0.72, 0.12, 0.3)} material={bodyDark} position={[0, -0.005, -0.01]} />
        {/* Red felt strip above keys */}
        <mesh geometry={boxGeo(0.68, 0.012, 0.04)} material={redFelt} position={[0, 0.085, 0.11]} />
        {/* Gold strip under keyboard */}
        <mesh geometry={boxGeo(0.66, 0.008, 0.025)} material={goldAccent} position={[0, 0.058, 0.1]} />

        {/* Keys */}

        {keys}

        {/* Music stand (angled flat panel above keys) */}
        <group position={[0, 0.245, 0.12]} rotation={[0.25, 0, 0]}>
          <mesh geometry={latheGeo([[0.3, 0], [0.32, 0.015], [0.32, 0.18], [0.3, 0.19]])} material={musicStandWood} />
          {/* Sheet of music */}
          <mesh geometry={boxGeo(0.28, 0.2, 0.004)} material={tm('#f5eedf', 0.8, 0, 'paper')} position={[0, 0.08, 0.002]} />
          {Array.from({ length: 7 }).map((_, line) => (
            <mesh
              key={`msl${line}`}
              geometry={boxGeo(0.24, 0.001, 0.001)}
              material={m('#5b3a22', 0.6)}
              position={[0, 0.06 - line * 0.014, 0.004]}
            />
          ))}
          {/* Approx note blobs */}
          {[[-0.08, 0.09], [-0.03, 0.05], [0.02, 0.02], [0.07, 0.065], [-0.05, -0.02]].map(([nx, ny], ni) => (
            <mesh key={`msn${ni}`} geometry={sphereGeo(0.006)} material={m('#241510', 0.4)} position={[nx, ny, 0.006]} />
          ))}
        </group>

        {/* Brand plate on front */}
        <mesh geometry={boxGeo(0.1, 0.015, 0.008)} material={goldAccent} position={[0, 0.12, 0.166]} />

        {/* Legs */}
        {[[-0.28, -0.12], [0.28, -0.12], [-0.28, 0.1], [0.28, 0.1]].map(([fx, fz], li) => (
          <mesh
            key={`leg${li}`}
            geometry={taperGeo(0.025, 0.03, 0.14)}
            material={bodyDark}
            position={[fx, -0.07, fz]}
          />
        ))}
        {/* Curved leg fillets */}
        {[[-0.28, -0.12], [0.28, -0.12], [-0.28, 0.1], [0.28, 0.1]].map(([fx, fz], li) => (
          <mesh key={`foot${li}`} geometry={taperGeo(0.03, 0.04, 0.01)} material={body} position={[fx, -0.14, fz]} />
        ))}

        {/* Lid prop stick */}
        <mesh geometry={boxGeo(0.008, 0.12, 0.008)} material={bodyDark} position={[0.3, 0.12, 0.05]} rotation={[0, 0, 0.4]} />
      </group>
    )
  }
    case 'mug': {
      // Rich ceramic palette
      const ceramicOuter = tm('#c96f43', 0.32, 0, 'ceramic')
      const ceramicInner = tm('#a85530', 0.4, 0, 'ceramic')
      const ceramicRim = tm('#d4794f', 0.3, 0, 'ceramic')
      const coffee = m('#2e1a0e', 0.6)
      const crema = m('#8a6040', 0.5)
      const latteArt = m('#e8d5c0', 0.45)
      const saucerMat = tm('#bd653c', 0.38, 0, 'ceramic')
      const saucerRim = tm('#a85a32', 0.42, 0, 'ceramic')
      const goldBand = m('#caa24a', 0.3, 0.35)
      const spoonMat = m('#b87333', 0.25, 0.65)
      const steam = m('#f3e9d8', 0.95)

      return (
        <group>
          {/* --- Cup body (lathe profile for realistic shape) --- */}
          <mesh
            geometry={latheGeo([
              [0.055, 0],       // base
              [0.058, 0.01],    // slight foot ring
              [0.054, 0.015],   // foot inset
              [0.052, 0.025],   // bottom curve
              [0.056, 0.05],    // belly starts
              [0.062, 0.08],    // belly
              [0.068, 0.1],     // widening
              [0.072, 0.115],   // near rim
              [0.073, 0.125],   // lip flare
              [0.071, 0.13],    // rim top
            ])}
            material={ceramicOuter}
            position={[0, 0, 0]}
            castShadow
          />
          {/* Inner cup wall (slightly smaller, hollow feel) */}
          <mesh
            geometry={latheGeo([
              [0.048, 0.02],
              [0.05, 0.04],
              [0.054, 0.07],
              [0.058, 0.095],
              [0.062, 0.11],
              [0.063, 0.12],
            ])}
            material={ceramicInner}
          />
          {/* Rim highlight ring */}
          <mesh
            geometry={torusGeo(0.072, 0.005, 10, 32)}
            material={ceramicRim}
            position={[0, 0.13, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />

          {/* --- Coffee liquid --- */}
          <mesh geometry={taperGeo(0.062, 0.055, 0.015)} material={coffee} position={[0, 0.122, 0]} />
          {/* Crema ring near the edge */}
          <mesh geometry={torusGeo(0.056, 0.006, 8, 24)} material={crema} position={[0, 0.129, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Latte art — simple rosetta heart shape */}
          <mesh geometry={sphereGeo(0.018)} material={latteArt} position={[0, 0.13, 0]} scale={[1, 0.3, 1]} />
          <mesh geometry={sphereGeo(0.012)} material={latteArt} position={[-0.015, 0.13, 0.01]} scale={[1, 0.3, 1]} />
          <mesh geometry={sphereGeo(0.012)} material={latteArt} position={[0.015, 0.13, 0.01]} scale={[1, 0.3, 1]} />
          {/* Small stem of the rosetta */}
          <mesh geometry={boxGeo(0.004, 0.001, 0.025)} material={latteArt} position={[0, 0.13, -0.012]} />

          {/* --- Decorative gold band --- */}
          <mesh geometry={torusGeo(0.068, 0.004, 8, 32)} material={goldBand} position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} />

          {/* --- Handle (thicker, more natural D-shape) --- */}
          <mesh
            geometry={torusGeo(0.04, 0.012, 12, 24)}
            material={ceramicOuter}
            position={[0.085, 0.075, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />

          {/* --- Saucer --- */}
          <mesh geometry={taperGeo(0.16, 0.14, 0.018)} material={saucerMat} position={[0, 0.009, 0]} castShadow />
          {/* Saucer inner depression */}
          <mesh geometry={taperGeo(0.11, 0.09, 0.008)} material={m('#a05535', 0.45)} position={[0, 0.018, 0]} />
          {/* Saucer raised rim */}
          <mesh geometry={torusGeo(0.145, 0.008, 10, 32)} material={saucerRim} position={[0, 0.016, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Gold accent ring on saucer */}
          <mesh geometry={torusGeo(0.1, 0.003, 8, 28)} material={goldBand} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} />

          {/* --- Small spoon resting on saucer --- */}
          <group position={[0.08, 0.022, 0.06]} rotation={[0, -0.3, 0]}>
            {/* Spoon bowl */}
            <mesh geometry={sphereGeo(0.018)} material={spoonMat} scale={[1, 0.4, 1]} />
            {/* Spoon handle */}
            <mesh geometry={boxGeo(0.005, 0.002, 0.08)} material={spoonMat} position={[0, 0, -0.045]} />
          </group>

          {/* --- Steam wisps (4 translucent curls with varying heights) --- */}
          {[[-0.015, 0.155], [0.01, 0.16], [-0.005, 0.165], [0.02, 0.15]].map(([sx, sy], i) => (
            <mesh
              key={`st${i}`}
              geometry={taperGeo(0.008 - i * 0.001, 0.002, 0.1 + i * 0.015)}
              material={steam}
              position={[sx, sy, (i - 1.5) * 0.008]}
              rotation={[0, 0, sx * 0.6 + (i - 1.5) * 0.15]}
            />
          ))}
        </group>
      )
    }
case 'trading_laptop': {
  // Premium navy workstation body (ASUS ProArt vibe) with a triple-monitor rig:
  // the main display plus two side screens mounted on rigid arms.

  // Full ANSI keyboard: function row (Esc + F1–F12 + power), QWERTY block with
  // wide enter/shift/space, and a 2×2 arrow cluster — navy keys with cool-white
  // labels, matching the workstation look.
  const keys = []
  const keyH = 0.0062
  const kSp = 0.0278 // column pitch
  const keyY = 0.0345
  const kZ = (r: number) => 0.015 + r * 0.0215
  const kRows: { l: string; w: number; sp?: 'power' | 'space' | 'arrow' }[][] = [
    // function row
    [
      { l: 'Esc', w: 1.5 }, { l: 'F1', w: 1 }, { l: 'F2', w: 1 }, { l: 'F3', w: 1 }, { l: 'F4', w: 1 },
      { l: 'F5', w: 1 }, { l: 'F6', w: 1 }, { l: 'F7', w: 1 }, { l: 'F8', w: 1 }, { l: 'F9', w: 1 },
      { l: 'F10', w: 1 }, { l: 'F11', w: 1 }, { l: 'F12', w: 1 }, { l: '', w: 1.5, sp: 'power' },
    ],
    // number row
    [
      { l: '`', w: 1 }, { l: '1', w: 1 }, { l: '2', w: 1 }, { l: '3', w: 1 }, { l: '4', w: 1 },
      { l: '5', w: 1 }, { l: '6', w: 1 }, { l: '7', w: 1 }, { l: '8', w: 1 }, { l: '9', w: 1 },
      { l: '0', w: 1 }, { l: '-', w: 1 }, { l: '=', w: 1 }, { l: 'Bksp', w: 2 },
    ],
    // qwerty row
    [
      { l: 'Tab', w: 1.5 }, { l: 'q', w: 1 }, { l: 'w', w: 1 }, { l: 'e', w: 1 }, { l: 'r', w: 1 },
      { l: 't', w: 1 }, { l: 'y', w: 1 }, { l: 'u', w: 1 }, { l: 'i', w: 1 }, { l: 'o', w: 1 },
      { l: 'p', w: 1 }, { l: '[', w: 1 }, { l: ']', w: 1 }, { l: '\\', w: 1.5 },
    ],
    // asdf row
    [
      { l: 'Caps', w: 1.75 }, { l: 'a', w: 1 }, { l: 's', w: 1 }, { l: 'd', w: 1 }, { l: 'f', w: 1 },
      { l: 'g', w: 1 }, { l: 'h', w: 1 }, { l: 'j', w: 1 }, { l: 'k', w: 1 }, { l: 'l', w: 1 },
      { l: ';', w: 1 }, { l: "'", w: 1 }, { l: 'Enter', w: 2.25 },
    ],
    // zxcv row + ▲
    [
      { l: 'Shift', w: 2.0 }, { l: 'z', w: 1 }, { l: 'x', w: 1 }, { l: 'c', w: 1 }, { l: 'v', w: 1 },
      { l: 'b', w: 1 }, { l: 'n', w: 1 }, { l: 'm', w: 1 }, { l: ',', w: 1 }, { l: '.', w: 1 },
      { l: '/', w: 1 }, { l: 'Shift', w: 1.0 }, { l: '▲', w: 1, sp: 'arrow' },
    ],
    // bottom row + ◄ ▼ ►
    [
      { l: 'Ctrl', w: 1.25 }, { l: 'Win', w: 1 }, { l: 'Alt', w: 1.25 }, { l: '', w: 6.25, sp: 'space' },
      { l: 'Alt', w: 1.25 }, { l: 'Fn', w: 1 }, { l: '◄', w: 1, sp: 'arrow' }, { l: '▼', w: 1, sp: 'arrow' }, { l: '►', w: 1, sp: 'arrow' },
    ],
  ]
  kRows.forEach((row, r) => {
    const total = row.reduce((s, k) => s + k.w, 0)
    const startX = -(total * kSp) / 2
    let cum = 0
    row.forEach((k, c) => {
      const kw = k.w * kSp - 0.002
      const kx = startX + cum * kSp + kw / 2
      cum += k.w
      const kz = kZ(r)
      const label = k.l
      const isWide = k.w > 1.4
      const isArrow = k.sp === 'arrow'
      const isPower = k.sp === 'power'
      const isSpace = k.sp === 'space'
      if (isSpace) {
        keys.push(
          <group key={`tsp${r}`} position={[kx, keyY, kz]}>
            <mesh geometry={boxGeo(kw, keyH, 0.021)} material={TRD_KEY} />
            <mesh geometry={boxGeo(kw * 0.94, keyH * 0.4, 0.019)} material={m('#2c3142', 0.6, 0.4)} position={[0, keyH / 2 + 0.0005, 0]} />
          </group>,
        )
        return
      }
      keys.push(
        <group key={`tk${r}-${c}`} position={[kx, keyY, kz]}>
          <mesh geometry={boxGeo(kw, keyH, 0.021)} material={TRD_KEY} />
          <mesh geometry={boxGeo(kw * 0.92, keyH * 0.4, 0.019)} material={m('#2c3142', 0.6, 0.4)} position={[0, keyH / 2 + 0.0005, 0]} />
          {isPower ? (
            <group position={[0, keyH / 2 + 0.0012, 0]}>
              <mesh geometry={torusGeo(0.004, 0.001)} material={m('#c8ccd2', 0.4, 0.5)} rotation={[-Math.PI / 2, 0, 0]} />
              <mesh geometry={boxGeo(0.0012, 0.005, 0.0012)} material={m('#c8ccd2', 0.4, 0.5)} position={[0, 0.0015, 0]} />
            </group>
          ) : label ? (
            <Text
              fontSize={isArrow ? 0.0065 : isWide ? 0.0045 : 0.0055}
              color={isArrow ? '#9fc4e8' : '#9aa4b8'}
              anchorX="center"
              anchorY="middle"
              position={[0, keyH / 2 + 0.001, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              {label}
            </Text>
          ) : null}
        </group>,
      )
    })
  })

  return (
    <group>
      {/* dark metal base plate — no RGB */}
      <group position={[0, -0.004, 0]}>
        <mesh geometry={boxGeo(0.52, 0.006, 0.22)} material={m('#1c2028', 0.4, 0.6)} />
        <mesh geometry={boxGeo(0.44, 0.005, 0.18)} material={m('#14171e', 0.45, 0.5)} />
      </group>

      {/* slim wedge deck — thicker at back, thinner at front */}
      <mesh geometry={boxGeo(0.48, 0.022, 0.19)} material={TRD_BODY} position={[0, 0.011, -0.075]} castShadow />
      <mesh geometry={boxGeo(0.48, 0.012, 0.19)} material={TRD_BODY} position={[0, 0.006, 0.115]} castShadow />
      <mesh geometry={boxGeo(0.44, 0.008, 0.24)} material={TRD_DECK} position={[0, 0.024, 0.02]} />
      {/* faint blue/white backlight bleeding from under the keys */}
      <mesh geometry={boxGeo(0.42, 0.0015, 0.2)} material={TRD_BACKLIGHT} position={[0, 0.029, 0.06]} />
      {/* keyboard */}
      {keys}
      {/* subtle recessed trackpad with a light border ring */}
      <mesh geometry={boxGeo(0.1, 0.004, 0.058)} material={m('#2a3140', 0.55, 0.5)} position={[0, 0.0165, 0.185]} />
      <mesh geometry={boxGeo(0.09, 0.0055, 0.048)} material={m('#0e1219', 0.55, 0.4)} position={[0, 0.0165, 0.185]} />

      {/* thin gunmetal aluminum edges */}
      <mesh geometry={boxGeo(0.004, 0.02, 0.3)} material={m('#3a3f4a', 0.35, 0.7)} position={[-0.238, 0.014, 0.03]} />
      <mesh geometry={boxGeo(0.004, 0.02, 0.3)} material={m('#3a3f4a', 0.35, 0.7)} position={[0.238, 0.014, 0.03]} />
      {/* front vent strip */}
      <mesh geometry={boxGeo(0.36, 0.006, 0.008)} material={m('#0f1116', 0.6, 0.4)} position={[0, 0.004, 0.208]} />

      {/* port indicators (HDMI + 2×USB-C style dots) */}
      {[-0.08, -0.02, 0.04].map((pz, i) => (
        <mesh key={`pl${i}`} geometry={boxGeo(0.003, 0.006, 0.012)} material={i === 1 ? m('#d4a84b', 0.45, 0.4) : m('#3a4050', 0.5, 0.4)} position={[-0.24, 0.013, pz]} />
      ))}
      {[-0.08, -0.02, 0.04].map((pz, i) => (
        <mesh key={`pr${i}`} geometry={boxGeo(0.003, 0.006, 0.012)} material={i === 1 ? m('#d4a84b', 0.45, 0.4) : m('#3a4050', 0.5, 0.4)} position={[0.24, 0.013, pz]} />
      ))}

      {/* faint cool screen light spilling onto the keys (subtle white) */}
      <pointLight position={[0, 0.12, -0.06]} color="#9fb0cc" intensity={0.16} distance={0.6} />

      {/* === CENTER SCREEN — TradingView chart (thin bezel, webcam) === */}
      {/* Clean opaque z-stack: bezel (0) → border (0.008) → glow (0.0105) → UI (0.013+).
          Every layer is a distinct z-band with gaps — no coplanar faces, no z-fight. */}
      <group position={[0, 0.028, -0.14]} rotation={[-0.22, 0, 0]}>
        {/* thin metal hinge bar */}
        <mesh geometry={boxGeo(0.5, 0.006, 0.014)} material={m('#1c2028', 0.45, 0.5)} position={[0, -0.002, 0.005]} />
        {/* bezel (opaque, back layer) */}
        <mesh geometry={boxGeo(0.46, 0.3, 0.012)} material={TRD_BODY} position={[0, 0.16, 0]} castShadow />
        {/* screen border — thin dark frame band (opaque, clear of bezel) */}
        <mesh geometry={boxGeo(0.44, 0.28, 0.003)} material={m(TRD_C.bg, 0.95)} position={[0, 0.16, 0.008]} />
        {/* emissive backlight layer (thin translucent sheet over the panel) */}
        <mesh geometry={boxGeo(0.41, 0.25, 0.001)} material={TRD_SCREEN} position={[0, 0.16, 0.0105]} />
        {/* live chart: candles + scales + MA + BUY/SELL + order book strip */}
        <TradingChartUI cx={0} cy={0.16} w={0.41} h={0.25} depth={0.013} />
        {/* webcam dot + lens ring at top center (in front of the bezel) */}
        <mesh geometry={sphereGeo(0.005)} material={m('#0a0c12', 0.4)} position={[0, 0.295, 0.007]} />
        <mesh geometry={torusGeo(0.007, 0.0015)} material={TRD_METAL} position={[0, 0.295, 0.007]} />
      </group>

      {/* === LEFT SCREEN — dense overview chart, mounted on an arm === */}
      <group position={[-0.365, 0.063, -0.03]} rotation={[-0.22, 0.3, 0]}>
        <mesh geometry={boxGeo(0.3, 0.3, 0.012)} material={TRD_BODY} position={[0, 0.15, 0]} castShadow />
        <mesh geometry={boxGeo(0.28, 0.28, 0.003)} material={m(TRD_C.bg, 0.95)} position={[0, 0.15, 0.008]} />
        <mesh geometry={boxGeo(0.26, 0.26, 0.001)} material={TRD_SCREEN} position={[0, 0.15, 0.0105]} />
        <DenseChartUI cx={0} cy={0.15} w={0.26} h={0.26} depth={0.013} />
      </group>

      {/* === RIGHT SCREEN — portfolio, mounted on an arm === */}
      <group position={[0.365, 0.063, -0.03]} rotation={[-0.22, -0.3, 0]}>
        <mesh geometry={boxGeo(0.3, 0.3, 0.012)} material={TRD_BODY} position={[0, 0.15, 0]} castShadow />
        <mesh geometry={boxGeo(0.28, 0.28, 0.003)} material={m(TRD_C.bg, 0.95)} position={[0, 0.15, 0.008]} />
        <mesh geometry={boxGeo(0.26, 0.26, 0.001)} material={TRD_SCREEN} position={[0, 0.15, 0.0105]} />
        <PositionsUI cx={0} cy={0.15} w={0.26} h={0.26} depth={0.013} />
      </group>

      {/* Mounting system: rigid arms + clamps attaching the side screens to the
          main display, like a real triple-monitor trading rig. */}
      {[-1, 1].map((s) => (
        <group key={`arm${s}`}>
          {[0.09, 0.21].map((ay) => {
            // All three screens tilt back -0.22 rad, so each arm's depth follows
            // the tilt: the clamp grips the center bezel edge and the tip bolts
            // onto the tilted side-screen rear face. The side screens sit a bit
            // higher than the center screen (LIFT), so the forward segment acts
            // as a small elbow bracket bridging the height gap.
            const LIFT = 0.035 // how much the side screens are raised
            const yl = (ay - 0.028) / 0.9759 // group-local height on the bezel
            const zClamp = -0.14 - 0.2182 * yl // center bezel mid-depth at this height
            const zTip = zClamp + 0.0994 // side-screen rear face at the raised height
            return (
              <group key={`seg${ay}`}>
                {/* clamp post gripping the tilted center bezel edge */}
                <mesh geometry={boxGeo(0.014, 0.016, 0.03)} material={m('#2a2f3f', 0.35, 0.7)} position={[s * 0.228, ay, zClamp]} />
                {/* horizontal arm rod running outward from the bezel edge */}
                <mesh geometry={boxGeo(0.135, 0.009, 0.012)} material={TRD_METAL} position={[s * 0.2975, ay, zClamp]} />
                {/* elbow bracket bridging up to the raised side screen */}
                <mesh geometry={boxGeo(0.012, 0.04, 0.0994)} material={TRD_METAL} position={[s * 0.365, ay + LIFT / 2, zClamp + 0.0497]} />
                {/* arm tip bolted to the raised side screen rear face */}
                <mesh geometry={boxGeo(0.02, 0.02, 0.02)} material={m('#1c2028', 0.45, 0.6)} position={[s * 0.365, ay + LIFT, zTip]} />
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}
    case 'flower_pot': {
      // Ultra upgrade: glazed terracotta pot on a saucer, deep grain soil, twin
      // curved stems, a layered pink bloom with a golden stamen core, veined
      // leaves, a closed bud, and a tiny ladybug resting on a leaf.
      const potMat = tm('#c96f43', 0.32, 0, 'ceramic')
      const potDark = tm('#a85530', 0.4, 0, 'ceramic')
      const rimMat = tm('#d4794f', 0.3, 0, 'ceramic')
      const saucerMat = tm('#bd653c', 0.38, 0, 'ceramic')
      const soilMat = new MeshStandardMaterial({ color: '#2a1a10', roughness: 0.95, metalness: 0, bumpMap: sandGrainTex(), bumpScale: 0.02 })
      const stemMat = m('#3e7d34', 0.5)
      const leafMat = m('#4caf50', 0.5)
      const veinMat = m('#2e6e2f', 0.5)
      const petalOuter = m('#f48fb1', 0.45)
      const petalInner = m('#f06292', 0.45)
      const stamenMat = glowMaterial('#ffd54f', 1.2)
      const budMat = m('#d81b60', 0.5)
      const sepalMat = m('#388e3c', 0.5)
      const ladyMat = m('#d32f2f', 0.4)
      const ladyHead = m('#111318', 0.5)
      return (
        <group>
          {/* saucer: shallow plate + rim */}
          <mesh geometry={taperGeo(0.09, 0.075, 0.014)} material={saucerMat} position={[0, 0.007, 0]} castShadow />
          <mesh geometry={torusGeo(0.086, 0.004, 10, 32)} material={rimMat} position={[0, 0.0135, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* pot: flared body with foot + lip rim */}
          <mesh geometry={latheGeo([[0.045, 0], [0.052, 0.02], [0.058, 0.055], [0.06, 0.09], [0.055, 0.11]])} material={potMat} position={[0, 0.014, 0]} castShadow />
          <mesh geometry={torusGeo(0.052, 0.0045, 10, 32)} material={potDark} position={[0, 0.017, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={torusGeo(0.056, 0.0045, 10, 32)} material={rimMat} position={[0, 0.124, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* soil */}
          <mesh geometry={sphereGeo(0.048)} material={soilMat} position={[0, 0.121, 0]} scale={[1, 0.28, 1]} castShadow />
          {/* main stem + bud stem */}
          <mesh geometry={boxGeo(0.01, 0.11, 0.01)} material={stemMat} position={[0.002, 0.176, -0.001]} rotation={[0.04, 0, -0.03]} castShadow />
          <mesh geometry={boxGeo(0.007, 0.075, 0.007)} material={stemMat} position={[-0.032, 0.156, 0.012]} rotation={[0.15, 0.35, 0.25]} castShadow />
          {/* leaves with centre veins */}
          {[[0.4, 0.15], [2.6, 0.17], [4.1, 0.13]].map(([a, ly], i) => (
            <group key={`lf${i}`} position={[0, ly, 0]} rotation={[0, a, 0]}>
              <mesh geometry={sphereGeo(0.05)} material={leafMat} position={[0, 0.01, 0.042]} rotation={[-0.45, 0, 0]} scale={[0.5, 0.14, 1]} castShadow />
              <mesh geometry={boxGeo(0.004, 0.004, 0.036)} material={veinMat} position={[0, 0.013, 0.042]} rotation={[-0.45, 0, 0]} />
              {i === 2 && (
                <group>
                  <mesh geometry={sphereGeo(0.007)} material={ladyMat} position={[0.018, 0.032, 0.058]} scale={[1, 0.8, 1]} castShadow />
                  <mesh geometry={sphereGeo(0.0035)} material={ladyHead} position={[0.024, 0.032, 0.062]} />
                </group>
              )}
            </group>
          ))}
          {/* bloom: outer + inner petal rings */}
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <group key={`po${i}`} position={[0, 0.22, 0]} rotation={[0, a, 0]}>
                <mesh geometry={sphereGeo(0.034)} material={petalOuter} position={[0, 0.012, 0.05]} rotation={[-0.9, 0, 0]} scale={[0.85, 0.4, 1.25]} castShadow />
              </group>
            )
          })}
          {Array.from({ length: 8 }, (_, i) => {
            const a = ((i + 0.5) / 8) * Math.PI * 2
            return (
              <group key={`pi${i}`} position={[0, 0.225, 0]} rotation={[0, a, 0]}>
                <mesh geometry={sphereGeo(0.026)} material={petalInner} position={[0, 0.01, 0.033]} rotation={[-0.65, 0, 0]} scale={[0.85, 0.4, 1.2]} castShadow />
              </group>
            )
          })}
          {/* golden stamen core */}
          {Array.from({ length: 7 }, (_, i) => {
            const a = (i / 7) * Math.PI * 2
            return (
              <group key={`st${i}`} position={[Math.cos(a) * 0.014, 0.235, Math.sin(a) * 0.014]} rotation={[0, -a, 0]}>
                <mesh geometry={capsuleGeo(0.003, 0.015)} material={stamenMat} rotation={[0.5, 0, 0]} castShadow />
              </group>
            )
          })}
          <mesh geometry={sphereGeo(0.01)} material={petalInner} position={[0, 0.236, 0]} castShadow />
          {/* closed bud with sepals */}
          <group position={[-0.036, 0.185, 0.014]} rotation={[0.1, 0.4, 0.3]}>
            {[0, 1, 2].map((i) => {
              const a = (i / 3) * Math.PI * 2
              return (
                <mesh key={`bu${i}`} geometry={sphereGeo(0.014)} material={budMat} position={[Math.cos(a) * 0.012, 0.02, Math.sin(a) * 0.012]} scale={[1, 1.2, 1]} castShadow />
              )
            })}
            {[0, 1, 2, 3].map((i) => {
              const a = ((i + 0.5) / 4) * Math.PI * 2
              return (
                <mesh key={`se${i}`} geometry={sphereGeo(0.007)} material={sepalMat} position={[Math.cos(a) * 0.013, 0.008, Math.sin(a) * 0.013]} scale={[1, 0.6, 1]} />
              )
            })}
          </group>
        </group>
      )
    }
    case 'chair_balloon': {
      return <BalloonProp />
    }
    case 'bento_box': {
      const boxMat = tm('#5c3a21', 0.6, 0, 'wood')
      const riceMat = m('#fdfbf7', 0.8)
      const salmonMat = m('#f27d56', 0.5)
      const brocMat = m('#2e7d32', 0.7)
      return (
        <group>
          <mesh geometry={boxGeo(0.32, 0.06, 0.22)} material={boxMat} position={[0, 0.03, 0]} castShadow />
          <mesh geometry={boxGeo(0.13, 0.04, 0.18)} material={riceMat} position={[-0.07, 0.05, 0]} />
          <mesh geometry={boxGeo(0.11, 0.045, 0.09)} material={salmonMat} position={[0.08, 0.051, 0.045]} />
          {[-0.07, 0.03, 0.07].map((bz, idx) => (
            <mesh key={`broc-${idx}`} geometry={sphereGeo(0.022)} material={brocMat} position={[0.08, 0.06, -0.04 + idx * 0.03]} />
          ))}
        </group>
      )
    }
    case 'hourglass': {
      // Vintage brass focus hourglass v2 — crystal-clear glass (no drawn edges),
      // warm golden sand with natural irregular mounds, thin smooth pillars,
      // thin plates, brass cups where glass meets wood, flat beveled base.
      const walnut = tm('#5c3a21', 0.6, 0, 'wood')
      const walnutDark = tm('#4a3319', 0.65, 0, 'wood')
      const brass = m('#b87333', 0.38, 0.65)
      const brassCap = m('#caa24a', 0.32, 0.65)
      const grain = sandGrainTex()
      const sandMat = new MeshStandardMaterial({ color: '#e6c687', roughness: 0.95, metalness: 0, bumpMap: grain, bumpScale: 0.016 })
      const moundMat = new MeshStandardMaterial({ color: '#e0b878', roughness: 0.95, metalness: 0, bumpMap: grain, bumpScale: 0.014 })
      // real glass: PBR transmission (refraction + thickness + ior) instead of
      // a flat tinted shell — one transmissive shell per bulb, faint blue tint
      const glass = new MeshPhysicalMaterial({
        color: '#eaf5fb',
        metalness: 0,
        roughness: 0.04,
        transparent: true,
        transmission: 1,
        ior: 1.45,
        thickness: 0.012,
        attenuationColor: '#bfe3f5',
        attenuationDistance: 0.15,
        clearcoat: 0.4,
        clearcoatRoughness: 0.08,
        side: DoubleSide,
        depthWrite: false,
      })
      const streamMat = glowMaterial('#d4a84b', 1.1)
      const grainMat = glowMaterial('#e6c687', 0.9)
      // pear bulb, tight neck (r 0.008): neck → flare → widest (r 0.051) → taper
      const outerBulb = [[0.008, 0.002], [0.022, 0.006], [0.042, 0.012], [0.05, 0.022], [0.051, 0.032], [0.042, 0.05], [0.031, 0.067], [0.025, 0.083]]
      // thin, smooth pillar with a barely-there waist (no lathe knobs)
      const pillarProfile = [
        [0.004, 0], [0.0048, 0.012], [0.0042, 0.05], [0.0038, 0.085], [0.0042, 0.12], [0.0048, 0.158], [0.004, 0.17],
      ]
      // natural sand pile via maths: angle of repose (~34°: r0/h ≈ 0.67),
      // slightly concave curve (pow 0.9) + seeded irregularity so the rim is
      // never a perfect geometric circle. apexUp = mound, else inverted pile.
      const sandPile = (r0: number, h: number, seed: number, apexUp: boolean): Array<[number, number]> => {
        let s = seed >>> 0
        const rnd = () => {
          s = (s * 1664525 + 1013904223) >>> 0
          return s / 4294967296
        }
        const n = 10
        const pts: Array<[number, number]> = []
        for (let i = 0; i <= n; i++) {
          const t = i / n
          const isApex = apexUp ? i === n : i === 0
          const r = isApex ? 0.0006 : r0 * (apexUp ? Math.pow(1 - t, 0.9) : Math.pow(t, 0.9)) * (1 + (rnd() - 0.5) * 0.1)
          pts.push([r, h * t])
        }
        return pts
      }
      return (
        // shift up so the base feet rest on the surface (bottom at y = 0)
        <group position={[0, 0.098, 0]}>
          {/* flat beveled base (no raised rim): flat top, beveled lower edge,
              brass inlay ring at the bottom edge, 3 feet, engraved minutes */}
          <mesh geometry={latheGeo([[0.095, 0], [0.095, 0.008], [0.085, 0.013]])} material={walnutDark} position={[0, -0.0915, 0]} castShadow />
          <mesh geometry={torusGeo(0.086, 0.0022)} material={brassCap} position={[0, -0.0975, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {[[0.065, 0], [-0.0325, 0.0563], [-0.0325, -0.0563]].map(([fx, fz], i) => (
            <mesh key={`ft${i}`} geometry={boxGeo(0.014, 0.006, 0.024)} material={walnutDark} position={[fx, -0.101, fz]} castShadow />
          ))}
          <Text fontSize={0.008} color="#e0c060" anchorX="center" anchorY="middle" position={[0, -0.0835, 0.082]} rotation={[-Math.PI / 2, 0, 0]}>
            15 · 30 · 60
          </Text>

          {/* thin top plate + brass edge + finial */}
          <mesh geometry={taperGeo(0.075, 0.075, 0.004)} material={walnut} position={[0, 0.087, 0]} castShadow />
          <mesh geometry={torusGeo(0.073, 0.0025)} material={brass} position={[0, 0.087, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={boxGeo(0.0035, 0.006, 0.0035)} material={brass} position={[0, 0.0925, 0]} />
          <mesh geometry={sphereGeo(0.0085)} material={brassCap} position={[0, 0.098, 0]} />
          <mesh geometry={sphereGeo(0.004)} material={brass} position={[0, 0.103, 0]} />

          {/* 4 thin smooth brass pillars with tiny cap rings */}
          {[[-0.0495, -0.0495], [0.0495, -0.0495], [-0.0495, 0.0495], [0.0495, 0.0495]].map(([px, pz], i) => (
            <group key={`p${i}`}>
              <mesh geometry={latheGeo(pillarProfile)} material={brass} position={[px, -0.085, pz]} />
              <mesh geometry={torusGeo(0.006, 0.0018)} material={brassCap} position={[px, 0.084, pz]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={torusGeo(0.006, 0.0018)} material={brassCap} position={[px, -0.084, pz]} rotation={[Math.PI / 2, 0, 0]} />
            </group>
          ))}

          {/* crystal glass bulbs — single transmissive shell each (real
              refraction/thickness via PBR), tiny glass collar hides the raw
              lathe rim at the neck; a warm light catches the curved surface */}
          <mesh geometry={latheGeo(outerBulb)} material={glass} />
          <mesh geometry={latheGeo(outerBulb)} material={glass} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={torusGeo(0.009, 0.002)} material={glass} rotation={[Math.PI / 2, 0, 0]} />
          <pointLight position={[0.11, 0.03, 0.09]} color="#ffffff" intensity={0.5} distance={0.5} />

          {/* brass cups where glass meets the plates */}
          <mesh geometry={taperGeo(0.031, 0.034, 0.009)} material={brassCap} position={[0, 0.0805, 0]} />
          <mesh geometry={taperGeo(0.031, 0.034, 0.009)} material={brassCap} position={[0, -0.0805, 0]} />
          <mesh geometry={torusGeo(0.031, 0.0025)} material={brass} position={[0, 0.084, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={torusGeo(0.031, 0.0025)} material={brass} position={[0, -0.084, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={torusGeo(0.034, 0.0025)} material={brass} position={[0, 0.0765, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={torusGeo(0.034, 0.0025)} material={brass} position={[0, -0.0765, 0]} rotation={[Math.PI / 2, 0, 0]} />

          {/* sand — natural lathe piles (angle of repose + seeded irregularity):
              top bulb nearly empty (inverted pile), bottom mound growing */}
          <mesh geometry={latheGeo(sandPile(0.015, 0.02, 11, false))} material={sandMat} position={[0, 0.003, 0]} />
          <mesh geometry={latheGeo(sandPile(0.017, 0.026, 23, true))} material={moundMat} position={[0, -0.0715, 0]} />
          {[[0.014, 0.026, 0.004], [-0.012, 0.025, -0.003], [0.006, 0.0285, -0.006], [-0.004, 0.028, 0.007]].map(([gx, gy, gz], i) => (
            <mesh key={`gp${i}`} geometry={sphereGeo(0.0022)} material={grainMat} position={[gx, gy, gz]} />
          ))}
          {[[0.015, -0.07, 0.003], [-0.014, -0.069, -0.003], [0.004, -0.068, 0.014], [-0.008, -0.0695, -0.011], [0.012, -0.071, -0.008]].map(([gx, gy, gz], i) => (
            <mesh key={`gm${i}`} geometry={sphereGeo(i % 2 ? 0.0028 : 0.002)} material={grainMat} position={[gx, gy, gz]} />
          ))}

          {/* sand stream — sine-swayed curve from the pile apex to the mound
              apex, with loose grains caught in the flow */}
          {[[0.003, -0.005, 0.0004], [-0.005, -0.013, -0.001], [-0.013, -0.021, 0.0013], [-0.021, -0.029, -0.0012], [-0.029, -0.037, 0.0006], [-0.037, -0.0455, -0.0003]].map(([y1, y2, ox], i) => (
            <mesh key={`s${i}`} geometry={boxGeo(0.0034, y1 - y2, 0.0034)} material={streamMat} position={[ox, (y1 + y2) / 2, 0]} />
          ))}
          {[[0.0025, -0.014, 0], [-0.0015, -0.026, 0.001], [0.001, -0.037, 0], [-0.0008, -0.044, 0.0005]].map(([gx, gy, gz], i) => (
            <mesh key={`st${i}`} geometry={sphereGeo(0.0016 + (i % 2) * 0.0006)} material={grainMat} position={[gx, gy, gz]} />
          ))}
        </group>
      )
    }
case 'book_stack': {
  const wornRough = (hex: string, wear = 0.75) => tm(hex, wear, 0.02, 'leather')
  const wornPaper = (hex: string, wear = 0.85) => tm(hex, wear, 0, 'paper')
  const spineGold = m('#d4a84b', 0.45, 0.4)
  const darkInk = m('#2a1f14', 0.85)
  const clothRed = wornRough('#8b1a1a', 0.7)
  const clothNavy = wornRough('#1e3a5f', 0.7)
  const clothGreen = wornRough('#2d5a3d', 0.7)
  const clothBrown = wornRough('#5c3a21', 0.72)
  const clothBurgundy = wornRough('#6b2d3e', 0.72)
  const clothCharcoal = wornRough('#3a3d42', 0.68)
  const clothGold = wornRough('#b8942e', 0.7)
  const clothCream = wornPaper('#f5eedf', 0.75)
  const leatherDark = wornRough('#3d1f0e', 0.65)
  const moroccoRed = wornRough('#a03030', 0.58)
  const vellumMat = wornPaper('#f0e8d0', 0.9)
  const clothLavender = wornRough('#7b6b8a', 0.7)
  const clothTeal = wornRough('#2d6b6b', 0.7)
  const clothOlive = wornRough('#5a6030', 0.7)
  const clothMaroon = wornRough('#6e2a30', 0.7)
  const clothIndigo = wornRough('#3a3070', 0.7)
  const clothPlum = wornRough('#5a3060', 0.7)
  const clothRust = wornRough('#8b4513', 0.7)
  const clothSlate = wornRough('#4a5568', 0.7)
  const clothWillow = wornRough('#6b7b3a', 0.7)
  const linenMat = wornPaper('#ede4d3', 0.8)
  const marbledEdge = m('#d4c5b2', 0.4)

  const foreEdge = wornPaper('#b8a58c', 0.72)
  const pageEdge = wornPaper('#c8b89a', 0.8)
  const endpaperRed = m('#c03030', 0.6)
  const endpaperBlue = m('#3050a0', 0.6)
  const endpaperGold = m('#d4a030', 0.5)
  const endpaperGreen = m('#30a050', 0.6)
  const wearDark = m('#1a1510', 0.9)
  const wearMark = m('#3a3028', 0.85)
  const goldTool = m('#e8c84a', 0.35, 0.5)
  const goldFine = m('#f0d860', 0.3, 0.55)

  interface BookDef {
    title: string
    author: string
    width: number
    depth: number
    thickness: number
    color: ReturnType<typeof wornRough>
    spineTex: ReturnType<typeof wornPaper>
    spinePatina: ReturnType<typeof m>
    endpaper: ReturnType<typeof m>
    hasCloth: boolean
    hasLeather: boolean
    hasMarbled: boolean
    tiltX: number
    tiltZ: number
    ribbon?: string
    ribbonColor?: string
    wearSpots?: [number, number, number][]
  }

  const bookDefs: BookDef[] = [
    { title: 'THE ILIAD', author: 'Homer', width: 0.30, depth: 0.21, thickness: 0.025, color: clothNavy, spineTex: clothCream, spinePatina: m('#d4a030', 0.5, 0.3), endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0, tiltZ: 0, ribbon: '#c03030', wearSpots: [[0.08, 0.005, 0.06], [-0.06, 0.003, 0.04]] },
    { title: 'MIDDLEMARCH', author: 'George Eliot', width: 0.28, depth: 0.19, thickness: 0.032, color: leatherDark, spineTex: wornPaper('#e8dcc8', 0.8), spinePatina: spineGold, endpaper: endpaperGold, hasCloth: false, hasLeather: true, hasMarbled: true, tiltX: 0.03, tiltZ: 0.02, wearSpots: [[0.07, 0.004, 0.05]] },
    { title: 'SHAKESPEARE', author: 'Complete Works', width: 0.34, depth: 0.23, thickness: 0.048, color: clothRed, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: false, tiltX: -0.02, tiltZ: 0.03, ribbon: '#f0d030', ribbonColor: '#f0d030', wearSpots: [[0.09, 0.006, 0.07], [-0.05, 0.003, 0.03]] },
    { title: 'PARADISE LOST', author: 'John Milton', width: 0.29, depth: 0.20, thickness: 0.027, color: clothBrown, spineTex: clothCream, spinePatina: m('#c8942a', 0.5, 0.3), endpaper: endpaperGreen, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.01, tiltZ: -0.01, wearSpots: [[0.06, 0.004, 0.05]] },
    { title: 'PRIDE & PREJUDICE', author: 'Jane Austen', width: 0.26, depth: 0.18, thickness: 0.022, color: clothBurgundy, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperGold, hasCloth: true, hasLeather: false, hasMarbled: false, tiltX: 0.04, tiltZ: -0.02, ribbon: '#4a90c0', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'THE ODYSSEY', author: 'Homer', width: 0.28, depth: 0.19, thickness: 0.024, color: clothGreen, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperGreen, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: -0.01, tiltZ: 0.01, wearSpots: [[0.07, 0.004, 0.06]] },
    { title: 'A TALE OF TWO CITIES', author: 'Dickens', width: 0.31, depth: 0.22, thickness: 0.028, color: clothCharcoal, spineTex: clothCream, spinePatina: m('#e0c878', 0.55, 0.3), endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0, tiltZ: 0, ribbon: '#c03030', wearSpots: [[0.08, 0.005, 0.05], [-0.04, 0.003, 0.03]] },
    { title: 'REBECCA', author: 'Daphne du Maurier', width: 0.27, depth: 0.185, thickness: 0.024, color: moroccoRed, spineTex: vellumMat, spinePatina: spineGold, endpaper: endpaperGold, hasCloth: false, hasLeather: true, hasMarbled: true, tiltX: 0.02, tiltZ: -0.03, wearSpots: [[0.06, 0.004, 0.04]] },
    { title: 'WUTHERING HEIGHTS', author: 'Emily Brontë', width: 0.27, depth: 0.185, thickness: 0.023, color: clothLavender, spineTex: clothCream, spinePatina: m('#a08040', 0.5, 0.25), endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: -0.03, tiltZ: 0.02, ribbon: '#6b8e6b', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'ANNA KARENINA', author: 'Leo Tolstoy', width: 0.32, depth: 0.22, thickness: 0.040, color: clothOlive, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperGreen, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.01, tiltZ: -0.01, wearSpots: [[0.08, 0.005, 0.06], [-0.05, 0.003, 0.03]] },
  ]
  const rightBookDefs: BookDef[] = [
    { title: 'THE GREAT GATSBY', author: 'F. Scott Fitzgerald', width: 0.25, depth: 0.175, thickness: 0.020, color: clothPlum, spineTex: clothCream, spinePatina: m('#c0a050', 0.5, 0.35), endpaper: endpaperGold, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.03, tiltZ: 0.02, ribbon: '#2080b0', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'JANE EYRE', author: 'Charlotte Brontë', width: 0.27, depth: 0.185, thickness: 0.026, color: clothTeal, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: -0.02, tiltZ: -0.02, wearSpots: [[0.06, 0.004, 0.05]] },
    { title: 'THE PICTURE OF DORIAN GRAY', author: 'Oscar Wilde', width: 0.28, depth: 0.19, thickness: 0.024, color: clothRust, spineTex: clothCream, spinePatina: m('#e8c060', 0.55, 0.3), endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: false, tiltX: 0, tiltZ: 0.01, ribbon: '#2a2a5e', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'CRIME AND PUNISHMENT', author: 'Fyodor Dostoevsky', width: 0.29, depth: 0.20, thickness: 0.030, color: clothSlate, spineTex: clothCream, spinePatina: m('#c8a848', 0.5, 0.35), endpaper: endpaperGold, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.02, tiltZ: 0.02, wearSpots: [[0.06, 0.004, 0.05]] },
    { title: 'THE SCARLET LETTER', author: 'Nathaniel Hawthorne', width: 0.26, depth: 0.18, thickness: 0.021, color: clothMaroon, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: -0.01, tiltZ: -0.03, ribbon: '#c03030', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'WAR AND PEACE', author: 'Leo Tolstoy', width: 0.35, depth: 0.24, thickness: 0.046, color: clothIndigo, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.03, tiltZ: 0.01, ribbon: '#d4a030', wearSpots: [[0.09, 0.006, 0.07], [-0.05, 0.003, 0.03]] },
    { title: 'THE COMPLETE POEMS', author: 'John Keats', width: 0.25, depth: 0.175, thickness: 0.019, color: clothWillow, spineTex: clothCream, spinePatina: m('#b08040', 0.5, 0.25), endpaper: endpaperGreen, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0, tiltZ: 0.03, wearSpots: [[0.04, 0.003, 0.03]] },
    { title: 'THE WAVES', author: 'Virginia Woolf', width: 0.24, depth: 0.17, thickness: 0.018, color: linenMat, spineTex: linenMat, spinePatina: m('#8a7a6a', 0.4, 0.1), endpaper: endpaperGold, hasCloth: true, hasLeather: false, hasMarbled: false, tiltX: -0.02, tiltZ: 0.02, ribbon: '#c07040', wearSpots: [[0.04, 0.002, 0.03]] },
    { title: 'MOBY-DICK', author: 'Herman Melville', width: 0.30, depth: 0.21, thickness: 0.036, color: clothGold, spineTex: clothCream, spinePatina: m('#5a3a10', 0.5, 0.3), endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.01, tiltZ: 0.01, wearSpots: [[0.07, 0.004, 0.05]] },
    { title: 'LES MISÉRABLES', author: 'Victor Hugo', width: 0.33, depth: 0.22, thickness: 0.042, color: clothBurgundy, spineTex: clothCream, spinePatina: m('#c0a030', 0.55, 0.35), endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.02, tiltZ: -0.01, ribbon: '#4a90c0', wearSpots: [[0.08, 0.005, 0.06], [-0.04, 0.003, 0.03]] },
  ]

  const buildStack = (books: BookDef[], baseX: number) => {
    const nodes: React.ReactNode[] = []
    let yAcc = 0.009

    books.forEach((b, i) => {
      const tiltX = b.tiltX
      const tiltZ = b.tiltZ
      const cx = baseX + tiltZ * 0.5
      const cz = tiltX * 0.5
      const halfW = b.width / 2
      const halfD = b.depth / 2
      const midY = yAcc + b.thickness / 2
      const spineSide = -halfW - (b.hasLeather ? 0.007 : 0.005)
      const clampX = -halfW
      const dotSideZ = 1

      nodes.push(
        <group key={`book-${baseX}-${i}`} position={[cx, midY, cz]} rotation={[tiltX, 0, tiltZ]}>
          <mesh geometry={boxGeo(b.width, b.thickness, b.depth)} material={b.color} position={[0, 0, 0]} />
          <mesh geometry={boxGeo(b.width * 0.02, b.thickness * 0.9, b.depth * 0.02)} material={foreEdge} position={[halfW - 0.001, 0, 0]} />
          {b.hasCloth && <mesh geometry={boxGeo(0.004, b.thickness + 0.001, b.depth)} material={b.color} position={[clampX, 0, 0]} />}
          {b.hasLeather && (
            <mesh
              geometry={boxGeo(0.005, b.thickness + 0.0008, b.depth + 0.001)}
              material={b.color}
              position={[clampX + dotSideZ * 0.001, 0, 0]}
            />
          )}
          <group position={[spineSide, 0, 0]}>
            <mesh geometry={boxGeo(0.001, b.thickness + 0.0002, b.depth)} material={b.spineTex} />
            {Array.from({ length: 10 }).map((_, bi) => {
              const bandY = -b.thickness / 2 + (bi + 1) * (b.thickness / 11)
              return <mesh key={`band-${bi}`} geometry={boxGeo(0.0018, 0.0018, b.depth + 0.004)} material={b.spinePatina} position={[dotSideZ * 0.001, bandY, 0]} />
            })}
            <mesh geometry={boxGeo(0.0018, b.thickness * 0.22, b.depth * 0.7)} material={spineGold} position={[dotSideZ * 0.001, b.thickness * 0.42, 0]} />
            <mesh geometry={boxGeo(0.0018, b.thickness * 0.14, b.depth * 0.6)} material={spineGold} position={[dotSideZ * 0.001, b.thickness * 0.22, 0]} />
            <mesh geometry={boxGeo(0.0012, b.thickness * 0.08, b.depth * 0.5)} material={goldTool} position={[dotSideZ * 0.001, b.thickness * 0.55, 0]} />
            <mesh geometry={boxGeo(0.0012, b.thickness * 0.06, b.depth * 0.45)} material={goldFine} position={[dotSideZ * 0.001, b.thickness * 0.65, 0]} />
            {b.hasMarbled && (
              <>
                <mesh geometry={boxGeo(0.0016, b.thickness * 0.06, b.depth * 0.85)} material={marbledEdge} position={[dotSideZ * 0.001, b.thickness * 0.48, 0]} />
                <mesh geometry={boxGeo(0.0016, b.thickness * 0.06, b.depth * 0.85)} material={marbledEdge} position={[dotSideZ * 0.001, -b.thickness * 0.48, 0]} />
                <mesh geometry={boxGeo(0.0014, b.thickness * 0.04, b.depth * 0.75)} material={marbledEdge} position={[dotSideZ * 0.001, b.thickness * 0.35, 0]} />
                <mesh geometry={boxGeo(0.0014, b.thickness * 0.04, b.depth * 0.75)} material={marbledEdge} position={[dotSideZ * 0.001, -b.thickness * 0.35, 0]} />
              </>
            )}
            {[b.depth * 0.38, -b.depth * 0.38].map((dz) => (
              <mesh key={`dot-${dz}`} geometry={sphereGeo(0.0015)} material={spineGold} position={[dotSideZ * 0.001, b.thickness * 0.42, dz]} />
            ))}
            {[b.depth * 0.25, -b.depth * 0.25].map((dz) => (
              <mesh key={`dot2-${dz}`} geometry={sphereGeo(0.001)} material={goldFine} position={[dotSideZ * 0.001, b.thickness * 0.58, dz]} />
            ))}
            <mesh geometry={boxGeo(0.001, b.thickness * 0.12, b.depth * 0.5)} material={b.endpaper} position={[dotSideZ * 0.001, b.thickness * 0.7, 0]} />
            <mesh geometry={boxGeo(0.001, b.thickness * 0.12, b.depth * 0.5)} material={b.endpaper} position={[dotSideZ * 0.001, -b.thickness * 0.7, 0]} />
          </group>
          {b.ribbon && (
            <group position={[b.width * 0.22, -b.thickness / 2 - 0.0005, 0]}>
              <mesh geometry={boxGeo(0.007, b.thickness * 0.45, 0.004)} material={m(b.ribbon, 0.7, 0.05)} />
              <mesh geometry={boxGeo(0.006, 0.06, 0.003)} material={m(b.ribbon, 0.65, 0.05)} position={[0, -b.thickness * 0.22, 0.002]} />
              <mesh geometry={boxGeo(0.003, 0.03, 0.002)} material={m(b.ribbon, 0.6, 0.05)} position={[0.002, -b.thickness * 0.35, 0.003]} />
            </group>
          )}
          {b.wearSpots && b.wearSpots.map(([wx, wy, wz], wi) => (
            <mesh key={`wear-${i}-${wi}`} geometry={sphereGeo(0.003)} material={wearDark} position={[wx, wy, wz]} />
          ))}
          <mesh geometry={boxGeo(b.width * 0.02, b.thickness * 0.5, b.depth * 0.02)} material={wearMark} position={[clampX + 0.002, 0, halfD - 0.01]} />
          <mesh geometry={boxGeo(b.width * 0.02, b.thickness * 0.5, b.depth * 0.02)} material={wearMark} position={[clampX + 0.002, 0, -halfD + 0.01]} />
          {Array.from({ length: 8 }).map((_, pi) => {
            const py = -b.thickness / 2 + (pi + 0.5) * (b.thickness / 8)
            return <mesh key={`page-${pi}`} geometry={boxGeo(b.width * 0.98, 0.0008, b.depth * 0.95)} material={pageEdge} position={[0, py, 0]} />
          })}
          <mesh geometry={boxGeo(b.width * 0.015, b.thickness * 0.9, b.depth * 0.01)} material={goldTool} position={[halfW - 0.002, 0, 0]} />
          <mesh geometry={boxGeo(b.width * 0.015, b.thickness * 0.9, b.depth * 0.01)} material={goldTool} position={[-halfW + 0.002, 0, 0]} />
        </group>,
      )
      yAcc += b.thickness
    })

    const stackW = 0.36
    const stackD = 0.26
    return (
      <group key={`stack-${baseX}`} position={[baseX, 0, 0]}>
        <mesh geometry={boxGeo(stackW, 0.012, stackD)} material={foreEdge} position={[0, 0.006, 0]} castShadow />
        <mesh geometry={boxGeo(stackW * 0.95, 0.002, stackD * 0.95)} material={wearMark} position={[0, 0.003, 0]} />
        {nodes}
      </group>
    )
  }

  const LEFT_X = -0.26
  const RIGHT_X = 0.26

  return (
    <group position={[0, 0, 0]}>
      {buildStack(bookDefs, LEFT_X)}
      {buildStack(rightBookDefs, RIGHT_X)}
    </group>
  )
}
  case 'do_not_disturb_poster': {
    // Classic hotel-style door sign: carved wooden post with a finial and
    // foot plate, a brass hook, a rope-hung light-wood plaque painted with
    // DO NOT DISTURB, a crescent-moon + Zzz motif and a focus note.
    const postMat = tm('#5a3a22', 0.6, 0, 'wood', 2, 2)
    const postDark = tm('#4a2e18', 0.65, 0, 'wood')
    const plaqueMat = tm('#e8dcc8', 0.55, 0, 'wood', 1, 1)
    const brass = m('#b8860b', 0.4, 0.8)
    const redMat = m('#a02020', 0.55)
    const inkMat = m('#2b2b2b', 0.6)
    const ropeMat = m('#d8c9a0', 0.7)
    return (
      <group>
        {/* foot plate */}
        <mesh geometry={taperGeo(0.09, 0.07, 0.02)} material={postDark} position={[0, 0.01, 0]} castShadow />
        {/* post: base collar, straight shaft, slim neck — sits on the foot plate */}
        <mesh geometry={latheGeo([[0.016, 0], [0.024, 0.006], [0.026, 0.022], [0.02, 0.05], [0.017, 0.4], [0.013, 0.43], [0.013, 0.46]])} material={postMat} position={[0, 0.02, 0]} castShadow />
        {/* finial ball on top of the post */}
        <mesh geometry={sphereGeo(0.017)} material={postDark} position={[0, 0.49, 0]} castShadow />
        {/* brass hook near the top, facing the viewer */}
        <mesh geometry={torusGeo(0.013, 0.003, 10, 24)} material={brass} position={[0, 0.4, 0.032]} rotation={[Math.PI / 2, 0, 0]} />
        {/* hanging plaque, slight natural tilt */}
        <group position={[0, 0.3, 0.035]} rotation={[0, 0, 0.025]}>
          {/* rope hanger (in front of the top rail) + brass ring looped over the hook */}
          <mesh geometry={boxGeo(0.008, 0.035, 0.008)} material={ropeMat} position={[0, 0.0835, 0.012]} />
          <mesh geometry={torusGeo(0.006, 0.0025, 8, 20)} material={brass} position={[0, 0.095, 0]} />
          {/* plaque board + wooden frame */}
          <mesh geometry={boxGeo(0.34, 0.26, 0.018)} material={plaqueMat} position={[0, -0.075, 0]} castShadow />
          <mesh geometry={boxGeo(0.36, 0.014, 0.022)} material={postDark} position={[0, 0.048, 0]} />
          <mesh geometry={boxGeo(0.36, 0.014, 0.022)} material={postDark} position={[0, -0.198, 0]} />
          <mesh geometry={boxGeo(0.014, 0.26, 0.022)} material={postDark} position={[-0.175, -0.075, 0]} />
          <mesh geometry={boxGeo(0.014, 0.26, 0.022)} material={postDark} position={[0.175, -0.075, 0]} />
          {/* red header band with title */}
          <mesh geometry={boxGeo(0.34, 0.062, 0.019)} material={redMat} position={[0, 0.02, 0]} />
          <Text fontSize={0.03} color="#fdf6ec" anchorX="center" anchorY="middle" position={[0, 0.02, 0.012]}>
            DO NOT DISTURB
          </Text>
          {/* crescent moon motif — dark disc, carved from the left so the
              crescent bulges right and opens left, like the classic moon */}
          <mesh geometry={circleGeo(0.028)} material={inkMat} position={[-0.055, -0.05, 0.011]} />
          <mesh geometry={circleGeo(0.026)} material={plaqueMat} position={[-0.075, -0.05, 0.012]} />
          {/* Zzz */}
          <Text fontSize={0.03} color="#a02020" anchorX="center" anchorY="middle" position={[0.06, -0.045, 0.011]}>
            z Z z
          </Text>
          {/* focus note */}
          <Text fontSize={0.014} color="#5a4632" anchorX="center" anchorY="middle" position={[0, -0.13, 0.011]}>
            FOCUS MODE ON
          </Text>
          <Text fontSize={0.014} color="#a02020" anchorX="center" anchorY="middle" position={[0, -0.178, 0.011]}>
            PLEASE KNOCK
          </Text>
        </group>
      </group>
    )
  }
  case 'trading_desktop_3side': {
    const frameMat = tm('#141820', 0.35, 0.2, 'wood')
    const standMat = tm('#1c1c22', 0.38, 0.22, 'wood')
    const bgMat = m('#06080c', 0.95)
    return (
      <group>
        <mesh geometry={boxGeo(0.72, 0.015, 0.35)} material={standMat} position={[0, 0.007, 0]} castShadow />
        {/* center — primary chart panel with price/time scales */}
        <group position={[0, 0.16, 0]}>
          <mesh geometry={boxGeo(0.02, 0.28, 0.32)} material={frameMat} position={[0, 0.14, 0]} castShadow />
          <mesh geometry={boxGeo(0.003, 0.24, 0.28)} material={bgMat} position={[0.008, 0.14, 0]} />
          <group position={[0.008, 0.14, 0]} rotation={[0, Math.PI / 2, 0]}>
            <TradingChartUI cx={0} cy={0} w={0.22} h={0.22} depth={0.002} />
          </group>
        </group>
        {/* left — labeled order book */}
        <group position={[-0.27, 0.16, 0]}>
          <mesh geometry={boxGeo(0.02, 0.28, 0.32)} material={frameMat} position={[0, 0.14, 0]} castShadow />
          <mesh geometry={boxGeo(0.003, 0.24, 0.28)} material={bgMat} position={[0.008, 0.14, 0]} />
          <group position={[0.008, 0.14, 0]} rotation={[0, Math.PI / 2, 0]}>
            <OrderBookUI cx={0} cy={0} w={0.22} h={0.24} depth={0.002} />
          </group>
        </group>
        {/* right — positions panel */}
        <group position={[0.27, 0.16, 0]}>
          <mesh geometry={boxGeo(0.02, 0.28, 0.32)} material={frameMat} position={[0, 0.14, 0]} castShadow />
          <mesh geometry={boxGeo(0.003, 0.24, 0.28)} material={bgMat} position={[0.008, 0.14, 0]} />
          <group position={[0.008, 0.14, 0]} rotation={[0, Math.PI / 2, 0]}>
            <PositionsUI cx={0} cy={0} w={0.22} h={0.24} depth={0.002} />
          </group>
        </group>
      </group>
    )
  }
  case 'water_bottle': {
    // Brushed stainless bottle with a dark cap and a blue wrap band.
    const steel = m('#aeb6bf', 0.22, 0.9)
    const steelDark = m('#6f7782', 0.3, 0.85)
    const capMat = m('#2a2d33', 0.35, 0.6)
    const bandMat = m('#3a6ea5', 0.45, 0.3)
    return (
      <group>
        <mesh geometry={latheGeo([
          [0.042, 0], [0.045, 0.005], [0.044, 0.02], [0.049, 0.06], [0.052, 0.12], [0.048, 0.15], [0.042, 0.16],
        ])} material={steel} castShadow />
        {/* shoulder flaring up into the neck */}
        <mesh geometry={latheGeo([
          [0.042, 0.16], [0.05, 0.17], [0.026, 0.185], [0.022, 0.19],
        ])} material={steel} />
        {/* screw cap */}
        <mesh geometry={taperGeo(0.024, 0.024, 0.02)} material={capMat} position={[0, 0.205, 0]} />
        <mesh geometry={torusGeo(0.028, 0.0035, 8, 24)} material={steelDark} position={[0, 0.19, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {/* blue wrap band */}
        <mesh geometry={torusGeo(0.0515, 0.005, 8, 32)} material={bandMat} position={[0, 0.085, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    )
  }
  case 'headphones': {
    // Over-ear headphones standing upright: top arc band + two leather pads.
    const bandMat = m('#22252b', 0.3, 0.55)
    const cupMat = m('#14161b', 0.4, 0.6)
    const padMat = tm('#4a5162', 0.85, 0, 'leather')
    const accentMat = glowMaterial('#4a86ff', 1.0)
    return (
      <group>
        <mesh geometry={arcBandGeo(0.06, 0.011)} material={bandMat} position={[0, 0.06, 0]} castShadow />
        {[-1, 1].map((sx) => (
          <group key={`cup${sx}`} position={[sx * 0.057, 0.05, 0]}>
            <mesh geometry={boxGeo(0.052, 0.075, 0.028)} material={cupMat} castShadow />
            <mesh geometry={boxGeo(0.056, 0.078, 0.012)} material={padMat} position={[sx * 0.014, 0, 0]} />
            <mesh geometry={circleGeo(0.006)} material={accentMat} position={[sx * 0.011, 0, 0.012]} />
          </group>
        ))}
      </group>
    )
  }
  case 'desk_lamp': {
    // Articulated study lamp: weighted base, tilt hinge, angled shade + glow bulb.
    const baseMat = m('#3a3f4b', 0.4, 0.5)
    const armMat = m('#2b2f38', 0.35, 0.6)
    const shadeMat = m('#1f6f4a', 0.45, 0.2)
    const innerMat = glowMaterial('#ffd9a8', 1.2)
    const jointMat = m('#caa24a', 0.3, 0.6)
    return (
      <group>
        <mesh geometry={taperGeo(0.09, 0.08, 0.025)} material={baseMat} position={[0, 0.0125, 0]} castShadow />
        <mesh geometry={boxGeo(0.022, 0.16, 0.022)} material={armMat} position={[0, 0.105, 0]} />
        <mesh geometry={sphereGeo(0.018)} material={jointMat} position={[0, 0.19, 0]} />
        <mesh geometry={boxGeo(0.02, 0.17, 0.02)} material={armMat} position={[0.035, 0.26, 0]} rotation={[0, 0, -0.45]} />
        <group position={[0.1, 0.335, 0]} rotation={[0, 0, 0.5]}>
          <mesh geometry={taperGeo(0.022, 0.055, 0.05)} material={shadeMat} castShadow />
          <mesh geometry={sphereGeo(0.018)} material={innerMat} position={[0, -0.024, 0]} />
        </group>
      </group>
    )
  }
  case 'plant': {
    // Deep-upgraded potted plant: ceramic pot on a saucer with a rolled rim and
    // grooved waist, pebbled soil, and a swaying crown of curved stems, real
    // teardrop leaves in three green shades, a daisy bloom, dew and a ladybug.
    const potMat = tm('#bd6337', 0.6, 0, 'ceramic')
    const potDark = m('#9c4f2c', 0.65, 0.02)
    const rimMat = tm('#c87042', 0.55, 0, 'ceramic')
    const soilMat = m('#38220f', 0.95)
    const pebbleA = m('#8a6b52', 0.9)
    const pebbleB = m('#6e6157', 0.85)
    const pebbleC = m('#a8907a', 0.9)
    return (
      <group>
        {/* saucer dish */}
        <mesh geometry={latheGeo([[0.072, 0], [0.078, 0.003], [0.083, 0.011], [0.08, 0.015], [0.058, 0.011]])} material={potDark} position={[0, -0.012, 0]} castShadow />
        {/* pot body — flares gently toward the top */}
        <mesh geometry={latheGeo([[0.05, 0], [0.056, 0.02], [0.064, 0.06], [0.068, 0.1], [0.062, 0.112]])} material={potMat} castShadow />
        {/* rolled rim */}
        <mesh geometry={torusGeo(0.066, 0.009)} material={rimMat} position={[0, 0.116, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
        {/* grooved band at the waist */}
        <mesh geometry={torusGeo(0.0625, 0.003)} material={potDark} position={[0, 0.052, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {/* soil mound with pebbles */}
        <mesh geometry={sphereGeo(0.06)} material={soilMat} position={[0, 0.114, 0]} scale={[1, 0.32, 1]} />
        {[[0.028, 0.13, 0.02], [-0.026, 0.128, -0.024], [0.018, 0.135, -0.03], [-0.03, 0.132, 0.018]].map(([px, py, pz], i) => (
          <mesh key={`pb${i}`} geometry={sphereGeo(0.0045)} material={i % 2 ? pebbleB : pebbleA} position={[px, py, pz]} scale={[1, 0.7, 1]} castShadow />
        ))}
        <mesh geometry={sphereGeo(0.0032)} material={pebbleC} position={[-0.008, 0.134, 0.036]} />
        {/* foliage — gently swaying */}
        <PlantFoliage />
      </group>
    )
  }
  case 'study_timer': {
    // Classic mechanical "tick-tick" kitchen-style countdown timer for study
    // sessions. The hand is LIVE: it sweeps clockwise as the real pomodoro
    // countdown ticks down, and a little red flag pops when the timer rings.
    // No audio — just the working visual.
    const bodyRed = m('#c8452c', 0.5, 0.05)
    const bodyDark = m('#9e3220', 0.55, 0.05)
    const cream = m('#f7efdd', 0.85, 0)
    const ink = m('#2b2118', 0.9, 0)
    const chrome = m('#c9ced6', 0.2, 0.8)
    const brass = m('#caa24a', 0.35, 0.65)
    const rubber = m('#1d1f26', 0.9, 0)

    const handRef = useRef<any>(null)
    const flagRef = useRef<any>(null)
    useFrame(() => {
      if (!handRef.current) return
      // Read the LIVE pomodoro state directly (no React re-render on every
      // tick — the hand just moves). Sweep clockwise from 12 o'clock as the
      // countdown burns down: full = 2π (top), zero = 0 (top again), the hand
      // physically rotates the whole way around like a real mechanical timer.
      const { phase, remaining, sessionMinutes } = usePomodoro.getState()
      const total = Math.max(1, sessionMinutes * 60)
      const frac = Math.min(1, Math.max(0, remaining / total))
      handRef.current.rotation.z = frac * Math.PI * 2
      // Pop the red flag when the session is finished / timer rang.
      if (flagRef.current) {
        const done = phase === 'finished' || (phase !== 'idle' && remaining <= 0)
        flagRef.current.position.y = done ? 0.155 : 0.13
      }
    })

    // 12 minute ticks around the dial (5-min spacing) with longer marks at :00
    const ticks: JSX.Element[] = []
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const major = i % 3 === 0 // :00 :15 :30 :45 get longer ticks
      ticks.push(
        <mesh
          key={`tk${i}`}
          geometry={boxGeo(0.004, major ? 0.02 : 0.011, 0.0015)}
          material={ink}
          position={[Math.sin(a) * 0.055, 0.05 + Math.cos(a) * 0.055, 0.0805]}
          rotation={[0, 0, -a]}
        />
      )
    }

    return (
      <group>
        {/* three rubber feet */}
        {[[0.05, 0], [-0.025, 0.0433], [-0.025, -0.0433]].map(([fx, fz], i) => (
          <mesh key={`ft${i}`} geometry={sphereGeo(0.009)} material={rubber} position={[fx, 0.006, fz]} scale={[1, 0.6, 1]} castShadow />
        ))}

        {/* main drum body — red rounded drum with a subtle taper */}
        <mesh geometry={latheGeo([
          [0.07, 0], [0.078, 0.006], [0.08, 0.02], [0.076, 0.055],
          [0.07, 0.075], [0.058, 0.09], [0.042, 0.096], [0.022, 0.099], [0, 0.1],
        ])} material={bodyRed} position={[0, 0.004, 0]} castShadow />
        {/* brass top rim */}
        <mesh geometry={torusGeo(0.072, 0.0035)} material={brass} position={[0, 0.098, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {/* bell on top + finial */}
        <mesh geometry={domeGeo(0.024)} material={chrome} position={[0, 0.11, 0]} castShadow />
        <mesh geometry={sphereGeo(0.007)} material={brass} position={[0, 0.132, 0]} />
        {/* red flag on a stalk (pops when timer rings) */}
        <group position={[0.055, 0, 0]}>
          <mesh geometry={boxGeo(0.003, 0.055, 0.003)} material={chrome} position={[0, 0.115, 0]} />
          <group ref={flagRef} position={[0.008, 0.13, 0]}>
            <mesh geometry={boxGeo(0.022, 0.014, 0.004)} material={bodyRed} position={[0.011, 0, 0]} />
          </group>
        </group>

        {/* cream dial face with chrome bezel */}
        <mesh geometry={circleGeo(0.062)} material={cream} position={[0, 0.05, 0.0785]} />
        <mesh geometry={torusGeo(0.062, 0.003)} material={chrome} position={[0, 0.05, 0.078]} rotation={[Math.PI / 2, 0, 0]} />
        {ticks}
        {/* minute numerals — inside the ticks, clear of the dial edge */}
        <Text fontSize={0.009} color="#2b2118" anchorX="center" anchorY="middle" position={[0, 0.093, 0.0805]}>60</Text>
        <Text fontSize={0.009} color="#2b2118" anchorX="center" anchorY="middle" position={[0.043, 0.05, 0.0805]}>15</Text>
        <Text fontSize={0.009} color="#2b2118" anchorX="center" anchorY="middle" position={[0, 0.007, 0.0805]}>30</Text>
        <Text fontSize={0.009} color="#2b2118" anchorX="center" anchorY="middle" position={[-0.043, 0.05, 0.0805]}>45</Text>

        {/* live sweeping hand + centre hub */}
        <group ref={handRef} position={[0, 0.05, 0.082]}>
          <mesh geometry={boxGeo(0.005, 0.056, 0.002)} material={ink} position={[0, 0.027, 0]} />
          <mesh geometry={boxGeo(0.012, 0.012, 0.003)} material={chrome} position={[0, 0, 0]} />
          <mesh geometry={sphereGeo(0.005)} material={bodyDark} position={[0, 0, 0.002]} />
        </group>
      </group>
    )
  }
  default:
      return null
  }
}

/** Circular studio dining table. The single chosen accessory sits on top. */
export function BigDiningTable({ accessory }: { accessory?: string }) {
  const R = 1.18
  const H = 0.92
  const oak = oakWood()
  const oakTop = new MeshStandardMaterial({
    color: '#caa069',
    map: oak.map,
    normalMap: oak.normal,
    roughnessMap: oak.rough,
    roughness: 0.7,
    metalness: 0,
  })
  oakTop.map!.repeat.set(7, 7)
  oakTop.normalMap!.repeat.set(7, 7)
  oakTop.roughnessMap!.repeat.set(7, 7)
  const woodDark = tm('#4f3621', 0.65, 0, 'wood', 3, 1)
  const dust = dustDecals()
  const top = accessory ? <group position={[0, H + 0.03, 0]} scale={1.5}><AccessoryModel id={accessory as AccessoryId} /></group> : null
  return (
    <group>
      {/* round top */}
      <mesh geometry={taperGeo(R, R, 0.06)} material={oakTop} position={[0, H, 0]} receiveShadow />
      {/* bevelled edge */}
      <mesh geometry={torusGeo(R, 0.025, 12, 48)} material={woodDark} position={[0, H + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* pedestal */}
      <mesh geometry={taperGeo(0.14, 0.2, H - 0.06)} material={woodDark} position={[0, (H - 0.06) / 2, 0]} castShadow />
      {/* foot */}
      <mesh geometry={taperGeo(0.52, 0.52, 0.05)} material={oakTop} position={[0, 0.025, 0]} castShadow />
      {/* ambient occlusion / contact darkening under the accessory */}
      {top && (
        <mesh geometry={circleGeo(0.42)} material={m('#140c04', 0.55)} rotation={[-Math.PI / 2, 0, 0]} position={[0, H + 0.031, 0]} />
      )}
      {/* dust + faint scuffs scattered on the boards */}
      {dust.map((t, i) => (
        <mesh key={`dust${i}`} geometry={circleGeo(0.18 + (i % 3) * 0.07)} rotation={[-Math.PI / 2, 0, (i * 1.7) % Math.PI]} position={[(i - 2) * 0.22, H + 0.032, (i % 2 ? 0.3 : -0.3)]}>
          <meshBasicMaterial map={t} transparent depthWrite={false} opacity={0.7} />
        </mesh>
      ))}
      {top}
    </group>
  )
}

/** A small study desk holding the equipped accessories, parented to the avatar so
 *  it travels with the character (visible in the library hall). */
export function AccessoryTray({ accessories }: { accessories?: string[] }) {
  const ids = (accessories ?? []).filter((a) => ACCESSORIES.some((d) => d.id === a)) as AccessoryId[]
  if (ids.length === 0) return null

  const cols = Math.min(4, ids.length)
  const rows = Math.ceil(ids.length / cols)
  const slot = 0.46
  const deskW = cols * slot + 0.18
  const deskD = rows * slot + 0.18
  const deskTop = 0.2

  return (
    <group>
      {/* desk top */}
      <mesh geometry={boxGeo(deskW, 0.03, deskD)} material={tm('#6b4a2e', 0.7, 0, 'wood', 3, 1)} position={[0, deskTop, 0]} castShadow />
      {/* legs */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} geometry={boxGeo(0.04, deskTop, 0.04)} material={tm('#4f3621', 0.7, 0, 'wood', 1, 1)}
          position={[sx * (deskW / 2 - 0.05), deskTop / 2, sz * (deskD / 2 - 0.05)]} />
      ))}
      {ids.map((id, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = (col - (cols - 1) / 2) * slot
        const z = (row - (rows - 1) / 2) * slot
        return (
          <group key={`${id}-${i}`} position={[x, deskTop + 0.015, z]}>
            <AccessoryModel id={id} />
          </group>
        )
      })}
    </group>
  )
}
