import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRealmByCode } from '../lib/realms'
import { useRealm } from '../store/realm'
import './Realm.css'

/**
 * Invite deep-link handler for `/realm/:code`. Resolves the code server-side
 * (enforcing visibility/bans), caches + enters the realm, and drops the player
 * straight into it. A signed-out visitor reaches the auth screen first (the route
 * lives behind auth); once signed in they can paste the code via "Join by code".
 */
export function RealmInvite() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const rememberCustom = useRealm((s) => s.rememberCustom)
  const enterCustom = useRealm((s) => s.enterCustom)
  const [error, setError] = useState<string | null>(null)
  const done = useRef(false)

  useEffect(() => {
    if (done.current || !code) return
    done.current = true
    void (async () => {
      const { realm, error } = await getRealmByCode(code)
      if (!realm) {
        setError(error || 'This invite is no longer valid.')
        return
      }
      const cached = {
        id: realm.id,
        name: realm.name,
        code: realm.code,
        visibility: realm.visibility,
        ownerId: realm.owner_id,
        createdAt: realm.created_at,
      }
      rememberCustom(cached)
      enterCustom(cached)
      navigate('/explore', { replace: true })
    })()
  }, [code, rememberCustom, enterCustom, navigate])

  return (
    <div className="realm-root">
      <div className="realm-stage">
        <header className="realm-head">
          <span className="sf-pill">Realm invite</span>
          <h1>{error ? 'Invite unavailable' : 'Opening realm…'}</h1>
          <p>{error ?? 'Resolving your invite and stepping inside.'}</p>
        </header>
        {error && (
          <div className="realm-create">
            <button className="sf-btn water" onClick={() => navigate('/realm')}>
              Back to realms
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
