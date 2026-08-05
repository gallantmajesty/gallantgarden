import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useMagnet } from '../store/magnet'
import { Modal } from '../components/Modal'
import { PngIcon, type PngIconName } from '../components/PngIcon'
import { RankBadge } from '../components/RankBadge'
import { LobbySettings } from '../components/settings/LobbySettings'
import { ResourceBar } from '../components/ResourceBar'
import { ScorePanel } from '../components/ScorePanel'
import { LoginPanel } from '../components/LoginPanel'
import { RANKS, getRank, rankProgress, rankForLifetime } from '../lib/ranks'
import { getDailyEngagement } from '../lib/xpEngine'
import { FriendsPanel } from '../components/FriendsPanel'
import { useFriends } from '../store/friends'
import { useChat } from '../store/chat'
import { useIsDesktop } from '../components/DesktopOnly'
import { PendingDot } from '../components/pending/PendingDot'
import { LuckyWheelModal } from '../components/focus/LuckyWheelModal'
import { NewsModal } from '../components/focus/NewsModal'
import { RankUpCelebration } from '../components/RankUpCelebration'
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
  { key: 'blueprint', labelKey: 'lobby.objBlueprint', captionKey: 'lobby.objBlueprintCaption', png: 'notes', route: '/blueprint', soon: true },
  { key: 'realm', labelKey: 'lobby.objRealm', captionKey: 'lobby.objRealmCaption', png: 'realm', route: '/lobby/realm/choose' },
  { key: 'magnet', labelKey: 'lobby.objMagnet', captionKey: 'lobby.objMagnetCaption', png: 'tasks', route: '/magnet', soon: true },
  { key: 'games', labelKey: 'lobby.objGames', captionKey: 'lobby.objGamesCaption', png: 'games', route: '/games', soon: true },
]

const MOBILE_WORLDS: LobbyObject[] = [
  { key: 'realm', labelKey: 'lobby.objRealm', captionKey: 'lobby.objRealmCaption', png: 'realm', route: '/lobby/realm/choose', accent: '#6bbf4f' },
  { key: 'blueprint', labelKey: 'lobby.objBlueprint', captionKey: 'lobby.objBlueprintCaption', png: 'notes', route: '/blueprint', accent: '#caa84a', soon: true },
  { key: 'magnet', labelKey: 'lobby.objMagnet', captionKey: 'lobby.objMagnetCaption', png: 'tasks', route: '/magnet', accent: '#e88aaa', soon: true },
  { key: 'games', labelKey: 'lobby.objGames', captionKey: 'lobby.objGamesCaption', png: 'games', route: '/games', accent: '#8a6cff', soon: true },
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
  const [panel, setPanel] = useState<null | 'settings' | 'friends' | 'inbox' | 'score' | 'login'>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [showWheel, setShowWheel] = useState(false)
  const [showNews, setShowNews] = useState(false)
  const userXp = useProfile((s) => s.xp)
  const userPremiumXp = useProfile((s) => s.premiumXp)
  const userRankXp = useProfile((s) => s.rankXp)
  const rank = useProfile((s) => rankForLifetime(s.rankXp, s.xp, s.premiumXp).id)
  const incomingCount = useFriends((s) => s.incoming.length)
  const unreadCount = useChat((s) => s.summaries.filter((s) => s.unread).length)
  const isDesktop = useIsDesktop()
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
  const nameWarning = useProfile((s) => s.nameWarning)
  const displayName =
    profileName && profileName !== 'Explorer'
      ? profileName
      : user?.profile?.name || user?.email?.split('@')[0] || 'Explorer'

  const rankObj = getRank(rank)
  const rankAccent = rankObj.accent
  const rankIdx = RANKS.indexOf(rankObj)
  const rankTier = Math.max(1, Math.floor(rankIdx / 3) + 1) // 1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond, 6=Crystal, 7=Focuster
  const totalXp = userXp + userPremiumXp
  const rankXp = userRankXp || totalXp
  const { pct: xpPctRaw, nextRank } = rankProgress(rankXp)
  const xpPct = Math.round(xpPctRaw * 100)

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      rankTimersRef.current.forEach(clearTimeout)
    }
  }, [])

useEffect(() => {
  const lastShown = localStorage.getItem('sf.loginPanel.lastShown')
  const now = Date.now()
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
  const cooldownOk = !lastShown || (now - Number(lastShown)) > TWENTY_FOUR_HOURS
  const engagement = getDailyEngagement()
  if (user && cooldownOk && (engagement.penaltyApplied || engagement.activeMinToday < engagement.penaltyThresholdMin)) {
    setShowLoginPanel(true)
    localStorage.setItem('sf.loginPanel.lastShown', String(now))
  }
}, [user])

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
    if (!user) {
      console.warn('[Lobby] No user, redirecting to login')
      navigate('/')
      return
    }
    navigate('/lobby/explore?world=library')
  }, [navigate, user])

  /* ═══════════════════════════════════════════════════════════════
     DESKTOP LAYOUT — PIXEL-PERFECT, DO NOT TOUCH
     ═══════════════════════════════════════════════════════════════ */
  if (isDesktop) {
    return (
      <div className="lobby-root">
        {user?.isGuest && (
          <div className="lobby-guest-banner">
            <span>You're browsing as a guest — your progress saves on this device only.</span>
            <button className="sf-btn water" onClick={() => navigate('/guest')}>Guest Info</button>
          </div>
        )}
        <div className="lobby-topleft">
          <button
            className={`lobby-xp ${rankTransition?.active ? 'lobby-xp--transitioning' : ''}`}
            onClick={pickProfile}
            title={`${displayName} · ${rankObj.name}`}
            style={{ ['--xp' as string]: rankAccent, ['--pct' as string]: xpPct, ['--xpi' as string]: rankTier }}
          >
            <PendingDot />
            <span className="lobby-xp__medal">
              <RankBadge rankId={rank} size={36} />
            </span>
            <span className="lobby-xp__name">{displayName}</span>
          </button>

        </div>
        <div className="lobby-bottomleft">
          <button className="lobby-exit sf-btn water" onClick={() => { signOut(); navigate('/') }}>Exit</button>
        </div>
        <div className="lobby-topright">
          <button className="lobby-round lobby-round--score" title="Score" onClick={() => setPanel('score')}>
            <PendingDot size={9} />
            <PngIcon name="streaks" size={40} />
          </button>
          <button className="lobby-round" title="Avatar" onClick={() => navigate('/avatar')}>
            <PendingDot size={9} />
            <PngIcon name="profile" size={32} />
          </button>
           <button className="lobby-round" title={t('common.settings')} onClick={() => setPanel('settings')}>
             <PngIcon name="settings" size={32} />
           </button>
          {/* Inbox dropdown */}
          <div className="lobby-inbox-wrap">
            <button className="lobby-inbox-btn" onClick={() => setPanel(p => p === 'inbox' ? null : 'inbox')}>
              <Glyph name="mail" />
              {(incomingCount > 0 || unreadCount > 0) && <span className="lobby-inbox-badge" />}
            </button>
            {panel === 'inbox' && (
              <div className="lobby-inbox-dropdown">
                <div className="lobby-inbox-header">
                  <span>Inbox</span>
                  <button className="lobby-inbox-close" onClick={() => setPanel(null)}>✕</button>
                </div>
                <div className="lobby-inbox-list">
                  <button className="lobby-inbox-item" onClick={() => setPanel(null)}>
                    <Glyph name="info" className="lobby-inbox-icon" />
                    <span>About</span>
                  </button>
                  <button className="lobby-inbox-item" onClick={() => { setPanel(null); setPanel('friends'); }}>
                    <Glyph name="users" className="lobby-inbox-icon" />
                    <span>Friend Requests</span>
                    {incomingCount > 0 && <span className="lobby-inbox-count">{incomingCount}</span>}
                  </button>
                  <button className="lobby-inbox-item" onClick={() => setPanel(null)}>
                    <Glyph name="life-buoy" className="lobby-inbox-icon" />
                    <span>Team Support</span>
                  </button>
                  <button className="lobby-inbox-item" onClick={() => setPanel(null)}>
                    <Glyph name="newspaper" className="lobby-inbox-icon" />
                    <span>News</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={`lobby-stage ${transition?.active ? 'lobby-stage--transitioning' : ''}`}>
          <div className="lobby-welcome">
            <span className="sf-pill">{t('common.lobby')}</span>
            <h1>Welcome back, <span className="lobby-welcome__name">{displayName}</span></h1>
            <p>{t('lobby.pickWhere')}</p>
          </div>

          {/* Inbox bar */}
          {nameWarning && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(230, 50, 50, 0.15), rgba(200, 40, 40, 0.1))',
              border: '1px solid rgba(230, 80, 80, 0.4)',
              borderRadius: 12,
              padding: '12px 18px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }} onClick={() => setPanel('profile')}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#ff6b6b' }}>Your name needs updating</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  Names must use only letters, numbers and _. Free rename available now.
                </div>
              </div>
            </div>
          )}
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
                    <PngIcon name={o.png} size={80} alt={t(o.labelKey)} />
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

        {panel === 'friends' && <FriendsPanel onClose={() => setPanel(null)} />}
        {panel === 'settings' && <LobbySettings onClose={() => setPanel(null)} />}
        {panel === 'score' && <ScorePanel onClose={() => setPanel(null)} />}
        {panel === 'login' && <LoginPanel onClose={() => setPanel(null)} />}
        {showLoginPanel && <LoginPanel onClose={() => setShowLoginPanel(false)} />}
        <ResourceBar />
        <RankUpCelebration />
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
            <button className="sf-btn water" onClick={() => navigate('/guest')}>Guest Info</button>
          </div>
        )}

      {/* Header */}
      <div className="lm-header">
        <div className="lm-logo">
          <img src="/icons/focus-lily-logo.png" alt="FocusLily" width={28} height={28} />
          <span className="lm-logo-text">FocusLily</span>
        </div>
        <div className="lm-header-actions">
          <button className="lm-score-btn" onClick={() => setShowWheel(true)} title="Lucky Wheel">
            🎡
          </button>
          <button className="lm-inbox-btn" onClick={() => setPanel(p => p === 'inbox' ? null : 'inbox')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
            {(incomingCount > 0 || unreadCount > 0) && <span className="lm-inbox-badge" />}
          </button>
          <button className="lm-bell" onClick={() => setPanel('friends')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            {incomingCount > 0 && <span className="lm-bell-dot" />}
          </button>
          <button className="lm-score-btn" onClick={() => setPanel('score')} title="Focus Score">
            <PendingDot size={8} />
            <PngIcon name="streaks" size={26} />
          </button>
        </div>
        {panel === 'inbox' && (
          <div className="lm-inbox-dropdown">
            <div className="lm-inbox-header">
              <span>Inbox</span>
              <button className="lm-inbox-close" onClick={() => setPanel(null)}>✕</button>
            </div>
            <div className="lm-inbox-list">
              <button className="lm-inbox-item" onClick={() => setPanel(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lm-inbox-icon"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span>About</span>
              </button>
              <button className="lm-inbox-item" onClick={() => { setPanel(null); setPanel('friends'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lm-inbox-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Friend Requests</span>
                {incomingCount > 0 && <span className="lm-inbox-count">{incomingCount}</span>}
              </button>
              <button className="lm-inbox-item" onClick={() => setPanel(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lm-inbox-icon"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span>Team Support</span>
              </button>
              <button className="lm-inbox-item" onClick={() => { setPanel(null); setShowNews(true); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lm-inbox-icon"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z"/><path d="M8 14h8"/><path d="M8 18h8"/><path d="M8 10h3"/></svg>
                <span>News</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User card */}
      <div className="lm-user-card">
        <button className="lm-user-left" onClick={() => navigate('/profile')}>
          <PendingDot />
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

      {/* Inbox bar — mobile */}
      {(incomingCount > 0 || unreadCount > 0) && (
        <div className="lm-inbox" onClick={() => setPanel('friends')}>
          <span className="lm-inbox-icon">📬</span>
          <span className="lm-inbox-text">
            {incomingCount > 0 && <span>{incomingCount} friend request{incomingCount > 1 ? 's' : ''}</span>}
            {incomingCount > 0 && unreadCount > 0 && <span> · </span>}
            {unreadCount > 0 && <span>{unreadCount} unread message{unreadCount > 1 ? 's' : ''}</span>}
          </span>
          <span className="lm-inbox-arrow">›</span>
        </div>
      )}

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
                <PngIcon name={o.png} size={56} alt={t(o.labelKey)} />
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
          { id: 'realm' as const, label: 'Realm', path: '/lobby/realm/choose', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
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
            {item.id === 'profile' && <PendingDot size={7} />}
            <svg className="lm-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            <span className="lm-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Panels */}
      {panel === 'friends' && <FriendsPanel onClose={() => setPanel(null)} />}
      {panel === 'settings' && <LobbySettings onClose={() => setPanel(null)} />}
      {panel === 'score' && <ScorePanel onClose={() => setPanel(null)} />}
      {panel === 'login' && <LoginPanel onClose={() => setPanel(null)} />}
      <LuckyWheelModal open={showWheel} onClose={() => setShowWheel(false)} />
      <NewsModal open={showNews} onClose={() => setShowNews(false)} />
      <RankUpCelebration />
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
    trophy: 'M6 9V2h12v7a6 6 0 11-12 0z M6 4H2v3a3 3 0 003 3h1 M18 4h4v3a3 3 0 01-3 3h-1 M9 21h6 M12 15v6',
    chart: 'M4 20h16 M4 20V10 M10 20V4 M16 20v-8 M22 20H2',
    wand: 'M3 21l8-8 M11 13l-1.5-1.5 M17.5 7.5l-1-1a1 1 0 00-1.4 0l-7 7a1 1 0 000 1.4l1 1a1 1 0 001.4 0l7-7a1 1 0 000-1.4z M20 3l1 1',
    stickman: 'M12 2a3 3 0 100 6 3 3 0 000-6z M8 22v-6a4 4 0 018 0v6 M12 12v4',
  }
  return (
    <svg className="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] ?? paths.star} />
    </svg>
  )
}
