import { Suspense, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CharacterAvatar } from '../avatar/CharacterAvatar'
import { useAvatar } from '../avatar/store'
import {
  FEMALE_CHARACTERS,
  MALE_CHARACTERS,
  characterById,
  type Character,
  type Gender,
} from '../avatar/characters'
import { LoadingVeil } from '../components/LoadingVeil'
import './AvatarCreator.css'

const GENDER_TABS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
]

export function AvatarCreator() {
  const navigate = useNavigate()
  const characterId = useAvatar((s) => s.config.characterId)
  const pick = useAvatar((s) => s.pick)
  const save = useAvatar((s) => s.save)

  const selected = characterById(characterId)
  const [gender, setGender] = useState<Gender>(selected.gender)
  const [auto, setAuto] = useState(true)
  const [saving, setSaving] = useState(false)
  const controls = useRef<OrbitControlsImpl>(null)

  const roster = gender === 'male' ? MALE_CHARACTERS : FEMALE_CHARACTERS

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
          <h1>Choose Character</h1>
        </div>
        <div className="ac-hint-chip">Pick the hero who studies with you</div>
      </header>

      <div className="ac-grid ac-grid-2">
        {/* ---- center: 3D preview of the selected character (static) ---- */}
        <section className="ac-stage">
          <Suspense fallback={<div className="ac-stage-veil"><LoadingVeil label="Summoning your character…" /></div>}>
            <CharacterCanvas characterId={characterId} auto={auto} controlsRef={controls} />
          </Suspense>
          <button className="ac-randomize" onClick={() => setAuto((v) => !v)} data-on={auto}>
            <CamGlyph kind="auto" /> {auto ? 'Auto-rotate' : 'Manual'}
          </button>
        </section>

        {/* ---- right: gender partition + character roster ---- */}
        <aside className="ac-panel">
          <div className="ac-tabs">
            {GENDER_TABS.map((t) => (
              <button key={t.id} className="ac-tab" data-on={gender === t.id} onClick={() => setGender(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="ac-panel-body">
            <div className="ac-field">
              <span className="ac-field-label">Characters</span>
              <div className="ac-char-list">
                {roster.map((c) => (
                  <CharacterCard
                    key={c.id}
                    character={c}
                    selected={c.id === characterId}
                    onPick={() => pick(c.id)}
                  />
                ))}
              </div>
            </div>
            <p className="ac-char-note">More heroes — and caps, hats &amp; wearables — arrive soon.</p>
          </div>

          <button className="sf-btn ac-save" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Character'}
          </button>
          <p className="ac-save-note">You can change it anytime later.</p>
        </aside>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- 3D canvas */

function CharacterCanvas({
  characterId,
  auto,
  controlsRef,
}: {
  characterId: string
  auto: boolean
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
          fetch (keeps the chooser fast + offline-safe) */}
      <hemisphereLight args={['#cfe0ff', '#3a2f4a', 0.8]} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} color="#fff3df" />
      <directionalLight position={[-3, 2, -2]} intensity={0.45} color="#9a8cff" />
      <ambientLight intensity={0.25} />

      <group position={[0, -0.9, 0]}>
        {/* No locomotion ref => the character holds a calm idle pose (no preview
            animation), per the brief. */}
        <CharacterAvatar characterId={characterId} />
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

/* ------------------------------------------------------------------- roster */

function CharacterCard({
  character,
  selected,
  onPick,
}: {
  character: Character
  selected: boolean
  onPick: () => void
}) {
  return (
    <button className="ac-char" data-on={selected} onClick={onPick}>
      <span className="ac-char-name">{character.name}</span>
      {selected && <span className="ac-char-tick">✓</span>}
    </button>
  )
}

/* -------------------------------------------------------------------- glyphs */

function CamGlyph({ kind }: { kind: 'auto' }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'auto') return <svg {...common}><path d="M21 12a9 9 0 11-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
  return null
}
