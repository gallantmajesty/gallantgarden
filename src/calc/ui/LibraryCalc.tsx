import { useCallback, useEffect, useRef, useState } from 'react'
import '../registry' // ensure calculators are registered
import { CATEGORIES, allCalcs, getCalc, type CalcCategoryId, type CalcModule } from '../registry/registry'
import { useKeypad } from '../engine/useKeypad'
import { useKeyboardInput } from '../engine/useKeyboardInput'
import { Keypad } from './Keypad'
import { useCalcPrefs } from '../store/prefs'
import './LibraryCalc.css'

// The in-library calculator. A warm-wood floating panel docked to the RIGHT of
// the Explore HUD. It opens as a small "mini" Basic calculator sitting on the
// lower-right (not jammed in the corner); a ⋮ three-dot menu on its title bar
// switches to any other calculator (scientific, converters, finance, …) pulled
// live from the registry. Picking an advanced/other calculator grows the panel
// to ~a quarter of the screen on the right. The panel is draggable by its title
// bar and resizable from its edges, and supports physical-keyboard input.

interface Geo { x: number; y: number; w: number; h: number }

// The compact "mini" panel is reserved for the Basic calculator; anything else
// is an "advanced/other" calculator and opens at the larger quarter-screen size.
function isMini(id: string): boolean {
  return id === 'basic'
}

// Small mini calc, docked on the right and sitting low (but kept off the very
// corner by a generous bottom margin) — "on the right, below".
function miniGeo(): Geo {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = 288
  const h = 392
  return { w, h, x: vw - w - 26, y: Math.max(84, Math.round(vh - h - 104)) }
}

// Advanced/other calculators: ~a quarter of the screen, docked to the right.
function quarterGeo(): Geo {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.max(340, Math.min(440, Math.round(vw * 0.25)))
  const h = Math.max(460, Math.min(660, Math.round(vh * 0.78)))
  return { w, h, x: vw - w - 26, y: Math.round((vh - h) / 2) }
}

type Edge = 'e' | 'w' | 's' | 'n' | 'se' | 'sw' | 'ne' | 'nw'

export function LibraryCalc({ onClose }: { onClose: () => void }) {
  const [geo, setGeo] = useState<Geo>(miniGeo)
  const [calcId, setCalcId] = useState('basic')
  const [pickerOpen, setPickerOpen] = useState(false)
  const prefs = useCalcPrefs()

  const calc = getCalc(calcId) ?? getCalc('basic')!
  const mini = isMini(calcId)
  // The basic & scientific calculators are keypad-driven and own their state
  // here so keyboard input and the type switch keep a single live keypad.
  const k = useKeypad()
  const isKeypad = calcId === 'basic' || calcId === 'scientific'
  useKeyboardInput(k, isKeypad)

  // mark usage when the calculator type changes
  useEffect(() => { prefs.markUsed(calcId) }, [calcId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-dock the panel only when crossing the mini ↔ advanced boundary: Basic is
  // the small mini panel; picking any other calculator grows it to quarter-screen
  // (and coming back to Basic shrinks it again). Switching between two advanced
  // calculators keeps whatever size the user has dragged it to.
  const prevMini = useRef(mini)
  useEffect(() => {
    if (mini !== prevMini.current) {
      setGeo(mini ? miniGeo() : quarterGeo())
      prevMini.current = mini
    }
  }, [mini])

  // ----- drag + resize (pointer-based, same model as the pro window) -----
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const resize = useRef<{ edge: Edge; sx: number; sy: number; start: Geo } | null>(null)

  const onMove = useCallback((e: PointerEvent) => {
    const vw = window.innerWidth, vh = window.innerHeight
    if (drag.current) {
      setGeo((g) => ({
        ...g,
        x: Math.max(8, Math.min(vw - 80, e.clientX - drag.current!.dx)),
        y: Math.max(8, Math.min(vh - 44, e.clientY - drag.current!.dy)),
      }))
    } else if (resize.current) {
      const { edge, sx, sy, start } = resize.current
      const dx = e.clientX - sx, dy = e.clientY - sy
      setGeo(() => {
        let { x, y, w, h } = start
        const MIN_W = 300, MIN_H = 380
        if (edge.includes('e')) w = Math.max(MIN_W, start.w + dx)
        if (edge.includes('s')) h = Math.max(MIN_H, start.h + dy)
        if (edge.includes('w')) { w = Math.max(MIN_W, start.w - dx); x = start.x + (start.w - w) }
        if (edge.includes('n')) { h = Math.max(MIN_H, start.h - dy); y = start.y + (start.h - h) }
        return { x, y, w, h }
      })
    }
  }, [])

  const onUp = useCallback(() => {
    drag.current = null
    resize.current = null
    document.body.classList.remove('fw-dragging')
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [onMove, onUp])

  function startDrag(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('.lc-no-drag')) return
    drag.current = { dx: e.clientX - geo.x, dy: e.clientY - geo.y }
    document.body.classList.add('fw-dragging')
  }
  function startResize(edge: Edge, e: React.PointerEvent) {
    e.stopPropagation()
    resize.current = { edge, sx: e.clientX, sy: e.clientY, start: geo }
    document.body.classList.add('fw-dragging')
  }

  const EDGES: Edge[] = ['e', 'w', 's', 'n', 'se', 'sw', 'ne', 'nw']
  const Body = calc.Component

  return (
    <div
      className={`lc ${mini ? 'mini' : ''}`}
      style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h }}
      role="dialog"
      aria-label={`${calc.name} calculator`}
    >
      {/* title bar: [⋮ other calcs] · name · close — drag handle */}
      <div className="lc-bar" onPointerDown={startDrag}>
        <button
          className={`lc-dots lc-no-drag ${pickerOpen ? 'on' : ''}`}
          onClick={() => setPickerOpen((o) => !o)}
          title="Other calculators"
          aria-label="Choose another calculator"
        >
          ⋮
        </button>
        <span className="lc-bar-name">{calc.name}</span>
        <div className="lc-bar-actions lc-no-drag">
          <button className="lc-x" onClick={onClose} title="Close calculator" aria-label="Close">✕</button>
        </div>
      </div>

      {pickerOpen && (
        <TypePicker
          activeId={calcId}
          onPick={(id) => { setCalcId(id); setPickerOpen(false) }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <div className="lc-body">
        {isKeypad ? <Keypad k={k} scientific={calcId === 'scientific'} /> : <Body embedded />}
      </div>

      {EDGES.map((edge) => (
        <div key={edge} className={`lc-rz lc-${edge}`} onPointerDown={(e) => startResize(edge, e)} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- type picker */

function TypePicker({
  activeId,
  onPick,
  onClose,
}: {
  activeId: string
  onPick: (id: string) => void
  onClose: () => void
}) {
  const [cat, setCat] = useState<CalcCategoryId | 'all'>('all')
  const [q, setQ] = useState('')

  const list: CalcModule[] = allCalcs()
    .filter((c) => (cat === 'all' ? true : c.category === cat))
    .filter((c) => (q ? (c.name + ' ' + c.keywords.join(' ')).toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || a.name.localeCompare(b.name))

  return (
    <>
      <div className="lc-picker-scrim" onPointerDown={onClose} />
      <div className="lc-picker lc-no-drag" role="menu">
        <input
          className="lc-picker-search"
          autoFocus
          placeholder="Search calculators…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="lc-picker-cats">
          <button className={`lc-cat ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>All</button>
          {CATEGORIES.filter((c) => c.id !== 'featured').map((c) => (
            <button key={c.id} className={`lc-cat ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="lc-picker-list">
          {list.map((c) => (
            <button
              key={c.id}
              className={`lc-picker-item ${c.id === activeId ? 'on' : ''}`}
              onClick={() => onPick(c.id)}
            >
              <strong>{c.name}</strong>
              <small>{c.description}</small>
            </button>
          ))}
          {list.length === 0 && <p className="lc-picker-empty">No calculators match.</p>}
        </div>
      </div>
    </>
  )
}
