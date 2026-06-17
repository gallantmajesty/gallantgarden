import { useNavigate } from 'react-router-dom'

export function Placeholder({ title, note }: { title: string; note: string }) {
  const navigate = useNavigate()
  return (
    <div style={{ position: 'relative', height: '100svh', overflow: 'hidden' }}>
      <button className="sf-btn secondary back-btn" onClick={() => navigate('/sticky')}>
        ← Back
      </button>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          display: 'grid',
          placeContent: 'center',
          textAlign: 'center',
          padding: 20,
        }}
      >
        <div className="sf-panel" style={{ padding: '34px 40px', maxWidth: 460 }}>
          <span className="sf-pill">Building next</span>
          <h1 style={{ color: 'var(--wood-dark)', fontSize: 34, margin: '12px 0 8px' }}>{title}</h1>
          <p style={{ color: 'var(--ink-soft)' }}>{note}</p>
        </div>
      </div>
    </div>
  )
}
