// @ts-nocheck
// 3D accessory props for the avatar's desk / the studio dining table. Each
// AccessoryModel is a small, detailed procedural object (no GLB assets) that
// reads as a real item. BigDiningTable is the circular studio table used in the
// Avatar Creator's Accessories step — the single chosen accessory sits on top.
// AccessoryTray is the little desk that travels with the avatar (library hall).
import {
  type Color,
  boxGeo,
  latheGeo,
  sphereGeo,
  taperGeo,
  torusGeo,
  sharedMaterial,
  texturedMaterial,
} from './config'
import { ACCESSORIES, type AccessoryId } from './config'

const m = (hex: string, rough = 0.6, metal = 0) => sharedMaterial(hex, rough, metal)

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

/** One accessory model, centred on X/Z, base sitting at y = 0. Detailed. */
export function AccessoryModel({ id }: { id: AccessoryId }) {
  switch (id) {
    case 'laptop':
  case 'gaming_laptop': {
    const isGaming = id === 'gaming_laptop'
    const clockSec = isGaming ? (Date.now() / 1000) % 10 : 0
    const shell = isGaming ? tm('#3a2616', 0.5, 0, 'wood') : tm('#b8a48c', 0.5, 0.1, 'leather')
    const base = isGaming ? tm('#2a1a10', 0.6, 0, 'wood') : tm('#9a8468', 0.6, 0, 'wood')
    const keyMat = !isGaming ? m('#e9dcc4', 0.5) : null

    const { base: hueBase, glowSoft, glowMid, glowHard, glowUltra, complimentGlowSoft, complimentGlowMid, rgb } =
      isGaming
        ? makeRgbGamingPalette(clockSec / 10)
        : {
            base: '#c9924a',
            compliment: '#7a4a2b',
            glowSoft: m('#c9924a', 0.4, 0.1),
            glowMid: m('#c9924a', 0.4, 0.2),
            glowHard: m('#c9924a', 0.35, 0.2),
            glowUltra: m('#c9924a', 0.3, 0.15),
            complimentGlowSoft: m('#7a4a2b', 0.4, 0.1),
            complimentGlowMid: m('#7a4a2b', 0.4, 0.2),
            rgb: WARM_GLOW,
          }

    const screenGlow = isGaming ? glowHard : m('#c9924a', 0.35)
    const logo = isGaming ? glowMid : m('#caa24a', 0.4, 0.3)

    const keys = []
    const colsK = 11
    const rowsK = 5
    for (let r = 0; r < rowsK; r++) {
      for (let c = 0; c < colsK; c++) {
        const kx = -0.165 + c * 0.033
        const kz = 0.015 + r * 0.026
        const keyPalette = isGaming ? rgb : ['#e9dcc4']
        const hue = keyMat ? keyPalette[0] : keyPalette[(c + r) % keyPalette.length]
        keys.push(
          <mesh
            key={`k${r}-${c}`}
            geometry={boxGeo(0.028, 0.009, 0.022)}
            material={keyMat ? keyMat : m(hue, 0.45, 0.2)}
            position={[kx, 0.031, kz]}
          />,
        )
      }
    }

    return (
      <group>
        {/* RGB underglow / backlight strip */}
        <group position={[0, -0.004, 0]}>
          <mesh geometry={boxGeo(0.48, 0.005, 0.18)} material={glowSoft} />
          <mesh geometry={boxGeo(0.44, 0.004, 0.14)} material={glowHard} />
          <mesh geometry={boxGeo(0.4, 0.003, 0.1)} material={glowUltra} />
        </group>

        {/* base / keyboard deck */}
        <mesh
          geometry={boxGeo(0.44, 0.025, 0.32)}
          material={isGaming ? tm('#2a1a10', 0.5, 0, 'wood') : shell}
          position={[0, 0.0125, 0.02]}
          castShadow
        />
        <mesh geometry={boxGeo(0.4, 0.012, 0.22)} material={base} position={[0, 0.026, 0.03]} />
        {keys}
        {/* trackpad (lit edge when gaming) */}
        <mesh
          geometry={boxGeo(0.11, 0.006, 0.07)}
          material={isGaming ? glowMid : m('#d9c8a8', 0.5)}
          position={[0, 0.03, 0.13]}
        />
        {/* left RGB accent bar */}
        {isGaming && (
          <mesh geometry={boxGeo(0.005, 0.025, 0.28)} material={complimentGlowMid} position={[-0.215, 0.025, 0.03]} />
        )}
        {/* right RGB accent bar */}
        {isGaming && (
          <mesh geometry={boxGeo(0.005, 0.025, 0.28)} material={complimentGlowSoft} position={[0.215, 0.025, 0.03]} />
        )}

        {/* screen lid */}
        <group position={[0, 0.025, -0.13]} rotation={[-0.22, 0, 0]}>
          {/* thin RGB light bar on screen hinge */}
          {isGaming && (
            <mesh geometry={boxGeo(0.46, 0.006, 0.012)} material={glowUltra} position={[0, -0.002, 0.005]} />
          )}
          <mesh geometry={boxGeo(0.44, 0.3, 0.014)} material={shell} position={[0, 0.15, 0]} castShadow />
          <mesh geometry={boxGeo(0.4, 0.26, 0.004)} material={m('#241510', 0.4)} position={[0, 0.15, 0.008]} />
          <mesh geometry={boxGeo(0.37, 0.23, 0.002)} material={screenGlow} position={[0, 0.15, 0.01]} />
          {/* lit brand emblem on the lid */}
          <mesh geometry={boxGeo(0.06, 0.06, 0.002)} material={logo} position={[0, 0.15, 0.011]} />
        </group>
      </group>
    )
  }
    case 'phone': {
      const shell = tm('#5b3a22', 0.45, 0.1, 'leather')
      const screen = m('#1a120a', 0.4)
      const ui = m('#c9924a', 0.4)
      const cam = m('#241510', 0.4)
      const lens = m('#3a2616', 0.3, 0.4)
      const lensGlass = m('#8a5a37', 0.2, 0.5)
      const apps = ['#c9924a', '#d99a4e', '#a06a3a', '#8a5a37', '#e0b878', '#b87333']
      return (
        // lies FLAT on the table (face up) — not standing
        <group position={[0, 0.012, 0.14]}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <mesh geometry={boxGeo(0.14, 0.28, 0.018)} material={shell} position={[0, 0.14, 0]} castShadow />
            <mesh geometry={boxGeo(0.122, 0.258, 0.004)} material={screen} position={[0, 0.14, 0.009]} />
            <mesh geometry={boxGeo(0.104, 0.234, 0.002)} material={ui} position={[0, 0.14, 0.011]} />
            {/* dynamic island + front camera */}
            <mesh geometry={boxGeo(0.05, 0.014, 0.004)} material={shell} position={[0, 0.25, 0.012]} />
            <mesh geometry={sphereGeo(0.006)} material={m('#0a0a0c', 0.3)} position={[0, 0.266, 0.012]} />
            {/* app grid */}
            {apps.map((c, i) => (
              <mesh key={i} geometry={boxGeo(0.026, 0.026, 0.002)} material={m(c, 0.45)} position={[-0.03 + (i % 3) * 0.032, 0.2 - Math.floor(i / 3) * 0.034, 0.012]} />
            ))}
            {/* dock */}
            <mesh geometry={boxGeo(0.11, 0.012, 0.002)} material={m('#2a1a10', 0.4)} position={[0, 0.06, 0.012]} />
            {/* rear camera module (square bump + 4 lenses + flash) */}
            <mesh geometry={boxGeo(0.062, 0.062, 0.014)} material={cam} position={[0.03, 0.21, -0.014]} />
            {[[0.016, 0.226], [0.044, 0.226], [0.016, 0.194], [0.044, 0.194]].map(([cx, cy], i) => (
              <group key={i} position={[cx, cy, -0.022]}>
                <mesh geometry={taperGeo(0.015, 0.015, 0.012)} material={lens} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={sphereGeo(0.006)} material={lensGlass} position={[0, 0, -0.008]} />
              </group>
            ))}
            <mesh geometry={sphereGeo(0.006)} material={m('#fff3c0', 0.3, 0.2)} position={[0.012, 0.194, -0.022]} />
          </group>
        </group>
      )
    }
    case 'book': {
      const cover = tm('#7a3b22', 0.7, 0, 'leather')
      const cover2 = tm('#5e2c18', 0.7, 0, 'leather')
      const pages = tm('#f3ead2', 0.85, 0, 'paper')
      const pageLine = m('#e0d2b0', 0.9)
      const gold = m('#caa24a', 0.4, 0.3)
      const emblem = m('#e0b86a', 0.4, 0.35)
      return (
        <group>
          <mesh geometry={boxGeo(0.36, 0.09, 0.28)} material={cover} position={[0, 0.045, 0]} castShadow />
          <mesh geometry={boxGeo(0.34, 0.07, 0.265)} material={pages} position={[0, 0.062, 0.004]} />
          {/* page lines on the top edge */}
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={`pl${i}`} geometry={boxGeo(0.33, 0.002, 0.25)} material={pageLine} position={[0, 0.05 + i * 0.007, 0.004]} />
          ))}
          {/* spine with ridges */}
          <mesh geometry={boxGeo(0.012, 0.09, 0.28)} material={pages} position={[-0.17, 0.045, 0]} />
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={`sp${i}`} geometry={boxGeo(0.014, 0.002, 0.26)} material={pageLine} position={[-0.17, 0.022 + i * 0.018, 0.004]} />
          ))}
          <mesh geometry={boxGeo(0.33, 0.012, 0.25)} material={cover2} position={[0, 0.092, 0]} />
          {/* embossed title band + emblem */}
          <mesh geometry={boxGeo(0.24, 0.026, 0.004)} material={gold} position={[0.02, 0.075, 0.141]} />
          <mesh geometry={boxGeo(0.14, 0.014, 0.004)} material={gold} position={[0.02, 0.05, 0.141]} />
          <mesh geometry={sphereGeo(0.022)} material={emblem} position={[-0.08, 0.072, 0.142]} />
          {/* gold corner ornaments */}
          {[[-0.15, 0.07], [0.15, 0.07], [-0.15, 0.02], [0.15, 0.02]].map(([cx, cy], i) => (
            <mesh key={`co${i}`} geometry={boxGeo(0.03, 0.03, 0.004)} material={gold} position={[cx, cy, 0.141]} />
          ))}
          {/* bookmark ribbon */}
          <mesh geometry={boxGeo(0.02, 0.16, 0.004)} material={m('#e0b84a', 0.6)} position={[0.14, -0.015, 0.141]} />
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
    default:
      return null
  }
}

/** Circular studio dining table. The single chosen accessory sits on top. */
export function BigDiningTable({ accessory }: { accessory?: string }) {
  const R = 1.18
  const H = 0.92
  const wood = tm('#6b4a2e', 0.6, 0, 'wood', 3, 1)
  const woodDark = tm('#4f3621', 0.65, 0, 'wood', 3, 1)
  const inlay = m('#caa24a', 0.4, 0.3)
  const top = accessory ? <group position={[0, H + 0.03, 0]} scale={1.5}><AccessoryModel id={accessory as AccessoryId} /></group> : null
  return (
    <group>
      {/* round top */}
      <mesh geometry={taperGeo(R, R, 0.06)} material={wood} position={[0, H, 0]} castShadow />
      {/* bevelled edge */}
      <mesh geometry={torusGeo(R, 0.025, 12, 48)} material={woodDark} position={[0, H + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* gold inlay ring on the surface */}
      <mesh geometry={torusGeo(R * 0.62, 0.012, 10, 48)} material={inlay} position={[0, H + 0.032, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* pedestal */}
      <mesh geometry={taperGeo(0.14, 0.2, H - 0.06)} material={woodDark} position={[0, (H - 0.06) / 2, 0]} castShadow />
      {/* foot */}
      <mesh geometry={taperGeo(0.52, 0.52, 0.05)} material={wood} position={[0, 0.025, 0]} castShadow />
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
