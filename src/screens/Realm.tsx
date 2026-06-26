import { Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { PngIcon } from '../components/PngIcon'
import { useRealm, type CustomRealm } from '../store/realm'
import { useAvatar } from '../avatar/store'
import { CharacterAvatar } from '../avatar/CharacterAvatar'
import type { AvatarConfig } from '../avatar/config'
import { LIBRARY_ROOMS, TRAIN_ROOMS } from '../lib/realm'
import { occupancy, totalOccupants, REALM_CAPACITY, type InstanceOccupancy } from '../lib/realmPresence'
import { createRealm, getRealmByCode, listPublicRealms, inviteLink, type Realm as DbRealm, type RealmVisibility } from '../lib/realms'
import './Realm.css'

type Mode = 'choose' | 'global' | 'library' | 'train' | 'custom'

export function Realm() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('choose')

  return (
    <div className="realm-root">
      <div className="realm-topleft">
        <button className="sf-btn ghost" onClick={() => (mode === 'choose' ? navigate('/') : setMode(mode === 'global' ? 'choose' : 'global'))}>
          ‹ {mode === 'choose' ? 'Lobby' : mode === 'global' ? 'Realm' : 'Global Realm'}
        </button>
      </div>

      <div className="realm-stage">
        {mode === 'choose' && <RealmChoose onPick={setMode} />}
        {mode === 'global' && <GlobalChoose onPick={setMode} />}
        {mode === 'library' && <LibraryRealm />}
        {mode === 'train' && <TrainRealm />}
        {mode === 'custom' && <CustomRealm />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ choose flavour */

function RealmChoose({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <>
      <header className="realm-head">
        <CharacterOrb />
        <span className="sf-pill">Realm</span>
        <h1>Choose your study world</h1>
        <p>Step into a shared public world or open a private realm of your own.</p>
      </header>

      <div className="realm-cards">
        <button className="realm-card water-glass" onClick={() => onPick('global')}>
          <div className="realm-card-orb">
            <PngIcon name="realm" size={72} alt="Global Realm" />
          </div>
          <h2>🌐 Global Realm</h2>
          <p>Join a shared study hall — Library halls or Train Station platforms alongside others.</p>
          <span className="realm-card-cta">Enter the realm ›</span>
        </button>

        <button className="realm-card water-glass" onClick={() => onPick('custom')}>
          <div className="realm-card-orb">
            <PngIcon name="realm" size={72} alt="Custom Realm" />
          </div>
          <h2>Custom Realm</h2>
          <p>Create a private world that&rsquo;s just yours. Invite friends later.</p>
          <span className="realm-card-cta">Create realm ›</span>
        </button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------- global sub-choose */

function GlobalChoose({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Global Realm</span>
        <h1>Pick a world</h1>
        <p>Choose a world type, then join a room to study alongside others live.</p>
      </header>

      <div className="realm-cards">
        <button className="realm-card water-glass" onClick={() => onPick('library')}>
          <div className="realm-card-orb">
            <PngIcon name="study-rooms" size={72} alt="Library" />
          </div>
          <h2>📚 Library</h2>
          <p>Grand reading halls, cozy nooks, and the Knowledge Tree at the heart of it all.</p>
          <span className="realm-card-cta">Enter the library ›</span>
        </button>

        <button className="realm-card water-glass" onClick={() => onPick('train')}>
          <div className="realm-card-orb">
            <PngIcon name="realm" size={72} alt="Train Station" />
          </div>
          <h2>🚂 Train Station</h2>
          <p>Board a magical train and commit to a real study journey — from Express to Grand Journey.</p>
          <span className="realm-card-cta">Enter the station ›</span>
        </button>
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

function LibraryRealm() {
  const navigate = useNavigate()
  const enterGlobal = useRealm((s) => s.enterGlobal)
  const [occ, setOcc] = useState<Record<string, InstanceOccupancy[]>>({})

  useEffect(() => {
    let alive = true
    async function load() {
      const entries = await Promise.all(
        LIBRARY_ROOMS.map(async (r) => [r.id, await occupancy(`lib:${r.id}`)] as const),
      )
      if (alive) setOcc(Object.fromEntries(entries))
    }
    void load()
    const t = window.setInterval(load, 15_000)
    return () => { alive = false; window.clearInterval(t) }
  }, [])

  function join(roomId: string, name: string) {
    enterGlobal(roomId, name)
    navigate('/explore')
  }

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Library</span>
        <h1>Pick a room</h1>
        <p>Step into any hall to study together — everyone who enters the same room sees each other live.</p>
      </header>
      <div className="realm-rooms">
        {LIBRARY_ROOMS.map((r) => {
          const rows = occ[r.id] ?? []
          const here = totalOccupants(rows)
          const instances = rows.length
          const lead = rows.find((x) => x.instance === 1)?.count ?? 0
          const full = instances > 0 && rows.every((x) => x.count >= REALM_CAPACITY)
          return (
            <div key={r.id} className="realm-room water-glass">
              <div className="realm-room-icon">
                <PngIcon name="study-rooms" size={40} alt="" />
              </div>
              <div className="realm-room-body">
                <div className="realm-room-top">
                  <strong>{r.name}</strong>
                  <span className="realm-room-count" title={`${here} studying now`}>
                    <span className="realm-room-dot" />
                    {Math.min(lead, REALM_CAPACITY)}/{REALM_CAPACITY}
                    {instances > 1 && <span className="realm-room-inst"> · {instances} rooms · {here} total</span>}
                  </span>
                </div>
                <p>{r.blurb}</p>
              </div>
              <button className="sf-btn water realm-join" onClick={() => join(r.id, r.name)}>
                {full ? 'Enter new room' : 'Enter'}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function TrainRealm() {
  const navigate = useNavigate()
  const enterGlobal = useRealm((s) => s.enterGlobal)
  const [occ, setOcc] = useState<Record<string, InstanceOccupancy[]>>({})

  useEffect(() => {
    let alive = true
    async function load() {
      const entries = await Promise.all(
        TRAIN_ROOMS.map(async (r) => [r.id, await occupancy(`train:${r.id}`)] as const),
      )
      if (alive) setOcc(Object.fromEntries(entries))
    }
    void load()
    const t = window.setInterval(load, 15_000)
    return () => { alive = false; window.clearInterval(t) }
  }, [])

  function join(roomId: string, name: string) {
    enterGlobal(roomId, name)
    navigate('/explore')
  }

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Train Station</span>
        <h1>Pick a platform</h1>
        <p>Study while waiting for your journey, or board a timed express.</p>
      </header>
      <div className="realm-rooms">
        {TRAIN_ROOMS.map((r) => {
          const rows = occ[r.id] ?? []
          const here = totalOccupants(rows)
          const instances = rows.length
          const lead = rows.find((x) => x.instance === 1)?.count ?? 0
          const full = instances > 0 && rows.every((x) => x.count >= REALM_CAPACITY)
          return (
            <div key={r.id} className="realm-room water-glass">
              <div className="realm-room-icon">
                <PngIcon name="realm" size={40} alt="" />
              </div>
              <div className="realm-room-body">
                <div className="realm-room-top">
                  <strong>{r.name}</strong>
                  <span className="realm-room-count" title={`${here} studying now`}>
                    <span className="realm-room-dot" />
                    {Math.min(lead, REALM_CAPACITY)}/{REALM_CAPACITY}
                    {instances > 1 && <span className="realm-room-inst"> · {instances} rooms · {here} total</span>}
                  </span>
                </div>
                <p>{r.blurb}</p>
              </div>
              <button className="sf-btn water realm-join" onClick={() => join(r.id, r.name)}>
                {full ? 'Enter new room' : 'Enter'}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* -------------------------------------------------------------- custom realm */

const VIS_OPTIONS: { id: RealmVisibility; label: string; blurb: string }[] = [
  { id: 'private', label: 'Private', blurb: 'Invite code / link only' },
  { id: 'friends', label: 'Friends', blurb: 'Your friends can join' },
  { id: 'public', label: 'Public', blurb: 'Anyone can discover it' },
]

function dbToCustom(r: DbRealm): CustomRealm {
  return { id: r.id, name: r.name, code: r.code, visibility: r.visibility, ownerId: r.owner_id, createdAt: r.created_at }
}

function CustomRealm() {
  const navigate = useNavigate()
  const custom = useRealm((s) => s.custom)
  const rememberCustom = useRealm((s) => s.rememberCustom)
  const enterCustom = useRealm((s) => s.enterCustom)

  const [name, setName] = useState('')
  const [vis, setVis] = useState<RealmVisibility>('private')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<DbRealm | null>(null)

  const [joinCode, setJoinCode] = useState('')
  const [joinErr, setJoinErr] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  const [publicRealms, setPublicRealms] = useState<DbRealm[]>([])

  useEffect(() => {
    let alive = true
    void listPublicRealms().then((rows) => alive && setPublicRealms(rows))
    return () => {
      alive = false
    }
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const realm = await createRealm(name, vis, REALM_CAPACITY)
    setBusy(false)
    if (!realm) {
      setJoinErr('Could not create the realm. Are you signed in?')
      return
    }
    rememberCustom(dbToCustom(realm))
    setCreated(realm) // show the invite card; the player taps Enter to step inside
  }

  async function join(e: React.FormEvent) {
    e.preventDefault()
    if (joining || !joinCode.trim()) return
    setJoining(true)
    setJoinErr(null)
    // accept a full link or a bare code
    const code = joinCode.trim().split('/').pop() || joinCode.trim()
    const { realm, error } = await getRealmByCode(code)
    setJoining(false)
    if (!realm) {
      setJoinErr(error || 'Realm not found.')
      return
    }
    const c = dbToCustom(realm)
    rememberCustom(c)
    enterCustom(c)
    navigate('/explore')
  }

  function open(realm: CustomRealm) {
    enterCustom(realm)
    navigate('/explore')
  }

  if (created) {
    return <InviteCard realm={created} onEnter={() => open(dbToCustom(created))} onBack={() => setCreated(null)} />
  }

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Custom Realm</span>
        <h1>Your own world</h1>
        <p>Create a realm, then share its invite code or link so friends join the exact same world.</p>
      </header>

      <form className="realm-create realm-create-col" onSubmit={create}>
        <input
          className="sf-input"
          placeholder="Name your realm — e.g. Midnight Library"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        <div className="realm-vis">
          {VIS_OPTIONS.map((o) => (
            <button
              type="button"
              key={o.id}
              className={`realm-vis-opt ${vis === o.id ? 'on' : ''}`}
              onClick={() => setVis(o.id)}
            >
              <strong>{o.label}</strong>
              <span>{o.blurb}</span>
            </button>
          ))}
        </div>
        <button className="sf-btn water" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create realm'}
        </button>
      </form>

      {/* join by invite code or pasted link */}
      <form className="realm-create realm-join-form" onSubmit={join}>
        <input
          className="sf-input"
          placeholder="Have a code? Paste it — e.g. midnight-8xk2p"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button className="sf-btn water secondary" type="submit" disabled={joining}>
          {joining ? 'Joining…' : 'Join'}
        </button>
      </form>
      {joinErr && <p className="realm-join-err">{joinErr}</p>}

      {custom.length > 0 && (
        <div className="realm-mine">
          <h3>Your realms</h3>
          <div className="realm-mine-list">
            {custom.map((r) => (
              <button key={r.id} className="realm-mine-item" onClick={() => open(r)}>
                <PngIcon name="realm" size={34} alt="" />
                <span>{r.name}</span>
                {r.code && <span className="realm-mine-code">{r.code}</span>}
                <span className="realm-mine-go">Enter ›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {publicRealms.length > 0 && (
        <div className="realm-mine">
          <h3>Public realms</h3>
          <div className="realm-mine-list">
            {publicRealms.map((r) => (
              <button key={r.id} className="realm-mine-item" onClick={() => open(dbToCustom(r))}>
                <PngIcon name="realm" size={34} alt="" />
                <span>{r.name}</span>
                <span className="realm-mine-go">Enter ›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/** Post-create card: shows the shareable code + link with copy buttons, then a
 *  prominent Enter to step into the new realm. */
function InviteCard({ realm, onEnter, onBack }: { realm: DbRealm; onEnter: () => void; onBack: () => void }) {
  const link = inviteLink(realm.code)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  function copy(text: string, which: 'code' | 'link') {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(which)
      window.setTimeout(() => setCopied(null), 1600)
    })
  }

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Realm created</span>
        <h1>{realm.name}</h1>
        <p>Share this with friends so they drop into the exact same realm.</p>
      </header>

      <div className="realm-invite">
        <div className="realm-invite-row">
          <span className="realm-invite-label">Invite code</span>
          <code className="realm-invite-value">{realm.code}</code>
          <button className="sf-btn water secondary" onClick={() => copy(realm.code, 'code')}>
            {copied === 'code' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="realm-invite-row">
          <span className="realm-invite-label">Invite link</span>
          <code className="realm-invite-value">{link}</code>
          <button className="sf-btn water secondary" onClick={() => copy(link, 'link')}>
            {copied === 'link' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="realm-create">
        <button className="sf-btn ghost" onClick={onBack}>
          ‹ Back
        </button>
        <button className="sf-btn water" onClick={onEnter}>
          Enter realm ›
        </button>
      </div>
    </>
  )
}
