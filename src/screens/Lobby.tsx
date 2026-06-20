import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { Modal } from '../components/Modal'
import { PngIcon, type PngIconName } from '../components/PngIcon'
import { Flag } from '../components/Flag'
import { RankBadge } from '../components/RankBadge'
import { LobbySettings } from '../components/settings/LobbySettings'
import { FriendsPanel } from '../components/FriendsPanel'
import './Lobby.css'

interface LobbyObject {
  key: string
  label: string
  caption: string
  png: PngIconName
  route?: string
  soon?: boolean
}

const OBJECTS: LobbyObject[] = [
  { key: 'sticky', label: 'Sticky Notes', caption: 'Your visual thinking space', png: 'notes', route: '/sticky' },
  { key: 'realm', label: 'Realm', caption: 'Step into a shared study world', png: 'realm', route: '/realm' },
  { key: 'magnet', label: 'Task Magnet', caption: 'Your private productivity HQ', png: 'tasks', route: '/magnet' },
  { key: 'focus', label: 'Focus Timer', caption: 'Beat procrastination', png: 'focus-timer', soon: true },
]

export function Lobby() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<null | 'interact' | 'settings' | 'friends'>(null)
  const country = useProfile((s) => s.data.country)
  const rank = useProfile((s) => s.data.rank)

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
      {/* ---------- top-left: profile + Interact ---------- */}
      <div className="lobby-topleft">
        <button className="lobby-chip" onClick={() => navigate('/profile')} title="Your profile">
          {country ? <Flag code={country} className="lobby-chip-flag" /> : <span className="lobby-avatar-dot" />}
          <span className="lobby-chip-name">{displayName}</span>
          <RankBadge rankId={rank} size={22} className="lobby-chip-rank" />
        </button>
        <button className="sf-btn ghost lobby-iconbtn" onClick={() => setPanel('interact')}>
          <Glyph name="people" /> Interact
        </button>
      </div>

      {/* ---------- top-right: avatar / settings ---------- */}
      <div className="lobby-topright">
        <button className="lobby-round" title="Choose character" onClick={() => navigate('/avatar')}>
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
              className={`lobby-object water-glass ${o.soon ? 'soon' : ''}`}
              style={{ animationDelay: `${i * 70}ms` }}
              onClick={() => pick(o)}
            >
              <div className="lobby-object-orb">
                <PngIcon name={o.png} size={64} alt={o.label} />
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
          <button className="menu-item" onClick={() => setPanel('friends')}>
            <span className="menu-item-icon"><Glyph name="people" /></span>
            <span>
              <strong>Friends</strong>
              <small>Find explorers & follow them</small>
            </span>
          </button>
          <button className="menu-item" onClick={() => navigate('/profile')}>
            <span className="menu-item-icon"><Glyph name="face" /></span>
            <span>
              <strong>Your Profile</strong>
              <small>Customize your study base</small>
            </span>
          </button>
          {[
            ['Controls', 'How to move & interact', 'gear'],
            ['Info', 'About Focus Lily', 'star'],
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

      {panel === 'friends' && <FriendsPanel onClose={() => setPanel(null)} />}

      {panel === 'settings' && <LobbySettings onClose={() => setPanel(null)} />}
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
    magnet: 'M5 3v7a7 7 0 0014 0V3h-4v7a3 3 0 01-6 0V3z M5 3h4 M15 3h4',
    people: 'M8 11a3 3 0 100-6 3 3 0 000 6z M2 20a6 6 0 0112 0 M17 11a3 3 0 100-6 M16 14a6 6 0 016 6',
    face: 'M12 2a10 10 0 100 20 10 10 0 000-20z M9 10h.01 M15 10h.01 M8 15a4 4 0 008 0',
    gear: 'M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2',
    palette:
      'M12 3a9 9 0 100 18 2.5 2.5 0 002.5-2.5 2 2 0 01.5-1.4 2 2 0 011.5-.6H18a3 3 0 003-3A9 9 0 0012 3z M7.5 11.5h.01 M10 7.5h.01 M14.5 7.5h.01',
  }
  return (
    <svg className="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] ?? paths.star} />
    </svg>
  )
}
