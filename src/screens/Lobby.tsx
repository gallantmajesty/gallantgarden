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
  accent?: string
}

const OBJECTS: LobbyObject[] = [
  { key: 'blueprint', labelKey: 'lobby.objBlueprint', captionKey: 'lobby.objBlueprintCaption', png: 'notes', route: '/blueprint' },
  { key: 'realm', labelKey: 'lobby.objRealm', captionKey: 'lobby.objRealmCaption', png: 'realm', route: '/realm' },
  { key: 'magnet', labelKey: 'lobby.objMagnet', captionKey: 'lobby.objMagnetCaption', png: 'tasks', route: '/magnet' },
  { key: 'games', labelKey: 'lobby.objGames', captionKey: 'lobby.objGamesCaption', png: 'focus-lily-logo', route: '/games' },
]

const MOBILE_WORLDS: LobbyObject[] = [
  { key: 'realm', labelKey: 'lobby.objRealm', captionKey: 'lobby.objRealmCaption', png: 'realm', route: '/realm', accent: '#6bbf4f' },
  { key: 'blueprint', labelKey: 'lobby.objBlueprint', captionKey: 'lobby.objBlueprintCaption', png: 'notes', route: '/blueprint', accent: '#caa84a' },
  { key: 'magnet', labelKey: 'lobby.objMagnet', captionKey: 'lobby.objMagnetCaption', png: 'tasks', route: '/magnet', accent: '#e88aaa' },
  { key: 'games', labelKey: 'lobby.objGames', captionKey: 'lobby.objGamesCaption', png: 'focus-lily-logo', route: '/games', accent: '#8a6cff' },
]

const DAILY_QUESTS = [
  { id: 1, label: 'Complete 3 Focus Sessions', progress: 2, total: 3, reward: 50, icon: '🎯' },
  { id: 2, label: 'Study for 120 minutes', progress: 75, total: 120, reward: 80, icon: '⏱' },
  { id: 3, label: 'Complete all today\'s tasks', progress: 1, total: 4, reward: 60, icon: '✅' },
]

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getGreetingEmoji(): string {
  const h = new Date().getHours()
  if (h < 12) return '☀️'
  if (h < 17) return '🌤'
  return '🌙'
}

export function Lobby() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<null | 'interact' | 'settings' | 'friends'>(null)
  const rank = useProfile((s) => s.data.rank)
  const incomingCount = useFriends((s) => s.incoming.length)
  const userXp = useProfile((s) => s.xp)
  const isDesktop = useIsDesktop()
  const userPremiumXp = useProfile((s) => s.premiumXp)
  const [mobileNav, setMobileNav] = useState<'home' | 'realm' | 'tasks' | 'games' | 'profile'>('home')
  const [showQuests, setShowQuests] = useState(false)

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
  const totalXp = userXp + userPremiumXp
  const { pct: xpPctRaw, nextRank } = rankProgress(totalXp)
  const xpPct = Math.round(xpPctRaw * 100)

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
    setRankTransition({ active: true, phase: 'slide', originX: cx, originY: cy })
    rankTimersRef.current.push(setTimeout(() => {
      setRankTransition((p) => p ? { ...p, phase: 'fire' } : null)
    }, 500))
    rankTimersRef.current.push(setTimeout(() => {
      setRankTransition((p) => p ? { ...p, phase: 'go' } : null)
    }, 3000))
    rankTimersRef.current.push(setTimeout(() => {
      navigate('/profile')
    }, 3250))
  }, [navigate, transition, rankTransition])

  const pick = useCallback((o: LobbyObject, idx: number, e: React.MouseEvent) => {
    if (o.soon || !o.route) { setPanel(null); return }
    if (transition?.active) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setTransition({ active: true, index: idx, phase: 'emit', originX: cx, originY: cy })
    timersRef.current.push(setTimeout(() => {
      setTransition((p) => p ? { ...p, phase: 'center' } : null)
    }, 400))
    timersRef.current.push(setTimeout(() => {
      setTransition((p) => p ? { ...p, phase: 'ultra' } : null)
    }, 800))
    timersRef.current.push(setTimeout(() => {
      navigate(o.route!)
    }, 1250))
  }, [navigate, transition])

  const pickMobile = useCallback((o: LobbyObject) => {
    if (o.soon || !o.route) return
    navigate(o.route)
  }, [navigate])

  const startSession = useCallback(() => {
    navigate('/explore?world=library')
  }, [navigate])

  /* ═══════════════════════════════════════════════════════════════
     DESKTOP LAYOUT — PIXEL-PERFECT, DO NOT TOUCH
     ═══════════════════════════════════════════════════════════════ */
  if (isDesktop) {
    return (
      <div className="lobby-root">
        {user?.isGuest && (
          <div className="lobby-guest-banner">
            <span>You're browsing as a guest — your progress saves on this device only.</span>
            <button className="sf-btn water" onClick={() => navigate('/')}>Sign Up to Save</button>
          </div>
        )}
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
        <div className="lobby-bottomleft">
          <button className="lobby-exit sf-btn ghost" onClick={() => { signOut(); navigate('/') }}>Exit</button>
        </div>
        <div className="lobby-topright">
          <button className="lobby-round" title={t('common.settings')} onClick={() => setPanel('settings')}>
            <Glyph name="gear" />
          </button>
        </div>
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
                </button>
              )
            })}
          </div>
        </div>
        {transition?.active && (
          <div className={`lobby-transition-overlay lobby-transition--${transition.phase}`}>
            <div className="lobby-transition-logo" style={{ ['--ox' as string]: `${transition.originX}px`, ['--oy' as string]: `${transition.originY}px` }}>
              <PngIcon name={OBJECTS[transition.index].png} size={120} alt={t(OBJECTS[transition.index].labelKey)} />
            </div>
            <div className="lobby-transition-label">{t(OBJECTS[transition.index].labelKey)}</div>
          </div>
        )}
        {rankTransition?.active && (
          <div className={`rank-transition-overlay rank-transition--${rankTransition.phase}`}>
            <div className="rank-mountains">
              <div className="rank-mountain rank-mountain--far" />
              <div className="rank-mountain rank-mountain--mid" />
              <div className="rank-mountain rank-mountain--near" />
            </div>
            <div className="rank-transition-badge" style={{ ['--ox' as string]: `${rankTransition.originX}px`, ['--oy' as string]: `${rankTransition.originY}px` }}>
              <RankBadge rankId={rank} size={120} />
            </div>
            <div className="rank-transition-name">{displayName}</div>
            <div className="rank-transition-rank">{rankObj.name}</div>
          </div>
        )}
        <Modal open={panel === 'interact'} title={t('lobby.interact')} onClose={() => setPanel(null)}>
          <div className="menu-list">
            <button className="menu-item" onClick={() => setPanel('friends')}>
              <span className="menu-item-icon"><Glyph name="people" /></span>
              <span><strong>{t('friendsPanel.tabFriends')}</strong><small>{t('lobby.friendsSub')}</small></span>
              {incomingCount > 0 && <span className="menu-badge">{incomingCount}</span>}
            </button>
            <button className="menu-item" onClick={() => navigate('/profile')}>
              <span className="menu-item-icon"><Glyph name="face" /></span>
              <span><strong>{t('lobby.yourProfile')}</strong><small>{t('lobby.profileSub')}</small></span>
            </button>
            {[
              { t: t('lobby.menuControls'), s: t('lobby.menuControlsSub'), g: 'gear', soon: true },
              { t: t('lobby.menuInfo'), s: t('lobby.menuInfoSub'), g: 'star', route: '/info' },
              { t: t('lobby.menuHelp'), s: t('lobby.menuHelpSub'), g: 'book', soon: true },
            ].map((it) => (
              <button key={it.t} className="menu-item" onClick={() => { setPanel(null); if (it.route) navigate(it.route) }}>
                <span className="menu-item-icon"><Glyph name={it.g} /></span>
                <span><strong>{it.t}</strong><small>{it.s}</small></span>
                {it.soon && <span className="menu-soon">Soon</span>}
              </button>
            ))}
          </div>
        </Modal>
        {panel === 'friends' && <FriendsPanel onClose={() => setPanel(null)} />}
        {panel === 'settings' && <LobbySettings onClose={() => setPanel(null)} />}
        <ResourceBar />
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════
     MOBILE + TABLET — ENHANCED DESIGN
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="lobby-mobile">
      {/* Ambient background */}
      <div className="lm-bg">
        <div className="lm-bg-orb lm-bg-orb--1" />
        <div className="lm-bg-orb lm-bg-orb--2" />
        <div className="lm-bg-orb lm-bg-orb--3" />
      </div>

      {user?.isGuest && (
        <div className="lobby-guest-banner">
          <span>You're browsing as a guest</span>
          <button className="sf-btn water" onClick={() => navigate('/')}>Sign Up</button>
        </div>
      )}

      {/* Header */}
      <div className="lm-header">
        <button className="lm-hamburger" onClick={() => setPanel('interact')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="lm-logo">
          <img src="/icons/focus-lily-logo.png" alt="FocusLily" width={28} height={28} />
          <span className="lm-logo-text">FocusLily</span>
        </div>
        <button className="lm-bell" onClick={() => setPanel('friends')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          {incomingCount > 0 && <span className="lm-bell-dot" />}
        </button>
      </div>

      {/* User card */}
      <div className="lm-user-card">
        <button className="lm-user-left" onClick={() => navigate('/profile')}>
          <div className="lm-avatar-wrap">
            <RankBadge rankId={rank} size={48} />
            <div className="lm-avatar-ring" />
          </div>
          <div className="lm-user-info">
            <span className="lm-user-name">{displayName}</span>
            <span className="lm-user-rank">✦ {rankObj.name}</span>
          </div>
        </button>
        <div className="lm-petals">
          <span className="lm-petals-icon">🌸</span>
          <span className="lm-petals-val">{totalXp.toLocaleString()}</span>
        </div>
      </div>

      {/* Greeting + CTA hero */}
      <div className="lm-hero">
        <div className="lm-hero-glow" />
        <div className="lm-greeting">
          <p className="lm-greeting-text">{getGreeting()} {getGreetingEmoji()}</p>
          <h1 className="lm-greeting-name">{displayName} ✦</h1>
          <p className="lm-greeting-sub">Let's make this session legendary.</p>
        </div>

        <button className="lm-cta" onClick={startSession}>
          <div className="lm-cta-glow" />
          <div className="lm-cta-icon">
            <img src="/icons/focus-lily-logo.png" alt="" width={28} height={28} />
          </div>
          <div className="lm-cta-text">
            <strong>START FOCUS SESSION</strong>
            <span>Begin your journey</span>
          </div>
          <div className="lm-cta-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
      </div>

      {/* Quick stats ring */}
      <div className="lm-stats-row">
        <div className="lm-stat-ring">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#xpGrad)" strokeWidth="6"
              strokeDasharray={`${(xpPct / 100) * 213.6} 213.6`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)" />
            <defs><linearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#caa84a"/><stop offset="100%" stopColor="#ffce54"/></linearGradient></defs>
          </svg>
          <div className="lm-stat-ring-inner">
            <span className="lm-stat-ring-num">{xpPct}%</span>
            <span className="lm-stat-ring-label">XP</span>
          </div>
        </div>
        <div className="lm-stat-ring">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#streakGrad)" strokeWidth="6"
              strokeDasharray={`${(7 / 30) * 213.6} 213.6`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)" />
            <defs><linearGradient id="streakGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff6a1a"/><stop offset="100%" stopColor="#ffce54"/></linearGradient></defs>
          </svg>
          <div className="lm-stat-ring-inner">
            <span className="lm-stat-ring-num">7</span>
            <span className="lm-stat-ring-label">Streak</span>
          </div>
        </div>
        <div className="lm-stat-ring">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#focusGrad)" strokeWidth="6"
              strokeDasharray={`${(75 / 180) * 213.6} 213.6`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)" />
            <defs><linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6bbf4f"/><stop offset="100%" stopColor="#4a9e36"/></linearGradient></defs>
          </svg>
          <div className="lm-stat-ring-inner">
            <span className="lm-stat-ring-num">75</span>
            <span className="lm-stat-ring-label">min</span>
          </div>
        </div>
      </div>

      {/* Daily Quests */}
      <div className="lm-quests">
        <button className="lm-quests-toggle" onClick={() => setShowQuests(!showQuests)}>
          <span className="lm-quests-icon">🏆</span>
          <span className="lm-quests-title">Daily Quests</span>
          <span className="lm-quests-badge">3 active</span>
          <svg className={`lm-quests-chevron ${showQuests ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        {showQuests && (
          <div className="lm-quests-list">
            {DAILY_QUESTS.map((q) => (
              <div key={q.id} className="lm-quest">
                <span className="lm-quest-icon">{q.icon}</span>
                <div className="lm-quest-body">
                  <div className="lm-quest-top">
                    <span className="lm-quest-label">{q.label}</span>
                    <span className="lm-quest-reward">+{q.reward} 🌸</span>
                  </div>
                  <div className="lm-quest-bar">
                    <div className="lm-quest-fill" style={{ width: `${Math.min(100, (q.progress / q.total) * 100)}%` }} />
                  </div>
                  <span className="lm-quest-progress">{q.progress} / {q.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Worlds */}
      <div className="lm-worlds">
        <div className="lm-worlds-header">
          <span className="lm-worlds-line" />
          <span className="lm-worlds-title">YOUR WORLDS</span>
          <span className="lm-worlds-line" />
        </div>
        <div className="lm-worlds-grid">
          {MOBILE_WORLDS.map((o) => (
            <button key={o.key} className="lm-world-card" onClick={() => pickMobile(o)} style={{ '--card-accent': o.accent } as React.CSSProperties}>
              <div className="lm-world-card-glow" />
              <div className="lm-world-card-icon">
                <PngIcon name={o.png} size={40} alt={t(o.labelKey)} />
              </div>
              <div className="lm-world-card-info">
                <strong>{t(o.labelKey)}</strong>
                <span>{t(o.captionKey)}</span>
              </div>
              <div className="lm-world-card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="lm-bottomnav">
        <div className="lm-bottomnav-bg" />
        {([
          { id: 'home' as const, label: 'Home', path: '/', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10' },
          { id: 'realm' as const, label: 'Realm', path: '/realm', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
          { id: 'tasks' as const, label: 'Tasks', path: '/magnet', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
          { id: 'games' as const, label: 'Games', path: '/games', icon: 'M6 12h4M8 10v4M15 13h.01M18 11h.01M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0017.32 5z' },
          { id: 'profile' as const, label: 'Profile', path: '/profile', icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 3a4 4 0 100 8 4 4 0 000-8z' },
        ]).map((item) => (
          <button
            key={item.id}
            className={`lm-nav-item ${mobileNav === item.id ? 'active' : ''}`}
            onClick={() => { setMobileNav(item.id); if (item.id !== 'home') navigate(item.path) }}
          >
            {mobileNav === item.id && <div className="lm-nav-indicator" />}
            <svg className="lm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            <span className="lm-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Panels */}
      <Modal open={panel === 'interact'} title={t('lobby.interact')} onClose={() => setPanel(null)}>
        <div className="menu-list">
          <button className="menu-item" onClick={() => setPanel('friends')}>
            <span className="menu-item-icon"><Glyph name="people" /></span>
            <span><strong>{t('friendsPanel.tabFriends')}</strong><small>{t('lobby.friendsSub')}</small></span>
            {incomingCount > 0 && <span className="menu-badge">{incomingCount}</span>}
          </button>
          <button className="menu-item" onClick={() => navigate('/profile')}>
            <span className="menu-item-icon"><Glyph name="face" /></span>
            <span><strong>{t('lobby.yourProfile')}</strong><small>{t('lobby.profileSub')}</small></span>
          </button>
          <button className="menu-item" onClick={() => { setPanel(null); navigate('/info') }}>
            <span className="menu-item-icon"><Glyph name="star" /></span>
            <span><strong>{t('lobby.menuInfo')}</strong><small>{t('lobby.menuInfoSub')}</small></span>
          </button>
          <button className="menu-item" onClick={() => { signOut(); navigate('/') }}>
            <span className="menu-item-icon"><Glyph name="gear" /></span>
            <span><strong>Exit</strong><small>Sign out of FocusLily</small></span>
          </button>
        </div>
      </Modal>
      {panel === 'friends' && <FriendsPanel onClose={() => setPanel(null)} />}
      {panel === 'settings' && <LobbySettings onClose={() => setPanel(null)} />}
    </div>
  )
}

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
    palette: 'M12 3a9 9 0 100 18 2.5 2.5 0 002.5-2.5 2 2 0 01.5-1.4 2 2 0 011.5-.6H18a3 3 0 003-3A9 9 0 0012 3z M7.5 11.5h.01 M10 7.5h.01 M14.5 7.5h.01',
  }
  return (
    <svg className="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] ?? paths.star} />
    </svg>
  )
}
