import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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

function mapInsForgeUser(
  u:
    | { id: string; email: string; profile?: { name?: string; avatar_url?: string | null } | null; metadata?: Record<string, unknown> | null }
    | null,
): AuthUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? '',
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
    const result = await insforge.auth.getCurrentUser()
    setUser(mapInsForgeUser(result.data?.user ?? null))
  }, [])

  useEffect(() => {
    let cancelled = false
    initSession()
    void runGlobalInit()

    void (async () => {
      try {
        await refresh()
      } catch (e) {
        console.error('[Auth] session restore failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) return error.message
    const u = data?.user
      ? {
          id: (data.user as { id: string }).id,
          email: (data.user as { id: string; email: string }).email,
          profile: { name: undefined, avatar_url: null },
        }
      : null
    setUser(u)
    if (u) await runUserInit(u)
    return null
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await insforge.auth.signUp({ email, password, name })
    if (error) return error.message
    const u = data?.user
      ? {
          id: (data.user as { id: string }).id,
          email: (data.user as { id: string; email: string }).email,
          profile: { name: undefined, avatar_url: null },
        }
      : null
    setUser(u)
    if (u) await runUserInit(u)
    return null
  }, [])

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await insforge.auth.signInWithOAuth(provider, { redirectTo })
    if (error) return error.message
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
    await insforge.auth.signOut()
    runUserTeardown()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInWithProvider, signInAsGuest, signOut, refresh }),
    [user, loading, signIn, signUp, signInWithProvider, signInAsGuest, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
