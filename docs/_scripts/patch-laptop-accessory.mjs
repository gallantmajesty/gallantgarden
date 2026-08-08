// Surgical patch: gaming laptop realism upgrades for ../src/avatar/Accessories.tsx
// Run from the project root (docs/):  node _scripts/patch-laptop-accessory.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const file = path.resolve(here, '..', '..', 'src', 'avatar', 'Accessories.tsx')
let src = readFileSync(file, 'utf8')

// ---------------------------------------------------------------------------
// 1. Extend the three import list with the new symbols
// ---------------------------------------------------------------------------
const threeImportOld = `import {
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  ExtrudeGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector3,
} from 'three'`
const threeImportNew = `import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  ExtrudeGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector3,
} from 'three'`

// ---------------------------------------------------------------------------
// 2. Extend the drei import with Environment + Lightformer
// ---------------------------------------------------------------------------
const dreiOld = `import { Text } from '@react-three/drei'`
const dreiNew = `import { Environment, Lightformer, Text } from '@react-three/drei'`

// ---------------------------------------------------------------------------
// 3. Add procedural texture + material helpers after the `tm` helper
// ---------------------------------------------------------------------------
const helpersAnchor = `) => texturedMaterial(hex, kind, rough, metal, rx, ry)`
const helpersNew = `) => texturedMaterial(hex, kind, rough, metal, rx, ry)

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
      ctx.fillStyle = \`rgba(\${tone},\${tone},\${tone},\${0.05 + Math.random() * 0.07})\`
      ctx.fillRect(0, y, w, 0.6 + Math.random() * 1.2)
    }
    // long thin scratches
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = \`rgba(255,255,255,\${0.08 + Math.random() * 0.1})\`
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
      ctx.strokeStyle = \`rgba(\${Math.random() > 0.5 ? 0 : 255},255,255,\${0.25 + Math.random() * 0.5})\`
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
  return laptopMaterial(\`brush:\${hex}:\${rough}:\${metal}:\${rx}:\${ry}\`, () => {
    const t = brushedMetalTex()
    t.repeat.set(rx, ry)
    return new MeshStandardMaterial({ color: hex, map: t, roughness: rough, metalness: metal })
  })
}

/** Additive light-bleed material with soft radial falloff. */
function additiveGlow(hex: string, opacity: number) {
  return laptopMaterial(\`add:\${hex}:\${opacity}\`, () =>
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
}`

// ---------------------------------------------------------------------------
// 4. Chassis: brushed anodized metal for shell + palm rest
// ---------------------------------------------------------------------------
const chassisOld = `    const shell = isGaming ? m('#0a0a0f', 0.35, 0.55) : aluminumBody
    const palmRest = isGaming ? m('#0a0a0f', 0.4, 0.5) : aluminumDeck`
const chassisNew = `    // Brushed-anodized body — procedural grain + smudges so the chassis reads
    // as machined metal, not flat dark grey.
    const shell = isGaming ? brushedMetalMaterial('#16161c', 0.32, 0.72, 6, 3) : aluminumBody
    const palmRest = isGaming ? brushedMetalMaterial('#17171d', 0.36, 0.66, 6, 2) : aluminumDeck`

// ---------------------------------------------------------------------------
// 5. Keyboard deck: brushed metal too
// ---------------------------------------------------------------------------
const deckOld = `        <mesh geometry={boxGeo(0.46, 0.004, 0.20)} material={isGaming ? m('#16161a', 0.4, 0.6) : m('#9aa2aa', 0.3, 0.83)} position={[0, 0.012, -0.02]} />`
const deckNew = `        <mesh geometry={boxGeo(0.46, 0.004, 0.20)} material={isGaming ? brushedMetalMaterial('#14141a', 0.4, 0.6, 5, 3) : m('#9aa2aa', 0.3, 0.83)} position={[0, 0.012, -0.02]} />`

// ---------------------------------------------------------------------------
// 6. Screen materials: dedicated glass + dust mat (defined near screen consts)
// ---------------------------------------------------------------------------
const screenMatAnchor = `    const screenBg = glowMaterial('#0a0c12', 0.35) // self-lit OLED panel glow
    const screenGloss = m('#ffffff', 0.05, 0.98) // ultra-glossy screen surface
    const bezelMat = m('#1a1a1c', 0.8, 0.15) // thin black bezel
    const logo = isGaming ? glowMaterial('#00e5ff', 1.6) : m('#a8b0b8', 0.25, 0.85)`
const screenMatNew = `    const screenBg = glowMaterial('#0a0c12', 0.35) // self-lit OLED panel glow
    const screenGloss = m('#ffffff', 0.05, 0.98) // ultra-glossy screen surface
    const bezelMat = m('#1a1a1c', 0.8, 0.15) // thin black bezel
    const logo = isGaming ? glowMaterial('#00e5ff', 1.6) : m('#a8b0b8', 0.25, 0.85)

    // Glass layer: clearcoat + micro-scratch roughness so the screen catches
    // Fresnel-style reflections instead of reading as a flat decal.
    const screenGlass = laptopMaterial('screen-glass', () => {
      const g = new MeshPhysicalMaterial({
        color: '#0a0d14',
        metalness: 0.1,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.18,
        envMapIntensity: 1.1,
        transparent: true,
        opacity: 0.28,
        side: DoubleSide,
      })
      g.roughnessMap = scratchRoughnessTex()
      return g
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
    )`

// ---------------------------------------------------------------------------
// 7. Keycaps: RGB hot-spots (per-key variance) + sculpted dish top
// ---------------------------------------------------------------------------
const keysHotOld = `          const isWASD = ['w', 'a', 's', 'd'].includes(label)
          if (isSpace) {`
const keysHotNew = `          const isWASD = ['w', 'a', 's', 'd'].includes(label)
          // RGB hot-spots: each cap's backlight differs slightly (real RGB
          // boards have per-LED variance + light falloff toward the edges).
          const hot = 1.05 + ((c * 31 + r * 17) % 7) * 0.13
          const keyUnderGlow = isWASD
            ? RGB_MAGENTA
            : glowMaterial(['#00ffff', '#ff00ff', '#4466ff'][(c + r * 2) % 3], 1.1 + hot)
          if (isSpace) {`

// space key — add dish top + hot glow
const keysSpaceOld = `                <mesh geometry={boxGeo(kw, capH, capD)} material={KEY_MATTE} castShadow />
                <mesh geometry={boxGeo(kw * 0.94, capH * 0.4, capD * 0.92)} material={m('#2a2a2e', 0.7, 0.05)} position={[0, capH / 2 + 0.0005, 0]} />
                <mesh geometry={boxGeo(kw - 0.001, 0.0025, capD - 0.001)} material={rgbCol(c, r)} position={[0, -capH / 2 - 0.0008, 0]} />`
const keysSpaceNew = `                <mesh geometry={boxGeo(kw, capH, capD)} material={KEY_MATTE} castShadow />
                <mesh geometry={boxGeo(kw * 0.94, capH * 0.4, capD * 0.92)} material={m('#2a2a2e', 0.7, 0.05)} position={[0, capH / 2 + 0.0005, 0]} />
                <mesh geometry={boxGeo(kw * 0.86, capH * 0.22, capD * 0.82)} material={keyDishMat} position={[0, capH / 2 + 0.0009, 0]} />
                <mesh geometry={boxGeo(kw - 0.001, 0.0025, capD - 0.001)} material={glowMaterial('#00ffff', 1.1 + hot)} position={[0, -capH / 2 - 0.0008, 0]} />`

// regular key — add dish top, per-key hot-spot underglow
const keysRegOld = `              {/* top surface for bevel */}
              <mesh geometry={boxGeo(kw * 0.92, capH * 0.4, capD * 0.9)} material={m('#2a2a2e', 0.7, 0.05)} position={[0, capH / 2 + 0.0005, 0]} />
              {/* per-key RGB underglow — magenta on WASD (nudged up so it sits on the deck, not inside it) */}
              <mesh geometry={boxGeo(kw - 0.001, 0.0025, capD - 0.001)} material={isWASD ? RGB_MAGENTA : rgbCol(c, r)} position={[0, -capH / 2 - 0.0008, 0]} />`
const keysRegNew = `              {/* top surface for bevel */}
              <mesh geometry={boxGeo(kw * 0.92, capH * 0.4, capD * 0.9)} material={m('#2a2a2e', 0.7, 0.05)} position={[0, capH / 2 + 0.0005, 0]} />
              {/* sculpted dish — concave keycap top with radial shading */}
              <mesh geometry={boxGeo(kw * 0.84, capH * 0.22, capD * 0.8)} material={keyDishMat} position={[0, capH / 2 + 0.0009, 0]} />
              {/* per-key RGB underglow — magenta on WASD, hot-spot variance elsewhere */}
              <mesh geometry={boxGeo(kw - 0.001, 0.0025, capD - 0.001)} material={keyUnderGlow} position={[0, -capH / 2 - 0.0008, 0]} />`

// keyDishMat definition — insert right after the gaming kRows block
const dishAnchor = `      const rgbCol = (c: number, r: number) => RGB_WAVE[(c + r * 2) % RGB_WAVE.length]`
const dishNew = `      const rgbCol = (c: number, r: number) => RGB_WAVE[(c + r * 2) % RGB_WAVE.length]
      // Sculpted dish material shared by every cap (concave radial shading).
      const keyDishMat = laptopMaterial('keycap-dish-mat', () => {
        const mat = new MeshStandardMaterial({ map: keycapDishTex(), roughness: 0.72, metalness: 0.05 })
        mat.color.set('#e8e8ea')
        return mat
      })`

// ---------------------------------------------------------------------------
// 8. Key-well RGB light bleed (leakage + falloff) after {keys}
// ---------------------------------------------------------------------------
const bleedAnchor = `        {/* ==================== INDIVIDUAL KEYCAPS ==================== */}
        {keys}`
const bleedNew = `        {/* ==================== INDIVIDUAL KEYCAPS ==================== */}
        {keys}

        {/* RGB bleed (gaming) — soft additive glow across the key well so the
            backlight reads as keycap leakage + light falloff, not flat strips */}
        {isGaming && (
          <group>
            <mesh geometry={boxGeo(0.42, 0.0016, 0.15)} material={additiveGlow('#00ffff', 0.14)} position={[0, 0.016, -0.02]} />
            <mesh geometry={boxGeo(0.42, 0.0012, 0.15)} material={additiveGlow('#ff00ff', 0.09)} position={[0, 0.0166, -0.02]} />
          </group>
        )}`

// ---------------------------------------------------------------------------
// 9. Screen: glass layer + volumetric halo above the content
// ---------------------------------------------------------------------------
const screenGlassAnchor = `          {/* OLED screen */}
          <mesh geometry={boxGeo(0.42, 0.23, 0.001)} material={screenBg} position={[0, 0.148, 0.003]} />
          <mesh geometry={boxGeo(0.42, 0.23, 0.0005)} material={screenGloss} position={[0, 0.148, 0.0035]} />
          
          {/* Screen content */}
          {screenContent}`
const screenGlassNew = `          {/* OLED screen */}
          <mesh geometry={boxGeo(0.42, 0.23, 0.001)} material={screenBg} position={[0, 0.148, 0.003]} />
          <mesh geometry={boxGeo(0.42, 0.23, 0.0005)} material={screenGloss} position={[0, 0.148, 0.0035]} />
          
          {/* Screen content */}
          {screenContent}

          {/* Glass layer — clearcoat + micro-scratches above the content so it
              catches env reflections like real screen glass */}
          {isGaming && <mesh geometry={boxGeo(0.42, 0.23, 0.0006)} material={screenGlass} position={[0, 0.148, 0.0042]} />}
          {/* Volumetric halo: stacked additive planes fading forward off the screen */}
          {isGaming && (
            <group>
              <mesh geometry={boxGeo(0.46, 0.25, 0.0008)} material={additiveGlow('#00e5ff', 0.1)} position={[0, 0.148, 0.006]} />
              <mesh geometry={boxGeo(0.52, 0.29, 0.001)} material={additiveGlow('#00e5ff', 0.05)} position={[0, 0.148, 0.008]} />
            </group>
          )}`

// ---------------------------------------------------------------------------
// 10. Side intake grilles next to the side rails
// ---------------------------------------------------------------------------
const railsOld = `        {/* Side rails — flush with body (same height and depth, no vertical strips) */}
        <mesh geometry={boxGeo(0.006, 0.012, 0.30)} material={m('#6e767c', 0.35, 0.85)} position={[-0.237, 0.006, 0]} />
        <mesh geometry={boxGeo(0.006, 0.012, 0.30)} material={m('#6e767c', 0.35, 0.85)} position={[0.237, 0.006, 0]} />`
const railsNew = `        {/* Side rails — flush with body (same height and depth, no vertical strips) */}
        <mesh geometry={boxGeo(0.006, 0.012, 0.30)} material={m('#6e767c', 0.35, 0.85)} position={[-0.237, 0.006, 0]} />
        <mesh geometry={boxGeo(0.006, 0.012, 0.30)} material={m('#6e767c', 0.35, 0.85)} position={[0.237, 0.006, 0]} />
        {/* Side intake grilles (gaming) — thin slots near the hinge for airflow */}
        {isGaming && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={\`intL\${i}\`} geometry={boxGeo(0.006, 0.0018, 0.0006)} material={m('#050508', 0.7, 0.4)} position={[-0.237, 0.008, -0.115 + i * 0.009]} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={\`intR\${i}\`} geometry={boxGeo(0.006, 0.0018, 0.0006)} material={m('#050508', 0.7, 0.4)} position={[0.237, 0.008, -0.115 + i * 0.009]} />
            ))}
          </>
        )}`

// ---------------------------------------------------------------------------
// 11. Lighting: stronger screen glow + warm spill on palm rest + table, dust
// ---------------------------------------------------------------------------
const lightsOld = `        {/* Soft screen glow reflecting on keyboard */}
        {!isGaming && (
          <pointLight position={[0, 0.18, -0.12]} color="#e8f0f8" intensity={0.4} distance={0.5} decay={2} />
        )}
        {isGaming && (
          <pointLight position={[0, 0.2, -0.14]} color="#6ee7ff" intensity={0.55} distance={0.7} />
        )}`
const lightsNew = `        {/* Soft screen glow reflecting on keyboard */}
        {!isGaming && (
          <pointLight position={[0, 0.18, -0.12]} color="#e8f0f8" intensity={0.4} distance={0.5} decay={2} />
        )}
        {isGaming && (
          <>
            {/* cyan screen glow + warm fill cast from the display */}
            <pointLight position={[0, 0.2, -0.14]} color="#6ee7ff" intensity={0.9} distance={0.8} />
            <pointLight position={[0, 0.03, 0.06]} color="#ffb066" intensity={0.35} distance={0.5} />
            {/* warm screen light spilling onto the table in front of the laptop */}
            <mesh geometry={boxGeo(0.5, 0.0015, 0.2)} material={additiveGlow('#ffb066', 0.14)} position={[0, -0.0005, 0.22]} rotation={[-Math.PI / 2, 0, 0]} />
            {/* amber bleed across the palm rest from the screen */}
            <mesh geometry={boxGeo(0.44, 0.0012, 0.05)} material={additiveGlow('#ffb066', 0.18)} position={[0, 0.0146, 0.105]} />
            {/* dust motes drifting in the air — life + scale for the shot */}
            <group ref={dustRef}>
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i / 12) * Math.PI * 2
                return (
                  <mesh
                    key={\`dust\${i}\`}
                    geometry={sphereGeo(0.0008 + (i % 3) * 0.0004)}
                    material={dustMat}
                    position={[Math.cos(a) * (0.3 + (i % 4) * 0.05), 0.12 + (i % 5) * 0.04, Math.sin(a) * (0.3 + (i % 3) * 0.06)]}
                  />
                )
              })}
            </group>
          </>
        )}`

// ---------------------------------------------------------------------------
// 12. dustRef declaration + drift animation in useFrame
// ---------------------------------------------------------------------------
const frameOld = `    useFrame((state) => {
      if (ledRef.current) {
        const t = state.clock.elapsedTime
        // breathe between dim and bright so the power LED reads as "charging"
        ledRef.current.material.emissiveIntensity = 0.55 + Math.sin(t * 2.2) * 0.45
      }
    })`
const frameNew = `    const dustRef = useRef<any>(null)
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
    })`

// ---------------------------------------------------------------------------
// 13. Procedural studio environment (Lightformers) at the top of the group
// ---------------------------------------------------------------------------
const envAnchor = `    return (
      <group>
        {/* ==================== BASE CONSTRUCTION ==================== */}`
const envNew = `    return (
      <group>
        {/* Soft studio environment — procedural light panels give the anodized
            body realistic reflections (no network fetch) */}
        {isGaming && (
          <Environment resolution={128} frames={1}>
            <Lightformer intensity={1.6} position={[0, 1.6, 2.4]} scale={[3, 1.4, 1]} color="#ffd9a0" />
            <Lightformer intensity={1} position={[0, 0.6, -2.4]} scale={[3, 1.4, 1]} color="#6ee7ff" />
            <Lightformer intensity={0.9} position={[-2.4, 1.1, 0.4]} rotation-y={Math.PI / 2} scale={[2, 1.4, 1]} color="#ffffff" />
            <Lightformer intensity={0.7} position={[2.4, 0.9, 0.6]} rotation-y={-Math.PI / 2} scale={[2, 1.4, 1]} color="#ffb066" />
          </Environment>
        )}

        {/* ==================== BASE CONSTRUCTION ==================== */}`

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------
const patches = [
  ['three imports', threeImportOld, threeImportNew],
  ['drei imports', dreiOld, dreiNew],
  ['texture helpers', helpersAnchor, helpersNew],
  ['chassis brushed metal', chassisOld, chassisNew],
  ['deck brushed metal', deckOld, deckNew],
  ['screen materials', screenMatAnchor, screenMatNew],
  ['keys hot-spots', keysHotOld, keysHotNew],
  ['space key dish', keysSpaceOld, keysSpaceNew],
  ['regular key dish', keysRegOld, keysRegNew],
  ['keyDishMat', dishAnchor, dishNew],
  ['key-well bleed', bleedAnchor, bleedNew],
  ['screen glass + halo', screenGlassAnchor, screenGlassNew],
  ['side intake grilles', railsOld, railsNew],
  ['lighting + dust', lightsOld, lightsNew],
  ['useFrame dust', frameOld, frameNew],
  ['environment', envAnchor, envNew],
]

let failed = false
for (const [name, old, next] of patches) {
  const count = src.split(old).length - 1
  if (count !== 1) {
    console.error(`✗ ${name}: expected exactly 1 match, found ${count}`)
    failed = true
    continue
  }
  src = src.replace(old, next)
  console.log(`✓ ${name}`)
}

if (failed) {
  console.error('\nAborting — no changes written.')
  process.exit(1)
}

writeFileSync(file, src)
console.log(`\nWrote ${file}`)
