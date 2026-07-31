import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import './i18n'
import { useProfile } from './store/profile'
import { applyVisualSettings, useSettings } from './store/settings'
import { useWebTheme } from './store/webTheme'
import { applyWebTheme } from './lib/webThemes'
import { WebBackground } from './components/WebBackground'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IntroVeil } from './components/IntroVeil'
import { MobileControlCenter } from './components/mobile/MobileControlCenter'
import { MobileBlocker } from './components/MobileBlocker'
import GlobalClickSpark from './components/GlobalClickSpark'
import './screens/Explore.css'
import { AuthScreen } from './screens/AuthScreen'
import { GuestMode } from './screens/GuestMode'
import { Onboarding } from './screens/Onboarding'
import { Landing } from './screens/public/Landing'
const ComingSoon = lazy(() => import('./screens/ComingSoon').then(m => ({ default: m.ComingSoon })))
const NotFound = lazy(() => import('./screens/NotFound').then(m => ({ default: m.NotFound })))
import { useLobbyReady } from './hooks/useLobbyReady'
const Lobby = lazy(() => import('./screens/Lobby').then(m => ({ default: m.Lobby })))
const Blueprint = lazy(() => import('./screens/Blueprint').then(m => ({ default: m.Blueprint })))
const NotesHub = lazy(() => import('./screens/NotesHub').then(m => ({ default: m.NotesHub })))
const NotesEditor = lazy(() => import('./screens/NotesEditor').then(m => ({ default: m.NotesEditor })))
const Explore = lazy(() => import('./screens/Explore').then(m => ({ default: m.Explore })))
const StudyRoom = lazy(() => import('./screens/StudyRoom').then(m => ({ default: m.StudyRoom })))
const About = lazy(() => import('./screens/About').then(m => ({ default: m.About })))
const Realm = lazy(() => import('./screens/Realm').then(m => ({ default: m.Realm })))
const RealmInvite = lazy(() => import('./screens/RealmInvite').then(m => ({ default: m.RealmInvite })))
const TaskMagnet = lazy(() => import('./screens/TaskMagnet').then(m => ({ default: m.TaskMagnet })))
const Profile = lazy(() => import('./screens/Profile').then(m => ({ default: m.Profile })))
const AvatarCreator = lazy(() => import('./screens/AvatarCreator').then(m => ({ default: m.AvatarCreator })))
const CharacterSelection = lazy(() => import('./screens/CharacterSelection').then(m => ({ default: m.CharacterSelection })))
const Games = lazy(() => import('./screens/games').then(m => ({ default: m.Games })))
const LavaPad = lazy(() => import('./screens/games').then(m => ({ default: m.LavaPad })))
const OwnerPanel = lazy(() => import('./components/owner/OwnerPage').then(m => ({ default: m.OwnerPage })))
const EventShop = lazy(() => import('./components/focus/EventShop').then(m => ({ default: m.EventShop })))
const InventoryPanel = lazy(() => import('./components/focus/InventoryPanel').then(m => ({ default: m.InventoryPanel })))

export default function App() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const onboarded = useProfile((s) => s.onboarded)
  const profileReady = useProfile((s) => s.ready)
  const location = useLocation()

  // Lobby readiness — preload icons so the intro veil can stay until they're loaded
  const waitForLobby = useSettings((s) => s.waitForLobbyReady)
  const lobbyReady = useLobbyReady()

  // DEBUG: log auth state on route change
  useEffect(() => {
    console.log('[App] route change', { pathname: location.pathname, user: !!user, loading, onboarded, profileReady })
  }, [location.pathname, user, loading, onboarded, profileReady])

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
    const offSettings = useSettings.subscribe(apply)
    const offWeb = useWebTheme.subscribe(apply)
    return () => {
      offSettings()
      offWeb()
    }
  }, [])

  const PUBLIC_PATHS = new Set(['/', '/about', '/guest'])
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
            <Route path="/guest" element={<GuestMode />} />
      <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
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
  const isBlueprintRoute = location.pathname === '/blueprint'
  const isOwnerRoute = location.pathname === '/owner'

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
    {user && <WebBackground />}
    {user && <IntroVeil ready={veilReady} />}
    {loading ? null : !user ? (
      <AuthScreen />
    ) : !profileReady ? null : !onboarded ? (
      <Onboarding />
    ) : (
      <ErrorBoundary resetKeys={[location.pathname]}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/lobby" replace />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/lobby/realm" element={<Realm />} />
            <Route path="/lobby/realm/choose" element={<Realm />} />
            <Route path="/lobby/realm/library" element={<Realm />} />
            <Route path="/lobby/realm/train" element={<Realm />} />
            <Route path="/lobby/realm/uk-cafe" element={<Realm />} />
            <Route path="/lobby/realm/public" element={<Realm />} />
            <Route path="/lobby/realm/custom" element={<Realm />} />
            <Route path="/lobby/realm/custom/:code" element={<Realm />} />
            <Route path="/lobby/explore" element={<Explore />} />
            <Route path="/blueprint" element={<Blueprint />} />
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
            <Route path="/games" element={<Games />} />
            <Route path="/games/lava-pad" element={<LavaPad />} />
            <Route path="/event-shop" element={<EventShop />} />
            <Route path="/inventory" element={<InventoryPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    )}
    {user && <MobileControlCenter />}
    <GlobalClickSpark />
  </>
)

// Blueprint works on mobile — skip the blocker for that route
if (isBlueprintRoute) return appContent

return (
  <MobileBlocker>
    {appContent}
  </MobileBlocker>
)
}