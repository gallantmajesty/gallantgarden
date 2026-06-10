import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { SceneBackground } from '../components/SceneBackground'
import { Modal } from '../components/Modal'
import './Lobby.css'

interface LobbyObject {
  key: string
  label: string
  caption: string
  icon: string
  route?: string
  soon?: boolean
}

const OBJECTS: LobbyObject[] = [
  { key: 'sticky', label: 'Sticky Notes', caption: 'Grow your note forest', icon: 'note', route: '/sticky' },
  { key: 'explore', label: 'Explore World', caption: 'Enter the International Realm', icon: 'globe', route: '/explore' },
  { key: 'self', label: 'Self Notes', caption: 'A quiet journal', icon: 'book', soon: true },
  { key: 'focus', label: 'Focus Timer', caption: 'Beat procrastination', icon: 'clock', soon: true },
  { key: 'soon', label: 'Coming Soon', caption: 'New magic brewing', icon: 'star', soon: true },
]

export function Lobby() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<null | 'interact' | 'settings' | 'avatar' | 'account'>(null)

  const displayName = user?.profile?.name || user?.email?.split('@')[0] || 'Explorer'

  function pick(o: LobbyObject) {
    if (o.soon || !o.route) {
      setPanel(null)
      // gentle "coming soon" — handled inline via the disabled style + toast later
      return
    }
    navigate(o.route)
  }

  return (
    <div className="lobby-root">
      <SceneBackground />

      {/* ---------- top-left: Interact ---------- */}
      <div className="lobby-topleft">
        <button className="sf-btn ghost lobby-iconbtn" onClick={() => setPanel('interact')}>
          <Glyph name="people" /> Interact
        </button>
      </div>

      {/* ---------- top-right: account / settings / avatar ---------- */}
      <div className="lobby-topright">
        <button className="lobby-chip" onClick={() => setPanel('account')}>
          <span className="lobby-avatar-dot" />
          <span className="lobby-chip-name">{displayName}</span>
        </button>
        <button className="lobby-round" title="Customize avatar" onClick={() => setPanel('avatar')}>
          <Glyph name="face" />
        </button>
        <button className="lobby-round" title="Settings" onClick={() => setPanel('settings')}>
          <Glyph name="gear" />
        </button>
      </div>

      {/* ---------- center stage: floating objects ---------- */}
      <div className="lobby-stage">
        <div className="lobby-welcome">
          <span className="sf-pill">Lobby</span>
          <h1>Welcome back, {displayName}</h1>
          <p>Pick where your mind wants to wander.</p>
        </div>

        <div className="lobby-objects">
          {OBJECTS.map((o, i) => (
            <button
              key={o.key}
              className={`lobby-object ${o.soon ? 'soon' : ''}`}
              style={{ animationDelay: `${i * 70}ms` }}
              onClick={() => pick(o)}
            >
              <div className="lobby-object-orb">
                <Glyph name={o.icon} />
              </div>
              <div className="lobby-object-label">{o.label}</div>
              <div className="lobby-object-caption">{o.caption}</div>
              {o.soon && <div className="lobby-soon-tag">Soon</div>}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- panels ---------- */}
      <Modal open={panel === 'interact'} title="Interact" onClose={() => setPanel(null)}>
        <div className="menu-list">
          {[
            ['Invite Friends', 'Share a magic link', 'people'],
            ['Friends', 'See who is studying', 'face'],
            ['Controls', 'How to move & interact', 'gear'],
            ['Info', 'About StudyForest', 'star'],
            ['Help', 'Tips & support', 'book'],
          ].map(([t, s, g]) => (
            <button key={t} className="menu-item" onClick={() => setPanel(null)}>
              <span className="menu-item-icon"><Glyph name={g} /></span>
              <span>
                <strong>{t}</strong>
                <small>{s}</small>
              </span>
              <span className="menu-soon">Soon</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={panel === 'account'} title="Your Account" onClose={() => setPanel(null)}>
        <div className="account-box">
          <div className="account-name">{displayName}</div>
          <div className="account-email">{user?.email}</div>
        </div>
        <button className="sf-btn secondary" style={{ width: '100%', marginTop: 16 }} onClick={signOut}>
          Sign Out
        </button>
      </Modal>

      <Modal open={panel === 'settings'} title="Settings" onClose={() => setPanel(null)}>
        <p className="panel-hint">
          Graphics quality, audio, and control bindings will live here. For now, StudyForest
          auto-tunes itself to stay smooth.
        </p>
      </Modal>

      <Modal open={panel === 'avatar'} title="Customize Avatar" onClose={() => setPanel(null)} width={520}>
        <p className="panel-hint">
          Head, hair, body size and outfit colors — full avatar customization is coming with the
          3D lobby. Your choices will save to your profile.
        </p>
      </Modal>
    </div>
  )
}

/* tiny inline icon set (no emoji, crisp SVG) */
function Glyph({ name }: { name: string }) {
  const paths: Record<string, string> = {
    note: 'M5 3h14v14l-5 5H5z M14 22v-5h5',
    globe: 'M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2c3 3 3 17 0 20 M12 2c-3 3-3 17 0 20',
    book: 'M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3z M18 20a3 3 0 00-3-3H4',
    clock: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 7v5l3 3',
    star: 'M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9z',
    people: 'M8 11a3 3 0 100-6 3 3 0 000 6z M2 20a6 6 0 0112 0 M17 11a3 3 0 100-6 M16 14a6 6 0 016 6',
    face: 'M12 2a10 10 0 100 20 10 10 0 000-20z M9 10h.01 M15 10h.01 M8 15a4 4 0 008 0',
    gear: 'M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2',
  }
  return (
    <svg className="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] ?? paths.star} />
    </svg>
  )
}
