import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import './i18n'
import { useProfile } from './store/profile'
import { applyVisualSettings, useSettings } from './store/settings'
import { useWebTheme } from './store/webTheme'
import { applyWebTheme } from './lib/webThemes'
import { syncOverridesFromDb } from './lib/ownerOverrides'
import { syncWheelFromDb } from './lib/luckyWheel'
import { syncUpdatesFromDb, syncNewsFromDb } from './lib/announcements'
import { WebBackground } from './components/WebBackground'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IntroVeil } from './components/IntroVeil'
import { MobileControlCenter } from './components/mobile/MobileControlCenter'
import { MobileBlocker } from './components/MobileBlocker'
import { SocialHub } from './features/social/SocialHub'
import { useIsMobileOrTablet } from './hooks/useDevice'
import GlobalClickSpark from './components/GlobalClickSpark'
import './screens/Explore.css'
import { AuthScreen } from './screens/AuthScreen'
import { GuestMode } from './screens/GuestMode'
import { ShotHarness } from './screens/ShotHarness'
import { Onboarding } from './screens/Onboarding'
import { Landing } from './screens/public/Landing'
const ComingSoon = lazy(() => import('./screens/ComingSoon').then(m => ({ default: m.ComingSoon })))
const NotFound = lazy(() => import('./screens/NotFound').then(m => ({ default: m.NotFound })))
import { useLobbyReady } from './hooks/useLobbyReady'
const Lobby = lazy(() => import('./screens/Lobby').then(m => ({ default: m.Lobby })))
const NotesHub = lazy(() => import('./screens/NotesHub').then(m => ({ default: m.NotesHub })))
const NotesEditor = lazy(() => import('./screens/NotesEditor').then(m => ({ default: m.NotesEditor })))
const Explore = lazy(() => import('./screens/Explore').then(m => ({ default: m.Explore })))
const StudyRoom = lazy(() => import('./screens/StudyRoom').then(m => ({ default: m.StudyRoom })))
const About = lazy(() => import('./screens/About').then(m => ({ default: m.About })))
const Realm = lazy(() => import('./screens/Realm').then(m => ({ default: m.Realm })))
const TaskMagnet = lazy(() => import('./screens/TaskMagnet').then(m => ({ default: m.TaskMagnet })))
const RealmInvite = lazy(() => import('./screens/RealmInvite').then(m => ({ default: m.RealmInvite })))
const Profile = lazy(() => import('./screens/Profile').then(m => ({ default: m.Profile })))
const AvatarCreator = lazy(() => import('./screens/AvatarCreator').then(m => ({ default: m.AvatarCreator })))
const CharacterSelection = lazy(() => import('./screens/CharacterSelection').then(m => ({ default: m.CharacterSelection })))
const OwnerPanel = lazy(() => import('./components/owner/OwnerPage').then(m => ({ default: m.OwnerPage })))
const EventShop = lazy(() => import('./components/focus/EventShop').then(m => ({ default: m.EventShop })))
const InventoryPanel = lazy(() => import('./components/focus/InventoryPanel').then(m => ({ default: m.InventoryPanel })))
const Store = lazy(() => import('./screens/Store').then(m => ({ default: m.Store })))
const Shop = lazy(() => import('./screens/Shop').then(m => ({ default: m.Shop })))
const Legal = lazy(() => import('./screens/Legal').then(m => ({ default: m.Legal })))
const Blueprint = lazy(() => import('./screens/Blueprint').then(m => ({ default: m.Blueprint })))
import { IndividualComingSoon } from './screens/IndividualComingSoon'

export default function App() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const onboarded = useProfile((s) => s.onboarded)
  const profileReady = useProfile((s) => s.ready)
  const location = useLocation()
  const isMobile = useIsMobileOrTablet()

  // Lobby readiness — preload icons so the intro veil can stay until they're loaded
  const waitForLobby = useSettings((s) => s.waitForLobbyReady)
  const lobbyReady = useLobbyReady()

  // Apply visual + theme settings app-wide and keep them in sync. Both stores
  // feed the same CSS custom properties, so we re-apply in a fixed order on any
  // change: visual settings first (theme/brightness/motion), then the web theme
  // — the web theme is authoritative for the lobby's accent/glass/ink palette,
  // so it must win. Runs even on the auth screen so branding stays consistent.
  useEffect(() => {
    const apply = () => {
      applyVisualSettings(useSettings.getState())
      const w = useWebTheme.getState()
      applyWebTheme(w.themeId, w.accent, w.fontColor, w.bgId)
    }
    apply()
    // Sync owner overrides from DB on startup (non-blocking)
    syncOverridesFromDb().catch(() => {})
    syncWheelFromDb().catch(() => {})
    syncUpdatesFromDb().catch(() => {})
    syncNewsFromDb().catch(() => {})
    const offSettings = useSettings.subscribe(apply)
    const offWeb = useWebTheme.subscribe(apply)
    return () => {
      offSettings()
      offWeb()
    }
  }, [])

  const PUBLIC_PATHS = new Set(['/', '/about', '/guest', '/login', '/login/github', '/login/perinfo', '/__shot'])
  const isPublic = PUBLIC_PATHS.has(location.pathname)

  // Public marketing pages render without WebBackground/IntroVeil
  // Show landing immediately — don't wait for auth to resolve.
  // But if auth is still loading, hold off — a logged-in user should land
  // straight in the Lobby without a flash of the Landing page.
  if (isPublic && !user && !loading) {
    return (
      <ErrorBoundary resetKeys={[location.pathname]}>
        <Suspense fallback={null}>
           <Routes>
            <Route path="/__shot" element={<ShotHarness />} />
            <Route path="/guest" element={<GuestMode />} />
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route path="/login" element={<AuthScreen />} />
            <Route path="/login/github" element={<AuthScreen />} />
            <Route path="/login/perinfo" element={<Onboarding />} />
            <Route path="/terms" element={<Legal />} />
            <Route path="/privacy" element={<Legal />} />
            <Route path="/refund" element={<Legal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <GlobalClickSpark />
      </ErrorBoundary>
    )
  }

  // The background is mounted once, above the auth/loading/router branch, so it
  // persists across every navigation and never remounts (zero flash).
  // Blueprint route is accessible on mobile — no MobileBlocker wrapper for it.
  const appReady = !loading && (!user || profileReady)
  const veilReady = appReady && (!waitForLobby || lobbyReady)
  const isOwnerRoute = location.pathname === '/owner'

  // Mobile gating — only the heavy desktop-only areas stay blocked on phones &
  // tablets. Realms are now reachable on mobile (with a landscape/rotate prompt
  // and touch controls). Still excluded: TaskMagnet, Blueprint and Games.
  // `isMobile` is computed above at the top of the component (rules of hooks).
  const MOBILE_BLOCKED = /^\/magnet(\/|$)|^\/blueprint(\/|$)|^\/games(\/|$)/
  const isMobileBlockedRoute = isMobile && MOBILE_BLOCKED.test(location.pathname)

// Owner route renders completely standalone — no WebBackground, no IntroVeil, no lobby chrome
if (isOwnerRoute && !loading) {
  return (
    <ErrorBoundary resetKeys={[location.pathname]}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/owner" element={<OwnerPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

const appContent = (
  <>
    {user && !isMobile && <WebBackground />}
    {user && !isMobile && <IntroVeil ready={veilReady} />}
    {loading ? null : !user ? (
      isPublic ? (
        <AuthScreen />
      ) : (
        <ErrorBoundary resetKeys={[location.pathname]}>
          <Suspense fallback={null}>
            <Routes>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      )
    ) : !profileReady ? null : !onboarded ? (
      <Onboarding />
    ) : (
      <ErrorBoundary resetKeys={[location.pathname]}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/lobby" replace />} />
            <Route path="/login" element={<Navigate to="/lobby" replace />} />
            <Route path="/login/github" element={<Navigate to="/lobby" replace />} />
            <Route path="/login/perinfo" element={<Navigate to="/lobby" replace />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/lobby/realm" element={<Realm />} />
            <Route path="/lobby/realm/choose" element={<Realm />} />
            <Route path="/lobby/realm/private" element={<Realm />} />
            <Route path="/lobby/realm/library" element={<Realm />} />
            <Route path="/lobby/realm/train" element={<IndividualComingSoon featureId="train" />} />
            <Route path="/lobby/realm/uk-cafe" element={<IndividualComingSoon featureId="uk-cafe" />} />
            <Route path="/lobby/realm/chinese-cafe" element={<Realm />} />
            <Route path="/lobby/realm/public" element={<Realm />} />
            <Route path="/lobby/realm/custom" element={<Realm />} />
            <Route path="/lobby/realm/custom/:code" element={<Realm />} />
            <Route path="/lobby/explore" element={<Explore />} />
            <Route path="/blueprint/*" element={<Blueprint />} />
            <Route path="/notes" element={<NotesHub />} />
            <Route path="/notes/doc" element={<NotesEditor />} />
            <Route path="/realm/:code" element={<RealmInvite />} />
            <Route path="/info" element={<About />} />
            <Route path="/room" element={<Navigate to="/lobby" replace />} />
            <Route path="/rooms" element={<Navigate to="/lobby" replace />} />
            <Route path="/room/:id" element={<StudyRoom />} />
            <Route path="/magnet" element={<TaskMagnet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/u/:playerId" element={<Profile />} />
            <Route path="/avatar" element={<AvatarCreator />} />
            <Route path="/character-select" element={<CharacterSelection />} />
            <Route path="/games" element={<IndividualComingSoon featureId="games" />} />
            <Route path="/games/lava-pad" element={<IndividualComingSoon featureId="games" />} />
            <Route path="/event-shop" element={<EventShop />} />
            <Route path="/inventory" element={<InventoryPanel />} />
            <Route path="/store" element={<Store />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/terms" element={<Legal />} />
            <Route path="/privacy" element={<Legal />} />
            <Route path="/refund" element={<Legal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    )}
    {user && <MobileControlCenter />}
    {/* Chat hub mounted globally on mobile so the "Messages" entry in the
        mobile shell's More sheet can open it from any interior screen.
        On desktop the launcher lives inside Lobby, so we skip it here. */}
    {isMobile && user && <SocialHub />}
    <GlobalClickSpark />
  </>
)

// On mobile, only the excluded heavy areas stay behind the "Desktop Only"
// blocker. Everything else renders its own touch-friendly layout (no MobileBlocker).
if (isMobileBlockedRoute) {
  return <MobileBlocker />
}

return appContent
}