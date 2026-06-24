import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './FloatingWindow.css'

// A professional desktop-style floating window: draggable by its title bar,
// resizable from the edges/corner, with minimise / maximise / restore / close.
// The Master Calculator opens in one of these (large, centred, ~80% of screen)
// so the platform feels like a real application rather than a web widget.

export interface WindowState {
  x: number
  y: number
  w: number
  h: number
}

interface Props {
  title: string
  icon?: ReactNode
  children: ReactNode
  onClose: () => void
  /** Initial geometry; defaults to a centred ~80%-of-screen window. */
  initial?: Partial<WindowState>
  /** Min content size. */
  minW?: number
  minH?: number
}

function defaultGeometry(): WindowState {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(1100, Math.round(vw * 0.82))
  const h = Math.min(760, Math.round(vh * 0.82))
  return { w, h, x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2) }
}

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export function FloatingWindow({ title, icon, children, onClose, initial, minW = 420, minH = 360 }: Props) {
  const [geo, setGeo] = useState<WindowState>(() => ({ ...defaultGeometry(), ...initial }))
  const [maximized, setMaximized] = useState(false)
  const [minimized, setMinimized] = useState(false)
  // Remember the floating geometry while maximized so Restore returns to it.
  const restoreGeo = useRef<WindowState>(geo)

  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const resize = useRef<{ edge: Edge; sx: number; sy: number; start: WindowState } | null>(null)

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (drag.current) {
      const vw = window.innerWidth, vh = window.innerHeight
      setGeo((g) => {
        const nx = Math.max(-g.w + 120, Math.min(vw - 80, e.clientX - drag.current!.dx))
        const ny = Math.max(0, Math.min(vh - 44, e.clientY - drag.current!.dy))
        return { ...g, x: nx, y: ny }
      })
    } else if (resize.current) {
      const { edge, sx, sy, start } = resize.current
      const dx = e.clientX - sx
      const dy = e.clientY - sy
      setGeo(() => {
        let { x, y, w, h } = start
        if (edge.includes('e')) w = Math.max(minW, start.w + dx)
        if (edge.includes('s')) h = Math.max(minH, start.h + dy)
        if (edge.includes('w')) { w = Math.max(minW, start.w - dx); x = start.x + (start.w - w) }
        if (edge.includes('n')) { h = Math.max(minH, start.h - dy); y = start.y + (start.h - h) }
        return { x, y, w, h }
      })
    }
  }, [minW, minH])

  const onPointerUp = useCallback(() => {
    drag.current = null
    resize.current = null
    document.body.classList.remove('fw-dragging')
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  function startDrag(e: React.PointerEvent) {
    if (maximized) return
    drag.current = { dx: e.clientX - geo.x, dy: e.clientY - geo.y }
    document.body.classList.add('fw-dragging')
  }
  function startResize(edge: Edge, e: React.PointerEvent) {
    if (maximized) return
    e.stopPropagation()
    resize.current = { edge, sx: e.clientX, sy: e.clientY, start: geo }
    document.body.classList.add('fw-dragging')
  }

  function toggleMax() {
    if (maximized) {
      setGeo(restoreGeo.current)
      setMaximized(false)
    } else {
      restoreGeo.current = geo
      setMaximized(true)
    }
  }

  const style: React.CSSProperties = maximized
    ? { left: 0, top: 0, width: '100vw', height: '100svh', borderRadius: 0 }
    : { left: geo.x, top: geo.y, width: geo.w, height: minimized ? undefined : geo.h }

  const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

  return (
    <div className="fw-scrim" onPointerDown={(e) => e.target === e.currentTarget && undefined}>
      <div className={`fw ${maximized ? 'max' : ''} ${minimized ? 'min' : ''}`} style={style} role="dialog" aria-label={title}>
        <div className="fw-bar" onPointerDown={startDrag} onDoubleClick={toggleMax}>
          <div className="fw-bar-title">
            {icon && <span className="fw-bar-icon">{icon}</span>}
            <span>{title}</span>
          </div>
          <div className="fw-bar-actions">
            <button className="fw-ctrl min" title="Minimise" onClick={() => setMinimized((m) => !m)}>—</button>
            <button className="fw-ctrl max" title={maximized ? 'Restore' : 'Maximise'} onClick={toggleMax}>
              {maximized ? '❐' : '▢'}
            </button>
            <button className="fw-ctrl close" title="Close" onClick={onClose}>✕</button>
          </div>
        </div>

        {!minimized && <div className="fw-content">{children}</div>}

        {!maximized && !minimized &&
          EDGES.map((edge) => (
            <div key={edge} className={`fw-resize fw-${edge}`} onPointerDown={(e) => startResize(edge, e)} />
          ))}
      </div>
    </div>
  )
}
