import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/auth'
import { useProfile } from './store/profile'
import { applyVisualSettings, useSettings } from './store/settings'
import { useWebTheme } from './store/webTheme'
import { applyWebTheme } from './lib/webThemes'
import { WebBackground } from './components/WebBackground'
import { IntroVeil } from './components/IntroVeil'
import { AuthScreen } from './screens/AuthScreen'
import { Onboarding } from './screens/Onboarding'
import { Lobby } from './screens/Lobby'
import { Blueprint } from './screens/Blueprint'
import { StickyEntry } from './screens/StickyEntry'
import { Explore } from './screens/Explore'
import { Realm } from './screens/Realm'
import { TaskMagnet } from './screens/TaskMagnet'
import { Profile } from './screens/Profile'
import { AvatarCreator } from './screens/AvatarCreator'
import { LoadingVeil } from './components/LoadingVeil'
import { DesktopOnly, useIsDesktop } from './components/DesktopOnly'

export default function App() {
  const { user, loading } = useAuth()
  const onboarded = useProfile((s) => s.onboarded)
  const profileReady = useProfile((s) => s.ready)
  const isDesktop = useIsDesktop()

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

  // Focus Lily is a desktop-only platform — phones and tablets (and phones in
  // "request desktop site" mode) are blocked entirely; the app never mounts.
  if (!isDesktop) return <DesktopOnly />

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
      {loading ? (
        <LoadingVeil />
      ) : !user ? (
        <AuthScreen />
      ) : !profileReady ? (
        <LoadingVeil />
      ) : !onboarded ? (
        <Onboarding />
      ) : (
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/sticky" element={<StickyEntry />} />
          <Route path="/blueprint" element={<Blueprint />} />
          <Route path="/realm" element={<Realm />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/magnet" element={<TaskMagnet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/u/:username" element={<Profile />} />
          <Route path="/avatar" element={<AvatarCreator />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  )
}
