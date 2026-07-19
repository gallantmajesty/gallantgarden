import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CanvasTexture,
  DoubleSide,
  MeshStandardMaterial,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three'
import { HALL } from './layout'
import { staircases, columns } from './furniture'
import { InstancedBoxes } from './Instanced'
import { useSettings } from '../../store/settings'
import { throttle } from '../../lib/frameThrottle'

/**
 * Night-only magical layer — the Harry-Potter Great-Hall feel. Mounted ONLY when
 * nightMode is on, so the bright daytime scene is completely untouched and there
 * is zero cost by day. Contains:
 *   • EnchantedCeiling — the famous starry night sky overhead (drifting stars +
 *     slow nebula). Rendered TRANSPARENT so the real stone roof + beams still show
 *     through — a dark magical sky, not a removed roof.
 *   • FloorRuneRing — a glowing magic sigil on the floor under the centre, so the
 *     hall has a focal pool of light at its heart.
 *   • CarpetGlow — the central foot-path runner glows with the same warm yellow
 *     rune light as the floor ring.
 *   • StairGlow — the grand staircases get glowing tread edges, so they read as
 *     enchanted ramps climbing to the balcony.
 *   • PillarRunes — glowing carved sigil bands up the columns.
 *   • PotionBottles — dark, magical glowing bottles hung on the pillars (the
 *     "hey bottle" potion look). Emissive + bloom only, no real lights, so they
 *     stay cheap at night.
 */

/* ------------------------------------------------------------------ */
/* Enchanted ceiling — starfield + nebula shader                       */
/* ------------------------------------------------------------------ */
function EnchantedCeiling() {
  const mat = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 } }),
    [],
  )
  useFrame((s) => {
    if (!throttle(20, performance.now())) return
    if (mat.current) mat.current.uniforms.uTime.value = s.clock.elapsedTime
  })
  const { halfW, halfL, wallH } = HALL
  return (
    <mesh position={[0, wallH + 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[halfW * 2 - 0.4, halfL * 2 - 0.4]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        side={DoubleSide}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `}
        fragmentShader={`
          precision highp float;
          varying vec2 vUv;
          uniform float uTime;

          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float star(vec2 uv, float density, float sz){
            vec2 g = floor(uv*density);
            float h = hash(g);
            if(h < 0.965) return 0.0;
            vec2 f = fract(uv*density) - 0.5;
            float d = length(f);
            float tw = 0.6 + 0.4*sin(uTime*2.0 + h*40.0);
            return smoothstep(sz, 0.0, d) * tw;
          }
          void main(){
            vec2 uv = vUv;
            // deep midnight blue base (kept translucent so the stone roof reads through)
            vec3 col = vec3(0.02,0.03,0.10);
            // slow nebula wash
            float n = sin(uv.x*3.0 + uTime*0.05)*0.5 + 0.5;
            float n2 = sin(uv.y*4.0 - uTime*0.04)*0.5 + 0.5;
            vec3 neb = mix(vec3(0.06,0.04,0.16), vec3(0.12,0.07,0.20), n*n2);
            col += neb*0.22;
            // three layers of stars at different scales
            float s = 0.0;
            s += star(uv, 60.0, 0.06);
            s += star(uv+5.3, 110.0, 0.05)*0.8;
            s += star(uv+11.7, 180.0, 0.04)*0.6;
            col += vec3(0.9,0.85,0.7)*s;
            gl_FragColor = vec4(col, 0.5);
          }
        `}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Glowing floor rune ring under the centre                            */
/* ------------------------------------------------------------------ */
function makeRuneRingTexture(): CanvasTexture {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, S, S)
  const cx = S / 2
  const cy = S / 2
  ctx.translate(cx, cy)
  ctx.lineCap = 'round'
  // outer glowing ring
  ctx.strokeStyle = 'rgba(255,196,120,0.9)'
  ctx.shadowColor = 'rgba(255,170,80,0.9)'
  ctx.shadowBlur = 18
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(0, 0, S * 0.42, 0, Math.PI * 2)
  ctx.stroke()
  // inner ring
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(0, 0, S * 0.34, 0, Math.PI * 2)
  ctx.stroke()
  // rune ticks around the ring
  const ticks = 24
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2
    const r1 = S * 0.34
    const r2 = S * 0.42
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1)
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2)
    ctx.stroke()
  }
  // central star / compass sigil
  ctx.lineWidth = 4
  const pts = 8
  ctx.beginPath()
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2
    const r = i % 2 === 0 ? S * 0.22 : S * 0.1
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function FloorRuneRing() {
  const tex = useMemo(() => makeRuneRingTexture(), [])
  const matRef = useRef<MeshStandardMaterial>(null)
  useFrame((s) => {
    if (!throttle(20, performance.now())) return
    if (matRef.current) {
      const t = s.clock.elapsedTime
      // gentle breathing glow
      matRef.current.emissiveIntensity = 1.4 + Math.sin(t * 0.8) * 0.4
    }
  })
  const R = 9
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
      <circleGeometry args={[R, 64]} />
      <meshStandardMaterial
        ref={matRef}
        map={tex}
        emissive="#ffb454"
        emissiveMap={tex}
        emissiveIntensity={1.6}
        transparent
        opacity={0.9}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Glowing carpet foot-path (central runner) — same warm yellow rune  */
/* light as the floor ring, so the walkway glows underfoot.           */
/* ------------------------------------------------------------------ */
function makePathGlowTexture(): CanvasTexture {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, S, S)
  // clean, symmetric glowing tract: two solid border lines + a solid centre
  // line, all crisp (no blur). Mirrored left/right so it reads as one track.
  ctx.strokeStyle = 'rgba(255,198,124,1)'
  ctx.lineWidth = 14
  // left & right borders
  ctx.beginPath()
  ctx.moveTo(S * 0.2, 0)
  ctx.lineTo(S * 0.2, S)
  ctx.moveTo(S * 0.8, 0)
  ctx.lineTo(S * 0.8, S)
  ctx.stroke()
  // centre line
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(S * 0.5, 0)
  ctx.lineTo(S * 0.5, S)
  ctx.stroke()
  // rune diamonds marching down the centre, evenly spaced (symmetric)
  ctx.fillStyle = 'rgba(255,170,80,1)'
  const n = 16
  for (let i = 0; i < n; i++) {
    const y = ((i + 0.5) / n) * S
    ctx.save()
    ctx.translate(S * 0.5, y)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-12, -12, 24, 24)
    ctx.restore()
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function CarpetGlow() {
  const tex = useMemo(() => makePathGlowTexture(), [])
  const matRef = useRef<MeshStandardMaterial>(null)
  useFrame((s) => {
    if (!throttle(20, performance.now())) return
    if (matRef.current) matRef.current.emissiveIntensity = 1.1 + Math.sin(s.clock.elapsedTime * 0.7) * 0.3
  })
  const { halfL } = HALL
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <planeGeometry args={[5.2, halfL * 2 - 3]} />
      <meshStandardMaterial
        ref={matRef}
        map={tex}
        emissive="#ffb454"
        emissiveMap={tex}
        emissiveIntensity={1.3}
        transparent
        opacity={0.85}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Glowing stair treads — the grand staircases read as enchanted ramps */
/* ------------------------------------------------------------------ */
function StairGlow() {
  const steps = useMemo(() => staircases(), [])
  const boxes = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number] }[] = []
    for (const sc of steps) {
      for (const st of sc.steps) {
        const top = st.pos[1] + st.size[1] / 2
        out.push({ pos: [st.pos[0], top + 0.02, st.pos[2]], size: [st.size[0], 0.04, 0.18] })
      }
    }
    return out
  }, [steps])
  return (
    <InstancedBoxes
      items={boxes.map((b) => ({ pos: b.pos, size: b.size, color: '#ffb454' }))}
      emissive="#ff9a3c"
      emissiveIntensity={1.5}
      roughness={0.4}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Glowing carved sigil bands up the columns (pillar runes)           */
/* ------------------------------------------------------------------ */
function makePillarRuneTexture(): CanvasTexture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, S, S)
  ctx.strokeStyle = 'rgba(201,162,74,0.95)'
  ctx.shadowColor = 'rgba(201,162,74,0.9)'
  ctx.shadowBlur = 10
  ctx.lineWidth = 6
  // a row of little runes
  for (let i = 0; i < 4; i++) {
    const x = (i + 0.5) * (S / 4)
    ctx.beginPath()
    ctx.moveTo(x, S * 0.25)
    ctx.lineTo(x, S * 0.75)
    ctx.moveTo(x - 10, S * 0.4)
    ctx.lineTo(x + 10, S * 0.4)
    ctx.moveTo(x - 8, S * 0.6)
    ctx.lineTo(x + 8, S * 0.6)
    ctx.stroke()
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = 1000 // RepeatWrapping
  tex.wrapT = 1000
  return tex
}

function PillarRunes() {
  const cols = useMemo(() => columns(), [])
  const tex = useMemo(() => makePillarRuneTexture(), [])
  const { wallH } = HALL
  const bands = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number] }[] = []
    const ys = [wallH * 0.25, wallH * 0.5, wallH * 0.72]
    for (const col of cols) {
      for (const y of ys) {
        out.push({ pos: [col[0], y, col[2]], size: [1.0, 0.5, 1.0] })
      }
    }
    return out
  }, [cols, wallH])
  const matRef = useRef<MeshStandardMaterial>(null)
  useFrame((s) => {
    if (!throttle(20, performance.now())) return
    if (matRef.current) matRef.current.emissiveIntensity = 1.0 + Math.sin(s.clock.elapsedTime * 0.9) * 0.3
  })
  return (
    <>
      {bands.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={[b.size[0], b.size[1], b.size[2]]} />
          <meshStandardMaterial
            ref={i === 0 ? matRef : undefined}
            map={tex}
            emissive="#c9a24a"
            emissiveMap={tex}
            emissiveIntensity={1.2}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Dark magical potion bottles hung on the pillars (the "hey bottle"  */
/* look) — small glowing vessels casting eerie pools of light.        */
/* ------------------------------------------------------------------ */
function PotionBottles() {
  const cols = useMemo(() => columns(), [])
  const { wallH } = HALL
  const bottles = useMemo(() => {
    const out: { pos: [number, number, number]; color: string }[] = []
    const colors = ['#7a3cff', '#36c6b0', '#ff6f91', '#ffba49', '#5b9bd5', '#9b6bff']
    let k = 0
    for (const col of cols) {
      // hang two bottles per pillar at different heights, offset to the outer face
      for (const fz of [-1, 1]) {
        const y = wallH * (0.3 + 0.15 * (k % 3))
        out.push({ pos: [col[0] + (col[0] > 0 ? 0.7 : -0.7), y, col[2] + fz * 0.7], color: colors[k % colors.length] })
        k++
      }
    }
    return out
  }, [cols, wallH])
  return (
    <group>
      {bottles.map((b, i) => (
        <group key={i} position={b.pos}>
          {/* little cord to the pillar */}
          <mesh position={[b.pos[0] > 0 ? -0.35 : 0.35, 0.4, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.8, 4]} />
            <meshStandardMaterial color="#2a1d10" />
          </mesh>
          {/* bottle body */}
          <mesh>
            <sphereGeometry args={[0.16, 14, 14]} />
            <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={1.6} transparent opacity={0.85} roughness={0.2} />
          </mesh>
          {/* neck */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 0.18, 8]} />
            <meshStandardMaterial color="#caa24a" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* glow is emissive + bloom only (no real light — keeps night FPS high) */}
        </group>
      ))}
    </group>
  )
}

export function NightMagic() {
  const night = useSettings((s) => s.nightMode)
  if (!night) return null
  return (
    <group>
      <EnchantedCeiling />
      <FloorRuneRing />
      <CarpetGlow />
      <StairGlow />
      <PillarRunes />
      <PotionBottles />
    </group>
  )
}
