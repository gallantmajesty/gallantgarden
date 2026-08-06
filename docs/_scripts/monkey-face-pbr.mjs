// Monkey face upgrade — "substance-3d" style: texture/material-based realism,
// NOT more polygons. Three parts:
//  1. logoTextures.ts: add monkeyFurTex (short soft coat bump) + monkeyIrisTex
//     (warm amber gradient iris).
//  2. AvatarRig.tsx: wire fur bump into the monkeyFur material; import the new
//     textures.
//  3. MonkeyHead: textured eyes (sclera + gradient iris + pupil + 2 glints),
//     two angled male brows (replacing the flat bar), nostrils pushed proud of
//     the nose pad, glossy nose with glint. All z-depths verified against the
//     face-mask ellipsoid so nothing buries.
import { readFileSync, writeFileSync } from 'node:fs'

// ---------- 1. logoTextures.ts ----------
const lp = 'C:/Users/taksh/studyforest/src/avatar/logoTextures.ts'
let lsrc = readFileSync(lp, 'utf8').replace(/\r\n/g, '\n')

const newTex = `
/** Short soft monkey-coat fur (grayscale bump map) — dense fine strokes so the
 *  monkey's head/body read as soft fur instead of smooth plastic. */
export function monkeyFurTex(): CanvasTexture {
  return cachedTexture('monkey-fur', (ctx, w, h) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    // fine short undercoat strokes
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const len = 2 + Math.random() * 4
      const angle = (Math.random() - 0.5) * 1.2
      const tone = 92 + Math.floor(Math.random() * 88)
      ctx.strokeStyle = \`rgba(\${tone},\${tone},\${tone},\${0.3 + Math.random() * 0.5})\`
      ctx.lineWidth = 0.5 + Math.random() * 1.1
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.sin(angle) * len, y + Math.cos(angle) * len)
      ctx.stroke()
    }
    // dense short flecks — soft clump texture between strokes
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const tone = 70 + Math.floor(Math.random() * 110)
      ctx.fillStyle = \`rgba(\${tone},\${tone},\${tone},\${0.3 + Math.random() * 0.4})\`
      ctx.fillRect(x, y, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6)
    }
    // a few brighter guard hairs for depth
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const tone = 185 + Math.floor(Math.random() * 65)
      ctx.strokeStyle = \`rgba(\${tone},\${tone},\${tone},0.5)\`
      ctx.lineWidth = 0.4 + Math.random() * 0.7
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (Math.random() - 0.5) * 2.5, y + 3 + Math.random() * 4)
      ctx.stroke()
    }
  }, 256, 256)
}

/** Monkey eye iris — warm amber-brown radial gradient (golden centre fading to a
 *  deep umber rim) so the eye glows warmly instead of reading as a flat dot. */
export function monkeyIrisTex(): CanvasTexture {
  return cachedTexture('monkey-iris', (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    const grad = ctx.createRadialGradient(cx, cy, w * 0.02, cx, cy, w * 0.5)
    grad.addColorStop(0, '#b5762e')
    grad.addColorStop(0.4, '#8a4f1c')
    grad.addColorStop(0.75, '#4a2409')
    grad.addColorStop(1, '#1f0d02')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }, 128, 128)
}
`

const anchor = 'export function sandGrainTex(): CanvasTexture {'
const ai = lsrc.indexOf(anchor)
if (ai < 0) throw new Error('sandGrainTex anchor not found')
lsrc = lsrc.slice(0, ai) + newTex.trimStart() + '\n' + lsrc.slice(ai)
writeFileSync(lp, lsrc.replace(/\n/g, '\r\n'), 'utf8')
console.log('logoTextures.ts: textures added')

// ---------- 2 & 3. AvatarRig.tsx ----------
const p = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let src = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// import line
const impFrom = `import { focusLilyChestTex, hairFrizzTex, skinReliefTex, pandaFurTex, pandaIrisTex } from './logoTextures'`
const impTo = `import { focusLilyChestTex, hairFrizzTex, skinReliefTex, pandaFurTex, pandaIrisTex, monkeyFurTex, monkeyIrisTex } from './logoTextures'`
if (!src.includes(impFrom)) throw new Error('import line not found')
src = src.replace(impFrom, impTo)

// wire fur bump into the shared monkeyFur material
const furFrom = `  const monkeyFur = sharedMaterial('#8B5E3C', 0.62)\n  const monkeyFace = sharedMaterial('#F5D6B4', 0.68)`
const furTo = `  const monkeyFur = sharedMaterial('#8B5E3C', 0.62)\n  monkeyFur.bumpMap = monkeyFurTex()\n  monkeyFur.bumpScale = 0.45\n  monkeyFur.needsUpdate = true\n  const monkeyFace = sharedMaterial('#F5D6B4', 0.68)`
if (!src.includes(furFrom)) throw new Error('monkeyFur anchor not found')
src = src.replace(furFrom, furTo)

// ---- replace the whole MonkeyHead function ----
const fnStart = 'function MonkeyHead({ P, fur, face, dark, inner, belly }: { P: Proportions; fur: Mat; face: Mat; dark: Mat; inner: Mat; belly: Mat }) {'
const fnEndMarker = '/* ================================================ PANDA HEAD'
const s = src.indexOf(fnStart)
const e = src.indexOf(fnEndMarker)
if (s < 0 || e < 0) throw new Error('MonkeyHead bounds not found')

const newFn = `function MonkeyHead({ P, fur, face, dark, inner, belly }: { P: Proportions; fur: Mat; face: Mat; dark: Mat; inner: Mat; belly: Mat }) {
  const r = P.headR
  const cy = r * 0.92

  // ---- PBR-style eye materials: warm sclera, gradient-textured amber iris,
  //      dark pupil, bright glints (texture shading, not geometry) ----
  const sclera = sharedMaterial('#f7f1e4', 0.3)
  const irisM = sharedMaterial('#8a4f1c', 0.25)
  irisM.map = monkeyIrisTex()
  irisM.needsUpdate = true
  const pupil = sharedMaterial('#140a03', 0.4)
  const glint = sharedMaterial('#ffffff', 0.95)
  // glossy dark nose pad (slightly wet look)
  const nosePad = sharedMaterial('#24140a', 0.32)
  const nostrilM = sharedMaterial('#0c0703', 0.25)
  const mouthM = sharedMaterial('#3a2416', 0.5)
  const blush = sharedMaterial('#f4a090', 0.55)

  return (
    <group position={[0, cy, 0]}>
      {/* round furry head — slightly wider than tall; fur coat bump makes it
          read as soft hair, not plastic */}
      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.1, r * 1.05, r * 1.02]} castShadow />

      {/* lighter tan face mask — heart/oval shaped, centred on the front.
          Ellipsoid: center (0, -0.06r, 0.5r), half-axes (0.7r, 0.7r, 0.62r);
          front at center = 0.5 + 0.62 = 1.12r. */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.7, r * 0.7, r * 0.62]} position={[0, -r * 0.06, r * 0.5]} />

      {/* big round ears on the sides — the classic monkey silhouette */}
      {[-1, 1].map((sx) => (
        <group key={\`ear\${sx}\`} position={[sx * r * 1.0, r * 0.3, -r * 0.05]}>
          {/* outer ear — big round disc */}
          <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 0.4, r * 0.5, r * 0.1]} />
          {/* inner ear — lighter pinkish/tan */}
          <mesh geometry={sphereGeo(1)} material={inner} scale={[r * 0.26, r * 0.34, r * 0.06]} position={[sx * -r * 0.02, -r * 0.02, r * 0.05]} />
        </group>
      ))}

      {/* big warm eyes — gradient iris + pupil + twin catchlights; bulge proudly
          off the mask (mask front at eye height ≈ 1.046r, eye front 1.15r) */}
      {[-1, 1].map((sx) => (
        <group key={\`eye\${sx}\`} position={[sx * r * 0.3, r * 0.08, r * 1.02]}>
          {/* white-ish sclera */}
          <mesh geometry={sphereGeo(1)} material={sclera} scale={[r * 0.22, r * 0.25, r * 0.13]} />
          {/* gradient amber iris */}
          <mesh geometry={sphereGeo(1)} material={irisM} scale={[r * 0.13, r * 0.15, r * 0.09]} position={[0, 0, r * 0.06]} />
          {/* dark pupil */}
          <mesh geometry={sphereGeo(1)} material={pupil} scale={[r * 0.06, r * 0.07, r * 0.05]} position={[0, 0, r * 0.1]} />
          {/* big primary catchlight + small sparkle */}
          <mesh geometry={sphereGeo(1)} material={glint} scale={[r * 0.05, r * 0.05, r * 0.02]} position={[sx * -r * 0.03, r * 0.06, r * 0.13]} />
          <mesh geometry={sphereGeo(1)} material={glint} scale={[r * 0.03, r * 0.03, r * 0.02]} position={[sx * r * 0.02, -r * 0.04, r * 0.13]} />
        </group>
      ))}

      {/* two angled brows — soft dark tufts sweeping outward for a confident,
          masculine (but friendly) look; replaces the old flat bar */}
      {[-1, 1].map((sx) => (
        <mesh key={\`brow\${sx}\`} geometry={sphereGeo(1)} material={dark}
          scale={[r * 0.2, r * 0.05, r * 0.09]}
          position={[sx * r * 0.3, r * 0.2, r * 1.02]}
          rotation={[0, 0, sx * 0.3]} />
      ))}

      {/* glossy dark nose pad, slightly protruding (front 1.14r) */}
      <mesh geometry={sphereGeo(1)} material={nosePad} scale={[r * 0.12, r * 0.09, r * 0.1]} position={[0, -r * 0.24, r * 1.04]} />
      {/* nose glint — small wet highlight */}
      <mesh geometry={sphereGeo(1)} material={glint} scale={[r * 0.025, r * 0.015, r * 0.01]} position={[-r * 0.035, -r * 0.21, r * 1.14]} />

      {/* nostrils — two dark slits on the nose tip, pushed OUT past the pad
          (pad front 1.14r; nostril front 1.17r+0.012 so they never bury) */}
      <mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.03, r * 0.024, r * 0.012]} position={[-r * 0.042, -r * 0.245, r * 1.17]} />
      <mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.03, r * 0.024, r * 0.012]} position={[r * 0.042, -r * 0.245, r * 1.17]} />

      {/* wide cheeky grin — warm curved smile line (front 1.03r vs mask 1.009r) */}
      <mesh geometry={torusGeo(r * 0.3, r * 0.03, 8, 20)} material={mouthM}
        position={[0, -r * 0.46, r * 1.0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]} />

      {/* lower lip for a fuller smile (front 1.08r vs mask 0.967r) */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.08]} position={[0, -r * 0.52, r * 1.0]} />

      {/* soft rosy cheeks — gentle blend onto the tan face (front 0.97r vs 0.913r) */}
      {[-1, 1].map((sx) => (
        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.13, r * 0.09, r * 0.05]} position={[sx * r * 0.52, -r * 0.1, r * 0.92]} />
      ))}

      {/* little tuft of fur on top of the head */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.14, r * 0.14, r * 0.14]} position={[0, r * 1.0, r * 0.35]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[-r * 0.08, r * 1.05, r * 0.3]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[r * 0.08, r * 1.05, r * 0.3]} />
    </group>
  )
}

`
src = src.slice(0, s) + newFn + src.slice(e)
writeFileSync(p, src.replace(/\n/g, '\r\n'), 'utf8')
console.log('AvatarRig.tsx: MonkeyHead rebuilt + fur bump wired')
