import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useMagnet } from '../store/magnet'
import { usePomodoro } from '../store/pomodoro'
import { Modal } from '../components/Modal'
import { PngIcon, type PngIconName } from '../components/PngIcon'
import { RankBadge } from '../components/RankBadge'
import { LobbySettings } from '../components/settings/LobbySettings'
import { ResourceBar } from '../components/ResourceBar'
import { ScorePanel } from '../components/ScorePanel'
import { LoginPanel } from '../components/LoginPanel'
import { RANKS, getRank, rankProgress, rankForLifetime } from '../lib/ranks'
import { computeStreak } from '../lib/magnet/insights'
import { FriendsPanel } from '../components/FriendsPanel'
import { SocialHub } from '../features/social/SocialHub'
import { MusicWidget } from '../components/MusicWidget'
import { useFriends } from '../store/friends'
import { useChat } from '../store/chat'
import { useIsDesktop } from '../components/DesktopOnly'
import { MobileShell } from '../components/mobile/MobileShell'
import { PendingDot } from '../components/pending/PendingDot'
import { LuckyWheelModal } from '../components/focus/LuckyWheelModal'
import { NewsModal } from '../components/focus/NewsModal'
import { ComingSoonModal } from '../components/ComingSoonModal'
import { featureData, type FeatureData } from './IndividualComingSoon'
import { GREEN_LEAF_ICON, GOLD_LEAF_ICON } from '../lib/leafIcons'
import { RankUpCelebration } from '../components/RankUpCelebration'
import { MascotTour } from '../components/MascotTour'
import { readTour, setTourStep as saveTourStep, completeTour as finishTour, isTourLive, type TourState } from '../lib/tour'
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
  { key: 'realm', labelKey: 'lobby.objRealm', captionKey: 'lobby.objRealmCaption', png: 'realm', route: '/lobby/realm/choose' },
  { key: 'magnet', labelKey: 'lobby.objMagnet', captionKey: 'lobby.objMagnetCaption', png: 'tasks', route: '/magnet' },
  { key: 'blueprint', labelKey: 'lobby.objBlueprint', captionKey: 'lobby.objBlueprintCaption', png: 'notes', route: '/blueprint', soon: true },
  { key: 'games', labelKey: 'lobby.objGames', captionKey: 'lobby.objGamesCaption', png: 'games', route: '/games', soon: true },
]

const MOBILE_WORLDS: LobbyObject[] = [
  { key: 'realm', labelKey: 'lobby.objRealm', captionKey: 'lobby.objRealmCaption', png: 'realm', route: '/lobby/realm/choose', accent: '#6bbf4f' },
  { key: 'magnet', labelKey: 'lobby.objMagnet', captionKey: 'lobby.objMagnetCaption', png: 'tasks', route: '/magnet', accent: '#e88aaa' },
  { key: 'games', labelKey: 'lobby.objGames', captionKey: 'lobby.objGamesCaption', png: 'games', route: '/games', accent: '#8a6cff', soon: true },
]

const DAILY_QUESTS = [
  { id: 1, label: 'Complete 3 Focus Sessions', total: 3, reward: 50, icon: '🎯' },
  { id: 2, label: 'Study for 120 minutes', total: 120, reward: 80, icon: '⏱' },
  { id: 3, label: 'Complete all today\'s tasks', total: 4, reward: 60, icon: '✅' },
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
  const [showWheel, setShowWheel] = useState(false)
  const [showNews, setShowNews] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const userXp = useProfile((s) => s.xp)
  const userPremiumXp = useProfile((s) => s.premiumXp)
  const userRankXp = useProfile((s) => s.rankXp)
  const rank = useProfile((s) => rankForLifetime(s.rankXp, s.xp, s.premiumXp).id)
  const incomingCount = useFriends((s) => s.incoming.length)
  const unreadCount = useChat((s) => s.summaries.filter((s) => s.unread).length)
  const isDesktop = useIsDesktop()
  const [mobileNav, setMobileNav] = useState<'home' | 'realm' | 'tasks' | 'games' | 'profile'>('home')
  const [guestBannerHidden, setGuestBannerHidden] = useState(false)
  const [showQuests, setShowQuests] = useState(false)
  const [soonFeature, setSoonFeature] = useState<FeatureData | null>(null)
  // Hidden preview unlock: tap the "Coming Soon" Blueprint tile 10× on desktop
  // to reveal it for THIS session only (cleared when you fully quit the web).
  const [blueprintUnlocked, setBlueprintUnlocked] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem('fl_blueprint_unlocked') === '1',
  )
  const [blueprintClicks, setBlueprintClicks] = useState(0)
  // Max's guided tour for new players — starts on the lobby, walks into the Realm.
  // Keyed per-account (see lib/tour.ts), so every new user gets guided once.
  const [tourStep, setTourStepState] = useState<TourState | null>(() => readTour(user?.id))

  // Real stat sources: streak from magnet activity, focus from pomodoro history.
  const magnetData = useMagnet((s) => s.data)
  const pomoHistory = usePomodoro((s) => s.history)
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const streak = useMemo(() => computeStreak(magnetData, new Date()), [magnetData])
  const todaySessions = useMemo(
    () => pomoHistory.filter((h) => h.completed && h.date.slice(0, 10) === todayKey),
    [pomoHistory, todayKey],
  )
  const todayMin = useMemo(
    () => todaySessions.reduce((sum, h) => sum + h.totalFocusMinutes, 0),
    [todaySessions],
  )
  const todayTasks = useMemo(
    () => magnetData.tasks.filter((t) => t.due === todayKey),
    [magnetData, todayKey],
  )
  const todayTasksDone = todayTasks.filter((t) => t.done).length
  const quests = useMemo(
    () =>
      DAILY_QUESTS.map((q) => ({
        ...q,
        progress: q.id === 1 ? todaySessions.length : q.id === 2 ? todayMin : todayTasksDone,
        total: q.id === 3 ? Math.max(1, todayTasks.length) : q.total,
      })),
    [todaySessions, todayMin, todayTasksDone, todayTasks.length],
  )

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



  // Guest banner: visible for 3s, then fades out (never comes back until reload).
  useEffect(() => {
    if (!user?.isGuest || guestBannerHidden) return
    const t = setTimeout(() => setGuestBannerHidden(true), 3000)
    timersRef.current.push(t)
    return () => clearTimeout(t)
  }, [user?.isGuest, guestBannerHidden])

  // Start Max's guided tour the first time a player reaches the lobby. Syncs
  // against the account's key once the user is available (it may load after
  // the first render), and resumes mid-tour as the player navigates through
  // the guided walk in THIS tab. Any leftover mid-tour step from a PREVIOUS
  // visit is retired instead of replayed — the guide is a first-time-only
  // helper, and once a user has walked (or skipped) it, it must never show
  // again on every visit.
  useEffect(() => {
    if (!user) return
    const current = readTour(user.id)
    if (current === null) {
      saveTourStep('lobby-realm', user.id)
      setTourStepState('lobby-realm')
    } else if (current !== 'done' && !isTourLive(user.id)) {
      // Stale mid-tour state left behind by an earlier tab/session — retire
      // it for good so the mascot never reappears on later visits.
      finishTour(user.id)
      setTourStepState('done')
    } else if (current !== tourStep) {
      setTourStepState(current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const skipTour = useCallback(() => {
    finishTour(user?.id)
    setTourStepState('done')
  }, [user?.id])

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
    if (o.key === 'blueprint' && !blueprintUnlocked) {
      const n = blueprintClicks + 1
      setBlueprintClicks(n)
      if (n >= 10) {
        setBlueprintUnlocked(true)
        try { sessionStorage.setItem('fl_blueprint_unlocked', '1') } catch { /* ignore */ }
        navigate('/blueprint')
        return
      }
      const f = featureData[o.key]
      if (f) { setSoonFeature(f); setPanel(null) }
      return
    }
    if (o.soon && !(o.key === 'blueprint' && blueprintUnlocked)) {
      const f = featureData[o.key]
      if (f) { setSoonFeature(f); setPanel(null); }
      return
    }
    if (!o.route) { setPanel(null); return }
    if (transition?.active) return
    // Max's tour: clicking the Realm card walks him into the Realm screen.
    if (tourStep === 'lobby-realm' && o.key === 'realm') {
      saveTourStep('realm-pick', user?.id)
      setTourStepState('realm-pick')
    }
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
    }, 700))
    timersRef.current.push(setTimeout(() => {
      navigate(o.route!)
    }, 1200))
  }, [navigate, transition, tourStep, blueprintUnlocked, blueprintClicks])

  const pickMobile = useCallback((o: LobbyObject) => {
    if (o.soon) {
      const f = featureData[o.key]
      if (f) setSoonFeature(f)
      return
    }
    if (!o.route) return
    // Max's tour: clicking the Realm card walks him into the Realm screen.
    if (tourStep === 'lobby-realm' && o.key === 'realm') {
      saveTourStep('realm-pick', user?.id)
      setTourStepState('realm-pick')
    }
    navigate(o.route)
  }, [navigate, tourStep, user?.id])

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
          <div className={`lobby-guest-banner${guestBannerHidden ? ' lobby-guest-banner--hidden' : ''}`}>
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
            <PngIcon name="streaks" size={48} />
          </button>
          <button className="lobby-round" title="Avatar" onClick={() => navigate('/avatar')}>
            <PendingDot size={9} />
            <PngIcon name="profile" size={32} />
          </button>
          <button className="lobby-round" title="Shop" onClick={() => navigate('/shop')}>
            <PngIcon name="shop" size={40} />
          </button>
           <button className="lobby-round" title={t('common.settings')} onClick={() => setPanel('settings')}>
              <PngIcon name="settings" size={40} />
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
                  <button className="lobby-inbox-item" onClick={() => { setPanel(null); navigate('/info'); }}>
                    <Glyph name="info" className="lobby-inbox-icon" />
                    <span>About</span>
                  </button>
                  <button className="lobby-inbox-item" onClick={() => { setPanel(null); setPanel('friends'); }}>
                    <Glyph name="users" className="lobby-inbox-icon" />
                    <span>Friend Requests</span>
                    {incomingCount > 0 && <span className="lobby-inbox-count">{incomingCount}</span>}
                  </button>
                  <button className="lobby-inbox-item" onClick={() => { setPanel(null); setShowSupport(true); }}>
                    <Glyph name="life-buoy" className="lobby-inbox-icon" />
                    <span>Team Support</span>
                  </button>
                  <button className="lobby-inbox-item" onClick={() => { setPanel(null); setShowNews(true); }}>
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
            }} onClick={() => { setPanel(null); navigate('/profile'); }}>
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
              const isSoon = o.soon && !(o.key === 'blueprint' && blueprintUnlocked)
              let animClass = ''
              if (isSelected && transition.phase === 'emit') animClass = 'lobby-obj--emit'
              else if (isSelected && (transition.phase === 'center' || transition.phase === 'ultra')) animClass = 'lobby-obj--card-fade'
              else if (isLeft) animClass = 'lobby-obj--exit-left'
              else if (isRight) animClass = 'lobby-obj--exit-right'
              return (
                <button
                  key={o.key}
                  data-tour-key={o.key}
                  className={`lobby-object water-glass ${isSoon ? 'soon' : ''} ${animClass}`}
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
                  {isSoon && <div className="lobby-soon-tag">{t('common.soon')}</div>}
                </button>
              )
            })}
          </div>
        </div>
        {tourStep === 'lobby-realm' && (
          <MascotTour
            target=".lobby-object[data-tour-key='realm']"
            hint="yo, welcome to the forest! first stop — the Realm, where everyone studies together. tap it and let's go."
            side="right"
            step={1}
            total={3}
            onSkip={skipTour}
          />
        )}
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
        <LuckyWheelModal open={showWheel} onClose={() => setShowWheel(false)} />
        <NewsModal open={showNews} onClose={() => setShowNews(false)} />
        <ComingSoonModal
          open={!!soonFeature}
          title={soonFeature?.title ?? ''}
          description={soonFeature?.description ?? ''}
          image={soonFeature?.image ?? ''}
          onClose={() => setSoonFeature(null)}
        />
        <SupportModal open={showSupport} onClose={() => setShowSupport(false)} defaultEmail={user?.email} />
        <ResourceBar />
        <RankUpCelebration />
        <SocialHub />
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════
       MOBILE + TABLET — unified MobileShell layout
     ═══════════════════════════════════════════════════════════════ */
  return (
    <MobileShell title="Home">
        {user?.isGuest && (
          <div className={`lobby-guest-banner${guestBannerHidden ? ' lobby-guest-banner--hidden' : ''}`}>
            <span>You're browsing as a guest</span>
            <button className="sf-btn water" onClick={() => navigate('/guest')}>Guest Info</button>
          </div>
        )}

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
          <img src={GREEN_LEAF_ICON} className="lm-petals-icon" width={16} height={16} alt="" />
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
              strokeDasharray={`${(Math.min(streak, 30) / 30) * 213.6} 213.6`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)" />
            <defs><linearGradient id="streakGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff6a1a"/><stop offset="100%" stopColor="#ffce54"/></linearGradient></defs>
          </svg>
          <div className="lm-stat-ring-inner">
            <span className="lm-stat-ring-num">{streak}</span>
            <span className="lm-stat-ring-label">Streak</span>
          </div>
        </div>
        <div className="lm-stat-ring">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#focusGrad)" strokeWidth="6"
              strokeDasharray={`${(Math.min(todayMin, 180) / 180) * 213.6} 213.6`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)" />
            <defs><linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6bbf4f"/><stop offset="100%" stopColor="#4a9e36"/></linearGradient></defs>
          </svg>
          <div className="lm-stat-ring-inner">
            <span className="lm-stat-ring-num">{todayMin}</span>
            <span className="lm-stat-ring-label">min</span>
          </div>
        </div>
      </div>

      {/* Daily Quests */}
      <div className="lm-quests">
        <button className="lm-quests-toggle" onClick={() => setShowQuests(!showQuests)}>
          <span className="lm-quests-icon">🏆</span>
          <span className="lm-quests-title">Daily Quests</span>
          <span className="lm-quests-badge">{quests.length} active</span>
          <svg className={`lm-quests-chevron ${showQuests ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        {showQuests && (
          <div className="lm-quests-list">
            {quests.map((q) => (
              <div key={q.id} className="lm-quest">
                <span className="lm-quest-icon">{q.icon}</span>
                <div className="lm-quest-body">
                  <div className="lm-quest-top">
                    <span className="lm-quest-label">{q.label}</span>
                    <span className="lm-quest-reward">+{q.reward} <img src={GREEN_LEAF_ICON} width={14} height={14} alt="" style={{ verticalAlign: '-2px' }} /></span>
                  </div>
                  <div className="lm-quest-bar">
                    <div className="lm-quest-fill" style={{ width: `${Math.min(100, (q.progress / q.total) * 100)}%` }} />
                  </div>
                  <span className="lm-quest-progress">{Math.min(q.progress, q.total)} / {q.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panels */}
      {panel === 'friends' && <FriendsPanel onClose={() => setPanel(null)} />}
      {panel === 'settings' && <LobbySettings onClose={() => setPanel(null)} />}
      {panel === 'score' && <ScorePanel onClose={() => setPanel(null)} />}
      {panel === 'login' && <LoginPanel onClose={() => setPanel(null)} />}
      <LuckyWheelModal open={showWheel} onClose={() => setShowWheel(false)} />
      <NewsModal open={showNews} onClose={() => setShowNews(false)} />
      <SupportModal open={showSupport} onClose={() => setShowSupport(false)} defaultEmail={user?.email} />
      <ComingSoonModal
        open={!!soonFeature}
        title={soonFeature?.title ?? ''}
        description={soonFeature?.description ?? ''}
        image={soonFeature?.image ?? ''}
        onClose={() => setSoonFeature(null)}
      />
      <RankUpCelebration />
    </MobileShell>
  )
}

const SUPPORT_EMAIL = 'focus@focuslily.com'
const SUPPORT_MAX = 2000 // max message chars — same budget as chat messages
const SUPPORT_COOLDOWN_MS = 60 * 60 * 1000 // one support request per hour
const SUPPORT_COOLDOWN_KEY = 'sf.support.lastSent'

const SUPPORT_TOPICS = [
  'General help',
  'Bug report',
  'Account help',
  'Payments / Golden leaves',
  'Feedback',
  'Other',
]

function SupportModal({ open, onClose, defaultEmail }: { open: boolean; onClose: () => void; defaultEmail?: string }) {
  const [topic, setTopic] = useState(SUPPORT_TOPICS[0])
  const [message, setMessage] = useState('')
  // Prefill the reply address with the signed-in account's email so support
  // can answer straight back; guests leave it blank.
  const [replyEmail, setReplyEmail] = useState(defaultEmail ?? '')
  // One support request per hour — timestamp when the cooldown ends.
  const [cooldownUntil, setCooldownUntil] = useState<number>(() => {
    const last = Number(localStorage.getItem(SUPPORT_COOLDOWN_KEY) ?? 0)
    return last ? last + SUPPORT_COOLDOWN_MS : 0
  })
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  // Re-read the cooldown every time the panel opens (the component stays
  // mounted, so the initializer alone would go stale across open/close).
  useEffect(() => {
    if (!open) return
    const last = Number(localStorage.getItem(SUPPORT_COOLDOWN_KEY) ?? 0)
    setCooldownUntil(last ? last + SUPPORT_COOLDOWN_MS : 0)
  }, [open])
  if (!open) return null

  const trimmed = message.trim()
  const ready = trimmed.length >= 10
  const inCooldown = cooldownUntil > now
  const remainMs = Math.max(0, cooldownUntil - now)
  const remainLabel = `${Math.floor(remainMs / 60000)}m ${Math.floor((remainMs % 60000) / 1000)}s`

  const markSent = () => {
    localStorage.setItem(SUPPORT_COOLDOWN_KEY, String(Date.now()))
    setCooldownUntil(Date.now() + SUPPORT_COOLDOWN_MS)
  }
  const subject = `[${topic}] Support request`
  const body = `${trimmed}\n\n—\nReply to: ${replyEmail.trim() || 'not provided'}\nPlayer: ${typeof window !== 'undefined' ? window.location.host : ''}`
  const gmailParams = new URLSearchParams({ to: SUPPORT_EMAIL, su: subject, body })
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&${gmailParams.toString()}`
  const mailtoParams = new URLSearchParams({ su: subject, body })
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?${mailtoParams.toString()}`

  return (
    <Modal open={open} title="Team Support" onClose={onClose} width={460}>
      <div className="support">
        <p className="support-lead">
          For account help, bugs or feedback — your message goes directly to the
          FocusLily inbox (<span className="support-mail">{SUPPORT_EMAIL}</span>).
        </p>

        <div className="support-field">
          <label className="support-label" htmlFor="support-topic">Topic</label>
          <select
            id="support-topic"
            className="support-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            {SUPPORT_TOPICS.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
        </div>

        <div className="support-field">
          <label className="support-label" htmlFor="support-msg">Message</label>
          <textarea
            id="support-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue or feedback"
            maxLength={SUPPORT_MAX}
            className="support-input support-input--area"
          />
          <span className="support-count">
            {trimmed.length} / {SUPPORT_MAX} characters · minimum 10
          </span>
        </div>

        <div className="support-field">
          <label className="support-label" htmlFor="support-mail">
            Your email <em>(so we can reply)</em>
          </label>
          <input
            id="support-mail"
            value={replyEmail}
            onChange={(e) => setReplyEmail(e.target.value)}
            type="email"
            placeholder="you@example.com — optional"
            maxLength={254}
            className="support-input"
          />
        </div>

        <div className="support-actions">
          <a
            href={ready && !inCooldown ? gmailUrl : undefined}
            aria-disabled={!ready || inCooldown}
            onClick={(e) => {
              if (!ready || inCooldown) { e.preventDefault(); return }
              markSent()
            }}
            target="_blank"
            rel="noopener noreferrer"
            className={`support-btn${ready && !inCooldown ? '' : ' is-disabled'}`}
          >
            {inCooldown
              ? `You can send another request in ${remainLabel}`
              : ready
                ? 'Send to FocusLily inbox'
                : `Write at least 10 characters (${trimmed.length}/10)`}
          </a>
          <a
            href={ready && !inCooldown ? mailtoUrl : undefined}
            aria-disabled={!ready || inCooldown}
            onClick={(e) => {
              if (!ready || inCooldown) { e.preventDefault(); return }
              markSent()
            }}
            className={`support-btn support-btn--ghost${ready && !inCooldown ? '' : ' is-disabled'}`}
          >
            {inCooldown ? `One request per hour — try again in ${remainLabel}` : 'Use my email app'}
          </a>
        </div>

        <div className="support-foot">
          <a
            href="https://www.instagram.com/thefocuslily"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram · @thefocuslily
          </a>
          <span className="support-note">Response time 24–48h</span>
        </div>
      </div>
    </Modal>
  )
}

function Glyph({ name, className }: { name: string; className?: string }) {
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
    <svg className={className ? `glyph ${className}` : 'glyph'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] ?? paths.star} />
    </svg>
  )
}
