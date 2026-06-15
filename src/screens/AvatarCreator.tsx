import { Suspense, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { AvatarRig, type AvatarRigHandle } from '../avatar/AvatarRig'
import { AvatarAnimator, type PreviewState } from '../avatar/AvatarAnimator'
import type { Locomotion } from '../avatar/animation'
import { useAvatar } from '../avatar/store'
import {
  BOTTOMS,
  CLOTH_COLORS,
  HAIRS,
  HAIR_COLORS,
  HEIGHT_MAX,
  HEIGHT_MIN,
  SHOES,
  SHOE_COLORS,
  SKINS,
  TOPS,
  type AvatarConfig,
  type StyleOption,
  type Swatch,
} from '../avatar/config'
import { LoadingVeil } from '../components/LoadingVeil'
import './AvatarCreator.css'

type Tab = 'body' | 'hair' | 'top' | 'bottom' | 'shoes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'body', label: 'Body' },
  { id: 'hair', label: 'Hair' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'shoes', label: 'Shoes' },
]

const PREVIEW_ANIMS: { id: PreviewState; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Walk' },
  { id: 'run', label: 'Run' },
  { id: 'jump', label: 'Jump' },
  { id: 'wave', label: 'Wave' },
]

export function AvatarCreator() {
  const navigate = useNavigate()
  const config = useAvatar((s) => s.config)
  const patch = useAvatar((s) => s.patch)
  const randomize = useAvatar((s) => s.randomize)
  const save = useAvatar((s) => s.save)

  const [tab, setTab] = useState<Tab>('body')
  const [anim, setAnim] = useState<PreviewState>('idle')
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
      {/* header */}
      <header className="ac-head">
        <button className="sf-btn ghost" onClick={() => navigate('/')}>
          ‹ Lobby
        </button>
        <div className="ac-title">
          <span className="ac-title-kicker">Focus Lily</span>
          <h1>Avatar Creator</h1>
        </div>
        <div className="ac-hint-chip">Bring your character to life</div>
      </header>

      <div className="ac-grid">
        {/* ---- left: camera + animation controls ---- */}
        <aside className="ac-rail">
          <div className="ac-rail-group">
            <span className="ac-rail-label">Camera</span>
            <button className="ac-rail-btn" onClick={() => setAuto((v) => !v)} data-on={auto}>
              <CamGlyph kind="auto" /> {auto ? 'Auto-rotate' : 'Manual'}
            </button>
            <button className="ac-rail-btn" onClick={() => controls.current?.reset()}>
              <CamGlyph kind="reset" /> Reset view
            </button>
          </div>

          <div className="ac-rail-group">
            <span className="ac-rail-label">Preview animation</span>
            <div className="ac-anim-bar">
              {PREVIEW_ANIMS.map((a) => (
                <button
                  key={a.id}
                  className="ac-anim-btn"
                  data-on={anim === a.id}
                  onClick={() => setAnim(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ---- center: 3D preview ---- */}
        <section className="ac-stage">
          <Suspense fallback={<div className="ac-stage-veil"><LoadingVeil label="Summoning your avatar…" /></div>}>
            <AvatarCanvas config={config} anim={anim} auto={auto} controlsRef={controls} />
          </Suspense>
          <button className="ac-randomize" onClick={randomize}>
            <CamGlyph kind="dice" /> Randomize
          </button>
        </section>

        {/* ---- right: customization ---- */}
        <aside className="ac-panel">
          <div className="ac-tabs">
            {TABS.map((t) => (
              <button key={t.id} className="ac-tab" data-on={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="ac-panel-body">
            {tab === 'body' && <BodyPanel config={config} patch={patch} />}
            {tab === 'hair' && (
              <>
                <StyleGrid label="Hair style" options={HAIRS} value={config.hair} onPick={(v) => patch('hair', v)} />
                <SwatchGrid label="Hair color" options={HAIR_COLORS} value={config.hairColor} onPick={(v) => patch('hairColor', v)} />
              </>
            )}
            {tab === 'top' && (
              <>
                <StyleGrid label="Top style" options={TOPS} value={config.top} onPick={(v) => patch('top', v)} />
                <SwatchGrid label="Top color" options={CLOTH_COLORS} value={config.topColor} onPick={(v) => patch('topColor', v)} />
              </>
            )}
            {tab === 'bottom' && (
              <>
                <StyleGrid label="Bottom style" options={BOTTOMS} value={config.bottom} onPick={(v) => patch('bottom', v)} />
                <SwatchGrid label="Bottom color" options={CLOTH_COLORS} value={config.bottomColor} onPick={(v) => patch('bottomColor', v)} />
              </>
            )}
            {tab === 'shoes' && (
              <>
                <StyleGrid label="Shoe style" options={SHOES} value={config.shoes} onPick={(v) => patch('shoes', v)} />
                <SwatchGrid label="Shoe color" options={SHOE_COLORS} value={config.shoesColor} onPick={(v) => patch('shoesColor', v)} />
              </>
            )}
          </div>

          <button className="sf-btn ac-save" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Avatar'}
          </button>
          <p className="ac-save-note">You can change it anytime later.</p>
        </aside>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- 3D canvas */

function AvatarCanvas({
  config,
  anim,
  auto,
  controlsRef,
}: {
  config: AvatarConfig
  anim: PreviewState
  auto: boolean
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  const rig = useRef<AvatarRigHandle>(null)
  // a fixed locomotion source the preview buttons don't need to touch — the
  // PreviewState override in the animator drives walk/run/jump directly.
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0 })

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.1, 3.4], fov: 38, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      {/* clean lighting only — no bloom/vignette/SSAO/DoF, and no external HDR
          fetch (keeps the creator fast + offline-safe) */}
      <hemisphereLight args={['#cfe0ff', '#3a2f4a', 0.8]} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} color="#fff3df" />
      <directionalLight position={[-3, 2, -2]} intensity={0.45} color="#9a8cff" />
      <ambientLight intensity={0.25} />

      <group position={[0, -0.9, 0]}>
        <AvatarRig ref={rig} config={config} />
        <AvatarAnimator rig={rig} locomotion={loco} preview={anim} lod="near" />
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
        minDistance={2}
        maxDistance={6}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, 0.1, 0]}
      />
    </Canvas>
  )
}

/* ------------------------------------------------------------------- panels */

function BodyPanel({ config, patch }: { config: AvatarConfig; patch: ReturnType<typeof useAvatar.getState>['patch'] }) {
  return (
    <>
      <div className="ac-field">
        <span className="ac-field-label">Body type</span>
        <div className="ac-seg">
          <button data-on={config.bodyType === 'male'} onClick={() => patch('bodyType', 'male')}>Male</button>
          <button data-on={config.bodyType === 'female'} onClick={() => patch('bodyType', 'female')}>Female</button>
        </div>
      </div>
      <SwatchGrid label="Skin tone" options={SKINS} value={config.skin} onPick={(v) => patch('skin', v)} />
      <div className="ac-field">
        <span className="ac-field-label">Height <b>{config.height} cm</b></span>
        <input
          className="ac-range"
          type="range"
          min={HEIGHT_MIN}
          max={HEIGHT_MAX}
          step={1}
          value={config.height}
          onChange={(e) => patch('height', Number(e.target.value))}
        />
      </div>
    </>
  )
}

function StyleGrid({ label, options, value, onPick }: { label: string; options: StyleOption[]; value: string; onPick: (id: string) => void }) {
  return (
    <div className="ac-field">
      <span className="ac-field-label">{label}</span>
      <div className="ac-style-grid">
        {options.map((o) => (
          <button key={o.id} className="ac-style" data-on={value === o.id} onClick={() => onPick(o.id)}>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function SwatchGrid({ label, options, value, onPick }: { label: string; options: Swatch[]; value: string; onPick: (id: string) => void }) {
  return (
    <div className="ac-field">
      <span className="ac-field-label">{label}</span>
      <div className="ac-swatch-grid">
        {options.map((o) => (
          <button
            key={o.id}
            className="ac-swatch"
            data-on={value === o.id}
            style={{ background: o.hex }}
            title={o.name}
            aria-label={o.name}
            onClick={() => onPick(o.id)}
          />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- glyphs */

function CamGlyph({ kind }: { kind: 'auto' | 'reset' | 'dice' }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'auto') return <svg {...common}><path d="M21 12a9 9 0 11-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
  if (kind === 'reset') return <svg {...common}><path d="M3 12a9 9 0 109-9 9 9 0 00-6.7 3L3 9" /><path d="M3 3v6h6" /></svg>
  return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.2" fill="currentColor" /><circle cx="16" cy="16" r="1.2" fill="currentColor" /><circle cx="16" cy="8" r="1.2" fill="currentColor" /><circle cx="8" cy="16" r="1.2" fill="currentColor" /></svg>
}
