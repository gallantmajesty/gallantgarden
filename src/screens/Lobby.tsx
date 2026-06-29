import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { Modal } from '../components/Modal'
import { PngIcon, type PngIconName } from '../components/PngIcon'
import { RankBadge } from '../components/RankBadge'
import { ResourceBar } from '../components/ResourceBar'
import { getRank, rankProgress } from '../lib/ranks'
import { LobbySettings } from '../components/settings/LobbySettings'
import { FriendsPanel } from '../components/FriendsPanel'
import { useFriends } from '../store/friends'
import { useIsDesktop } from '../components/DesktopOnly'
import './Lobby.css'

interface LobbyObject {
  key: string
  labelKey: string
  captionKey: string
  png: PngIconName
  route?: string
  soon?: boolean
  desktopOnly?: boolean
}

const OBJECTS: LobbyObject[] = [
  { key: 'room', labelKey: 'lobby.objStudyRooms', captionKey: 'lobby.objStudyRoomsCaption', png: 'study-rooms', route: '/rooms' },
  { key: 'sticky', labelKey: 'lobby.objStickyNotes', captionKey: 'lobby.objStickyNotesCaption', png: 'notes', route: '/sticky' },
  { key: 'realm', labelKey: 'lobby.objRealm', captionKey: 'lobby.objRealmCaption', png: 'realm', route: '/realm', desktopOnly: true },
  { key: 'magnet', labelKey: 'lobby.objMagnet', captionKey: 'lobby.objMagnetCaption', png: 'tasks', route: '/magnet' },
  { key: 'focus', labelKey: 'lobby.objFocusTimer', captionKey: 'lobby.objFocusTimerCaption', png: 'focus-timer', soon: true },
]

export function Lobby() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<null | 'interact' | 'settings' | 'friends'>(null)
  const rank = useProfile((s) => s.data.rank)
  const incomingCount = useFriends((s) => s.incoming.length)
  const userXp = useProfile((s) => s.xp)
  const isDesktop = useIsDesktop()
  const userPremiumXp = useProfile((s) => s.premiumXp)

  // Transition animation state
  const [transition, setTransition] = useState<{
    active: boolean
    index: number
    phase: 'emit' | 'center' | 'ultra'
    originX: number
    originY: number
  } | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Profile rank transition
  const [rankTransition, setRankTransition] = useState<{
    active: boolean
    phase: 'slide' | 'fire' | 'go'
    originX: number
    originY: number
  } | null>(null)
  const rankTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const profileName = useProfile((s) => s.displayName)
  const displayName =
    profileName && profileName !== 'Explorer'
      ? profileName
      : user?.profile?.name || user?.email?.split('@')[0] || 'Explorer'

  const rankObj = getRank(rank)
  const rankAccent = rankObj.accent
  // Use the new rank progress system based on actual XP
  const totalXp = userXp + userPremiumXp
  const { pct: xpPctRaw } = rankProgress(totalXp)
  const xpPct = Math.round(xpPctRaw * 100)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      rankTimersRef.current.forEach(clearTimeout)
    }
  }, [])

  const pickProfile = useCallback((e: React.MouseEvent) => {
    if (transition?.active || rankTransition?.active) return

    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    rankTimersRef.current.forEach(clearTimeout)
    rankTimersRef.current = []

    // Phase 1: badge slides to center, bg darkens
    setRankTransition({ active: true, phase: 'slide', originX: cx, originY: cy })

    // Phase 2: fire shine — hold for ~2.5s
    rankTimersRef.current.push(setTimeout(() => {
      setRankTransition((p) => p ? { ...p, phase: 'fire' } : null)
    }, 500))

    // Phase 3: navigate
    rankTimersRef.current.push(setTimeout(() => {
      setRankTransition((p) => p ? { ...p, phase: 'go' } : null)
    }, 3000))

    rankTimersRef.current.push(setTimeout(() => {
      navigate('/profile')
    }, 3250))
  }, [navigate, transition, rankTransition])

  const pick = useCallback((o: LobbyObject, idx: number, e: React.MouseEvent) => {
    if (o.soon || !o.route) {
      setPanel(null)
      return
    }
    if (o.desktopOnly && !isDesktop) {
      return
    }
    if (transition?.active) return

    // Capture the clicked card's center position for the logo origin
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    // Phase 1: emit — logo flies out of the card, other cards slide away
    setTransition({ active: true, index: idx, phase: 'emit', originX: cx, originY: cy })

    // Phase 2: center — logo arrives at center, card fades
    timersRef.current.push(setTimeout(() => {
      setTransition((p) => p ? { ...p, phase: 'center' } : null)
    }, 400))

    // Phase 3: ultra — logo zooms to fill the entire screen
    timersRef.current.push(setTimeout(() => {
      setTransition((p) => p ? { ...p, phase: 'ultra' } : null)
    }, 800))

    // Navigate at peak zoom
    timersRef.current.push(setTimeout(() => {
      navigate(o.route!)
    }, 1250))
  }, [navigate, transition, isDesktop])

  return (
    <div className="lobby-root">
      {/* ---------- top-left: profile + Interact ---------- */}
      <div className="lobby-topleft">
        <button
          className={`lobby-xp ${rankTransition?.active ? 'lobby-xp--transitioning' : ''}`}
          onClick={pickProfile}
          title={`${displayName} · ${rankObj.name}`}
          style={{ ['--xp' as string]: rankAccent, ['--pct' as string]: xpPct }}
        >
          <span className="lobby-xp__medal">
            <RankBadge rankId={rank} size={32} />
          </span>
          <span className="lobby-xp__name">{displayName}</span>
        </button>
        <button className="sf-btn ghost lobby-iconbtn" onClick={() => setPanel('interact')}>
          <Glyph name="people" />{t('lobby.interact')}
          {incomingCount > 0 && <span className="lobby-dot" />}
        </button>
      </div>

      {/* ---------- top-right: avatar / settings ---------- */}
      <div className="lobby-topright">
        <button className="lobby-round" title={t('lobby.chooseCharacter')} onClick={() => navigate('/avatar')}>
          <Glyph name="face" />
        </button>
        <button className="lobby-round" title={t('common.settings')} onClick={() => setPanel('settings')}>
          <Glyph name="gear" />
        </button>
      </div>

      {/* ---------- center stage: floating objects ---------- */}
      <div className={`lobby-stage ${transition?.active ? 'lobby-stage--transitioning' : ''}`}>
        <div className="lobby-welcome">
          <span className="sf-pill">{t('common.lobby')}</span>
          <h1>Welcome back, <span className="lobby-welcome__name">{displayName}</span></h1>
          <p>{t('lobby.pickWhere')}</p>
        </div>

        <div className="lobby-objects">
          {OBJECTS.map((o, i) => {
            const isTransitioning = transition?.active
            const isSelected = isTransitioning && transition.index === i
            const isLeft = isTransitioning && transition.index > i
            const isRight = isTransitioning && transition.index < i

            let animClass = ''
            if (isSelected && transition.phase === 'emit') animClass = 'lobby-obj--emit'
            else if (isSelected && (transition.phase === 'center' || transition.phase === 'ultra')) animClass = 'lobby-obj--card-fade'
            else if (isLeft) animClass = 'lobby-obj--exit-left'
            else if (isRight) animClass = 'lobby-obj--exit-right'

            return (
              <button
                key={o.key}
                className={`lobby-object water-glass ${o.soon ? 'soon' : ''} ${animClass}`}
                style={{ animationDelay: `${i * 70}ms` }}
                onClick={(e) => pick(o, i, e)}
                disabled={transition?.active && !isSelected}
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  const x = ((e.clientX - r.left) / r.width) * 100
                  const y = ((e.clientY - r.top) / r.height) * 100
                  e.currentTarget.style.setProperty('--glow-x', `${x}%`)
                  e.currentTarget.style.setProperty('--glow-y', `${y}%`)
                }}
                onPointerLeave={(e) => {
                  e.currentTarget.style.removeProperty('--glow-x')
                  e.currentTarget.style.removeProperty('--glow-y')
                }}
              >
                <div className="lobby-object-orb">
                  <PngIcon name={o.png} size={64} alt={t(o.labelKey)} />
                </div>
                <div className="lobby-object-label">{t(o.labelKey)}</div>
                <div className="lobby-object-caption">{t(o.captionKey)}</div>
                {o.soon && <div className="lobby-soon-tag">{t('common.soon')}</div>}
                {o.desktopOnly && !isDesktop && <div className="lobby-soon-tag">Desktop only</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ---------- transition overlay ---------- */}
      {transition?.active && (
        <div className={`lobby-transition-overlay lobby-transition--${transition.phase}`}>
          <div
            className="lobby-transition-logo"
            style={{
              ['--ox' as string]: `${transition.originX}px`,
              ['--oy' as string]: `${transition.originY}px`,
            }}
          >
            <PngIcon
              name={OBJECTS[transition.index].png}
              size={120}
              alt={t(OBJECTS[transition.index].labelKey)}
            />
          </div>
          <div className="lobby-transition-label">
            {t(OBJECTS[transition.index].labelKey)}
          </div>
        </div>
      )}

      {/* ---------- rank transition overlay ---------- */}
      {rankTransition?.active && (
        <div className={`rank-transition-overlay rank-transition--${rankTransition.phase}`}>
          <div className="rank-mountains">
            <div className="rank-mountain rank-mountain--far" />
            <div className="rank-mountain rank-mountain--mid" />
            <div className="rank-mountain rank-mountain--near" />
          </div>
          <div
            className="rank-transition-badge"
            style={{
              ['--ox' as string]: `${rankTransition.originX}px`,
              ['--oy' as string]: `${rankTransition.originY}px`,
            }}
          >
            <RankBadge rankId={rank} size={120} />
          </div>
          <div className="rank-transition-name">{displayName}</div>
          <div className="rank-transition-rank">{rankObj.name}</div>
        </div>
      )}

      {/* ---------- panels ---------- */}
      <Modal open={panel === 'interact'} title={t('lobby.interact')} onClose={() => setPanel(null)}>
        <div className="menu-list">
          <button className="menu-item" onClick={() => setPanel('friends')}>
            <span className="menu-item-icon"><Glyph name="people" /></span>
            <span>
              <strong>{t('friendsPanel.tabFriends')}</strong>
              <small>{t('lobby.friendsSub')}</small>
            </span>
            {incomingCount > 0 && <span className="menu-badge">{incomingCount}</span>}
          </button>
          <button className="menu-item" onClick={() => navigate('/profile')}>
            <span className="menu-item-icon"><Glyph name="face" /></span>
            <span>
              <strong>{t('lobby.yourProfile')}</strong>
              <small>{t('lobby.profileSub')}</small>
            </span>
          </button>
          {[
            { t: t('lobby.menuControls'), s: t('lobby.menuControlsSub'), g: 'gear', soon: true },
            { t: t('lobby.menuInfo'), s: t('lobby.menuInfoSub'), g: 'star', route: '/about' },
            { t: t('lobby.menuHelp'), s: t('lobby.menuHelpSub'), g: 'book', soon: true },
          ].map((it) => (
            <button
              key={it.t}
              className="menu-item"
              onClick={() => {
                setPanel(null)
                if (it.route) navigate(it.route)
              }}
            >
              <span className="menu-item-icon"><Glyph name={it.g} /></span>
              <span>
                <strong>{it.t}</strong>
                <small>{it.s}</small>
              </span>
              {it.soon && <span className="menu-soon">Soon</span>}
            </button>
          ))}
        </div>
      </Modal>

      {panel === 'friends' && <FriendsPanel onClose={() => setPanel(null)} />}

      {panel === 'settings' && <LobbySettings onClose={() => setPanel(null)} />}

      {/* ---------- resource bar (CoC-style currency display) ---------- */}
      <ResourceBar />
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
