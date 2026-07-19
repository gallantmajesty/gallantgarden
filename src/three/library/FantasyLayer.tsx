import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending, CanvasTexture, DoubleSide, MeshBasicMaterial,
  MeshStandardMaterial, SRGBColorSpace,
} from 'three'
import { HALL, WINDOW, windowStep, windowZs } from './layout'
import { env } from './env'
import { useSettings } from '../../store/settings'
import { throttle } from '../../lib/frameThrottle'

/**
 * The "Fantasy first" magical layer — purely additive / emissive, zero extra
 * real lights, and gated behind the same particle budget as Aurora/Fireflies so
 * it sheds on low-end presets. Two self-contained pieces:
 *
 *   1. Glowing floor magic-circles — a large rune ring framing the Knowledge Tree
 *      dais plus four smaller circles at the cardinal points. Emissive + an
 *      additive halo so they read as glowing even without the cinematic bloom pass.
 *   2. Volumetric window light-shafts — soft additive beams standing just inside
 *      each tall stained-glass bay, brightest by day, faint at night.
 *
 * Everything is generated procedurally (no asset files) and memoised once.
 */

/* ------------------------------------------------------------------ */
/* Procedural textures                                                */
/* ------------------------------------------------------------------ */

function makeRuneCircleTexture(): CanvasTexture {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.translate(S / 2, S / 2)
  const gold = '#ffd58a'
  const violet = '#9a78ff'

  ctx.strokeStyle = gold
  ctx.lineWidth = 6
  ctx.beginPath(); ctx.arc(0, 0, S * 0.46, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(0, 0, S * 0.40, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, S * 0.22, 0, Math.PI * 2); ctx.stroke()

  const spokes = 12
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2
    ctx.strokeStyle = i % 3 === 0 ? violet : gold
    ctx.lineWidth = i % 3 === 0 ? 4 : 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * S * 0.22, Math.sin(a) * S * 0.22)
    ctx.lineTo(Math.cos(a) * S * 0.40, Math.sin(a) * S * 0.40)
    ctx.stroke()
  }
  for (let i = 0; i < spokes * 2; i++) {
    const a = (i / (spokes * 2)) * Math.PI * 2
    ctx.fillStyle = gold
    ctx.beginPath()
    ctx.arc(Math.cos(a) * S * 0.43, Math.sin(a) * S * 0.43, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = violet
  ctx.beginPath()
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? S * 0.18 : S * 0.07
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath(); ctx.fill()

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** Soft radial alpha glow used for the additive halo under each rune circle. */
function makeGlowTexture(): CanvasTexture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,222,150,0.9)')
  g.addColorStop(0.5, 'rgba(180,140,255,0.35)')
  g.addColorStop(1, 'rgba(180,140,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return new CanvasTexture(c)
}

/** Horizontal band gradient: transparent edges, bright centre — a soft vertical
 *  beam of window light. Symmetric so it reads the same from either side. */
function makeShaftTexture(): CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = S
  c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, S, 0)
  g.addColorStop(0.0, 'rgba(255,238,196,0)')
  g.addColorStop(0.5, 'rgba(255,238,196,1)')
  g.addColorStop(1.0, 'rgba(255,238,196,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, 256)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/* ------------------------------------------------------------------ */
/* Components                                                         */
/* ------------------------------------------------------------------ */

function RuneCircle({
  x, z, r, circleTex, glowTex,
}: { x: number; z: number; r: number; circleTex: CanvasTexture; glowTex: CanvasTexture }) {
  const matRef = useRef<MeshStandardMaterial>(null)
  const haloRef = useRef<MeshBasicMaterial>(null)

  useFrame((state) => {
    if (!throttle(20, performance.now())) return
    const t = state.clock.elapsedTime
    const pulse = 0.85 + Math.sin(t * 0.7 + x * 0.3 + z * 0.3) * 0.15
    const night = useSettings.getState().nightMode
    // at night the floor runes stay subtle so the glow is local to the lanterns,
    // not a bright ring washing the whole floor
    const nightMul = night ? 0.25 : 1
    if (matRef.current) matRef.current.emissiveIntensity = (0.8 + (1 - env.dayFactor) * 0.7) * pulse * nightMul
    if (haloRef.current) haloRef.current.opacity = (0.22 + (1 - env.dayFactor) * 0.3) * pulse * nightMul
  })

  return (
    <group position={[x, 0.02, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r, 48]} />
        <meshStandardMaterial
          ref={matRef}
          map={circleTex}
          emissive="#ffcf8a"
          emissiveMap={circleTex}
          emissiveIntensity={0.9}
          transparent
          opacity={0.95}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[r * 1.15, 48]} />
        <meshBasicMaterial
          ref={haloRef}
          map={glowTex}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function LightShafts() {
  const grad = useMemo(makeShaftTexture, [])
  const { halfW, halfL } = HALL
  const zs = useMemo(() => windowZs(), [])
  const step = windowStep()
  const sillY = WINDOW.sillY
  const headY = WINDOW.headY
  const h = headY - sillY
  const midY = (sillY + headY) / 2

  // One shared additive material for every shaft so a single opacity write
  // animates the whole bank (cheap — no per-mesh state).
  const shaftMat = useMemo(
    () => new MeshBasicMaterial({
      map: grad,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
      opacity: 0.3,
    }),
    [grad],
  )

  useFrame((state) => {
    if (!throttle(20, performance.now())) return
    const day = env.dayFactor
    const flick = 0.9 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    shaftMat.opacity = (0.1 + day * 0.25) * flick
  })

  const shafts: JSX.Element[] = []
  for (const s of [-1, 1]) {
    const x = s * (halfW + 0.3)
    for (const z of zs) {
      shafts.push(
        <mesh
          key={`${s}-${z}`}
          position={[x - s * 0.6, midY, z]}
          rotation={[0, -Math.PI / 2, 0]}
          material={shaftMat}
        >
          <planeGeometry args={[step * 0.8, h]} />
        </mesh>,
      )
    }
  }
  return <>{shafts}</>
}

export function FantasyLayer() {
  const circleTex = useMemo(makeRuneCircleTexture, [])
  const glowTex = useMemo(makeGlowTexture, [])

  const spots = useMemo(() => {
    const arr = [{ x: 0, z: 0, r: 5.4 }]
    const R = 6.8
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      arr.push({ x: Math.cos(a) * R, z: Math.sin(a) * R, r: 1.6 })
    }
    return arr
  }, [])

  return (
    <group>
      {spots.map((p, i) => (
        <RuneCircle key={i} x={p.x} z={p.z} r={p.r} circleTex={circleTex} glowTex={glowTex} />
      ))}
      <LightShafts />
    </group>
  )
}
