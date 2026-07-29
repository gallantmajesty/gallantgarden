import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { CharacterAvatar } from '../avatar/CharacterAvatar'
import { KoreanCafeShowcase } from '../three/library/KoreanCafeShowcase'
import { useAvatar } from '../avatar/store'
import { CHARACTERS, characterById } from '../avatar/characters'
import { useProfile } from '../store/profile'
import { useShop } from '../shop/store'
import { BANNERS, LOGOS, type BannerCategory, type LogoCategory } from '../lib/banners'
import {
  type AvatarConfig,
  type StyleOption,
  type Swatch,
  SKINS,
  EYE_COLORS,
  ACCESSORIES,
  skinHex,
} from '../avatar/config'
import { BigDiningTable } from '../avatar/Accessories'
import { ResourceBar } from '../components/ResourceBar'
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

export function AvatarCreator() {
  const navigate = useNavigate()
  const config = useAvatar((s) => s.config)
  const set = useAvatar((s) => s.set)
  const reset = useAvatar((s) => s.reset)
  const save = useAvatar((s) => s.save)
  const userXp = useProfile((s) => s.xp)
  const userPremiumXp = useProfile((s) => s.premiumXp)

  const [saving, setSaving] = useState(false)
  const controls = useRef<OrbitControlsImpl>(null)

  async function onSave() {
    setSaving(true)
    await save()
    setSaving(false)
    navigate('/')
  }

  // Mind-map style wizard: Characters → Outfit → Accessories.
  const [step, setStep] = useState<'characters' | 'outfit' | 'accessories' | 'shop'>('characters')
  const steps = ['characters', 'outfit', 'accessories', 'shop'] as const
  const stepIndex = steps.indexOf(step)
  const goNext = () => { if (stepIndex < steps.length - 1) setStep(steps[stepIndex + 1]) }
  const goBack = () => { if (stepIndex > 0) setStep(steps[stepIndex - 1]) }
  const hasChar = !!config.characterId

  const humanIds = ['james', 'claire', 'mia']
  const isCurrentHuman = humanIds.includes(config.characterId || 'james')
  useEffect(() => {
    if (!isCurrentHuman && (step === 'outfit' || step === 'accessories')) {
      setStep('characters')
    }
  }, [config.characterId])

  return (
    <div className="ac-root">
      <div className="ac-body">
        {/* ---- left: dark 3D stage ---- */}
        <section className="ac-stage">
          <div className="ac-stage-name">
          {step === 'accessories' ? 'Accessory Studio' : step === 'shop' ? 'Avatar Shop' : characterById(config.characterId || 'james').name}
        </div>
          <Suspense fallback={<div className="ac-stage-veil" />}>
            <AvatarCanvas
          config={config}
          controlsRef={controls}
          accessoryMode={step === 'accessories'}
          accessory={config.accessories?.[0]}
        />
          </Suspense>
        </section>

        {/* ---- mind-map sidebar ---- */}
        <MindMap step={step} onPick={(s) => setStep(s)} config={config} />

        {/* ---- right: light dock ---- */}
        <aside className="ac-dock">
          <div className="ac-dock-head">
            <button className="ac-dock-back" onClick={() => navigate('/')} aria-label="Back">
              ← Back
            </button>
          </div>
          <div className="ac-dock-scroll">
            {step === 'characters' && <CharacterDisplayTab config={config} set={set} />}
            {step === 'outfit' && <OutfitTab config={config} set={set} />}
            {step === 'accessories' && <AccessoryTab config={config} set={set} />}
            {step === 'shop' && <ShopTab />}
          </div>
        </aside>
      </div>
      <ResourceBar />
    </div>
  )
}

/* ----------------------------------------------------------- mind-map sidebar */

function MindMap({ step, onPick, config }: { step: 'characters' | 'outfit' | 'accessories' | 'shop'; onPick: (s: 'characters' | 'outfit' | 'accessories' | 'shop') => void; config: AvatarConfig }) {
  const humanIds = ['james', 'claire', 'mia']
  const isHuman = humanIds.includes(config.characterId || 'james')
  const nodes: { id: 'characters' | 'outfit' | 'accessories' | 'shop'; label: string; ico: 'body' | 'top' | 'bag' | 'shop' }[] = [
    { id: 'characters', label: 'Body', ico: 'body' },
    ...(isHuman ? [
      { id: 'outfit' as const, label: 'Outfit', ico: 'top' as const },
      { id: 'accessories' as const, label: 'Accessories', ico: 'bag' as const },
    ] : []),
    { id: 'shop', label: 'Shop', ico: 'shop' as const },
  ]
  return (
    <aside className="ac-mindmap">
      <div className="ac-mm-title">Customize</div>
      {nodes.map((n, i) => (
        <div className="ac-mm-wrap" key={n.id}>
          {i > 0 && <div className="ac-mm-line" />}
          <button className={`ac-mm-node ${step === n.id ? 'on' : ''}`} onClick={() => onPick(n.id)}>
            <span className="ac-mm-ico"><Glyph kind={n.ico} /></span>
            <span className="ac-mm-label">{n.label}</span>
          </button>
        </div>
      ))}
    </aside>
  )
}

/* ----------------------------------------------------------------- category tabs */

type SetFn = (patch: Partial<AvatarConfig>) => void

function CharacterDisplayTab({ config, set }: { config: AvatarConfig; set: SetFn }) {
  const characters = CHARACTERS
  const tabs = ['Owned', 'EPIC', 'LEGENDARY']
  const [activeTab, setActiveTab] = useState('Owned')
  const [previewing, setPreviewing] = useState<string | null>(null)
  const current = config.characterId || 'james'
  const isOwned = useShop((s) => s.isOwned)
  const canAfford = useShop((s) => s.canAfford)
  const purchase = useShop((s) => s.purchase)
  const userXp = useProfile((s) => s.xp)

  const filtered = activeTab === 'Owned'
    ? characters.filter(c => isOwned(c.id))
    : characters.filter(c => (c.rarity ?? '').toLowerCase() === activeTab.toLowerCase())

  // Click = preview (show 3D model), but don't equip
  const handlePreview = (ch: typeof characters[0]) => {
    setPreviewing(ch.id)
    set({ ...characterById(ch.id).fallback, characterId: ch.id })
  }

  // Buy = purchase + equip
  const handleBuy = (ch: typeof characters[0], e: React.MouseEvent) => {
    e.stopPropagation()
    const price = ch.price ?? 0
    if (price <= 0 || !canAfford(price, userXp)) return
    const newXp = purchase(ch.id, price, userXp)
    if (newXp !== userXp) {
      useProfile.setState({ xp: newXp })
      const userId = useProfile.getState().userId
      if (userId) {
        import('../lib/insforge').then(({ insforge }) =>
          insforge.from('profiles').upsert([{ id: userId, xp: newXp }], { onConflict: 'id' })
        ).catch(() => {})
      }
    }
  }

  // Equip = select an already-owned character
  const handleEquip = (ch: typeof characters[0], e: React.MouseEvent) => {
    e.stopPropagation()
    set({ ...characterById(ch.id).fallback, characterId: ch.id })
  }

  return (
    <div className="ac-char-section">
      <div className="ac-char-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`ac-char-tab ${activeTab === tab ? 'active' : ''}`}
            data-rarity={tab.toLowerCase()}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="ac-char-grid">
        {filtered.map((ch) => {
          const owned = isOwned(ch.id)
          const price = ch.price ?? 0
          const affordable = canAfford(price, userXp)
          const isSelected = current === ch.id && owned
          return (
            <div
              key={ch.id}
              className={`ac-char-tile ${isSelected ? 'selected' : ''} ${!owned ? 'locked' : ''}`}
              onClick={() => handlePreview(ch)}
            >
              <div className="ac-char-avatar" style={{ background: ch.bg }}>
                <img className="ac-char-img" src={ch.icon} alt={ch.name} />
                {!owned && price > 0 && (
                  <div className={`ac-char-price ${affordable ? 'affordable' : ''}`}>
                    🍃 {price}
                  </div>
                )}
              </div>
              {isSelected && <div className="ac-char-selected-label">SELECTED</div>}
              <div className="ac-char-info">
                <span className="ac-char-tile-name">{ch.name}</span>
                <span className="ac-char-rarity" style={{ color: ch.color }}>{ch.rarity}</span>
              </div>
              {/* Buy button for locked characters */}
              {!owned && (
                <button
                  className={`ac-char-buy-btn ${affordable ? 'affordable' : ''}`}
                  onClick={(e) => handleBuy(ch, e)}
                  disabled={!affordable}
                >
                  {affordable ? `Buy 🍃${price}` : `Need 🍃${price}`}
                </button>
              )}
              {/* Equip button for owned but not selected */}
              {owned && !isSelected && (
                <button
                  className="ac-char-equip-btn"
                  onClick={(e) => handleEquip(ch, e)}
                >
                  Equip
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BodyTab({ config, set }: { config: AvatarConfig; set: SetFn }) {
  return null
}

/* ------------------------------------------------------------------ colour picker */

function ColorField({
  label,
  value,
  fallback,
  onChange,
  onClear,
}: {
  label: string
  value?: string
  fallback: string
  onChange: (hex: string) => void
  onClear: () => void
}) {
  const v = value ?? fallback
  return (
    <Field label={label}>
      <div className="ac-color-row">
        <input type="color" className="ac-color" value={v} onChange={(e) => onChange(e.target.value)} />
        <span className="ac-color-hex">{v.toUpperCase()}</span>
        {value && (
          <button className="ac-color-clear" onClick={onClear} title="Use default colour">
            Reset
          </button>
        )}
      </div>
    </Field>
  )
}

/* ------------------------------------------------------------------ outfit step */

function OutfitTab({ config, set }: { config: AvatarConfig; set: SetFn }) {
  return (
    <>
      <SwatchField label="Skin Tone" swatches={SKINS} selected={config.skin} onPick={(id) => set({ skin: id })} />
      <ColorField
        label="Skin Colour"
        value={config.skinColor}
        fallback={skinHex(config.skin)}
        onChange={(hex) => set({ skinColor: hex })}
        onClear={() => set({ skinColor: undefined })}
      />

      <SwatchField label="Eye Colour" swatches={EYE_COLORS} selected={config.eyes} onPick={(id) => set({ eyes: id })} />

      <p className="ac-foot-note">
        Outfit, hairstyle and height come from the character you pick — humans keep their
        default shoes, costume characters (Dino, Bunny) go barefoot. Next: add one accessory.
      </p>
    </>
  )
}

/* -------------------------------------------------------------- accessories step */

function AccessoryTab({ config, set }: { config: AvatarConfig; set: SetFn }) {
  const current = config.accessories?.[0] ?? null
  const choose = (id: string) => set({ accessories: current === id ? [] : [id] })
  return (
    <div className="ac-field">
      <span className="ac-field-label">Accessories <b>· pick one</b></span>
      <p className="ac-foot-note">
        Choose a single item — it appears on your studio dining table and travels with you into
        the library hall.
      </p>
      <div className="ac-acc-grid">
        {ACCESSORIES.map((a) => (
          <button
            key={a.id}
            className="ac-acc-tile"
            data-on={current === a.id}
            onClick={() => choose(a.id)}
          >
            <span className="ac-acc-emoji">{a.icon}</span>
            <span className="ac-acc-name">
              {a.name}
              <small>{a.blurb}</small>
            </span>
            {current === a.id && (
              <span className="ac-acc-tick"><Glyph kind="check" /></span>
            )}
          </button>
        ))}
      </div>
    </div>
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

/* ----------------------------------------------------------------- 3D canvas */

function AvatarCanvas({
  config,
  controlsRef,
  accessoryMode,
  accessory,
}: {
  config: AvatarConfig
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  accessoryMode?: boolean
  accessory?: string
}) {
  // Wizard character renders as a transparent standalone shot — no pedestal, no
  // floor shadow, no environment light: a single warm top-down spotlight + a
  // faint rim light, orthographic front view, alpha channel on the canvas.
  const isWizard = config.characterId === 'wizard'

  // Accessories step: show the studio dining table with the single chosen item.
  // No character — just the accessory on the table.
  if (accessoryMode) {
    return (
      <Canvas
        shadows={false}
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.2, 3.6], fov: 42, near: 0.1, far: 50 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <hemisphereLight args={['#ffe8c0', '#3a2a18', 0.8]} />
        <directionalLight position={[3, 5, 2]} intensity={1.15} color="#ffecd0" />
        <directionalLight position={[-2, 3, -1]} intensity={0.45} color="#ffb870" />
        <pointLight position={[0, 1.6, 0.8]} intensity={0.5} color="#ff9040" distance={6} decay={2} />
        <ambientLight intensity={0.28} color="#ffe8d0" />

        <DustMotes count={50} />

        <group position={[0, -0.9, 0]}>
          <BigDiningTable accessory={accessory} />
          <SoftShadow />
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
          target={[0, 0.15, 0]}
        />
      </Canvas>
    )
  }

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      orthographic={isWizard}
      camera={isWizard
        ? { position: [0, 1.1, 4], zoom: 90, near: 0.1, far: 50 }
        : { position: [0, 1.1, 3.4], fov: 38, near: 0.1, far: 50 }
      }
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: isWizard, preserveDrawingBuffer: isWizard }}
      style={isWizard ? { background: 'transparent' } : undefined}
    >
      {isWizard ? (
        <>
          {/* Warm top-down spotlight only + faint rim — per wizard character spec */}
          <spotLight position={[0, 6, 1]} angle={0.6} penumbra={0.5} intensity={2.4} color="#fff0d8" />
          <directionalLight position={[-3, 1.5, -2]} intensity={0.35} color="#d8c8ff" />
          <group position={[0, -0.9, 0]}>
            <PreviewAvatar config={config} />
          </group>
        </>
      ) : (
        <>
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

            {/* 360° cozy Korean café showcase surrounding the character */}
            <KoreanCafeShowcase />

            {/* warm wooden pedestal with glowing edge */}
            <CafePedestal />

            {/* soft CIRCULAR contact shadow (radial gradient) — avoids the hard
                square edge of ContactShadows */}
            <SoftShadow />
          </group>
        </>
      )}

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

/** Soft circular ground shadow — a radial-gradient disc under the character so the
 *  shadow reads as a natural round pool instead of a hard square. */
function SoftShadow() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
    g.addColorStop(0, 'rgba(24,12,4,0.5)')
    g.addColorStop(0.6, 'rgba(24,12,4,0.24)')
    g.addColorStop(1, 'rgba(24,12,4,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
      <circleGeometry args={[0.82, 48]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  )
}

/** Simple wooden café pedestal — just a floor disc so the character has ground. */
function CafePedestal() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.9, 48]} />
      <meshStandardMaterial color="#3a2a18" roughness={0.85} metalness={0.05} />
    </mesh>
  )
}

/** The customizable body, driven by the emote bar. Uses CharacterAvatar
 *  to render the GLB model (the Blender schoolboy). */
function PreviewAvatar({ config }: { config: AvatarConfig }) {
  return <CharacterAvatar config={config} static />
}

/* -------------------------------------------------------------------- shop tab */

function ShopTab() {
  const xp = useProfile((s) => s.xp)
  const savePublic = useProfile((s) => s.savePublic)
  const pub = useProfile((s) => s.pub)
  const [shopTab, setShopTab] = useState<'banners' | 'logos'>('banners')
  const [flash, setFlash] = useState<string | null>(null)

  const buy = (id: string, price: number) => {
    if (useShop.getState().isOwned(id)) return
    if (!useShop.getState().canAfford(price, xp)) return
    const newLeaves = useShop.getState().purchase(id, price, xp)
    useProfile.setState({ xp: newLeaves })
    setFlash(id)
    setTimeout(() => setFlash(null), 800)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['banners', 'logos'] as const).map((t) => (
          <button key={t} onClick={() => setShopTab(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid',
            borderColor: shopTab === t ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.08)',
            background: shopTab === t ? 'rgba(212,168,67,0.1)' : 'rgba(255,255,255,0.03)',
            color: shopTab === t ? '#d4a843' : 'rgba(255,255,255,0.5)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            {t === 'banners' ? 'Banners' : 'Logos'}
          </button>
        ))}
      </div>

      {shopTab === 'banners' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(['others'] as BannerCategory[]).map((cat) => {
            const items = BANNERS.filter((b) => b.category === cat && !useShop.getState().isOwned(b.id))
            if (items.length === 0) return null
            return (
              <div key={cat}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(240,223,192,0.35)', marginBottom: 6 }}>
                  Premium Banners
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {items.map((b) => {
                    return (
                      <div key={b.id} style={{
                        borderRadius: 8, overflow: 'hidden',
                        border: '1.5px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.03)',
                        animation: flash === b.id ? 'ac-shop-flash 0.5s ease-out' : undefined,
                      }}>
                        <div style={{
                          height: 48,
                          background: b.image ? `url(${b.image})` : b.css,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                        }} />
                        <div style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#f6efe2' }}>{b.name}</span>
                          <button onClick={() => buy(b.id, b.price)} disabled={!useShop.getState().canAfford(b.price, xp)} style={{
                            background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.25)',
                            borderRadius: 4, color: '#f0c840', fontSize: 10, fontWeight: 700,
                            padding: '2px 6px', cursor: useShop.getState().canAfford(b.price, xp) ? 'pointer' : 'not-allowed',
                            opacity: useShop.getState().canAfford(b.price, xp) ? 1 : 0.35,
                            display: 'flex', alignItems: 'center', gap: 2,
                          }}>
                            🍃 {b.price}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {shopTab === 'logos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {LOGOS.filter((l) => !useShop.getState().isOwned(l.id)).map((l) => {
            return (
              <div key={l.id} style={{
                borderRadius: 8, overflow: 'hidden', padding: 10, textAlign: 'center',
                border: '1.5px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                animation: flash === l.id ? 'ac-shop-flash 0.5s ease-out' : undefined,
              }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid rgba(255,255,255,0.08)' }}>
                  {l.image ? (
                    <img src={l.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: l.dim ? 'brightness(0.85)' : undefined }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: l.css || 'rgba(255,255,255,0.1)' }} />
                  )}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#f6efe2', marginBottom: 4 }}>{l.name}</div>
                <button onClick={() => buy(l.id, l.price)} disabled={!useShop.getState().canAfford(l.price, xp)} style={{
                  background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.25)',
                  borderRadius: 4, color: '#f0c840', fontSize: 10, fontWeight: 700,
                  padding: '3px 8px', cursor: useShop.getState().canAfford(l.price, xp) ? 'pointer' : 'not-allowed',
                  opacity: useShop.getState().canAfford(l.price, xp) ? 1 : 0.35,
                  display: 'flex', alignItems: 'center', gap: 2, margin: '0 auto',
                }}>
                  🍃 {l.price}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------- glyphs */

type GlyphKind =
  | 'home' | 'quests' | 'garden' | 'shop' | 'friends' | 'gear'
  | 'sliders' | 'bag' | 'gem' | 'close' | 'check' | 'auto'
  | 'body' | 'hair' | 'eyes' | 'top' | 'bottom' | 'shoes'
  | 'idle' | 'wave' | 'happy' | 'celebrate' | 'sit'
  | 'users' | 'back'

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
    case 'back': return <svg {...c}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
    default: return null
  }
}
