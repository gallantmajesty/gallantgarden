import { useEffect } from 'react'
import { useAuth } from '../store/auth'
import { setSentryUser } from '../lib/sentry'

export function SentryUserTracker() {
  const { user } = useAuth()

  useEffect(() => {
    setSentryUser(user ? { id: user.id, email: user.email, username: user.profile?.name } : null)
  }, [user])

  return null
}