import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useIsMobileOrTablet } from '../hooks/useDevice'
import { MobileShell } from '../components/mobile/MobileShell'
import './Notes.css'

// Hub shown when a student opens "Notes" from the Lobby. Offers the two note
// modes: the Word-like document editor and the existing Sticky Notes board.
export function NotesHub() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const mobile = useIsMobileOrTablet()

  if (mobile) {
    return (
      <MobileShell title="Notes">
        <p style={{ color: 'var(--ms-text-dim)', marginTop: 4 }}>
          Choose how you want to capture your study notes.
        </p>
        <div className="ms-list">
          <button className="card-row" onClick={() => navigate('/notes/doc')}>
            <span className="ms-row-icon"><img src="/icons/notes.png" width={22} height={22} alt="" /></span>
            <span className="ms-row-body">
              <strong>Notes</strong>
              <span>A free-flow, Word-like page. Write, format and decorate.</span>
            </span>
            <span className="ms-row-arrow">›</span>
          </button>

          <div className="card-row" style={{ opacity: 0.6 }}>
            <span className="ms-row-icon"><img src="/icons/notes.png" width={22} height={22} alt="" /></span>
            <span className="ms-row-body">
              <strong>Sticky Notes</strong>
              <span>The visual board — best on a larger screen.</span>
            </span>
            <span className="ms-soon-tag">Desktop</span>
          </div>
        </div>
      </MobileShell>
    )
  }

  return (
    <div className="notes-hub">
      <header className="notes-hub-head">
        <button className="notes-hub-back" onClick={() => navigate(-1)}>‹ Back</button>
        <h1>Notes</h1>
        <p>Choose how you want to capture your study notes.</p>
      </header>

      <div className="notes-hub-grid">
        <button className="notes-hub-card" onClick={() => navigate('/notes/doc')}>
          <div className="notes-hub-card-icon">📝</div>
          <h2>Notes</h2>
          <p>A free-flow, Word-like page. Write, format, paint and decorate — mix your notes your way.</p>
          <span className="notes-hub-go">Open Notes →</span>
        </button>

        <button className="notes-hub-card" onClick={() => navigate('/blueprint')}>
          <div className="notes-hub-card-icon">📌</div>
          <h2>Sticky Notes</h2>
          <p>The visual board. Pin ideas, link them with threads and map out how everything connects.</p>
          <span className="notes-hub-go">Open Sticky Notes →</span>
        </button>
      </div>
    </div>
  )
}
