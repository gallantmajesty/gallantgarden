import { useNavigate } from 'react-router-dom'

interface Props {
  name: string
}

export function FlagshipUnavailable({ name }: Props) {
  const navigate = useNavigate()

  return (
    <div className="flagship-unavailable water-glass" style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '24px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
        {name} — Under Development
      </h1>
      <p style={{ fontSize: 16, opacity: 0.8, maxWidth: 480, marginBottom: 24 }}>
        This realm is currently being crafted for a future release. The code is complete
        and ready — it's just waiting for its moment to shine.
      </p>
      <button
        className="sf-btn water"
        onClick={() => navigate('/realm')}
        style={{ marginTop: 16 }}
      >
        ← Back to Realms
      </button>
    </div>
  )
}
