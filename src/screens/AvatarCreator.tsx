import { Suspense, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { AvatarRig, type AvatarRigHandle } from '../avatar/AvatarRig'
import { AvatarAnimator } from '../avatar/AvatarAnimator'
import { BASE_BODY } from '../avatar/baseBody'
import type { Locomotion } from '../avatar/animation'
import { useAvatar } from '../avatar/store'
import {
  BOTTOMS,
  EYE_COLORS,
  HEIGHT_MAX,
  HEIGHT_MIN,
  SHOES,
  SKINS,
  TOPS,
  hairHex,
  hairsFor,
  starterCosmetics,
  type AvatarConfig,
  type GarmentOption,
  type StyleOption,
  type Swatch,
} from '../avatar/config'
import { accessoriesByCategory } from '../avatar/accessories/catalog'
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  SLOT_FOR_ACCESSORY_CATEGORY,
  type AccessoryItem,
} from '../avatar/accessories/types'
import { RARITY_COLOR, RARITY_LABEL } from '../marketplace/types'
import { useProfile } from '../store/profile'
import { useShop } from '../shop/store'
import { LoadingVeil } from '../components/LoadingVeil'
import { useIsDesktop, DesktopOnly } from '../components/DesktopOnly'
import './AvatarCreator.css'

// Roblox-style customizer for the ONE base body, laid out like the product
// mockup: a full-bleed dark 3D stage on the left (turntable + emote bar) and a
// light docked panel on the right (icon category tabs + thumbnail pickers). Every
// control writes straight to the avatar store via `set`, so the preview and the
// in-world avatar update live. All catalogs come from src/avatar/config.ts, so
// adding a hairstyle/colour there shows up here for free. No roster, no
// characterId — a single customizable body.

// Emotes live in the realm/game world, not the avatar editor — the editor is a
// focused dressing room. The preview just idles + turntable-rotates.

type DockTab = 'customize' | 'items' | 'accessories'

export function AvatarCreator() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const config = useAvatar((s) => s.config)
  const set = useAvatar((s) => s.set)
  const reset = useAvatar((s) => s.reset)
  const save = useAvatar((s) => s.save)
  const userXp = useProfile((s) => s.xp)
  const userPremiumXp = useProfile((s) => s.premiumXp)
  const shopOwned = useShop((s) => s.ownedItems)
  const shopPurchase = useShop((s) => s.purchase)

  const [dock, setDock] = useState<DockTab>('customize')
  const [saving, setSaving] = useState(false)
  const controls = useRef<OrbitControlsImpl>(null)
  const [previewItem, setPreviewItem] = useState<AccessoryItem | null>(null)

  if (!isDesktop) return <DesktopOnly />

  // When previewing an unowned item, merge it into the config so the 3D rig shows it
  const displayConfig = useMemo(() => {
    if (!previewItem) return config
    return {
      ...config,
      accessories: { ...config.accessories, [previewItem.slot]: previewItem.id },
    }
  }, [config, previewItem])

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

        {/* Focused dressing-room nav: Home / Shop / Avatar only. Quests, Garden &
            Friends live elsewhere — the editor stays distraction-free. Shop will
            open this editor on its Marketplace tab once that lands (Phase 3); for
            now it just keeps you in the dressing room. */}
        <nav className="ac-nav">
          <button className="ac-nav-item" onClick={() => navigate('/')}>
            <Glyph kind="home" /> Home
          </button>
          <button className="ac-nav-item" onClick={() => navigate('/avatar')}>
            <Glyph kind="shop" /> Shop
          </button>
          <button className="ac-nav-item" data-on onClick={() => navigate('/avatar')}>
            <Glyph kind="body" /> Avatar
          </button>
        </nav>

        <div className="ac-wallet">
          <span className="ac-coin ac-coin-petal">
            <img className="ac-coin-icon" src="/icons/leaf.png" alt="" draggable={false} /> {userXp.toLocaleString()}
          </span>
          <span className="ac-coin ac-coin-gem">
            <img className="ac-coin-icon" src="/icons/golden-leaf.png" alt="" draggable={false} /> {userPremiumXp.toLocaleString()}
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
            <AvatarCanvas config={displayConfig} controlsRef={controls} />
          </Suspense>
        </section>

        {/* ---- right: light dock ---- */}
        <aside className="ac-dock">
          <div className="ac-dock-head">
            <div className="ac-dock-toggle">
              <button data-on={dock === 'customize'} onClick={() => setDock('customize')}>
                <Glyph kind="sliders" /> Customize
              </button>
              <button data-on={dock === 'items'} onClick={() => setDock('items')}>
                <Glyph kind="bag" /> Items
              </button>
              <button data-on={dock === 'accessories'} onClick={() => setDock('accessories')}>
                <Glyph kind="gem" /> Accessories
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
          ) : dock === 'items' ? (
            <div className="ac-dock-scroll">
              <MyItems config={config} set={set} />
            </div>
          ) : (
            <div className="ac-dock-scroll">
              <AccessoriesPanel config={config} set={set} shopOwned={shopOwned} userXp={userXp} onPreview={setPreviewItem} />
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

        {/* ---- preview bar: try-before-you-buy ---- */}
        {previewItem && (
          <div className="ac-preview-bar">
            <div className="ac-preview-info">
              <span className="ac-preview-name">{previewItem.name}</span>
              <span className="ac-preview-price">
                <img src="/icons/leaf.png" alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 3 }} />
                {previewItem.price}
              </span>
            </div>
            <div className="ac-preview-actions">
              <button className="ac-preview-buy" onClick={() => {
                const newLeaves = shopPurchase(previewItem.id, previewItem.price, userXp)
                if (newLeaves !== userXp) {
                  useProfile.setState({ xp: newLeaves })
                  set({ accessories: { ...config.accessories, [previewItem.slot]: previewItem.id } })
                  setPreviewItem(null)
                }
              }} disabled={userXp < previewItem.price}>
                Buy &amp; Equip
              </button>
              <button className="ac-preview-cancel" onClick={() => setPreviewItem(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
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
// Base-body cosmetics: hair + clothing. These are always available.
// Accessories (glasses, hats, wings, etc.) are bought with leaves in the Accessories tab.

function MyItems({ config, set }: { config: AvatarConfig; set: SetFn }) {
  return (
    <>
      <p className="ac-items-note">
        Base cosmetics — always available. Buy accessories with leaves in the Accessories tab.
      </p>
      <StyleField
        label="Hairstyles"
        styles={hairsFor(config.bodyType)}
        selected={config.hair}
        tileHex={() => hairHex(config.hairColor)}
        onPick={(id) => set({ hair: id })}
      />
      <GarmentField label="Tops" items={TOPS} selected={config.top} onPick={(id) => set({ top: id })} />
      <GarmentField label="Bottoms" items={BOTTOMS} selected={config.bottom} onPick={(id) => set({ bottom: id })} />
      <GarmentField label="Shoes" items={SHOES} selected={config.shoes} onPick={(id) => set({ shoes: id })} />
      <p className="ac-items-note">Glasses, hats, wings, handhelds &amp; more live in the Accessories tab.</p>
    </>
  )
}

/* ----------------------------------------------------------------- accessories */
// The cosmetic accessory wardrobe: 7 categories, one item per conflicting slot,
// but every slot can be worn at once (hat + glasses + scarf + wings + a book…).
// Clicking a tile equips it, or unequips it if it's already on. Items show
// leaf prices — buy to unlock, then equip freely.
function AccessoriesPanel({ config, set, shopOwned, userXp, onPreview }: {
  config: AvatarConfig; set: SetFn
  shopOwned: string[]
  userXp: number
  onPreview: (item: AccessoryItem | null) => void
}) {
  const eq = config.accessories
  return (
    <>
      <p className="ac-items-note">
        Mix &amp; match — wear a hat, glasses, a scarf, wings and a handheld all at once. Tap an item to preview it first.
      </p>
      {CATEGORY_ORDER.map((cat) => {
        const slot = SLOT_FOR_ACCESSORY_CATEGORY[cat]
        const equippedId = eq[slot] ?? null
        return (
          <Field key={cat} label={CATEGORY_LABEL[cat]}>
            <div className="ac-acc-grid">
              {accessoriesByCategory(cat).map((it) => {
                const owned = shopOwned.includes(it.id) || it.price === 0
                const on = equippedId === it.id
                const canBuy = !owned && userXp >= it.price
                return (
                  <button
                    key={it.id}
                    className={`ac-acc-tile ${!owned ? 'ac-acc-tile--locked' : ''}`}
                    data-on={on}
                    style={{ ['--rarity' as string]: RARITY_COLOR[it.rarity] }}
                    title={`${it.name} · ${RARITY_LABEL[it.rarity]}${!owned ? ` · ${it.price} leaves` : ''}`}
                    onClick={() => {
                      if (owned) {
                        onPreview(null)
                        set({ accessories: { ...eq, [slot]: on ? null : it.id } })
                      } else if (canBuy) {
                        onPreview(it)
                      }
                    }}
                  >
                    <span className="ac-acc-dot" />
                    <span className="ac-acc-name">{it.name}</span>
                    {!owned && (
                      <span className="ac-acc-price" style={{ color: canBuy ? '#6fb86a' : '#ff6a6a' }}>
                        <img src="/icons/leaf.png" alt="" style={{ width: 12, height: 12, verticalAlign: 'middle', marginRight: 2 }} /> {it.price}
                      </span>
                    )}
                    {owned && on && <span className="ac-acc-tick"><Glyph kind="check" /></span>}
                  </button>
                )
              })}
            </div>
          </Field>
        )
      })}
    </>
  )
}

/* ----------------------------------------------------------------- 3D canvas */

// Static locomotion for the editor: the avatar stands in place; the emote bar
// drives the pose via the animator's `preview` override.
const STATIC_LOCO: Locomotion = { speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false }

function AvatarCanvas({
  config,
  controlsRef,
}: {
  config: AvatarConfig
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.1, 3.4], fov: 38, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      {/* warm café lighting — golden key + soft amber fill */}
      <hemisphereLight args={['#ffe8c0', '#3a2a18', 0.7]} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} color="#ffecd0" />
      <directionalLight position={[-2, 3, -1]} intensity={0.4} color="#ffb870" />
      <pointLight position={[0, 0.5, 0]} intensity={0.6} color="#ff9040" distance={4} decay={2} />
      <ambientLight intensity={0.25} color="#ffe8d0" />

      {/* warm dust motes floating in lamplight */}
      <DustMotes count={60} />

      <group position={[0, -0.9, 0]}>
        <PreviewAvatar config={config} />

        {/* warm wooden pedestal with glowing edge */}
        <CafePedestal />

        <ContactShadows position={[0, 0.002, 0]} opacity={0.4} scale={3} blur={2.6} far={2} resolution={256} color="#2a1a0a" />
      </group>

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        autoRotate={false}
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

/** Warm dust motes drifting in lamplight */
function DustMotes({ count = 60 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!)
  const positions = useRef(new Float32Array(count * 3))

  useMemo(() => {
    const pos = positions.current
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8
      pos[i * 3 + 1] = Math.random() * 5 - 0.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1
    }
  }, [count])

  useFrame((_, dt) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += dt * 0.04
      arr[i * 3] += Math.sin(i * 0.7) * dt * 0.02
      if (arr[i * 3 + 1] > 4.5) arr[i * 3 + 1] = -0.5
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions.current, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#ffe0a0"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

/** Warm wooden café pedestal with glowing ring edge */
function CafePedestal() {
  const ringRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.45 + Math.sin(t * 1.2) * 0.1
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.12 + Math.sin(t * 0.8) * 0.05
    }
  })

  return (
    <group>
      {/* soft warm floor glow */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[1.2, 48]} />
        <meshBasicMaterial color="#d49040" transparent opacity={0.12} />
      </mesh>

      {/* dark wooden floor disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 48]} />
        <meshStandardMaterial color="#3a2a18" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* glowing warm ring — like a lantern edge */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[0.82, 0.88, 48]} />
        <meshBasicMaterial color="#ff9040" transparent opacity={0.45} />
      </mesh>

      {/* inner accent ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[0.54, 0.58, 48]} />
        <meshBasicMaterial color="#c07030" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

/** The customizable body, driven by the emote bar. Renders the procedural rig +
 *  animator directly (vs the static CharacterAvatar) so emotes play live; the
 *  baked base.glb's own emote clips can replace this path once that art lands. */
function PreviewAvatar({ config }: { config: AvatarConfig }) {
  const rig = useRef<AvatarRigHandle>(null)
  const loco = useRef<Locomotion>(STATIC_LOCO)
  return (
    <group scale={BASE_BODY.scale} position={[0, BASE_BODY.yOffset, 0]}>
      <AvatarRig ref={rig} config={config} />
      <AvatarAnimator rig={rig} locomotion={loco} preview="idle" lod="near" />
    </group>
  )
}

/* -------------------------------------------------------------------- glyphs */

type GlyphKind =
  | 'home' | 'quests' | 'garden' | 'shop' | 'friends' | 'gear'
  | 'sliders' | 'bag' | 'gem' | 'close' | 'check' | 'auto'
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
    case 'gem': return <svg {...c}><path d="M6 3h12l3 6-9 12L3 9z" /><path d="M3 9h18M9 3l-3 6 6 12 6-12-3-6" /></svg>
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
