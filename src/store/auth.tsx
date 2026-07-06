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
import { runGlobalInit, runUserTeardown } from '../lib/appInit'
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

function mapSupabaseUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): AuthUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? '',
    profile: {
      name: (u.user_metadata?.full_name ?? u.user_metadata?.name ?? undefined) as string | undefined,
      avatar_url: (u.user_metadata?.avatar_url ?? null) as string | null,
    },
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    setUser(mapSupabaseUser(data.user))
  }, [])

  useEffect(() => {
    let cancelled = false
    initSession()
    void runGlobalInit()

    const handleHashChange = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return
        const u = mapSupabaseUser(data.session?.user ?? null)
        setUser(u)
        if (u) void runUserInit?.(u)
      }).catch((e) => console.error('[Auth] session restore failed:', e)).finally(() => {
        if (!cancelled) setLoading(false)
      })
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      cancelled = true
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    const u = mapSupabaseUser(data.user)
    setUser(u)
    if (u) await runUserInit?.(u)
    return null
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) return error.message
    const u = mapSupabaseUser(data.user)
    setUser(u)
    if (u) await runUserInit?.(u)
    return null
  }, [])

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) return error.message
    // Always redirect — Supabase returns the URL to redirect to
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
    await runUserInit?.(guestUser)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
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
