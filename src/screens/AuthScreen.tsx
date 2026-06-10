import { useState, type FormEvent } from 'react'
import { useAuth } from '../store/auth'
import { SceneBackground } from '../components/SceneBackground'
import './AuthScreen.css'

type Mode = 'in' | 'up'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  return (
    <div className="auth-root">
      <SceneBackground />

      <div className="auth-card sf-panel">
        <div className="auth-crest">
          <span className="auth-crest-glyph" />
        </div>
        <h1 className="auth-title">StudyForest</h1>
        <p className="auth-sub">
          A calm magical world for focused study. Plant trees, grow your notes.
        </p>

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

          {error && <div className="auth-error">{error}</div>}

          <button className="sf-btn auth-submit" disabled={busy} type="submit">
            {busy ? 'Opening the gate…' : mode === 'in' ? 'Enter the Forest' : 'Begin Adventure'}
          </button>
        </form>
      </div>
    </div>
  )
}
