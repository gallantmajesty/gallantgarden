import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/auth'
import { useProfile } from './store/profile'
import { applyVisualSettings, useSettings } from './store/settings'
import { useWebTheme } from './store/webTheme'
import { applyWebTheme } from './lib/webThemes'
import { WebBackground } from './components/WebBackground'
import { AuthScreen } from './screens/AuthScreen'
import { Onboarding } from './screens/Onboarding'
import { Lobby } from './screens/Lobby'
import { StickyEntry } from './screens/StickyEntry'
import { Forest } from './screens/Forest'
import { Explore } from './screens/Explore'
import { Realm } from './screens/Realm'
import { TaskMagnet } from './screens/TaskMagnet'
import { Profile } from './screens/Profile'
import { AvatarCreator } from './screens/AvatarCreator'
import { Placeholder } from './screens/Placeholder'
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

  // The background is mounted once, above the auth/loading/router branch, so it
  // persists across every navigation and never remounts (zero flash).
  return (
    <>
      <WebBackground />
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
          <Route path="/sticky/forest" element={<Forest />} />
          <Route path="/realm" element={<Realm />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/magnet" element={<TaskMagnet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/u/:username" element={<Profile />} />
          <Route path="/avatar" element={<AvatarCreator />} />
          <Route
            path="/sticky/casual"
            element={
              <Placeholder
                title="Casual Notes & Flashcards"
                note="A fast searchable list of all your notes plus flashcards is coming right after the forest."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  )
}
