import { Suspense, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { PngIcon } from '../components/PngIcon'
import { useRealm, type CustomRealm } from '../store/realm'
import { useSettings } from '../store/settings'
import { useAvatar } from '../avatar/store'
import { CharacterAvatar } from '../avatar/CharacterAvatar'
import type { AvatarConfig } from '../avatar/config'
import { Section, Slider, Toggle } from '../components/settings/controls'
import { GLOBAL_ROOMS, REALM_PRESENCE_LIVE, ENABLE_WATERFALL_REALM, isDevAccess } from '../lib/realm'
import './Realm.css'

type Mode = 'choose' | 'global' | 'custom'

export function Realm() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('choose')
  const [audioOpen, setAudioOpen] = useState(false)

  return (
    <div className="realm-root">
      <div className="realm-topleft">
        <button className="sf-btn ghost" onClick={() => (mode === 'choose' ? navigate('/') : setMode('choose'))}>
          ‹ {mode === 'choose' ? 'Lobby' : 'Realm'}
        </button>
      </div>

      <div className="realm-topright">
        <button className="sf-btn ghost" onClick={() => setAudioOpen(true)}>
          ♪ Audio
        </button>
      </div>

      <div className="realm-stage">
        {mode === 'choose' && <RealmChoose onPick={setMode} />}
        {mode === 'global' && <GlobalRealm />}
        {mode === 'custom' && <CustomRealm />}
      </div>

      {audioOpen && <AudioPanel onClose={() => setAudioOpen(false)} />}
    </div>
  )
}

/* ----------------------------------------------------------------- audio panel
 * The Sound controls used to live in the Lobby settings drawer; they now live
 * here, since this is where the realm/scene ambience plays. Reuses the shared
 * settings drawer chrome + control primitives (controls.tsx / controls.css) so
 * it looks and behaves exactly like the old panel. */
function AudioPanel({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  return (
    <div className="settings-scrim" onPointerDown={onClose}>
      <div className="settings-panel" onPointerDown={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2>Audio</h2>
          <button className="settings-x" onClick={onClose} aria-label="Close audio">
            ✕
          </button>
        </div>
        <div className="settings-body">
          <Section title="Sound">
            <Slider label="Master volume" value={s.master} onChange={(v) => s.set('master', v)} />
            <Toggle label="Ambient music" value={s.ambientOn} onChange={(v) => s.set('ambientOn', v)} />
            <Slider label="Ambient level" value={s.ambientVol} onChange={(v) => s.set('ambientVol', v)} />
            <Toggle label="Rain / weather" value={s.rainOn} onChange={(v) => s.set('rainOn', v)} />
            <Slider label="Rain / weather level" value={s.rainVol} onChange={(v) => s.set('rainVol', v)} />
          </Section>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ choose flavour */

function RealmChoose({ onPick }: { onPick: (m: Mode) => void }) {
  const navigate = useNavigate()
  const enterFlagship = useRealm((s) => s.enterFlagship)

  // The Waterfall Realm is still experimental. It is shown as the prominent
  // flagship card ONLY once it is publicly enabled (ENABLE_WATERFALL_REALM). While
  // that flag is off it is hidden from users entirely — developers (?dev=1) still
  // reach it through a small, clearly-labelled box pinned to the bottom.
  const waterfallPublic = ENABLE_WATERFALL_REALM
  const waterfallDev = !ENABLE_WATERFALL_REALM && isDevAccess()

  function enterWaterfall() {
    if (!waterfallPublic && !waterfallDev) return // never enter while hidden
    enterFlagship('waterfall', 'Waterfall Realm')
    navigate('/explore')
  }

  return (
    <>
      <header className="realm-head">
        <CharacterOrb />
        <span className="sf-pill">Realm</span>
        <h1>Choose your study world</h1>
        <p>Step into a flagship world, join a shared public room, or open a private realm of your own.</p>
      </header>

      <div className="realm-cards">
        {/* flagship: the Waterfall Realm — only when publicly enabled */}
        {waterfallPublic && (
          <button className="realm-card water-glass realm-card-flagship" onClick={enterWaterfall}>
            <div className="realm-card-orb">
              <PngIcon name="realm" size={72} alt="Waterfall Realm" />
            </div>
            <span className="sf-pill realm-kind">Flagship</span>
            <h2>Waterfall Realm</h2>
            <p>A bright daytime paradise — a giant waterfall, a turquoise lake and five campfire camps to study and hang out around.</p>
            <span className="realm-card-cta">Enter the falls ›</span>
          </button>
        )}

        <button className="realm-card water-glass" onClick={() => onPick('global')}>
          <div className="realm-card-orb">
            <PngIcon name="study-rooms" size={72} alt="Global Realm" />
          </div>
          <h2>Global Realm</h2>
          <p>Drop into one of our pre-made study halls and focus alongside others.</p>
          <span className="realm-card-cta">Browse rooms ›</span>
        </button>

        <button className="realm-card water-glass" onClick={() => onPick('custom')}>
          <div className="realm-card-orb">
            <PngIcon name="realm" size={72} alt="Custom Realm" />
          </div>
          <h2>Custom Realm</h2>
          <p>Create a private world that&rsquo;s just yours. Invite friends later.</p>
          <span className="realm-card-cta">Create realm ›</span>
        </button>

        {/* developer-only access to the hidden experimental realm: small, last,
            and clearly tagged so it never reads as a production world */}
        {waterfallDev && (
          <button className="realm-card water-glass realm-card-dev" onClick={enterWaterfall}>
            <span className="sf-pill realm-kind realm-dev-tag">Experimental · Dev</span>
            <div className="realm-card-orb realm-card-orb-sm">
              <PngIcon name="realm" size={44} alt="Waterfall Realm" />
            </div>
            <h2>Waterfall Realm</h2>
            <p>Hidden from users while it&rsquo;s being optimized. Visible to you via dev access.</p>
            <span className="realm-card-cta">Enter (dev) ›</span>
          </button>
        )}
      </div>
    </>
  )
}

/* ----------------------------------------------------------- character orb
 * A small, personal 3D portrait of the player's chosen character on the realm
 * hub — slowly turning on a glowing dais. Reuses CharacterAvatar (same graceful
 * GLB→procedural fallback as the world/chooser). A light static canvas: no
 * shadows, no post, no orbit controls — just clean lighting + a gentle spin. */
function CharacterOrb() {
  const navigate = useNavigate()
  const config = useAvatar((s) => s.config)
  return (
    <div className="realm-avatar">
      <div className="realm-avatar-orb">
        <Canvas
          shadows={false}
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.05, 3.0], fov: 36, near: 0.1, far: 50 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <hemisphereLight args={['#cfe0ff', '#3a2f4a', 0.85]} />
          <directionalLight position={[3, 5, 2]} intensity={1.2} color="#fff3df" />
          <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#9a8cff" />
          <ambientLight intensity={0.3} />
          <Suspense fallback={null}>
            <SpinningAvatar config={config} />
          </Suspense>
        </Canvas>
      </div>
      <div className="realm-avatar-meta">
        <span className="realm-avatar-you">Your avatar</span>
        <strong>Study companion</strong>
        <button className="realm-avatar-change" onClick={() => navigate('/avatar')}>
          Customize ›
        </button>
      </div>
    </div>
  )
}

function SpinningAvatar({ config }: { config: AvatarConfig }) {
  const g = useRef<Group>(null)
  // No locomotion ref → the avatar holds a calm idle pose; we add only a slow
  // turntable spin so the portrait feels alive without a walking animation.
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6
  })
  return (
    <group ref={g} position={[0, -0.92, 0]}>
      <CharacterAvatar config={config} />
    </group>
  )
}

/* -------------------------------------------------------------- global rooms */

function GlobalRealm() {
  const navigate = useNavigate()
  const enterGlobal = useRealm((s) => s.enterGlobal)

  function join(roomId: string, name: string) {
    enterGlobal(roomId, name)
    navigate('/explore')
  }

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Global Realm</span>
        <h1>Pick a room</h1>
        <p>Step into any hall to study. Shared presence is on the way.</p>
      </header>

      {/* Honest status: no fake occupancy. Until a realtime presence channel
          lands, every room is a solo space and we say so plainly. */}
      {!REALM_PRESENCE_LIVE && (
        <div className="realm-banner">
          <span className="realm-banner-dot" />
          Realm multiplayer isn’t live yet — you’ll study solo for now. Live room counts and
          other students will appear here once presence ships.
        </div>
      )}

      <div className="realm-rooms">
        {GLOBAL_ROOMS.map((r) => (
          <div key={r.id} className="realm-room water-glass">
            <div className="realm-room-icon">
              <PngIcon name="study-rooms" size={40} alt="" />
            </div>
            <div className="realm-room-body">
              <div className="realm-room-top">
                <strong>{r.name}</strong>
                <span className="realm-room-count muted">Solo</span>
              </div>
              <p>{r.blurb}</p>
            </div>
            <button className="sf-btn water realm-join" onClick={() => join(r.id, r.name)}>
              Enter
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

/* -------------------------------------------------------------- custom realm */

function CustomRealm() {
  const navigate = useNavigate()
  const custom = useRealm((s) => s.custom)
  const createCustom = useRealm((s) => s.createCustom)
  const enterCustom = useRealm((s) => s.enterCustom)
  const [name, setName] = useState('')

  function create(e: React.FormEvent) {
    e.preventDefault()
    const realm = createCustom(name)
    enterCustom(realm)
    navigate('/explore')
  }

  function open(realm: CustomRealm) {
    enterCustom(realm)
    navigate('/explore')
  }

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Custom Realm</span>
        <h1>Your private world</h1>
        <p>Name your realm and step inside. Only you can enter — invites come later.</p>
      </header>

      <form className="realm-create" onSubmit={create}>
        <input
          className="sf-input"
          placeholder="Name your realm — e.g. Midnight Library"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        <button className="sf-btn water" type="submit">
          Create &amp; enter
        </button>
      </form>

      {custom.length > 0 && (
        <div className="realm-mine">
          <h3>Your realms</h3>
          <div className="realm-mine-list">
            {custom.map((r) => (
              <button key={r.id} className="realm-mine-item" onClick={() => open(r)}>
                <PngIcon name="realm" size={34} alt="" />
                <span>{r.name}</span>
                <span className="realm-mine-go">Enter ›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="realm-note">
        Custom realms are private to you today. Later, creating them may become a premium perk.
      </p>
    </>
  )
}
