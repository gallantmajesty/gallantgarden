// The accessory render registry — the ONLY place accessory geometry lives. Each
// renderer draws a FAMILY of items parametrically (params come from catalog.ts),
// so dozens of items reuse one renderer and new data rows need no code. Geometry &
// materials come from the shared, process-wide caches in ../config (sphereGeo,
// boxGeo, torusGeo, taperGeo, sharedMaterial) so there is zero per-avatar
// allocation — the same 60-FPS lever the body rig uses. Lens / emissive materials
// (which need transparency or glow that sharedMaterial doesn't cover) have their
// own tiny module-scope caches here.
//
// Frames per slot (set up by the wrappers + the rig's attachment points):
//  • head renderers (glasses/hats/ears/face…) draw in the HEAD-bone frame, using
//    head conventions hc (head centre) + fz (face front) derived from P.headR.
//  • neck/back/hand renderers draw in a small LOCAL frame the wrapper positions.

import { MeshStandardMaterial, type MeshStandardMaterial as Mat } from 'three'
import {
  boxGeo,
  sharedMaterial,
  sphereGeo,
  taperGeo,
  torusGeo,
} from '../config'
import type { Proportions } from '../rig'
import { getAccessory } from './catalog'
import type { AccessoryParams, EquippedAccessories, RenderKind } from './types'

type V3 = [number, number, number]

/* ----------------------------------------------------------------- materials */
const mat = (hex: string, rough = 0.6, metal = 0) => sharedMaterial(hex, rough, metal)

const lensCache = new Map<string, Mat>()
function lensMat(hex: string, opacity: number): Mat {
  const key = `${hex}|${opacity}`
  let m = lensCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, transparent: opacity < 0.99, opacity, roughness: 0.18, metalness: 0.25 })
    lensCache.set(key, m)
  }
  return m
}

const glowCache = new Map<string, Mat>()
function glowMat(hex: string, intensity = 0.9): Mat {
  const key = `${hex}|${intensity}`
  let m = glowCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: intensity, roughness: 0.4 })
    glowCache.set(key, m)
  }
  return m
}

/* ----------------------------------------------------------------- primitives */
function Ball({ m, s, p, r }: { m: Mat; s: V3; p: V3; r?: V3 }) {
  return <mesh geometry={sphereGeo(1)} material={m} scale={s} position={p} rotation={r} />
}
function Box({ m, s, p, r }: { m: Mat; s: V3; p: V3; r?: V3 }) {
  return <mesh geometry={boxGeo(1, 1, 1)} material={m} scale={s} position={p} rotation={r} />
}
function Tube({ m, rTop, rBot, len, p, r }: { m: Mat; rTop: number; rBot: number; len: number; p: V3; r?: V3 }) {
  return <mesh geometry={taperGeo(rTop, rBot, len)} material={m} position={p} rotation={r} />
}
function Ring({ m, radius, tube, p, r }: { m: Mat; radius: number; tube: number; p: V3; r?: V3 }) {
  return <mesh geometry={torusGeo(radius, tube)} material={m} position={p} rotation={r} />
}

/* -------------------------------------------------------------- param helpers */
const S = (v: unknown, d = '#999999') => (typeof v === 'string' ? v : d)
const B = (v: unknown) => v === true

/* ================================================================= EYEWEAR === */
// One renderer for all 20 glasses + sunglasses. `shape` picks the lens silhouette;
// `lensTint`/`lensOpacity` make it a sunglass; clear glasses get a faint lens.
function Glasses({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const ex = r * 0.4 // eye spacing (matches Head)
  const ey = hc - r * 0.05 // eye height (matches Head's eyes)
  // The face SURFACE bulges to ≈0.89r at the eyes, so glasses must sit ~1.0r out
  // in front to read — anything at the eye-draw plane (0.72r) is buried in the head.
  const ez = r * 1.0
  const shape = S(p.shape, 'round')
  const frame = mat(S(p.frame, '#222'), 0.45, 0.2)
  const tint = S(p.lensTint, '')
  const op = typeof p.lensOpacity === 'number' ? p.lensOpacity : 0
  const lens = tint || op > 0 ? lensMat(tint || '#222', op || 0.3) : null
  const emis = S(p.emissive, '')

  // lens silhouette per shape (half-width, half-height, frame tube)
  const oversized = shape === 'oversized'
  const lr = oversized ? r * 0.32 : r * 0.26
  const lh = shape === 'rect' ? lr * 0.66 : shape === 'cat' ? lr * 0.82 : lr
  const tube = shape === 'nerd' ? r * 0.055 : r * 0.04

  if (shape === 'visor') {
    // single wraparound bar across both eyes
    return (
      <group>
        <Box m={frame} s={[ex * 2.5, lh * 1.1, r * 0.08]} p={[0, ey, ez]} />
        {lens && <Box m={lens} s={[ex * 2.3, lh * 0.9, r * 0.05]} p={[0, ey, ez + r * 0.03]} />}
        {emis && <Box m={glowMat(emis, 1.1)} s={[ex * 2.2, lh * 0.28, r * 0.02]} p={[0, ey + lh * 0.2, ez + r * 0.05]} />}
        <Tube m={frame} rTop={r * 0.02} rBot={r * 0.02} len={r * 0.9} p={[-ex * 1.25, ey, -r * 0.1]} r={[Math.PI / 2, 0, 0]} />
        <Tube m={frame} rTop={r * 0.02} rBot={r * 0.02} len={r * 0.9} p={[ex * 1.25, ey, -r * 0.1]} r={[Math.PI / 2, 0, 0]} />
      </group>
    )
  }

  const renderLens = (sx: number) => (
    <group key={sx} position={[sx * ex, ey, ez]} rotation={shape === 'cat' ? [0, 0, sx * -0.3] : undefined}>
      <Ring m={frame} radius={lr} tube={tube} p={[0, 0, 0]} />
      {lens && <Ball m={lens} s={[lr, lh, r * 0.02]} p={[0, 0, 0]} />}
      {shape === 'heart' && <Box m={frame} s={[lr * 0.5, lr * 0.5, tube * 1.6]} p={[0, lr * 0.5, 0]} r={[0, 0, Math.PI / 4]} />}
      {shape === 'star' && [0, 1, 2, 3, 4].map((i) => (
        <Box key={i} m={frame} s={[tube * 1.4, lr * 0.5, tube * 1.4]} p={[Math.sin((i / 5) * Math.PI * 2) * lr, Math.cos((i / 5) * Math.PI * 2) * lr, 0]} />
      ))}
      {B(p.reflective) && <Ball m={glowMat('#dff3ff', 0.5)} s={[lr * 0.5, lh * 0.5, r * 0.01]} p={[-lr * 0.3, lr * 0.3, r * 0.02]} />}
    </group>
  )
  return (
    <group>
      {renderLens(-1)}
      {renderLens(1)}
      {/* bridge */}
      <Box m={frame} s={[ex * 0.5, tube * 1.4, tube * 1.4]} p={[0, ey + lh * 0.2, ez]} />
      {B(p.tape) && <Box m={mat('#f0ede4')} s={[tube * 2, lh * 0.7, tube * 2]} p={[0, ey, ez + r * 0.02]} />}
      {/* temple arms back to the ears */}
      <Box m={frame} s={[r * 0.9, tube * 1.2, tube * 1.2]} p={[-ex * 1.1, ey + lh * 0.2, -r * 0.1]} />
      <Box m={frame} s={[r * 0.9, tube * 1.2, tube * 1.2]} p={[ex * 1.1, ey + lh * 0.2, -r * 0.1]} />
    </group>
  )
}

/* ============================================================== HEADWEAR ====== */
// Brimmed hats: cap / bucket / fedora / straw / pirate.
function HatBrim({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const col = mat(S(p.color, '#444'))
  const crown = S(p.crown, 'cap')
  const baseY = hc + r * 0.62
  const brimY = baseY - r * 0.05
  const accent = S(p.accent, '')
  const band = S(p.band, '')
  return (
    <group>
      {/* crown dome over the hair */}
      <Ball m={col} s={[r * 1.04, r * (crown === 'fedora' ? 0.62 : 0.7), r * 1.04]} p={[0, baseY, -r * 0.04]} />
      {/* brim */}
      {crown === 'cap' ? (
        <Box m={col} s={[r * 1.1, r * 0.08, r * 1.0]} p={[0, brimY, r * 0.7]} r={[0.18, 0, 0]} />
      ) : crown === 'pirate' ? (
        <>
          <Ring m={col} radius={r * 1.2} tube={r * 0.12} p={[0, brimY, 0]} r={[Math.PI / 2, 0, 0]} />
          <Box m={col} s={[r * 2.5, r * 0.5, r * 0.1]} p={[0, baseY + r * 0.1, 0]} />
          {accent && <Ball m={mat(accent, 0.4, 0.5)} s={[r * 0.22, r * 0.22, r * 0.05]} p={[0, baseY, r * 0.5]} />}
        </>
      ) : (
        <Ring m={col} radius={r * (crown === 'straw' ? 1.35 : 1.15)} tube={r * 0.09} p={[0, brimY, 0]} r={[Math.PI / 2, 0, 0]} />
      )}
      {crown === 'bucket' && <Ball m={col} s={[r * 1.06, r * 0.5, r * 1.06]} p={[0, baseY - r * 0.1, 0]} />}
      {band && <Ring m={mat(band)} radius={r * 1.02} tube={r * 0.06} p={[0, baseY - r * 0.32, -r * 0.04]} r={[Math.PI / 2, 0, 0]} />}
    </group>
  )
}

// Soft caps: beanie / bandana.
function HatSoft({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const col = mat(S(p.color, '#888'))
  const cuff = S(p.cuff, '')
  return (
    <group>
      <Ball m={col} s={[r * 1.08, r * 0.85, r * 1.08]} p={[0, hc + r * 0.5, -r * 0.04]} />
      {cuff && <Ring m={mat(cuff)} radius={r * 1.04} tube={r * 0.12} p={[0, hc + r * 0.34, -r * 0.04]} r={[Math.PI / 2, 0, 0]} />}
      <Ball m={col} s={[r * 0.18, r * 0.18, r * 0.18]} p={[0, hc + r * 1.32, -r * 0.04]} />
    </group>
  )
}

// Crowns: jewelled points / flower ring.
function Crown({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const kind = S(p.kind, 'points')
  const y = hc + r * 0.72
  if (kind === 'flowers') {
    const petal = mat(S(p.petal, '#ff9ec2'))
    const leaf = mat(S(p.leaf, '#7fb98a'))
    return (
      <group>
        <Ring m={leaf} radius={r * 1.0} tube={r * 0.06} p={[0, y - r * 0.1, -r * 0.04]} r={[Math.PI / 2, 0, 0]} />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2
          return <Ball key={i} m={petal} s={[r * 0.16, r * 0.16, r * 0.16]} p={[Math.sin(a) * r * 1.0, y - r * 0.05, Math.cos(a) * r * 1.0 - r * 0.04]} />
        })}
      </group>
    )
  }
  const metal = mat(S(p.metal, '#e8c049'), 0.3, 0.7)
  const gem = mat(S(p.gem, '#7aa7ff'), 0.2, 0.3)
  return (
    <group>
      <Ring m={metal} radius={r * 1.0} tube={r * 0.1} p={[0, y - r * 0.12, -r * 0.04]} r={[Math.PI / 2, 0, 0]} />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        const x = Math.sin(a) * r * 0.98
        const z = Math.cos(a) * r * 0.98 - r * 0.04
        return (
          <group key={i}>
            <Tube m={metal} rTop={r * 0.02} rBot={r * 0.08} len={r * 0.34} p={[x, y + r * 0.06, z]} />
            <Ball m={gem} s={[r * 0.07, r * 0.09, r * 0.07]} p={[x, y + r * 0.24, z]} />
          </group>
        )
      })}
    </group>
  )
}

// Animal ears on a headband: bunny / cat.
function Ears({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const col = mat(S(p.color, '#eee'))
  const inner = mat(S(p.inner, '#ff9ec2'))
  const cat = S(p.kind, 'bunny') === 'cat'
  return (
    <group>
      <Ring m={col} radius={r * 0.96} tube={r * 0.05} p={[0, hc + r * 0.5, -r * 0.04]} r={[Math.PI / 2, 0, 0]} />
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * r * 0.5, hc + r * 0.95, -r * 0.04]} rotation={[0, 0, sx * (cat ? 0.25 : 0.12)]}>
          {cat ? (
            <>
              <Box m={col} s={[r * 0.34, r * 0.42, r * 0.18]} p={[0, 0, 0]} r={[0, 0, 0]} />
              <Box m={inner} s={[r * 0.2, r * 0.26, r * 0.1]} p={[0, 0, r * 0.06]} />
            </>
          ) : (
            <>
              <Ball m={col} s={[r * 0.18, r * 0.58, r * 0.16]} p={[0, r * 0.1, 0]} />
              <Ball m={inner} s={[r * 0.1, r * 0.42, r * 0.06]} p={[0, r * 0.1, r * 0.08]} />
            </>
          )}
        </group>
      ))}
    </group>
  )
}

// Over-ear headset / headphones (worn on the head).
function Headset({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const col = mat(S(p.color, '#222'))
  const cup = mat(S(p.cup, S(p.color, '#333')))
  const emis = S(p.emissive, '')
  return (
    <group>
      <Ring m={col} radius={r * 1.0} tube={r * 0.07} p={[0, hc + r * 0.55, -r * 0.04]} r={[0, 0, 0]} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Box m={cup} s={[r * 0.2, r * 0.42, r * 0.42]} p={[sx * r * 0.98, hc + r * 0.02, -r * 0.04]} />
          {emis && <Box m={glowMat(emis)} s={[r * 0.04, r * 0.3, r * 0.3]} p={[sx * r * 1.08, hc + r * 0.02, -r * 0.04]} />}
        </group>
      ))}
      {S(p.kind, '') === 'gaming' && <Tube m={col} rTop={r * 0.03} rBot={r * 0.03} len={r * 0.55} p={[r * 0.7, hc - r * 0.32, r * 0.4]} r={[0, 0, 1.0]} />}
    </group>
  )
}

// Pointed hats: wizard cone / viking dome+horns.
function PointHat({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const col = mat(S(p.color, '#555'))
  if (S(p.kind, 'wizard') === 'viking') {
    const horn = mat(S(p.horn, '#efe6d2'), 0.5)
    return (
      <group>
        <Ball m={col} s={[r * 1.06, r * 0.7, r * 1.06]} p={[0, hc + r * 0.55, -r * 0.04]} />
        <Ring m={col} radius={r * 1.02} tube={r * 0.08} p={[0, hc + r * 0.3, -r * 0.04]} r={[Math.PI / 2, 0, 0]} />
        {[-1, 1].map((sx) => (
          <Tube key={sx} m={horn} rTop={r * 0.02} rBot={r * 0.14} len={r * 0.6} p={[sx * r * 0.95, hc + r * 0.95, -r * 0.04]} r={[0, 0, sx * -0.6]} />
        ))}
      </group>
    )
  }
  const star = S(p.star, '')
  return (
    <group>
      <Ring m={col} radius={r * 1.15} tube={r * 0.1} p={[0, hc + r * 0.42, 0]} r={[Math.PI / 2, 0, 0]} />
      <Tube m={col} rTop={r * 0.02} rBot={r * 0.95} len={r * 1.5} p={[0, hc + r * 1.2, -r * 0.04]} r={[0.06, 0, 0]} />
      {star && <Ball m={glowMat(star, 0.7)} s={[r * 0.12, r * 0.12, r * 0.12]} p={[0, hc + r * 1.95, r * 0.05]} />}
    </group>
  )
}

/* ================================================================== FACE ===== */
// Facial hair: mustache / short+long beard / goatee.
function FacialHair({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const fz = r * 0.86 // accessory face-front plane (in front of the jaw surface)
  const col = mat(S(p.color, '#3a2a1a'), 0.7)
  const style = S(p.style, 'mustache')
  const mouthY = hc - r * 0.5
  if (style === 'mustache') {
    return (
      <group>
        {[-1, 1].map((sx) => (
          <Ball key={sx} m={col} s={[r * 0.2, r * 0.1, r * 0.1]} p={[sx * r * 0.18, mouthY + r * 0.14, fz + r * 0.06]} r={[0, 0, sx * 0.4]} />
        ))}
      </group>
    )
  }
  if (style === 'goatee') {
    return (
      <group>
        <Ball m={col} s={[r * 0.12, r * 0.1, r * 0.08]} p={[0, mouthY + r * 0.12, fz + r * 0.05]} />
        <Ball m={col} s={[r * 0.16, r * 0.22, r * 0.12]} p={[0, mouthY - r * 0.16, fz]} />
      </group>
    )
  }
  const long = style === 'beardLong'
  return (
    <group>
      {/* jaw-wrapping beard */}
      <Ball m={col} s={[r * 0.78, long ? r * 0.7 : r * 0.42, r * 0.7]} p={[0, mouthY - (long ? r * 0.28 : r * 0.12), fz - r * 0.42]} />
      {[-1, 1].map((sx) => (
        <Ball key={sx} m={col} s={[r * 0.16, r * 0.4, r * 0.2]} p={[sx * r * 0.6, hc - r * 0.32, r * 0.2]} />
      ))}
      {long && <Tube m={col} rTop={r * 0.5} rBot={r * 0.18} len={r * 0.7} p={[0, mouthY - r * 0.7, fz - r * 0.4]} />}
    </group>
  )
}

// Masks over the nose + mouth: cloth / medical / bandana.
function MaskAcc({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const fz = r * 0.86 // accessory face-front plane (in front of the jaw surface)
  const col = mat(S(p.color, '#ddd'))
  const y = hc - r * 0.36
  return (
    <group>
      <Ball m={col} s={[r * 0.62, r * 0.5, r * 0.5]} p={[0, y, fz - r * 0.12]} />
      {/* ear loops */}
      {[-1, 1].map((sx) => (
        <Tube key={sx} m={col} rTop={r * 0.02} rBot={r * 0.02} len={r * 0.5} p={[sx * r * 0.78, y + r * 0.1, -r * 0.1]} r={[0, 0, Math.PI / 2]} />
      ))}
      {B(p.pattern) && <Box m={mat('#f0ede4')} s={[r * 0.7, r * 0.06, r * 0.04]} p={[0, y, fz + r * 0.02]} r={[0.2, 0, 0]} />}
    </group>
  )
}

// Small face bits: clown nose / beauty mark / eye patch.
function FaceSmall({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const hc = r * 0.92
  const fz = r * 0.86 // accessory face-front plane (in front of the jaw surface)
  const col = mat(S(p.color, '#222'))
  const kind = S(p.kind, 'mark')
  if (kind === 'nose') return <Ball m={col} s={[r * 0.16, r * 0.16, r * 0.16]} p={[0, hc - r * 0.24, fz + r * 0.16]} />
  if (kind === 'eyepatch') {
    return (
      <group>
        <Ball m={col} s={[r * 0.24, r * 0.28, r * 0.1]} p={[-r * 0.4, hc - r * 0.03, fz + r * 0.04]} />
        <Box m={col} s={[r * 1.9, r * 0.05, r * 0.05]} p={[0, hc + r * 0.2, 0]} r={[0, 0, 0.18]} />
      </group>
    )
  }
  return <Ball m={col} s={[r * 0.04, r * 0.04, r * 0.04]} p={[r * 0.22, hc - r * 0.34, fz + r * 0.12]} /> // beauty mark
}

/* ================================================================== NECK ===== */
// Rendered in a local frame the wrapper centres at the neck base (y≈0 = collar).
function Neckwear({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const nr = P.neckR * 1.7 // collar radius around the neck
  const col = mat(S(p.color, '#888'), B(p.knit) ? 0.9 : 0.5, p.style === 'chain' || p.style === 'gem' ? 0.7 : 0)
  const style = S(p.style, 'scarf')
  switch (style) {
    case 'scarf':
      return (
        <group>
          <Ring m={col} radius={nr} tube={r * 0.16} p={[0, 0, 0]} r={[Math.PI / 2, 0, 0]} />
          <Box m={col} s={[r * 0.3, r * 0.7, r * 0.14]} p={[r * 0.1, -r * 0.45, P.torsoD * 0.7]} r={[0.1, 0, 0.05]} />
        </group>
      )
    case 'chain':
      return <Ring m={col} radius={nr} tube={r * 0.05} p={[0, -r * 0.05, P.torsoD * 0.2]} r={[Math.PI / 2.2, 0, 0]} />
    case 'pearls':
      return <group>{Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2
        return <Ball key={i} m={col} s={[r * 0.06, r * 0.06, r * 0.06]} p={[Math.sin(a) * nr, -r * 0.05 - Math.abs(Math.cos(a)) * r * 0.1, Math.cos(a) * nr * 0.5 + P.torsoD * 0.2]} />
      })}</group>
    case 'gem':
      return (
        <group>
          <Ring m={mat(S(p.color, '#e8c049'), 0.3, 0.7)} radius={nr} tube={r * 0.04} p={[0, -r * 0.05, P.torsoD * 0.2]} r={[Math.PI / 2.2, 0, 0]} />
          <Ball m={glowMat(S(p.gem, '#36c98a'), 0.5)} s={[r * 0.12, r * 0.14, r * 0.08]} p={[0, -r * 0.42, P.torsoD * 0.7]} />
        </group>
      )
    case 'tie':
      return <group>
        <Box m={col} s={[r * 0.2, r * 0.18, r * 0.1]} p={[0, -r * 0.05, P.torsoD * 0.7]} />
        <Box m={col} s={[r * 0.24, r * 0.8, r * 0.06]} p={[0, -r * 0.55, P.torsoD * 0.72]} />
      </group>
    case 'bowtie':
      return <group>
        {[-1, 1].map((sx) => <Box key={sx} m={col} s={[r * 0.26, r * 0.22, r * 0.08]} p={[sx * r * 0.2, -r * 0.05, P.torsoD * 0.75]} r={[0, 0, sx * 0.2]} />)}
        <Box m={col} s={[r * 0.1, r * 0.18, r * 0.1]} p={[0, -r * 0.05, P.torsoD * 0.78]} />
      </group>
    case 'neckband':
      return <group>
        <Ring m={col} radius={nr * 1.05} tube={r * 0.09} p={[0, -r * 0.05, 0]} r={[0, 0, 0]} />
        {[-1, 1].map((sx) => <Box key={sx} m={col} s={[r * 0.22, r * 0.26, r * 0.22]} p={[sx * nr * 1.05, -r * 0.05, 0]} />)}
      </group>
    case 'lanyard':
      return <group>
        {[-1, 1].map((sx) => <Box key={sx} m={col} s={[r * 0.05, r * 0.9, r * 0.04]} p={[sx * r * 0.28, -r * 0.4, P.torsoD * 0.55]} r={[0, 0, sx * 0.12]} />)}
        <Box m={mat(S(p.card, '#e8c049'))} s={[r * 0.4, r * 0.5, r * 0.04]} p={[0, -r * 0.85, P.torsoD * 0.6]} />
      </group>
    default:
      return null
  }
}

/* ================================================================== BACK ===== */
// Rendered in a local frame the wrapper centres on the upper back (+y up, +z toward
// the body, so accessory bulk extends to -z behind the avatar).
function Wings({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const preset = S(p.preset, 'angel')
  const col = mat(S(p.color, '#fff'), 0.6)
  const span = r * 2.4
  const renderWing = (sx: number) => {
    if (preset === 'butterfly') {
      const acc = mat(S(p.accent, '#ff9ec2'))
      return (
        <group key={sx} position={[sx * r * 0.4, 0, -r * 0.1]} rotation={[0, sx * 0.5, 0]}>
          <Ball m={col} s={[span * 0.5, r * 1.1, r * 0.06]} p={[sx * span * 0.4, r * 0.5, 0]} />
          <Ball m={acc} s={[span * 0.4, r * 0.8, r * 0.05]} p={[sx * span * 0.42, -r * 0.7, 0]} />
        </group>
      )
    }
    if (preset === 'demon') {
      const mem = mat(S(p.membrane, '#7a1e34'), 0.7)
      return (
        <group key={sx} position={[sx * r * 0.4, 0, -r * 0.1]} rotation={[0, sx * 0.6, 0]}>
          <Box m={mem} s={[span * 0.8, r * 1.6, r * 0.05]} p={[sx * span * 0.45, r * 0.2, 0]} r={[0, 0, sx * 0.3]} />
          {[0, 1, 2].map((i) => <Tube key={i} m={col} rTop={r * 0.02} rBot={r * 0.06} len={r * 0.5} p={[sx * span * (0.5 + i * 0.18), r * 0.9 - i * r * 0.5, r * 0.02]} r={[0, 0, sx * (0.4 - i * 0.3)]} />)}
        </group>
      )
    }
    // angel: stacked feather lobes
    return (
      <group key={sx} position={[sx * r * 0.4, 0, -r * 0.1]} rotation={[0, sx * 0.5, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <Ball key={i} m={col} s={[r * (0.7 - i * 0.1), r * (1.1 - i * 0.16), r * 0.06]} p={[sx * (r * 0.4 + i * r * 0.5), r * 0.6 - i * r * 0.35, 0]} r={[0, 0, sx * 0.3]} />
        ))}
      </group>
    )
  }
  return <group>{renderWing(-1)}{renderWing(1)}</group>
}

function Cape({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const col = mat(S(p.color, '#5a7da0'), 0.7)
  const long = B(p.fur)
  return (
    <group>
      <Tube m={col} rTop={P.chestW * 1.4} rBot={P.hipBoneW * (long ? 2.6 : 1.8)} len={long ? r * 3.6 : r * 2.2} p={[0, -r * (long ? 1.3 : 0.7), -r * 0.05]} />
      {S(p.trim, '') && <Ring m={mat(S(p.trim, '#e8c049'), 0.3, 0.6)} radius={P.chestW * 1.4} tube={r * 0.08} p={[0, r * 0.05, 0]} r={[Math.PI / 2, 0, 0]} />}
      {long && <Ball m={mat('#f3ecdf', 0.9)} s={[P.chestW * 1.5, r * 0.18, r * 0.3]} p={[0, r * 0.05, r * 0.05]} />}
    </group>
  )
}

function Bag({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const col = mat(S(p.color, '#3a6ea5'), 0.7)
  const strap = mat(S(p.color, '#3a6ea5'), 0.8)
  return (
    <group>
      <Box m={col} s={[P.chestW * 1.5, r * 1.5, r * 0.6]} p={[0, -r * 0.3, -r * 0.05]} />
      <Box m={col} s={[P.chestW * 1.1, r * 0.6, r * 0.5]} p={[0, r * 0.2, r * 0.05]} />
      {[-1, 1].map((sx) => <Tube key={sx} m={strap} rTop={r * 0.07} rBot={r * 0.07} len={r * 1.4} p={[sx * P.chestW * 0.8, r * 0.3, P.torsoD * 0.5]} r={[0.1, 0, 0]} />)}
    </group>
  )
}

// Floating / glowing back props: jetpack / books / aura.
function BackProp({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const kind = S(p.kind, 'aura')
  if (kind === 'jetpack') {
    const col = mat(S(p.color, '#9aa3ad'), 0.5, 0.4)
    return (
      <group>
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <Tube m={col} rTop={r * 0.3} rBot={r * 0.3} len={r * 1.4} p={[sx * r * 0.5, -r * 0.2, -r * 0.1]} />
            <Ball m={glowMat(S(p.flame, '#ff8a3a'), 1.0)} s={[r * 0.2, r * 0.4, r * 0.2]} p={[sx * r * 0.5, -r * 1.1, -r * 0.1]} />
          </group>
        ))}
      </group>
    )
  }
  if (kind === 'books') {
    const glow = S(p.emissive, '#b6a8ff')
    const cols = ['#6a4f8a', '#9a6a52', '#5a7da0']
    return (
      <group>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2
          return <Box key={i} m={mat(cols[i])} s={[r * 0.5, r * 0.7, r * 0.16]} p={[Math.sin(a) * r * 1.3, r * 0.3 + Math.cos(a) * r * 0.4, -r * 0.2]} r={[0, a, 0.2]} />
        })}
        <Ball m={glowMat(glow, 0.5)} s={[r * 1.6, r * 1.6, r * 0.2]} p={[0, r * 0.2, -r * 0.3]} />
      </group>
    )
  }
  // aura: a soft glowing ring + motes
  const glow = glowMat(S(p.emissive, '#b6a8ff'), 0.7)
  return (
    <group>
      <Ring m={glow} radius={r * 1.8} tube={r * 0.12} p={[0, -r * 0.4, 0]} r={[1.3, 0, 0]} />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return <Ball key={i} m={glow} s={[r * 0.12, r * 0.12, r * 0.12]} p={[Math.sin(a) * r * 1.6, r * 0.4 + Math.cos(a) * r * 0.5, -r * 0.1]} />
      })}
    </group>
  )
}

/* ================================================================== HAND ===== */
// Rendered inside the right-hand group. The arm hangs down, so the item sits just
// below/beside the hand, tipped slightly forward (+z) so it reads as "held".
function Handheld({ p, P }: { p: AccessoryParams; P: Proportions }) {
  const r = P.headR
  const col = mat(S(p.color, '#888'))
  const kind = S(p.kind, 'book')
  const y = -r * 0.5 // a touch below the hand
  const z = r * 0.2
  switch (kind) {
    case 'book':
    case 'notes':
      return <group position={[0, y, z]} rotation={[0.4, 0, 0]}>
        <Box m={col} s={[r * 0.7, r * 0.9, r * 0.18]} p={[0, 0, 0]} />
        <Box m={mat(S(p.ink, '#f3ecdf'))} s={[r * 0.6, r * 0.8, r * 0.2]} p={[0, 0, 0]} />
      </group>
    case 'coffee':
      return <group position={[0, y, z]}>
        <Tube m={col} rTop={r * 0.26} rBot={r * 0.22} len={r * 0.5} p={[0, 0, 0]} />
        {S(p.sleeve, '') && <Ring m={mat(S(p.sleeve, '#9a6a52'))} radius={r * 0.25} tube={r * 0.06} p={[0, 0, 0]} r={[Math.PI / 2, 0, 0]} />}
        <Ball m={mat('#fff')} s={[r * 0.22, r * 0.06, r * 0.22]} p={[0, r * 0.26, 0]} />
      </group>
    case 'pencil':
      return <group position={[0, y, z]} rotation={[0.3, 0, 0.2]}>
        <Tube m={col} rTop={r * 0.07} rBot={r * 0.07} len={r * 1.1} p={[0, 0, 0]} />
        <Tube m={mat('#f0c4a0')} rTop={r * 0.02} rBot={r * 0.07} len={r * 0.18} p={[0, -r * 0.6, 0]} />
        <Tube m={mat('#ff7a9c')} rTop={r * 0.08} rBot={r * 0.08} len={r * 0.12} p={[0, r * 0.58, 0]} />
      </group>
    case 'wand':
      return <group position={[0, y, z]} rotation={[0.3, 0, 0.2]}>
        <Tube m={col} rTop={r * 0.05} rBot={r * 0.05} len={r * 1.2} p={[0, 0, 0]} />
        <Ball m={glowMat(S(p.star, '#ffd36e'), 0.8)} s={[r * 0.18, r * 0.18, r * 0.1]} p={[0, r * 0.66, 0]} />
      </group>
    case 'lantern':
      return <group position={[0, y - r * 0.2, z]}>
        <Tube m={col} rTop={r * 0.04} rBot={r * 0.04} len={r * 0.3} p={[0, r * 0.5, 0]} r={[0, 0, 0]} />
        <Box m={col} s={[r * 0.36, r * 0.06, r * 0.36]} p={[0, r * 0.32, 0]} />
        <Ball m={glowMat(S(p.glow, '#ffcf6e'), 0.9)} s={[r * 0.26, r * 0.4, r * 0.26]} p={[0, 0, 0]} />
        <Box m={col} s={[r * 0.36, r * 0.06, r * 0.36]} p={[0, -r * 0.28, 0]} />
      </group>
    case 'rose':
      return <group position={[0, y, z]} rotation={[0.3, 0, 0.15]}>
        <Tube m={mat(S(p.stem, '#3f7d52'))} rTop={r * 0.04} rBot={r * 0.04} len={r * 1.0} p={[0, 0, 0]} />
        <Ball m={col} s={[r * 0.22, r * 0.24, r * 0.22]} p={[0, r * 0.56, 0]} />
      </group>
    case 'laptop':
    case 'tablet':
      return <group position={[0, y, z + r * 0.1]} rotation={[0.5, 0, 0]}>
        <Box m={col} s={[r * 1.0, r * 0.06, r * 0.7]} p={[0, 0, 0]} />
        <Box m={mat(S(p.screen, '#7df9ff'), 0.3)} s={[r * 0.92, r * 0.62, r * 0.04]} p={[0, r * 0.34, -r * 0.32]} r={[-0.5, 0, 0]} />
      </group>
    case 'camera':
      return <group position={[0, y, z]}>
        <Box m={col} s={[r * 0.7, r * 0.5, r * 0.4]} p={[0, 0, 0]} />
        <Tube m={mat('#111')} rTop={r * 0.18} rBot={r * 0.18} len={r * 0.2} p={[0, 0, r * 0.25]} r={[Math.PI / 2, 0, 0]} />
        <Ball m={glowMat(S(p.lens, '#7aa7ff'), 0.4)} s={[r * 0.14, r * 0.14, r * 0.06]} p={[0, 0, r * 0.36]} />
      </group>
    default:
      return null
  }
}

/* ============================================================== registry ===== */
type Renderer = (props: { p: AccessoryParams; P: Proportions }) => React.ReactElement | null

const RENDERERS: Record<RenderKind, Renderer> = {
  glasses: Glasses,
  hatBrim: HatBrim,
  hatSoft: HatSoft,
  crown: Crown,
  ears: Ears,
  headset: Headset,
  pointHat: PointHat,
  facialHair: FacialHair,
  mask: MaskAcc,
  faceSmall: FaceSmall,
  neckwear: Neckwear,
  wings: Wings,
  cape: Cape,
  bag: Bag,
  backProp: BackProp,
  handheld: Handheld,
}

function render(id: string | null | undefined, P: Proportions): React.ReactElement | null {
  const item = getAccessory(id)
  if (!item) return null
  const R = RENDERERS[item.render]
  return R ? <R p={item.params} P={P} /> : null
}

/* ----------------------------------------------------------------- wrappers */
// Layering: face (on the face) → eyewear (in front of eyes) → headwear (on top).
export function HeadAccessories({ eq, P }: { eq: EquippedAccessories; P: Proportions }) {
  return (
    <>
      {render(eq.face, P)}
      {render(eq.eyewear, P)}
      {render(eq.headwear, P)}
    </>
  )
}

// Below the head, around the neck base — positioned within the chest group.
export function NeckAccessories({ eq, P }: { eq: EquippedAccessories; P: Proportions }) {
  if (!getAccessory(eq.neck)) return null
  return <group position={[0, P.chestLen * 0.84, 0]}>{render(eq.neck, P)}</group>
}

// Behind the avatar — positioned on the upper back within the chest group.
export function BackAccessories({ eq, P }: { eq: EquippedAccessories; P: Proportions }) {
  if (!getAccessory(eq.back)) return null
  return <group position={[0, P.chestLen * 0.5, -P.torsoD * 0.7]}>{render(eq.back, P)}</group>
}

// In the right hand, in front of the body — rendered inside the hand group.
export function HandAccessory({ eq, P }: { eq: EquippedAccessories; P: Proportions }) {
  return render(eq.hand, P)
}
