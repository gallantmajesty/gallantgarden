import { Suspense, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { AvatarRig, type AvatarRigHandle } from '../avatar/AvatarRig'
import { AvatarAnimator, type PreviewState } from '../avatar/AvatarAnimator'
import { BASE_BODY } from '../avatar/baseBody'
import type { Locomotion } from '../avatar/animation'
import { useAvatar } from '../avatar/store'
import {
  BOTTOMS,
  EYE_COLORS,
  HAIRS,
  HEIGHT_MAX,
  HEIGHT_MIN,
  SHOES,
  SKINS,
  TOPS,
  hairHex,
  starterCosmetics,
  type AvatarConfig,
  type GarmentOption,
  type StyleOption,
  type Swatch,
} from '../avatar/config'
import { LoadingVeil } from '../components/LoadingVeil'
import './AvatarCreator.css'

// Roblox-style customizer for the ONE base body, laid out like the product
// mockup: a full-bleed dark 3D stage on the left (turntable + emote bar) and a
// light docked panel on the right (icon category tabs + thumbnail pickers). Every
// control writes straight to the avatar store via `set`, so the preview and the
// in-world avatar update live. All catalogs come from src/avatar/config.ts, so
// adding a hairstyle/colour there shows up here for free. No roster, no
// characterId — a single customizable body.

// Emote bar — drives the live preview pose (see AvatarAnimator PreviewState).
const EMOTES: { id: PreviewState; label: string; icon: GlyphKind }[] = [
  { id: 'idle', label: 'Idle', icon: 'idle' },
  { id: 'wave', label: 'Wave', icon: 'wave' },
  { id: 'happy', label: 'Cheer', icon: 'happy' },
  { id: 'celebrate', label: 'Celebrate', icon: 'celebrate' },
  { id: 'sit', label: 'Sit', icon: 'sit' },
]

type DockTab = 'customize' | 'items'

export function AvatarCreator() {
  const navigate = useNavigate()
  const config = useAvatar((s) => s.config)
  const set = useAvatar((s) => s.set)
  const reset = useAvatar((s) => s.reset)
  const save = useAvatar((s) => s.save)

  const [dock, setDock] = useState<DockTab>('customize')
  const [emote, setEmote] = useState<PreviewState>('idle')
  const [auto, setAuto] = useState(true)
  const [saving, setSaving] = useState(false)
  const controls = useRef<OrbitControlsImpl>(null)

  async function onSave() {
    setSaving(true)
    await save()
    setSaving(false)
    navigate('/')
  }

  return (
    <div className="ac-root">
      {/* ---- top game nav ---- */}
      <header className="ac-topnav">
        <button className="ac-brand" onClick={() => navigate('/')}>
          <span className="ac-brand-mark">✿</span>
          <span className="ac-brand-name">Focus Lily</span>
        </button>

        <nav className="ac-nav">
          <button className="ac-nav-item" data-on onClick={() => navigate('/')}>
            <Glyph kind="home" /> Home
          </button>
          <button className="ac-nav-item" onClick={() => navigate('/magnet')}>
            <Glyph kind="quests" /> Quests
          </button>
          <button className="ac-nav-item" onClick={() => navigate('/realm')}>
            <Glyph kind="garden" /> Garden
          </button>
          <button className="ac-nav-item" onClick={() => navigate('/')}>
            <Glyph kind="shop" /> Shop
          </button>
          <button className="ac-nav-item" onClick={() => navigate('/')}>
            <Glyph kind="friends" /> Friends
          </button>
        </nav>

        <div className="ac-wallet">
          <span className="ac-coin ac-coin-petal">
            <span className="ac-coin-dot ac-coin-dot-petal">✿</span> 12,450
          </span>
          <span className="ac-coin ac-coin-gem">
            <span className="ac-coin-dot ac-coin-dot-gem">◆</span> 320
          </span>
          <button className="ac-gear" onClick={() => navigate('/')} aria-label="Settings">
            <Glyph kind="gear" />
          </button>
        </div>
      </header>

      <div className="ac-body">
        {/* ---- left: dark 3D stage ---- */}
        <section className="ac-stage">
          <Suspense fallback={<div className="ac-stage-veil"><LoadingVeil label="Summoning your avatar…" /></div>}>
            <AvatarCanvas config={config} auto={auto} emote={emote} controlsRef={controls} />
          </Suspense>

          <button className="ac-rotate" onClick={() => setAuto((v) => !v)} data-on={auto}>
            <Glyph kind="auto" /> {auto ? 'Auto-rotate' : 'Manual'}
          </button>

          {/* emote bar */}
          <div className="ac-emotebar">
            {EMOTES.map((e) => (
              <button
                key={e.id}
                className="ac-emote"
                data-on={emote === e.id}
                onClick={() => setEmote(e.id)}
              >
                <span className="ac-emote-ico"><Glyph kind={e.icon} /></span>
                <span className="ac-emote-label">{e.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ---- right: light dock ---- */}
        <aside className="ac-dock">
          <div className="ac-dock-head">
            <div className="ac-dock-toggle">
              <button data-on={dock === 'customize'} onClick={() => setDock('customize')}>
                <Glyph kind="sliders" /> Customize
              </button>
              <button data-on={dock === 'items'} onClick={() => setDock('items')}>
                <Glyph kind="bag" /> My Items
              </button>
            </div>
            <button className="ac-dock-x" onClick={() => navigate('/')} aria-label="Close">
              <Glyph kind="close" />
            </button>
          </div>

          {dock === 'customize' ? (
            // Customize is intentionally limited to intrinsic APPEARANCE — body
            // type, height, skin, eyes. Clothing + hair are owned cosmetics and
            // live in "My Items", not here.
            <div className="ac-dock-scroll">
              <BodyTab config={config} set={set} />
            </div>
          ) : (
            <div className="ac-dock-scroll">
              <MyItems config={config} set={set} />
            </div>
          )}

          <div className="ac-dock-foot">
            <button className="ac-save" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Avatar'}
            </button>
            <button className="ac-reset" onClick={() => reset()}>
              Reset
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- category tabs */

type SetFn = (patch: Partial<AvatarConfig>) => void

function BodyTab({ config, set }: { config: AvatarConfig; set: SetFn }) {
  // Switching gender applies that gender's STARTER cosmetics (hair + outfit) so the
  // two starters stay distinct, while leaving the player's height/skin/eyes intact.
  const setGender = (bodyType: AvatarConfig['bodyType']) => {
    if (config.bodyType === bodyType) return
    set({ bodyType, ...starterCosmetics(bodyType) })
  }
  return (
    <>
      <Field label="Body type">
        <div className="ac-seg">
          <button data-on={config.bodyType === 'male'} onClick={() => setGender('male')}>
            Male
          </button>
          <button data-on={config.bodyType === 'female'} onClick={() => setGender('female')}>
            Female
          </button>
        </div>
      </Field>

      <Field label={<>Height <b>{config.height} cm</b></>}>
        <input
          className="ac-range"
          type="range"
          min={HEIGHT_MIN}
          max={HEIGHT_MAX}
          value={config.height}
          onChange={(e) => set({ height: Number(e.target.value) })}
        />
      </Field>

      <SwatchField
        label="Skin"
        swatches={SKINS}
        selected={config.skin}
        onPick={(id) => set({ skin: id })}
      />

      <SwatchField
        label="Eye Color"
        swatches={EYE_COLORS}
        selected={config.eyes}
        onPick={(id) => set({ eyes: id })}
      />
    </>
  )
}

/* ------------------------------------------------------------- control widgets */

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="ac-field">
      <span className="ac-field-label">{label}</span>
      {children}
    </div>
  )
}

/** Thumbnail-tile grid for styles. With no baked art yet, each tile shows the
 *  style name over a colour chip; `tileHex(s)` colours the chip (the current hair
 *  colour for hair, or the garment's own baked colour for items). */
function StyleField({
  label,
  styles,
  selected,
  tileHex,
  onPick,
}: {
  label: string
  styles: StyleOption[]
  selected: string
  tileHex: (s: StyleOption) => string
  onPick: (id: string) => void
}) {
  return (
    <Field label={label}>
      <div className="ac-tile-grid">
        {styles.map((s) => (
          <button
            key={s.id}
            className="ac-tile"
            data-on={selected === s.id}
            onClick={() => onPick(s.id)}
            title={s.name}
          >
            <span className="ac-tile-chip" style={{ background: s.id === 'none' ? 'transparent' : tileHex(s) }}>
              {s.id === 'none' && <span className="ac-tile-none">∅</span>}
            </span>
            <span className="ac-tile-name">{s.name}</span>
            {selected === s.id && <span className="ac-tile-tick"><Glyph kind="check" /></span>}
          </button>
        ))}
      </div>
    </Field>
  )
}

/** Style-only picker for owned cosmetic garments — each tile shows the item's own
 *  baked colour. There is no colour picker: colour is a property of the item. */
function GarmentField({
  label,
  items,
  selected,
  onPick,
}: {
  label: string
  items: GarmentOption[]
  selected: string
  onPick: (id: string) => void
}) {
  return <StyleField label={label} styles={items} selected={selected} tileHex={(s) => (s as GarmentOption).hex} onPick={onPick} />
}

/** Colour swatch row for a predefined appearance palette (skin / hair / eyes).
 *  Fixed palette only — no custom colour, in keeping with the limited-but-curated
 *  customization philosophy. */
function SwatchField({
  label,
  swatches,
  selected,
  onPick,
}: {
  label: string
  swatches: Swatch[]
  selected: string
  onPick: (id: string) => void
}) {
  return (
    <Field label={label}>
      <div className="ac-swatch-row">
        {swatches.map((s) => (
          <button
            key={s.id}
            className="ac-swatch"
            data-on={selected === s.id}
            title={s.name}
            aria-label={s.name}
            style={{ background: s.hex }}
            onClick={() => onPick(s.id)}
          />
        ))}
      </div>
    </Field>
  )
}

/* ----------------------------------------------------------------- my items */
// Cosmetics live here, not in Customize: hair + clothing are OWNED items you
// equip (and later unlock/purchase with Focus Points). For now every catalog
// entry is treated as owned so the avatar stays fully functional; the locked
// categories below are placeholders for the cosmetic types still to come.

function MyItems({ config, set }: { config: AvatarConfig; set: SetFn }) {
  return (
    <>
      <p className="ac-items-note">
        Your owned cosmetics. Earn Focus Points to unlock more — new items appear here.
      </p>
      <StyleField
        label="Hairstyles"
        styles={HAIRS}
        selected={config.hair}
        tileHex={() => hairHex(config.hairColor)}
        onPick={(id) => set({ hair: id })}
      />
      <GarmentField label="Tops" items={TOPS} selected={config.top} onPick={(id) => set({ top: id })} />
      <GarmentField label="Bottoms" items={BOTTOMS} selected={config.bottom} onPick={(id) => set({ bottom: id })} />
      <GarmentField label="Shoes" items={SHOES} selected={config.shoes} onPick={(id) => set({ shoes: id })} />
      <LockedCategory label="Accessories" />
      <LockedCategory label="Glasses" />
      <LockedCategory label="Wings" />
      <LockedCategory label="Back Items" />
    </>
  )
}

/** A cosmetic category that exists in the IA but has no items yet. */
function LockedCategory({ label }: { label: string }) {
  return (
    <Field label={label}>
      <div className="ac-locked">
        <Glyph kind="bag" /> Coming soon — unlock with Focus Points
      </div>
    </Field>
  )
}

/* ----------------------------------------------------------------- 3D canvas */

// Static locomotion for the editor: the avatar stands in place; the emote bar
// drives the pose via the animator's `preview` override.
const STATIC_LOCO: Locomotion = { speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false }

function AvatarCanvas({
  config,
  auto,
  emote,
  controlsRef,
}: {
  config: AvatarConfig
  auto: boolean
  emote: PreviewState
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.1, 3.4], fov: 38, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      {/* clean lighting only — no bloom/vignette/SSAO/DoF, and no external HDR
          fetch (keeps the editor fast + offline-safe) */}
      <hemisphereLight args={['#cfe0ff', '#3a2f4a', 0.8]} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} color="#fff3df" />
      <directionalLight position={[-3, 2, -2]} intensity={0.45} color="#9a8cff" />
      <ambientLight intensity={0.25} />

      <group position={[0, -0.9, 0]}>
        <PreviewAvatar config={config} emote={emote} />
        {/* magic-circle pedestal */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <ringGeometry args={[0.55, 0.85, 48]} />
          <meshBasicMaterial color="#8a6cff" transparent opacity={0.5} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.9, 48]} />
          <meshStandardMaterial color="#2a2440" roughness={0.6} />
        </mesh>
        <ContactShadows position={[0, 0.002, 0]} opacity={0.45} scale={3} blur={2.4} far={2} resolution={256} color="#1a1430" />
      </group>

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        autoRotate={auto}
        autoRotateSpeed={1.4}
        // Roblox-style turntable: damped click-drag glides to rest (no abrupt
        // stop / snap), with a calmer rotate speed for fine control.
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        minDistance={2}
        maxDistance={6}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, 0.1, 0]}
      />
    </Canvas>
  )
}

/** The customizable body, driven by the emote bar. Renders the procedural rig +
 *  animator directly (vs the static CharacterAvatar) so emotes play live; the
 *  baked base.glb's own emote clips can replace this path once that art lands. */
function PreviewAvatar({ config, emote }: { config: AvatarConfig; emote: PreviewState }) {
  const rig = useRef<AvatarRigHandle>(null)
  const loco = useRef<Locomotion>(STATIC_LOCO)
  return (
    <group scale={BASE_BODY.scale} position={[0, BASE_BODY.yOffset, 0]}>
      <AvatarRig ref={rig} config={config} />
      <AvatarAnimator rig={rig} locomotion={loco} preview={emote} lod="near" />
    </group>
  )
}

/* -------------------------------------------------------------------- glyphs */

type GlyphKind =
  | 'home' | 'quests' | 'garden' | 'shop' | 'friends' | 'gear'
  | 'sliders' | 'bag' | 'close' | 'check' | 'auto'
  | 'body' | 'hair' | 'eyes' | 'top' | 'bottom' | 'shoes'
  | 'idle' | 'wave' | 'happy' | 'celebrate' | 'sit'

function Glyph({ kind }: { kind: GlyphKind }) {
  const c = {
    width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.9,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (kind) {
    case 'home': return <svg {...c}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
    case 'quests': return <svg {...c}><path d="M9 11l3 3 8-8" /><path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h11" /></svg>
    case 'garden': return <svg {...c}><path d="M12 22V11" /><path d="M12 11C12 7 9 4 4 4c0 5 3 7 8 7z" /><path d="M12 13c0-3 3-6 8-6 0 4-3 6-8 6z" /></svg>
    case 'shop': return <svg {...c}><path d="M5 7h14l-1 13H6L5 7z" /><path d="M9 7a3 3 0 016 0" /></svg>
    case 'friends': return <svg {...c}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0112 0" /><path d="M16 6a3 3 0 010 6" /><path d="M18 14a6 6 0 013 5" /></svg>
    case 'gear': return <svg {...c}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
    case 'sliders': return <svg {...c}><path d="M4 8h10M18 8h2M4 16h2M10 16h10" /><circle cx="16" cy="8" r="2" /><circle cx="8" cy="16" r="2" /></svg>
    case 'bag': return <svg {...c}><path d="M6 7h12l1 13H5L6 7z" /><path d="M9 7V5a3 3 0 016 0v2" /></svg>
    case 'close': return <svg {...c}><path d="M6 6l12 12M18 6L6 18" /></svg>
    case 'check': return <svg {...c}><path d="M5 12l4 4 10-10" /></svg>
    case 'auto': return <svg {...c}><path d="M21 12a9 9 0 11-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
    case 'body': return <svg {...c}><circle cx="12" cy="6" r="3" /><path d="M6 21v-3a6 6 0 0112 0v3" /></svg>
    case 'hair': return <svg {...c}><path d="M5 13a7 7 0 0114 0" /><path d="M5 13c0 3 1 6 2 6M19 13c0 3-1 6-2 6" /></svg>
    case 'eyes': return <svg {...c}><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.5" /></svg>
    case 'top': return <svg {...c}><path d="M8 4l-4 4 2 2 2-1v11h8V9l2 1 2-2-4-4-2 2H10z" /></svg>
    case 'bottom': return <svg {...c}><path d="M7 3h10l1 18h-6l-1-9-1 9H6z" /></svg>
    case 'shoes': return <svg {...c}><path d="M3 16v-5l4-2 3 3 8 1c2 0 3 2 3 3v2H3z" /></svg>
    case 'idle': return <svg {...c}><circle cx="12" cy="6" r="2.5" /><path d="M12 8v7M9 22l3-7 3 7M8 12h8" /></svg>
    case 'wave': return <svg {...c}><path d="M7 11V6a1.5 1.5 0 013 0v4M10 10V5a1.5 1.5 0 013 0v5M13 10V6a1.5 1.5 0 013 0v6c0 4-2 7-6 7s-6-3-6-6l1-2" /></svg>
    case 'happy': return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M8 14a4 4 0 008 0" /><path d="M9 9h.01M15 9h.01" /></svg>
    case 'celebrate': return <svg {...c}><path d="M3 21l5-12 7 7-12 5z" /><path d="M14 4l1 2M18 8l2 1M16 2l0 2M20 6l2 0" /></svg>
    case 'sit': return <svg {...c}><path d="M6 4v7h7M6 11l-1 9M13 11l1 4h4M13 15l1 5M18 4v16" /></svg>
    default: return null
  }
}
