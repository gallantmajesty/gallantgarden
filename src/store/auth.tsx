import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { insforge } from '../lib/insforge'
import { runGlobalInit, runUserInit, runUserTeardown } from '../lib/appInit'
import { initSession, claimSession, releaseSession } from '../lib/session'
import { SessionLockOverlay } from '../components/SessionLockOverlay'

export interface AuthUser {
  id: string
  email: string
  profile?: { name?: string; avatar_url?: string | null }
}

/** OAuth identity providers wired in the UI. These must match the providers
 *  enabled server-side in InsForge (see docs/OAUTH_SETUP.md). InsForge runs the
 *  full OAuth 2.0 / PKCE flow and stores the session in a secure httpOnly cookie —
 *  no tokens or passwords ever live in our client code. */
export type OAuthProvider = 'google' | 'github' | 'microsoft'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  signInWithProvider: (provider: OAuthProvider) => Promise<string | null>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionLocked, setSessionLocked] = useState(false)
  const [lockedWhere, setLockedWhere] = useState<string | undefined>(undefined)

  const refresh = useCallback(async () => {
    const { data, error } = await insforge.auth.getCurrentUser()
    setUser(error ? null : ((data?.user as AuthUser) ?? null))
  }, [])

  useEffect(() => {
    let cancelled = false
    // Single-session guard: each tab gets a session_id + lock-change callback.
    // `where` is the device label of the holder we lost the lock to (PC/mobile).
    initSession((locked, where) => {
      setSessionLocked(locked)
      setLockedWhere(where)
    })
    // Once-per-device first-launch config (independent of who signs in).
    void runGlobalInit()
    void (async () => {
      // getCurrentUser() also finalizes any pending OAuth PKCE callback in the URL.
      const { data, error } = await insforge.auth.getCurrentUser()
      if (cancelled) return
      const u = error ? null : ((data?.user as AuthUser) ?? null)
      setUser(u)
      if (u) {
        await runUserInit(u)
        // Claim the single-session lock for this tab (steals it from any other
        // tab/browser/device — newest-open-wins, like WhatsApp/Netflix).
        await claimSession()
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) return error.message
    const u = (data?.user as AuthUser) ?? null
    setUser(u)
    if (u) {
      await runUserInit(u)
      await claimSession()
    }
    return null
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { data, error } = await insforge.auth.signUp({ email, password, name })
      if (error) return error.message
      // Email verification is disabled, so an accessToken comes back immediately.
      const u = (data?.user as AuthUser) ?? null
      setUser(u)
      if (u) {
        await runUserInit(u)
        await claimSession()
      }
      return null
    },
    [],
  )

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    // PKCE flow: the SDK generates the verifier/challenge, then redirects the
    // browser to the provider. On return, `insforge_code` is exchanged for a
    // session automatically during getCurrentUser() (see the bootstrap effect).
    const { data, error } = await insforge.auth.signInWithOAuth(provider, {
      redirectTo: window.location.origin,
    })
    if (error) return error.message
    // The SDK redirects automatically (skipBrowserRedirect is false); this is a
    // belt-and-braces fallback in case a host blocks the auto-redirect.
    if (data?.url) window.location.assign(data.url)
    return null
  }, [])

  const signOut = useCallback(async () => {
    // Release the single-session lock first so a re-sign-in doesn't briefly
    // see a stale holder, then tear down per-user state.
    await releaseSession()
    await insforge.auth.signOut()
    runUserTeardown()
    setSessionLocked(false)
    setLockedWhere(undefined)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInWithProvider, signOut, refresh }),
    [user, loading, signIn, signUp, signInWithProvider, signOut, refresh],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionLockOverlay visible={sessionLocked && !!user} where={lockedWhere} />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
