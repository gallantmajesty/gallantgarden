import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
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
  const navigate = useNavigate()

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

          // Claim session & start heartbeat. Heartbeat runs even when the
          // claim is held elsewhere (false) so this tab fails the heartbeat
          // and gets kicked; only a claim error (null — e.g. offline) skips
          // heartbeating, so offline use isn't punished.
          const claimed = await claimSession()
          if (claimed !== null) {
            stopHeartbeat = startHeartbeat()
          }
        } else {
          // No Supabase session — check for a persisted guest user
          const saved = localStorage.getItem('sf.guest')
          if (saved) {
            try {
              const guest = JSON.parse(saved) as AuthUser
              if (guest.isGuest && guest.id) {
                setUser(guest)
                await runUserInit(guest)
                return
              }
            } catch { /* invalid JSON, ignore */ }
          }
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
      navigate('/login', { replace: true })
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
    localStorage.removeItem('sf.guest')
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
      localStorage.removeItem('sf.guest')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) return error.message
      // With email confirmation enabled the account isn't usable (and there's
      // no session) until the link is clicked — report that to the caller with
      // a sentinel instead of entering an unconfirmed account.
      if (!data.session) return 'confirm-email'
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
      localStorage.removeItem('sf.guest')
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : 'https://focuslily.com'
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
    localStorage.setItem('sf.guest', JSON.stringify(guestUser))
    setUser(guestUser)
    await runUserInit(guestUser)
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem('sf.guest')
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
