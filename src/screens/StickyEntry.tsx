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
          <p>Two ways into the same notes — pick your mood.</p>
        </div>

        <div className="sticky-choices">
          <button className="sticky-choice water-glass tree" onClick={() => navigate('/sticky/forest')}>
            <div className="choice-art choice-art-tree">
              <span className="tree-canopy" />
              <span className="tree-trunk" />
              <span className="tree-note n1" />
              <span className="tree-note n2" />
              <span className="tree-note n3" />
            </div>
            <h2>Tree Sticky Notes</h2>
            <p>A living forest. Stick notes on trees, fly around, and explore in 3D.</p>
            <span className="choice-cta">Enter the Forest →</span>
          </button>

          <button className="sticky-choice water-glass casual" onClick={() => navigate('/sticky/casual')}>
            <div className="choice-art choice-art-casual">
              <span className="casual-row" />
              <span className="casual-row" />
              <span className="casual-row" />
              <span className="casual-card" />
            </div>
            <h2>Casual Sticky Notes</h2>
            <p>A fast, searchable list with flashcards — same notes, study-ready.</p>
            <span className="choice-cta">Open the List →</span>
          </button>
        </div>
      </div>
    </div>
  )
}
