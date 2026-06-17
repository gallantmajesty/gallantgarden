import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PngIcon } from '../components/PngIcon'
import { useRealm, type CustomRealm } from '../store/realm'
import { GLOBAL_ROOMS, ROOM_CAPACITY, mockOccupancy } from '../lib/realm'
import './Realm.css'

type Mode = 'choose' | 'global' | 'custom'

export function Realm() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('choose')

  return (
    <div className="realm-root">
      <div className="realm-topleft">
        <button className="sf-btn ghost" onClick={() => (mode === 'choose' ? navigate('/') : setMode('choose'))}>
          ‹ {mode === 'choose' ? 'Lobby' : 'Realm'}
        </button>
      </div>

      <div className="realm-stage">
        {mode === 'choose' && <RealmChoose onPick={setMode} />}
        {mode === 'global' && <GlobalRealm />}
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
        <span className="sf-pill">Realm</span>
        <h1>Choose your study world</h1>
        <p>Join a shared public room, or open a private realm of your own.</p>
      </header>

      <div className="realm-cards">
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
      </div>
    </>
  )
}

/* -------------------------------------------------------------- global rooms */

function GlobalRealm() {
  const navigate = useNavigate()
  const enterGlobal = useRealm((s) => s.enterGlobal)

  // Occupancy is mocked until backend presence sync lands; computed once so the
  // numbers stay stable while the user browses.
  const rooms = useMemo(
    () => GLOBAL_ROOMS.map((r) => ({ ...r, here: mockOccupancy(r.seed) })),
    [],
  )

  function join(roomId: string, name: string, full: boolean) {
    if (full) return
    enterGlobal(roomId, name)
    navigate('/explore')
  }

  return (
    <>
      <header className="realm-head">
        <span className="sf-pill">Global Realm</span>
        <h1>Pick a room</h1>
        <p>Live counts arrive with multiplayer — for now these show sample occupancy.</p>
      </header>

      <div className="realm-rooms">
        {rooms.map((r) => {
          const full = r.here >= ROOM_CAPACITY
          const pct = Math.round((r.here / ROOM_CAPACITY) * 100)
          return (
            <div key={r.id} className={`realm-room water-glass ${full ? 'full' : ''}`}>
              <div className="realm-room-icon">
                <PngIcon name="study-rooms" size={40} alt="" />
              </div>
              <div className="realm-room-body">
                <div className="realm-room-top">
                  <strong>{r.name}</strong>
                  <span className={`realm-room-count ${pct >= 80 ? 'hot' : ''}`}>
                    {r.here}/{ROOM_CAPACITY}
                  </span>
                </div>
                <p>{r.blurb}</p>
                <div className="realm-room-bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
              <button className="sf-btn water realm-join" disabled={full} onClick={() => join(r.id, r.name, full)}>
                {full ? 'Full' : 'Join'}
              </button>
            </div>
          )
        })}
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
