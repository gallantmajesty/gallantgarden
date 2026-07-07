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

function mapInsforgeUser(u: { id: string; email: string; profile: { name?: string; avatar_url?: string } | null } | null): AuthUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email,
    profile: {
      name: u.profile?.name,
      avatar_url: u.profile?.avatar_url ?? null,
    },
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const user = insforge.auth.getUser()
    setUser(mapInsforgeUser(user))
  }, [])

  useEffect(() => {
    let cancelled = false
    initSession()
    void runGlobalInit()

    const restoreSession = async () => {
      try {
    const user = insforge.auth.getUser()
    const u = mapInsforgeUser(user)
        if (cancelled) return
        setUser(u)
        if (u) {
          await runUserInit(u)
        }
      } catch (e) {
        console.error('[Auth] session restore failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restoreSession()
    window.addEventListener('hashchange', restoreSession)
    window.addEventListener('popstate', restoreSession)

    return () => {
      cancelled = true
      window.removeEventListener('hashchange', restoreSession)
      window.removeEventListener('popstate', restoreSession)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) return error.message
    setUser(mapInsforgeUser(data))
    if (data) await runUserInit(data)
    return null
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name,
      })
      if (error) return error.message
      setUser(mapInsforgeUser(data))
      if (data) await runUserInit(data)
      return null
    },
    [],
  )

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
    const { data, error } = await insforge.auth.signInWithOAuth(provider, { redirectTo })
    if (error) return error.message
    // InsForge returns the URL to redirect to — always follow it.
    if (data?.url) {
      window.location.assign(data.url)
    }
    return null
  }, [])

  const signInAsGuest = useCallback(async () => {
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
    const { error } = await insforge.auth.signOut()
    if (error) console.error('[Auth] signOut error:', error)
    runUserTeardown()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signInWithProvider,
      signInAsGuest,
      signOut,
      refresh,
    }),
    [user, loading, signIn, signUp, signInWithProvider, signInAsGuest, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
