import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRealmByCode } from '../lib/realms'
import { useRealm } from '../store/realm'
import './Realm.css'

/**
 * Invite deep-link handler for `/realm/:code`. Resolves the code server-side
 * (enforcing visibility/password/expiry/bans), caches + enters the realm, and
 * drops the player straight into it. If the realm requires a password, the
 * user is prompted before joining.
 */
export function RealmInvite() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const rememberCustom = useRealm((s) => s.rememberCustom)
  const enterCustom = useRealm((s) => s.enterCustom)
  const [error, setError] = useState<string | null>(null)
  const [needPassword, setNeedPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [joining, setJoining] = useState(false)
  const done = useRef(false)

  useEffect(() => {
    if (done.current || !code) return
    done.current = true
    void tryJoin(code)
  }, [code])

  async function tryJoin(c: string, pw?: string) {
    const { realm, error: err } = await getRealmByCode(c, pw)
    if (err === 'wrong password' && !pw) {
      setNeedPassword(true)
      return
    }
    if (!realm) {
      setError(err || 'This invite is no longer valid.')
      return
    }
    const cached = {
      id: realm.id,
      name: realm.name,
      code: realm.code,
      visibility: realm.visibility,
      ownerId: realm.owner_id,
      createdAt: realm.created_at,
      password: realm.password ?? undefined,
      expiresAt: realm.expires_at ?? undefined,
    }
    rememberCustom(cached)
    enterCustom(cached)
    navigate('/lobby/explore', { replace: true })
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code || joining) return
    setJoining(true)
    void tryJoin(code, password).finally(() => setJoining(false))
  }

  return (
    <div className="realm-root">
      <div className="realm-stage">
        <header className="realm-head">
          <span className="sf-pill">Realm invite</span>
          <h1>{error ? 'Invite unavailable' : needPassword ? 'Enter password' : 'Opening realm…'}</h1>
          <p>{error ?? (needPassword ? 'This realm requires a password to join.' : 'Resolving your invite and stepping inside.')}</p>
        </header>

        {needPassword && !error && (
          <form className="realm-create realm-create-col" onSubmit={handlePasswordSubmit} style={{ maxWidth: 400 }}>
            <input
              className="sf-input"
              type="password"
              placeholder="Enter realm password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={32}
              autoFocus
            />
            <button className="sf-btn water" type="submit" disabled={joining || !password}>
              {joining ? 'Joining…' : 'Join realm'}
            </button>
          </form>
        )}

        {error && (
          <div className="realm-create">
            <button className="sf-btn water" onClick={() => navigate('/lobby/realm/choose')}>
              Back to realms
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
