import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth, type OAuthProvider } from '../store/auth'
import './AuthScreen.css'

const AuthGlobe = lazy(() => import('../components/AuthGlobe'))

export function AuthScreen() {
  const { t } = useTranslation()
  const { signInWithProvider, signInAsGuest } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<OAuthProvider | 'guest' | null>(null)

  // Reset pending state on mount so stale "Redirecting…" doesn't stick around
  // when the user navigates back after a failed/cancelled OAuth redirect.
  useEffect(() => { setPending(null) }, [])

  const providers: { id: OAuthProvider; label: string }[] = [
  { id: 'github', label: t('auth.continueGithub') },
  ]

  async function oauth(provider: OAuthProvider) {
    setError(null)
    setPending(provider)
    const err = await signInWithProvider(provider)
    if (err) {
      setError(err)
      setPending(null)
    } else {
      // If the redirect didn't happen (popup blocked, etc.), clear pending
      // after a short delay so the user can try another sign-in method.
      setTimeout(() => {
        setPending(current => current === provider ? null : current)
      }, 4000)
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-globe-bg">
        <Suspense fallback={null}>
          <AuthGlobe
            speed={1.2}
            scale={9}
            fill="dots"
            fillColor="#d4af37"
            dots={{ color: '#d4af37', size: 4, density: 7, allDots: false }}
            oceanColor="transparent"
            outlineColor="#d4af37"
            showOutline
            outlineWidth={1.5}
            graticuleColor="rgba(212,175,55,0.12)"
            showGrid
            direction="left"
            stopOnHover={false}
            dragSpeed={5}
            initialLatitude={20}
            initialLongitude={-30}
          />
        </Suspense>
      </div>
      <div className="auth-card sf-panel">
        <div className="auth-crest">
          <span className="auth-sparkle auth-sparkle--1"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="2" fill="#d4af37"/></svg></span>
          <span className="auth-sparkle auth-sparkle--2"><svg width="7" height="7" viewBox="0 0 7 7" fill="none"><circle cx="3.5" cy="3.5" r="1.5" fill="#f6e8c8"/></svg></span>
          <span className="auth-sparkle auth-sparkle--3"><svg width="9" height="9" viewBox="0 0 9 9" fill="none"><circle cx="4.5" cy="4.5" r="1.8" fill="#d4af37"/></svg></span>
          <span className="auth-sparkle auth-sparkle--4"><svg width="6" height="6" viewBox="0 0 6 6" fill="none"><circle cx="3" cy="3" r="1.2" fill="#f6e8c8"/></svg></span>
          <span className="auth-sparkle auth-sparkle--5"><svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="1.5" fill="#d4af37"/></svg></span>
          <img className="auth-crest-glyph" src="/icons/focus-lily-logo.png" alt={t('common.appName')} />
        </div>
        <h1 className="auth-title">{t('common.appName')}</h1>
        <p className="auth-sub">
          {t('auth.subtitle')}
        </p>
        <span className="auth-tagline">study · focus · thrive</span>

        <div className="auth-oauth">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`auth-oauth-btn ${p.id}`}
              disabled={!!pending}
              onClick={() => oauth(p.id)}
            >
              <ProviderIcon provider={p.id} />
              <span>{pending === p.id ? t('auth.redirecting') : p.label}</span>
            </button>
          ))}
        </div>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="auth-guest-btn"
          disabled={!!pending}
          onClick={async () => {
            setError(null)
            setPending('guest')
            await signInAsGuest()
          }}
        >
          {pending === 'guest' ? t('auth.enterGuest') : t('auth.continueGuest')}
        </button>
        <p className="auth-guest-hint">
          {t('auth.guestHint')}
        </p>

        {error && <div className="auth-error">{error}</div>}
      </div>
    </div>
  )
}

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  return (
      <svg className="auth-oauth-icon" viewBox="0 0 24 24" aria-hidden width={20} height={20}>
        <path fill="#fff" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
      </svg>
  )
}