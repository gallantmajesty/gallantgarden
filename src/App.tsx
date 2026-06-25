import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './store/auth'
import { useProfile } from './store/profile'
import { applyVisualSettings, useSettings } from './store/settings'
import { useWebTheme } from './store/webTheme'
import { applyWebTheme } from './lib/webThemes'
import { WebBackground } from './components/WebBackground'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IntroVeil } from './components/IntroVeil'
import { AuthScreen } from './screens/AuthScreen'
import { Onboarding } from './screens/Onboarding'
import { Lobby } from './screens/Lobby'
import { Blueprint } from './screens/Blueprint'
import { StickyEntry } from './screens/StickyEntry'
import { Explore } from './screens/Explore'
import { StudyRoom } from './screens/StudyRoom'
import { RoomsList } from './screens/RoomsList'
import { About } from './screens/About'
import { Realm } from './screens/Realm'
import { RealmInvite } from './screens/RealmInvite'
import { TaskMagnet } from './screens/TaskMagnet'
import { Profile } from './screens/Profile'
import { AvatarCreator } from './screens/AvatarCreator'
import { ShotHarness } from './screens/ShotHarness' // TEMP: torso-review screenshots
import { PerfHarness } from './screens/PerfHarness' // TEMP: Forest Hall perf profiling
import { CalcHub } from './calc/ui/CalcHub' // TEMP usage in /__calc verify route
import { LoadingVeil } from './components/LoadingVeil'
import { MobileFullscreenGate, useIsDesktop } from './components/DesktopOnly'

export default function App() {
  const { user, loading } = useAuth()
  const onboarded = useProfile((s) => s.onboarded)
  const profileReady = useProfile((s) => s.ready)
  const isDesktop = useIsDesktop()
  const location = useLocation()

  // Apply visual + theme settings app-wide and keep them in sync. Both stores
  // feed the same CSS custom properties, so we re-apply in a fixed order on any
  // change: visual settings first (theme/brightness/motion), then the web theme
  // — the web theme is authoritative for the lobby's accent/glass/ink palette,
  // so it must win. Runs even on the auth screen so branding stays consistent.
  useEffect(() => {
    const apply = () => {
      applyVisualSettings(useSettings.getState())
      const w = useWebTheme.getState()
      applyWebTheme(w.themeId, w.accent, w.fontColor)
    }
    apply()
    const offSettings = useSettings.subscribe(apply)
    const offWeb = useWebTheme.subscribe(apply)
    return () => {
      offSettings()
      offWeb()
    }
  }, [])

  // Focus Lily now opens on phones & tablets too. Mobile visitors aren't blocked;
  // instead a fullscreen prompt (MobileFullscreenGate, rendered below) asks them
  // to enter fullscreen before starting and re-prompts if they leave it.

  // TEMP (torso review): a no-auth screenshot harness. Remove with ShotHarness.
  if (window.location.pathname === '/__shot') return <ShotHarness />

  // TEMP (perf pass): a no-auth, no-presence direct mount of Forest Hall so the
  // environment can be profiled in isolation (1 player, no crowd). Remove with
  // PerfHarness when the optimization pass is done.
  if (window.location.pathname === '/__perf') return <PerfHarness />

  // TEMP (calc verify): a no-auth direct mount of the Calculator Hub for visual
  // checks. Safe to remove — it short-circuits before auth.
  if (window.location.pathname === '/__calc') {
    return (
      <>
        <WebBackground />
        <CalcHub />
      </>
    )
  }

  // The opening scene plays over the boot. It cuts the moment the lobby (or auth
  // screen) is ready to paint — i.e. auth has resolved and, if signed in, the
  // profile has loaded — so the video stops "wherever it is" the instant we can
  // open the lobby, just like Clash of Clans.
  const appReady = !loading && (!user || profileReady)

  // The background is mounted once, above the auth/loading/router branch, so it
  // persists across every navigation and never remounts (zero flash).
  return (
    <>
      <WebBackground />
      <IntroVeil ready={appReady} />
      {/* mobile only: ask the visitor to enter fullscreen before starting, and
          re-prompt if they leave it. Desktop never mounts this. */}
      {!isDesktop && <MobileFullscreenGate />}
      {loading ? (
        <LoadingVeil />
      ) : !user ? (
        <AuthScreen />
      ) : !profileReady ? (
        <LoadingVeil />
      ) : !onboarded ? (
        <Onboarding />
      ) : (
        <ErrorBoundary resetKeys={[location.pathname]}>
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/sticky" element={<StickyEntry />} />
            <Route path="/blueprint" element={<Blueprint />} />
            <Route path="/realm" element={<Realm />} />
            <Route path="/realm/:code" element={<RealmInvite />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/rooms" element={<RoomsList />} />
            <Route path="/about" element={<About />} />
            <Route path="/room" element={<Navigate to="/rooms" replace />} />
            <Route path="/room/:id" element={<StudyRoom />} />
            <Route path="/magnet" element={<TaskMagnet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/u/:username" element={<Profile />} />
            <Route path="/avatar" element={<AvatarCreator />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      )}
    </>
  )
}
