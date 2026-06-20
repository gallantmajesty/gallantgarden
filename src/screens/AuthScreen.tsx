import { useState, type FormEvent } from 'react'
import { useAuth, type OAuthProvider } from '../store/auth'
import './AuthScreen.css'

type Mode = 'in' | 'up'

const PROVIDERS: { id: OAuthProvider; label: string }[] = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'github', label: 'Continue with GitHub' },
  { id: 'microsoft', label: 'Continue with Microsoft' },
]

export function AuthScreen() {
  const { signIn, signUp, signInWithProvider } = useAuth()
  const [mode, setMode] = useState<Mode>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [showEmail, setShowEmail] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const err =
      mode === 'in'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim() || 'Explorer')
    setBusy(false)
    if (err) setError(err)
    // On success the AuthProvider flips user -> app re-renders to the lobby.
  }

  async function oauth(provider: OAuthProvider) {
    setError(null)
    setPending(provider)
    const err = await signInWithProvider(provider)
    // On success the browser redirects to the provider, so we only land here on
    // an error (e.g. the provider isn't configured in InsForge yet).
    if (err) {
      setError(err)
      setPending(null)
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-card sf-panel">
        <div className="auth-crest">
          <img className="auth-crest-glyph" src="/icons/focus-lily-logo.png" alt="Focus Lily" />
        </div>
        <h1 className="auth-title">Focus Lily</h1>
        <p className="auth-sub">
          A calm magical world for focused study. Plant trees, grow your notes.
        </p>

        {/* ---------- primary: OAuth sign-in ---------- */}
        <div className="auth-oauth">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`auth-oauth-btn ${p.id}`}
              disabled={!!pending}
              onClick={() => oauth(p.id)}
            >
              <ProviderIcon provider={p.id} />
              <span>{pending === p.id ? 'Redirecting…' : p.label}</span>
            </button>
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* ---------- secondary: email / password fallback ---------- */}
        <button
          type="button"
          className="auth-email-toggle"
          onClick={() => setShowEmail((v) => !v)}
          aria-expanded={showEmail}
        >
          {showEmail ? 'Hide email sign-in' : 'or continue with email'}
        </button>

        {showEmail && (
          <>
            <div className="auth-tabs">
              <button
                className={`auth-tab ${mode === 'in' ? 'active' : ''}`}
                onClick={() => setMode('in')}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${mode === 'up' ? 'active' : ''}`}
                onClick={() => setMode('up')}
                type="button"
              >
                Create Account
              </button>
            </div>

            <form onSubmit={submit} className="auth-form">
              {mode === 'up' && (
                <div>
                  <label className="sf-label">Explorer name</label>
                  <input
                    className="sf-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="What should we call you?"
                    autoComplete="name"
                  />
                </div>
              )}
              <div>
                <label className="sf-label">Email</label>
                <input
                  className="sf-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="sf-label">Password</label>
                <input
                  className="sf-input"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                />
              </div>

              <button className="sf-btn auth-submit" disabled={busy} type="submit">
                {busy ? 'Opening the gate…' : mode === 'in' ? 'Enter the Forest' : 'Begin Adventure'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

/** Brand glyphs for each provider. Kept inline so the auth screen has no extra
 *  asset dependencies; colors follow each provider's brand guidelines. */
function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === 'google') {
    return (
      <svg className="auth-oauth-icon" viewBox="0 0 24 24" aria-hidden width={20} height={20}>
        <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.82h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.23c1.89-1.74 2.97-4.3 2.97-7.33z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22z" />
        <path fill="#FBBC05" d="M6.41 13.89a6 6 0 0 1 0-3.78V7.53H3.07a10 10 0 0 0 0 8.94l3.34-2.58z" />
        <path fill="#EA4335" d="M12 6.5c1.47 0 2.79.5 3.83 1.5l2.86-2.86A10 10 0 0 0 3.07 7.53l3.34 2.58C7.2 8.26 9.4 6.5 12 6.5z" />
      </svg>
    )
  }
  if (provider === 'github') {
    return (
      <svg className="auth-oauth-icon" viewBox="0 0 24 24" aria-hidden width={20} height={20}>
        <path fill="#fff" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
      </svg>
    )
  }
  // microsoft — four-square logo
  return (
    <svg className="auth-oauth-icon" viewBox="0 0 24 24" aria-hidden width={20} height={20}>
      <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
      <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
      <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
      <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
    </svg>
  )
}
