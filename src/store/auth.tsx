import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/insforge'
import { runGlobalInit, runUserInit, runUserTeardown } from '../lib/appInit'
import { initSession, claimSession, startHeartbeat } from '../lib/session'
import { networkId } from '../multiplayer/net'

export interface AuthUser {
  id: string
  email: string
  profile?: { name?: string; avatar_url?: string | null }
  isGuest?: boolean
}

export type OAuthProvider = 'github'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  signInWithProvider: (provider: OAuthProvider) => Promise<string | null>
  signInAsGuest: () => Promise<void>
  signInLocal: (name: string, email: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapSupabaseUser(su: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): AuthUser | null {
  if (!su) return null
  return {
    id: su.id,
    email: su.email ?? '',
    profile: {
      name: (su.user_metadata?.name as string) ?? (su.user_metadata?.full_name as string) ?? undefined,
      avatar_url: (su.user_metadata?.avatar_url as string) ?? null,
    },
  }
}

async function enrichWithProfile(u: AuthUser): Promise<AuthUser> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', u.id)
      .maybeSingle()
    return {
      ...u,
      profile: {
        name: data?.display_name ?? u.profile?.name,
        avatar_url: data?.avatar_url ?? u.profile?.avatar_url ?? null,
      },
    }
  } catch {
    return u
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    const u = mapSupabaseUser(data.user)
    if (u) {
      const enriched = await enrichWithProfile(u)
      setUser(enriched)
    } else {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let stopHeartbeat: (() => void) | null = null
    initSession()
    void runGlobalInit()

    const restoreSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const u = mapSupabaseUser(data.session?.user ?? null)
        if (cancelled) return
        if (u) {
          const enriched = await enrichWithProfile(u)
          setUser(enriched)
          await runUserInit(enriched)

          // Claim session & start heartbeat
          const claimed = await claimSession()
          if (claimed) {
            stopHeartbeat = startHeartbeat()
          }
        } else {
          setUser(null)
        }
      } catch (e) {
        console.error('[Auth] session restore failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Handle session lost (another device claimed it)
    const handleSessionLost = () => {
      console.warn('[Auth] Session claimed elsewhere')
      runUserTeardown()
      setUser(null)
      // Optionally show a modal to reclaim
    }
    window.addEventListener('session-lost', handleSessionLost)

    restoreSession()
    // Only restore on hashchange (OAuth callbacks), not on every popstate/navigation
    window.addEventListener('hashchange', restoreSession)

    return () => {
      cancelled = true
      if (stopHeartbeat) stopHeartbeat()
      window.removeEventListener('hashchange', restoreSession)
      window.removeEventListener('session-lost', handleSessionLost)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    const u = mapSupabaseUser(data.user)
    if (u) {
      const enriched = await enrichWithProfile(u)
      setUser(enriched)
      await runUserInit(enriched)
    }
    return null
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) return error.message
      const u = mapSupabaseUser(data.user)
      if (u) {
        const enriched = await enrichWithProfile(u)
        setUser(enriched)
        await runUserInit(enriched)
      }
      return null
    },
    [],
  )

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : 'https://focuslily.com'
      console.log('[Auth] signInWithProvider', provider, 'redirectTo:', redirectTo)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (error) {
        console.error('[Auth] OAuth error:', error)
        return error.message
      }
      if (data?.url) {
        window.location.assign(data.url)
      }
      return null
    } catch (e: any) {
      console.error('[Auth] OAuth exception:', e)
      return e?.message || 'Network request failed'
    }
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

  const signInLocal = useCallback(async (name: string, email: string) => {
    const localId = networkId()
    const localUser: AuthUser = {
      id: localId,
      email,
      profile: { name },
      isGuest: true,
    }
    setUser(localUser)
    await runUserInit(localUser)
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[Auth] signOut error:', error)
    // Release session on sign out
    await supabase.rpc('release_session').catch(() => {})
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
      signInLocal,
      signOut,
      refresh,
    }),
    [user, loading, signIn, signUp, signInWithProvider, signInAsGuest, signInLocal, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
