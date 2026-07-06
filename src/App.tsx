import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './store/auth'
import './i18n'
import { useProfile } from './store/profile'
import { applyVisualSettings, useSettings } from './store/settings'
import { useWebTheme } from './store/webTheme'
import { applyWebTheme } from './lib/webThemes'
import { WebBackground } from './components/WebBackground'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IntroVeil } from './components/IntroVeil'
import { AuthScreen } from './screens/AuthScreen'
import { Onboarding } from './screens/Onboarding'
import { Landing } from './screens/public/Landing'
import { useLobbyReady } from './hooks/useLobbyReady'
const Lobby = lazy(() => import('./screens/Lobby').then(m => ({ default: m.Lobby })))
const Blueprint = lazy(() => import('./screens/Blueprint').then(m => ({ default: m.Blueprint })))
const Explore = lazy(() => import('./screens/Explore').then(m => ({ default: m.Explore })))
const StudyRoom = lazy(() => import('./screens/StudyRoom').then(m => ({ default: m.StudyRoom })))
const RoomsList = lazy(() => import('./screens/RoomsList').then(m => ({ default: m.RoomsList })))
const About = lazy(() => import('./screens/About').then(m => ({ default: m.About })))
const Realm = lazy(() => import('./screens/Realm').then(m => ({ default: m.Realm })))
const RealmInvite = lazy(() => import('./screens/RealmInvite').then(m => ({ default: m.RealmInvite })))
const TaskMagnet = lazy(() => import('./screens/TaskMagnet').then(m => ({ default: m.TaskMagnet })))
const Profile = lazy(() => import('./screens/Profile').then(m => ({ default: m.Profile })))
const AvatarCreator = lazy(() => import('./screens/AvatarCreator').then(m => ({ default: m.AvatarCreator })))
const CharacterSelection = lazy(() => import('./screens/CharacterSelection').then(m => ({ default: m.CharacterSelection })))
const Games = lazy(() => import('./screens/games').then(m => ({ default: m.Games })))
const LavaPad = lazy(() => import('./screens/games').then(m => ({ default: m.LavaPad })))

export default function App() {
  const { user, loading } = useAuth()
  const onboarded = useProfile((s) => s.onboarded)
  const profileReady = useProfile((s) => s.ready)
  const location = useLocation()

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
    const offSettings = useSettings.subscribe(apply)
    const offWeb = useWebTheme.subscribe(apply)
    return () => {
      offSettings()
      offWeb()
    }
  }, [])

  const PUBLIC_PATHS = new Set(['/', '/about'])
  const isPublic = PUBLIC_PATHS.has(location.pathname)

  // The opening scene plays over the boot. It cuts the moment the lobby (or auth
  // screen) is ready to paint — i.e. auth has resolved and, if signed in, the
  // profile has loaded — so the video stops "wherever it is" the instant we can
  // open the lobby, just like Clash of Clans.
  const appReady = !loading && (!user || profileReady)
  const veilReady = appReady && (!waitForLobby || lobbyReady)

  // Public marketing pages render without WebBackground/IntroVeil
  // Show landing immediately — don't wait for auth to resolve.
  // But if auth is still loading, hold off — a logged-in user should land
  // straight in the Lobby without a flash of the Landing page.
  if (isPublic && !user && !loading) {
    return (
      <ErrorBoundary resetKeys={[location.pathname]}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    )
  }

  // The background is mounted once, above the auth/loading/router branch, so it
  // persists across every navigation and never remounts (zero flash).
  return (
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
              <Route path="/" element={<Lobby />} />
              <Route path="/blueprint" element={<Blueprint />} />
              <Route path="/realm" element={<Realm />} />
              <Route path="/realm/explore" element={<Explore />} />
              <Route path="/realm/:code" element={<RealmInvite />} />
              <Route path="/info" element={<About />} />
<Route path="/room" element={<Navigate to="/rooms" replace />} />
<Route path="/rooms" element={<RoomsList />} />
<Route path="/room/:id" element={<StudyRoom />} />
              <Route path="/magnet" element={<TaskMagnet />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/u/:username" element={<Profile />} />
              <Route path="/avatar" element={<AvatarCreator />} />
              <Route path="/character-select" element={<CharacterSelection />} />
              <Route path="/games" element={<Games />} />
              <Route path="/games/lava-pad" element={<LavaPad />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  )
}