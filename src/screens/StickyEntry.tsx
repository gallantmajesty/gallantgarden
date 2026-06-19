import { useNavigate } from 'react-router-dom'
import './StickyEntry.css'

export function StickyEntry() {
  const navigate = useNavigate()

  return (
    <div className="sticky-entry-root">
      <button className="sf-btn secondary back-btn" onClick={() => navigate('/')}>
        ← Lobby
      </button>

      <div className="sticky-entry-stage">
        <div className="sticky-entry-head">
          <span className="sf-pill">Sticky Notes</span>
          <h1>How do you want to study?</h1>
          <p>Two ways to work with your notes — pick your mood.</p>
        </div>

        <div className="sticky-choices">
          <button className="sticky-choice custom" onClick={() => navigate('/blueprint')}>
            <div className="choice-art choice-art-custom">
              <span className="custom-note c1" />
              <span className="custom-note c2" />
              <span className="custom-note c3" />
              <span className="custom-string s1" />
              <span className="custom-string s2" />
            </div>
            <h2>Custom Sticky Notes</h2>
            <p>An investigation board. Pin notes and photos, then link them with strings — your ideas, connected.</p>
            <span className="choice-cta">Open the Board →</span>
          </button>

          <button className="sticky-choice casual soon" disabled>
            <div className="choice-art choice-art-casual">
              <span className="casual-row" />
              <span className="casual-row" />
              <span className="casual-row" />
              <span className="casual-card" />
            </div>
            <h2>Casual Sticky Notes</h2>
            <p>A fast, searchable list with flashcards — same notes, study-ready.</p>
            <span className="choice-cta soon-tag">Coming soon</span>
          </button>
        </div>
      </div>
    </div>
  )
}
