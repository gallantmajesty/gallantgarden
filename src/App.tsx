import { lazy, Suspense, useEffect, useState } from 'react'
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
const ShotHarness = lazy(() => import('./screens/ShotHarness').then(m => ({ default: m.ShotHarness })))
const PerfHarness = lazy(() => import('./screens/PerfHarness').then(m => ({ default: m.PerfHarness })))
const CalcHub = lazy(() => import('./calc/ui/CalcHub').then(m => ({ default: m.CalcHub })))

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('sf_pass') === '5908')
  const [passInput, setPassInput] = useState('')
  const [passError, setPassError] = useState(false)

  if (!unlocked) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: 'linear-gradient(160deg, #1a150f 0%, #221b14 50%, #1a150f 100%)',
        fontFamily: 'var(--sans, system-ui, sans-serif)',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          padding: '40px 48px', borderRadius: 20,
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 36 }}>🔒</div>
          <h2 style={{ margin: 0, color: '#e8ddd0', fontWeight: 800, fontSize: 20, letterSpacing: 0.3 }}>
            Enter Password
          </h2>
          <p style={{ margin: 0, color: 'rgba(232,221,208,0.5)', fontSize: 13 }}>
            This site is password-protected
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (passInput === '5908') {
                sessionStorage.setItem('sf_pass', '5908')
                setUnlocked(true)
              } else {
                setPassError(true)
                setPassInput('')
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}
          >
            <input
              type="password"
              autoFocus
              value={passInput}
              onChange={(e) => { setPassInput(e.target.value); setPassError(false) }}
              placeholder="Password"
              style={{
                font: '600 15px var(--sans, system-ui)', padding: '12px 16px', borderRadius: 12,
                border: `1.5px solid ${passError ? '#e25b4b' : 'rgba(255,255,255,0.15)'}`,
                background: 'rgba(255,255,255,0.08)', color: '#e8ddd0', outline: 'none',
                width: '100%', boxSizing: 'border-box', textAlign: 'center',
                letterSpacing: 4, fontSize: 18,
              }}
            />
            {passError && (
              <span style={{ color: '#e25b4b', fontSize: 12, textAlign: 'center' }}>
                Incorrect password
              </span>
            )}
            <button
              type="submit"
              style={{
                font: '700 14px var(--sans, system-ui)', padding: '12px 24px', borderRadius: 12,
                border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--mg-accent, #5b7cfa), color-mix(in srgb, var(--mg-accent, #5b7cfa) 70%, #000))',
                color: '#fff', letterSpacing: 0.3,
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

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

  // TEMP (torso review): a no-auth screenshot harness. Remove with ShotHarness.
  if (window.location.pathname === '/__shot') return <ShotHarness />

  // TEMP (perf pass): a no-auth, no-presence direct mount of Forest Hall so the
  // environment can be profiled in isolation (1 player, no crowd). Remove with
  // PerfHarness when the optimization pass is done.
  if (window.location.pathname === '/__perf') return <PerfHarness />

  // TEMP (calc verify): a no-auth direct mount of the Calculator Hub for visual
  // checks. Safe to remove — it short-circuts before auth.
  if (window.location.pathname === '/__calc') {
    return (
      <>
        <WebBackground />
        <CalcHub />
      </>
    )
  }

  const PUBLIC_PATHS = new Set(['/', '/about'])
  const isPublic = PUBLIC_PATHS.has(location.pathname)

  // The opening scene plays over the boot. It cuts the moment the lobby (or auth
  // screen) is ready to paint — i.e. auth has resolved and, if signed in, the
  // profile has loaded — so the video stops "wherever it is" the instant we can
  // open the lobby, just like Clash of Clans.
  const appReady = !loading && (!user || profileReady)
  const veilReady = appReady && (!waitForLobby || lobbyReady)

  // Public marketing pages render without WebBackground/IntroVeil
  // Show landing immediately — don't wait for auth to resolve
  if (isPublic && !user) {
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
              <Route path="/realm/:code" element={<RealmInvite />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/rooms" element={<RoomsList />} />
              <Route path="/info" element={<About />} />
              <Route path="/room" element={<Navigate to="/rooms" replace />} />
              <Route path="/room/:id" element={<StudyRoom />} />
              <Route path="/magnet" element={<TaskMagnet />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/u/:username" element={<Profile />} />
              <Route path="/avatar" element={<AvatarCreator />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  )
}