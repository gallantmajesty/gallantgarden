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
import { initSession } from '../lib/session'
import { networkId } from '../multiplayer/net'

export interface AuthUser {
  id: string
  email: string
  profile?: { name?: string; avatar_url?: string | null }
  isGuest?: boolean
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
  signInAsGuest: () => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data, error } = await insforge.auth.getCurrentUser()
    setUser(error ? null : ((data?.user as AuthUser) ?? null))
  }, [])

  useEffect(() => {
    let cancelled = false
    // Initialize session for multi-device support
    initSession()
    // Once-per-device first-launch config (independent of who signs in).
    void runGlobalInit()
    void (async () => {
      try {
        const { data, error } = await insforge.auth.getCurrentUser()
        if (cancelled) return
        const u = error ? null : ((data?.user as AuthUser) ?? null)
        setUser(u)
        if (u) {
          await runUserInit(u)
        }
      } catch (e) {
        console.error('[Auth] getCurrentUser failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
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
    // Validate the redirect URL to prevent open redirect attacks
    if (data?.url) {
      try {
        const redirectUrl = new URL(data.url)
        const originUrl = new URL(window.location.origin)
        if (redirectUrl.origin === originUrl.origin) {
          window.location.assign(data.url)
        } else {
          console.error('[Auth] OAuth redirect URL does not match app origin, blocking redirect')
        }
      } catch {
        console.error('[Auth] Invalid OAuth redirect URL')
      }
    }
    return null
  }, [])

  const signInAsGuest = useCallback(async () => {
    // Create a lightweight guest user object — no InsForge auth session.
    // XP/progress lives in localStorage keyed by the guest network ID.
    // When the guest later signs up, their localStorage data is migrated.
    const guestNetId = networkId()
    const guestUser: AuthUser = {
      id: guestNetId,
      email: '',
      profile: { name: 'Guest' },
      isGuest: true,
    }
    setUser(guestUser)
    await runUserInit(guestUser)
  }, [])

  const signOut = useCallback(async () => {
    await insforge.auth.signOut()
    runUserTeardown()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInWithProvider, signInAsGuest, signOut, refresh }),
    [user, loading, signIn, signUp, signInWithProvider, signInAsGuest, signOut, refresh],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
