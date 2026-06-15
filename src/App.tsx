import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/auth'
import { applyVisualSettings, useSettings } from './store/settings'
import { AuthScreen } from './screens/AuthScreen'
import { Lobby } from './screens/Lobby'
import { StickyEntry } from './screens/StickyEntry'
import { Forest } from './screens/Forest'
import { Explore } from './screens/Explore'
import { Realm } from './screens/Realm'
import { TaskMagnet } from './screens/TaskMagnet'
import { AvatarCreator } from './screens/AvatarCreator'
import { Placeholder } from './screens/Placeholder'
import { LoadingVeil } from './components/LoadingVeil'
import { DesktopOnly, useIsDesktop } from './components/DesktopOnly'

export default function App() {
  const { user, loading } = useAuth()
  const isDesktop = useIsDesktop()

  // Apply visual settings (theme / brightness / motion) app-wide and keep them
  // in sync with the store. Runs even on the auth screen so branding is consistent.
  useEffect(() => {
    applyVisualSettings(useSettings.getState())
    return useSettings.subscribe((s) => applyVisualSettings(s))
  }, [])

  // Focus Lily is a desktop-only platform — phones and tablets (and phones in
  // "request desktop site" mode) are blocked entirely; the app never mounts.
  if (!isDesktop) return <DesktopOnly />

  if (loading) return <LoadingVeil />
  if (!user) return <AuthScreen />

  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/sticky" element={<StickyEntry />} />
      <Route path="/sticky/forest" element={<Forest />} />
      <Route path="/realm" element={<Realm />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/magnet" element={<TaskMagnet />} />
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
  )
}
