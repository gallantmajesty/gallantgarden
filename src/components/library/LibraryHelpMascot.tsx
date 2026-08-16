import { useEffect, useRef, useState } from 'react'
import { GHOST_MASCOT } from '../../lib/mascotGhost'
import './LibraryHelpMascot.css'

/* Max the ghost — a tiny floating helper at the top-left of the Library
   (and UK Café, which shares the same controls). Click him to open the
   controls guide; click anywhere else or press Esc to close. */

const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Look around',
    rows: [
      ['Mouse drag', 'Orbit your view around your desk'],
      ['F1 / F2', 'First / third-person camera'],
    ],
  },
  {
    title: 'Camera views',
    rows: [
      ['1 – 8', 'Switch between library views'],
      ['9', 'Cinematic tour'],
    ],
  },
]

export function LibraryHelpMascot() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Esc (only while open).
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="lhm" ref={ref}>
      <button
        className={`lhm-btn${open ? ' on' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="How to use the Library"
        aria-label="How to use the Library — controls guide"
      >
        <img className="lhm-img" src={GHOST_MASCOT.happy} alt="" draggable={false} />
        <span className="lhm-badge">?</span>
      </button>

      {open && (
        <div className="lhm-panel" role="dialog" aria-label="Library controls guide">
          <div className="lhm-hero">
            <img className="lhm-hero-face" src={GHOST_MASCOT.happy} alt="" draggable={false} />
            <div>
              <div className="lhm-title">How to use the Library</div>
              <div className="lhm-hero-sub">
                You're seated at your desk — drag to look around, the keys move your view.
              </div>
            </div>
            <button className="lhm-close" onClick={() => setOpen(false)} aria-label="Close guide">
              ✕
            </button>
          </div>

          <div className="lhm-body">
            {SECTIONS.map((sec) => (
              <div key={sec.title} className="lhm-sec">
                <div className="lhm-sec-title">{sec.title}</div>
                {sec.rows.map(([k, v]) => (
                  <div key={k} className="lhm-row">
                    <kbd className="lhm-key">{k}</kbd>
                    <span className="lhm-desc">{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="lhm-foot">
            <span className="lhm-foot-ghost">👻</span>
            {`the forest is yours — take it slow and soak it in.`}
          </div>
        </div>
      )}
    </div>
  )
}
