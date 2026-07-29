import { Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { PngIcon } from '../components/PngIcon'
import { useRealm, type CustomRealm } from '../store/realm'
import { useAvatar } from '../avatar/store'
import { characterById } from '../avatar/characters'
import { CharacterAvatar } from '../avatar/CharacterAvatar'
import type { AvatarConfig } from '../avatar/config'
import { LIBRARY_ROOMS, TRAIN_ROOMS, UK_CAFE_ROOMS, ROOM_CAPACITIES } from '../lib/realm'
import { occupancy, totalOccupants, REALM_CAPACITY, type InstanceOccupancy } from '../lib/realmPresence'
import { createRealm, getRealmByCode, searchPublicRealms, inviteLink, type Realm as DbRealm } from '../lib/realms'

import './Realm.css'

type Mode = 'choose' | 'private' | 'library' | 'train' | 'uk-cafe' | 'public'

export function Realm() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('choose')
  return (
    <div className="realm-root">
      <div className="realm-topleft">
        <button className="sf-btn water" onClick={() => (mode === 'choose' ? navigate('/') : setMode(mode === 'private' ? 'choose' : 'private'))}>
          ‹ {mode === 'choose' ? 'Lobby' : mode === 'private' ? 'Realms' : 'Private Realm'}
        </button>
      </div>

<div className="realm-stage">
         {mode === 'choose' && <RealmChoose onPick={setMode} />}
         {mode === 'private' && <PrivateChoose onPick={setMode} />}
         {mode === 'library' && <LibraryRealm />}
         {mode === 'train' && <TrainRealm />}
         {mode === 'uk-cafe' && <UkCafeRealm />}
         {mode === 'public' && <PublicRealm />}
       </div>
    </div>
  )
}

/* ------------------------------------------------------------ choose flavour */

function RealmChoose({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <>
      <div className="realm-topright">
        <CharacterOrb />
      </div>
      <header className="realm-head">
        <span className="sf-pill">Realm</span>
        <h1>Choose your study world</h1>
        <p>Join a public study hall or create a private world for your friends.</p>
      </header>

      <div className="realm-cards">
        <button
          className="realm-card water-glass"
          onClick={() => onPick('private')}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty('--glow-x', `${((e.clientX - r.left) / r.width) * 100}%`)
            e.currentTarget.style.setProperty('--glow-y', `${((e.clientY - r.top) / r.height) * 100}%`)
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.removeProperty('--glow-x')
            e.currentTarget.style.removeProperty('--glow-y')
          }}
        >
          <div className="realm-card-orb">
            <PngIcon name="study-rooms" size={72} alt="Public Realm" />
          </div>
          <h2>Public Realm</h2>
          <p>Join a shared study hall — Library halls or Train Station platforms alongside others.</p>
          <span className="realm-card-cta">Enter the realm ›</span>
        </button>

        <button
          className="realm-card water-glass"
          onClick={() => onPick('public')}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty('--glow-x', `${((e.clientX - r.left) / r.width) * 100}%`)
            e.currentTarget.style.setProperty('--glow-y', `${((e.clientY - r.top) / r.height) * 100}%`)
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.removeProperty('--glow-x')
            e.currentTarget.style.removeProperty('--glow-y')
          }}
        >
          <div className="realm-card-orb">
            <PngIcon name="realm" size={72} alt="Private Realm" />
          </div>
          <h2>Private Realm</h2>
          <p>Create a realm for you and your friends. Share the code and password to join together.</p>
          <span className="realm-card-cta">Create or join ›</span>
        </button>
      </div>
    </>
  )
}

/* ---------------------------------------------------------- private sub-choose */

function PrivateChoose({ onPick }: { onPick: (m: Mode) => void }) {
  const navigate = useNavigate()

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Private Realm</span>
        <h1>Pick a world</h1>
        <p>Choose a world type, then join a room to study alongside others live.</p>
      </header>

      <div className="realm-cards">
        <button
          className="realm-card water-glass"
          onClick={() => onPick('library')}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty('--glow-x', `${((e.clientX - r.left) / r.width) * 100}%`)
            e.currentTarget.style.setProperty('--glow-y', `${((e.clientY - r.top) / r.height) * 100}%`)
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.removeProperty('--glow-x')
            e.currentTarget.style.removeProperty('--glow-y')
          }}
        >
          <div className="realm-card-orb">
            <PngIcon name="study-rooms" size={72} alt="Library" />
          </div>
          <h2>📚 Library</h2>
          <p>Grand reading halls, cozy nooks, and the Knowledge Tree at the heart of it all.</p>
          <span className="realm-card-cta">Enter the library ›</span>
        </button>

        <button
          className="realm-card water-glass"
          onClick={() => onPick('train-station')}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty('--glow-x', `${((e.clientX - r.left) / r.width) * 100}%`)
            e.currentTarget.style.setProperty('--glow-y', `${((e.clientY - r.top) / r.height) * 100}%`)
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.removeProperty('--glow-x')
            e.currentTarget.style.removeProperty('--glow-y')
          }}
        >
          <div className="realm-card-orb">
            <PngIcon name="realm" size={72} alt="Train Station" />
          </div>
          <h2>🚂 Train Station</h2>
          <p>Board a magical train and commit to a real study journey — from Express to Grand Journey.</p>
          <span className="realm-card-cta">Enter the train ›</span>
        </button>
        
        <button
          className="realm-card water-glass"
          onClick={() => onPick('uk-cafe')}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            e.currentTarget.style.setProperty('--glow-x', `${((e.clientX - r.left) / r.width) * 100}%`)
            e.currentTarget.style.setProperty('--glow-y', `${((e.clientY - r.top) / r.height) * 100}%`)
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.removeProperty('--glow-x')
            e.currentTarget.style.removeProperty('--glow-y')
          }}
        >
          <div className="realm-card-orb">
            <PngIcon name="realm" size={72} alt="UK Cafe" />
          </div>
          <h2>☕ UK Cafe</h2>
          <p>A cozy Edinburgh-style cafe with exposed brick, warm lighting, and fresh pastries.</p>
          <span className="realm-card-cta">Enter the cafe ›</span>
        </button>
      </div>
    </>
  )
}

/* ----------------------------------------------------------- character orb */

function CharacterOrb() {
  const navigate = useNavigate()
  const config = useAvatar((s) => s.config)
  const character = characterById(config.characterId || 'james')

  return (
    <button className="realm-avatar" onClick={() => navigate('/avatar')} title="Customize character">
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
        <span className="realm-avatar-you">YOUR AVATAR</span>
        <span className="realm-avatar-name">{character.name}</span>
        <span className="realm-avatar-change">Customize ›</span>
      </div>
    </button>
  )
}

function SpinningAvatar({ config }: { config: AvatarConfig }) {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.4
  })
  return (
    <group ref={g} position={[0, -0.85, 0]}>
      <CharacterAvatar config={config} />
    </group>
  )
}

/* -------------------------------------------------------------- private rooms */

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
      navigate('/realm/explore?world=library')
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
                  <div className="roomlet-room-top">
                    <strong>{r.name}</strong>
                    <span className="realm-room-count" title={`${here} studying now`}>
                      <span className="roomlet-room-dot" />
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

function UkCafeRealm() {
  const navigate = useNavigate()
  const enterGlobal = useRealm((s) => s.enterGlobal)
  const [occ, setOcc] = useState<Record<string, InstanceOccupancy[]>>({})

  useEffect(() => {
    let alive = true
    async function load() {
      const entries = await Promise.all(
        UK_CAFE_ROOMS.map(async (r) => [r.id, await occupancy(`uk-cafe:${r.id}`)] as const),
      )
      if (alive) setOcc(Object.fromEntries(entries))
    }
    void load()
    const t = window.setInterval(load, 15_000)
    return () => { alive = false; window.clearInterval(t) }
  }, [])

  function join(roomId: string, name: string) {
    enterGlobal(roomId, name)
    navigate('/realm/explore?world=uk-cafe')
  }

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">UK Cafe</span>
        <h1>Pick a room</h1>
        <p>Step into any UK cafe to study together — everyone who enters the same room sees each other live.</p>
      </header>
      <div className="realm-rooms">
        {UK_CAFE_ROOMS.map((r) => {
          const rows = occ[r.id] ?? []
          const here = totalOccupants(rows)
          const instances = rows.length
          const lead = rows.find((x) => x.instance === 1)?.count ?? 0
          const full = instances > 0 && rows.every((x) => x.count >= ROOM_CAPACITIES[r.id])
          return (
            <div key={r.id} className="realm-room water-glass">
              <div className="realm-room-icon">
                <PngIcon name="realm" size={40} alt="" />
              </div>
              <div className="realm-room-body">
                <div className="roomlet-room-top">
                  <strong>{r.name}</strong>
                  <span className="realm-room-count" title={`${here} studying now`}>
                    <span className="roomlet-room-dot" />
                    {Math.min(lead, ROOM_CAPACITIES[r.id])}/${ROOM_CAPACITIES[r.id]}
                    {instances > 1 && <span className="roomlet-room-inst"> · {instances} rooms · {here} total</span>}
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
    navigate('/realm/explore?world=train-station')
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

/* -------------------------------------------------------------- public realm */

function dbToCustom(r: DbRealm): CustomRealm {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    visibility: r.visibility,
    ownerId: r.owner_id,
    createdAt: r.created_at,
    password: r.password ?? undefined,
    expiresAt: r.expires_at ?? undefined,
  }
}

/** Format time remaining until expiry as "Xh Ym" */
function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

function PublicRealm() {
  const navigate = useNavigate()
  const custom = useRealm((s) => s.custom)
  const rememberCustom = useRealm((s) => s.rememberCustom)
  const enterCustom = useRealm((s) => s.enterCustom)

  // Create form
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<DbRealm | null>(null)

  // Join form
  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [joinErr, setJoinErr] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [needPassword, setNeedPassword] = useState(false)
  const [pendingCode, setPendingCode] = useState('')

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DbRealm[]>([])
  const [searching, setSearching] = useState(false)

  // Countdown refresh
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(t)
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const realm = await createRealm(name, 'public', REALM_CAPACITY, password)
    setBusy(false)
    if (!realm) {
      setJoinErr('Could not create the realm. Are you signed in?')
      return
    }
    rememberCustom(dbToCustom(realm))
    setCreated(realm)
  }

  async function join(e: React.FormEvent) {
    e.preventDefault()
    if (joining || !joinCode.trim()) return
    setJoining(true)
    setJoinErr(null)
    const code = joinCode.trim()
    const { realm, error } = await getRealmByCode(code, needPassword ? joinPassword : undefined)
    setJoining(false)

    if (error === 'wrong password' && !needPassword) {
      setNeedPassword(true)
      setPendingCode(code)
      setJoining(false)
      return
    }

    if (!realm) {
      setJoinErr(error || 'Realm not found.')
      return
    }

    setNeedPassword(false)
    setPendingCode('')
    setJoinCode('')
    setJoinPassword('')
    const c = dbToCustom(realm)
    rememberCustom(c)
    enterCustom(c)
    navigate('/realm/explore?world=library')
  }

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.trim().length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const results = await searchPublicRealms(q)
    setSearchResults(results)
    setSearching(false)
  }

  async function joinSearchResult(realm: DbRealm) {
    if (realm.password) {
      setJoinCode(realm.code)
      setNeedPassword(true)
      setPendingCode(realm.code)
      setSearchQuery('')
      setSearchResults([])
      return
    }
    const c = dbToCustom(realm)
    rememberCustom(c)
    enterCustom(c)
    navigate('/realm/explore?world=library')
  }

  if (created) {
    return <InviteCard realm={created} onEnter={() => { enterCustom(dbToCustom(created)); navigate('/realm/explore?world=library') }} onBack={() => setCreated(null)} />
  }

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Public Realm</span>
        <h1>Your own world</h1>
        <p>Create a realm for you and your friends. Share the 7-digit code and password so they join the exact same world.</p>
      </header>

      <div className="realm-public-sections">

        {/* ── Create ── */}
        <div className="realm-section water-glass">
          <h3 className="realm-section-title">Create a realm</h3>
          <form className="realm-create realm-create-col" onSubmit={create}>
            <input
              className="sf-input"
              placeholder="Name your realm — e.g. Midnight Library"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
            <input
              className="sf-input"
              type="password"
              placeholder="Set a password for friends to join"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={32}
            />
            <div className="realm-create-note">Expires in 24 hours · One realm at a time</div>
            <button className="sf-btn water" type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create realm'}
            </button>
          </form>
        </div>

        {/* ── Join ── */}
        <div className="realm-section water-glass">
          <h3 className="realm-section-title">Join a realm</h3>
          <form className="realm-create realm-create-col" onSubmit={join}>
            <input
              className="sf-input"
              placeholder="Enter 7-digit code — e.g. 3847291"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value); setNeedPassword(false); setPendingCode(''); setJoinPassword(''); setJoinErr(null) }}
              maxLength={7}
              inputMode="numeric"
              pattern="[0-9]*"
            />
            {needPassword && (
              <input
                className="sf-input"
                type="password"
                placeholder="Enter realm password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                maxLength={32}
                autoFocus
              />
            )}
            <button className="sf-btn water" type="submit" disabled={joining}>
              {joining ? 'Joining…' : 'Join'}
            </button>
          </form>
          {joinErr && <p className="realm-join-err">{joinErr}</p>}
        </div>

        {/* ── Search ── */}
        <div className="realm-section water-glass">
          <h3 className="realm-section-title">Search realms</h3>
          <div className="realm-search">
            <input
              className="sf-input"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              maxLength={40}
            />
            {searching && <span className="realm-search-hint">Searching…</span>}
            {searchResults.length > 0 && (
              <div className="realm-search-results">
                {searchResults.map((r) => (
                  <button key={r.id} className="realm-search-item" onClick={() => joinSearchResult(r)}>
                    <PngIcon name="realm" size={28} alt="" />
                    <span className="realm-search-name">{r.name}</span>
                    {r.password && <span className="realm-search-lock">🔒</span>}
                    <span className="realm-search-go">Join ›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {custom.length > 0 && (
        <div className="realm-mine">
          <h3>Your realms</h3>
          <div className="realm-mine-list">
            {custom.map((r) => (
              <button key={r.id} className="realm-mine-item" onClick={() => { enterCustom(r); navigate('/realm/explore?world=library') }}>
                <PngIcon name="realm" size={34} alt="" />
                <span>{r.name}</span>
                {r.code && <span className="realm-mine-code">{r.code}</span>}
                {r.expiresAt && (
                  <span className={`realm-mine-expiry ${timeLeft(r.expiresAt) === 'Expired' ? 'expired' : ''}`}>
                    {timeLeft(r.expiresAt)}
                  </span>
                )}
                <span className="realm-mine-go">Enter ›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/** Post-create card: shows the 7-digit code + link with copy buttons, then a
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
        <p>Share this 7-digit code and password with friends so they join the exact same realm.</p>
      </header>

      <div className="realm-invite">
        <div className="realm-invite-row">
          <span className="realm-invite-label">7-digit code</span>
          <code className="realm-invite-code">{realm.code}</code>
          <button className="sf-btn water secondary" onClick={() => copy(realm.code, 'code')}>
            {copied === 'code' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {realm.password && (
          <div className="realm-invite-row">
            <span className="realm-invite-label">Password</span>
            <code className="realm-invite-value">{realm.password}</code>
          </div>
        )}
        <div className="realm-invite-row">
          <span className="realm-invite-label">Invite link</span>
          <code className="realm-invite-value">{link}</code>
          <button className="sf-btn water secondary" onClick={() => copy(realm.code, 'link')}>
            {copied === 'link' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {realm.expires_at && (
          <div className="realm-invite-expiry">
            Expires in {timeLeft(realm.expires_at)}
          </div>
        )}
      </div>

      <div className="realm-create">
        <button className="sf-btn water" onClick={onBack}>
          ‹ Back
        </button>
        <button className="sf-btn water" onClick={onEnter}>
          Enter realm ›
        </button>
      </div>
    </>
  )
}
