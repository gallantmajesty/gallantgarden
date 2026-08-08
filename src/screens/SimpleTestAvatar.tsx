import './SimpleTestAvatar.css'

export function SimpleTestAvatar() {
  return (
    <div className="test-avatar">
      <h2>Character Selection Test</h2>
      <p>If you see this, the basic component is working!</p>
      <div className="test-characters">
        <div className="test-character">
          <h3>James</h3>
          <p>Classic student</p>
        </div>
        <div className="test-character">
          <h3>Claire</h3>
          <p>Studious student</p>
        </div>
      </div>
      <p style={{ marginTop: '40px', opacity: 0.7 }}>
        Visit <a href="/character-select" style={{ color: '#fbbf24' }}>/character-select</a> for the full character selection interface
      </p>
    </div>
  )
}