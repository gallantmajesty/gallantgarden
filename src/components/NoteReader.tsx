import { useState } from 'react'
import DOMPurify from 'dompurify'
import type { StickyNote } from '../lib/types'
import { noteBackground } from '../lib/noteStyle'
import './NoteReader.css'

export function NoteReader({ note, onClose }: { note: StickyNote; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false)
  const bg = noteBackground(note)

  return (
    <div className="nr-overlay" onClick={onClose}>
      <div className="nr-stage" onClick={(e) => e.stopPropagation()}>
        <div
          className={`nr-card ${note.is_flashcard ? 'flashcard' : ''} ${flipped ? 'flipped' : ''}`}
          style={{
            background: bg,
            color: note.font_color,
            fontFamily: note.font_family,
            fontSize: Math.max(note.font_size, 18),
          }}
          onClick={() => note.is_flashcard && setFlipped((v) => !v)}
        >
          <span className="note3d-pin" />
          {!flipped ? (
            <>
              {note.image_url && <img className="nr-img" src={note.image_url} alt="" />}
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content_html) }} />
            </>
          ) : (
            <div className="nr-back">{note.flashcard_back || '(no answer yet)'}</div>
          )}
          {note.is_flashcard && <span className="nr-flip-hint">Tap to flip</span>}
        </div>
        <button className="sf-btn ghost nr-close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
