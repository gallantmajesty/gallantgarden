import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { screenToWorld, autoPorts } from '../../lib/blueprint/geom'
import type { Pt } from '../../lib/blueprint/geom'
import type { BlueprintNode, Port } from '../../lib/blueprint/types'

import { N8nNoteNode } from './N8nNoteNode'
import { N8nEdgesLayer } from './N8nEdgesLayer'

interface Connecting {
  from: BlueprintNode
  fromPort: Port
  to: Pt
}

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3.0
const ZOOM_SENSITIVITY = 0.0012
const GRID_SIZE = 28

export function Canvas() {
  const ref = useRef<HTMLDivElement>(null)
  const vp = useBlueprint((s) => s.doc.viewport)
  const nodes = useBlueprint((s) => s.doc.nodes)
  
  const selection = useBlueprint((s) => s.selection)
  const focusTypeId = useBlueprint((s) => s.focus.typeId)
  
  const setViewport = useBlueprint((s) => s.setViewport)
  const selectMany = useBlueprint((s) => s.selectMany)
  const clearSelection = useBlueprint((s) => s.clearSelection)
  const setFocus = useBlueprint((s) => s.setFocus)
  const addEdge = useBlueprint((s) => s.addEdge)

  const [connecting, setConnecting] = useState<Connecting | null>(null)
  
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)

  const pan = useRef<{ x: number; y: number; vx: number; vy: number; lastX: number; lastY: number } | null>(null)
  const marqueeRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const wheelTimeout = useRef<number>(0)

  

  const isEmpty = nodes.length === 0

  // Keyboard: Space for pan mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat && document.activeElement === document.body) {
        e.preventDefault()
        setSpacePressed(true)
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        setSpacePressed(false)
        pan.current = null
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Smooth zoom toward cursor with throttling
  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const now = performance.now()
      if (now - wheelTimeout.current < 16) return
      wheelTimeout.current = now

      const rect = el!.getBoundingClientRect()
      const cur = useBlueprint.getState().doc.viewport
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const delta = -e.deltaY * ZOOM_SENSITIVITY
      const factor = Math.exp(delta)
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * factor))

      const wx = (mx - cur.x) / cur.zoom
      const wy = (my - cur.y) / cur.zoom
      setViewport({
        zoom,
        x: mx - wx * zoom,
        y: my - wy * zoom,
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setViewport])

  function onBgPointerDown(e: React.PointerEvent) {
    if (e.target !== e.currentTarget) return

    const spacePan = spacePressed || e.button === 1 || e.button === 2 || (e as unknown as { getModifierState?: (k: string) => boolean }).getModifierState?.('Space')

    if (spacePan || e.button === 1) {
      e.preventDefault()
      pan.current = {
        x: e.clientX,
        y: e.clientY,
        vx: vp.x,
        vy: vp.y,
        lastX: e.clientX,
        lastY: e.clientY,
      }
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      return
    }

    if (e.button === 0) {
      clearSelection()
      if (focusTypeId) setFocus(null)
      const rect = ref.current!.getBoundingClientRect()
      const m = {
        x0: e.clientX - rect.left,
        y0: e.clientY - rect.top,
        x1: e.clientX - rect.left,
        y1: e.clientY - rect.top,
      }
      setMarquee(m)
      marqueeRef.current = m
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    }
  }

  function onBgPointerMove(e: React.PointerEvent) {
    if (pan.current) {
      const p = pan.current
      p.lastX = e.clientX
      p.lastY = e.clientY
      setViewport({ ...useBlueprint.getState().doc.viewport, x: p.vx + (e.clientX - p.x), y: p.vy + (e.clientY - p.y) })
      return
    }
    if (marqueeRef.current) {
      const rect = ref.current!.getBoundingClientRect()
      const m = { ...marqueeRef.current, x1: e.clientX - rect.left, y1: e.clientY - rect.top }
      setMarquee(m)
      marqueeRef.current = m
    }
  }

  function onBgPointerUp(e: React.PointerEvent) {
    if (pan.current) {
      pan.current = null
      useBlueprint.getState().flush()
    }
    if (marqueeRef.current) {
      const m = marqueeRef.current
      const cur = useBlueprint.getState().doc.viewport
      const a = screenToWorld(Math.min(m.x0, m.x1), Math.min(m.y0, m.y1), cur)
      const b = screenToWorld(Math.max(m.x0, m.x1), Math.max(m.y0, m.y1), cur)
      const hit = nodes.filter((n) => n.x + n.w >= a.x && n.x <= b.x && n.y + n.h >= a.y && n.y <= b.y)
      if (Math.abs(m.x1 - m.x0) > 6 && hit.length) selectMany(hit.map((n) => n.id))
      marqueeRef.current = null
      setMarquee(null)
    }
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }

  function nodeAt(w: Pt, excludeId: string): BlueprintNode | null {
    const list = useBlueprint.getState().doc.nodes
    for (let i = list.length - 1; i >= 0; i--) {
      const n = list[i]
      if (n.id !== excludeId && w.x >= n.x && w.x <= n.x + n.w && w.y >= n.y && w.y <= n.y + n.h) return n
    }
    let best: BlueprintNode | null = null
    let bestD = Infinity
    const tol = 100
    for (const n of list) {
      if (n.id === excludeId) continue
      const cx = Math.max(n.x, Math.min(w.x, n.x + n.w))
      const cy = Math.max(n.y, Math.min(w.y, n.y + n.h))
      const d = Math.hypot(w.x - cx, w.y - cy)
      if (d < tol && d < bestD) { best = n; bestD = d }
    }
    return best
  }

  function startConnect(nodeId: string, port: Port, e: React.PointerEvent) {
    console.log('startConnect called:', { nodeId, port })
    const from = useBlueprint.getState().doc.nodes.find((n) => n.id === nodeId)
    if (!from) {
      console.log('Node not found:', nodeId)
      return
    }
    const activeTypeId = useBlueprint.getState().activeTypeId
    console.log('Active connection type:', activeTypeId)
    const rect = ref.current!.getBoundingClientRect()
    const cur = useBlueprint.getState().doc.viewport
    const to = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, cur)
    console.log('Setting connecting state:', { from: from.id, fromPort: port, to })
    setConnecting({ from, fromPort: port, to })

    const handleMove = (ev: PointerEvent) => {
      const c = useBlueprint.getState().doc.viewport
      const w = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, c)
      setConnecting((p) => (p ? { ...p, to: w } : p))
    }

    const handleUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      const c = useBlueprint.getState().doc.viewport
      const w = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, c)
      const target = nodeAt(w, nodeId)
      const activeTypeId = useBlueprint.getState().activeTypeId
      
      console.log('Connection attempt:', {
        from: from.id,
        to: target?.id,
        activeTypeId,
        targetFound: !!target,
        differentNode: target && target.id !== nodeId
      })
      
      if (target && target.id !== nodeId && activeTypeId) {
        const { fromPort, toPort } = autoPorts(from, target)
        console.log('Adding edge:', { from: from.id, fromPort, to: target.id, toPort, typeId: activeTypeId })
        addEdge(from.id, fromPort, target.id, toPort, activeTypeId)
      } else {
        console.log('Connection failed:', {
          target: target?.id,
          sameNode: target && target.id === nodeId,
          noActiveType: !activeTypeId
        })
      }
      setConnecting(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  

  const gridStyle = useMemo(() => ({
    backgroundSize: `${vp.zoom * GRID_SIZE}px ${vp.zoom * GRID_SIZE}px`,
    backgroundPosition: `${vp.x}px ${vp.y}px`,
    opacity: Math.min(1, vp.zoom * 0.8),
  }), [vp.zoom, vp.x, vp.y])

  return (
    <div
      ref={ref}
      className={`bp-canvas ${spacePressed ? 'space-pan' : ''}`}
      onPointerDown={onBgPointerDown}
      onPointerMove={onBgPointerMove}
      onPointerUp={onBgPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      role="application"
      aria-label="Sticky notes canvas"
    >
{/* Dark investigation grid */}
<div className="bp-grid" style={{
  ...gridStyle,
  backgroundColor: 'transparent',
  backgroundImage:
    'radial-gradient(circle, rgba(255,245,225,0.06) 1px, transparent 1px)',
}} />

{/* World container */}
      <div
        className="bp-world"
        style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` }}
      >
<N8nEdgesLayer preview={connecting ? { from: connecting.from, fromPort: connecting.fromPort, to: connecting.to } : null} />
{nodes.map((n) => (
<N8nNoteNode
  key={n.id}
  node={n}
  selected={selection.includes(n.id)}
  validInputs={new Set(nodes.filter((x) => x.id !== n.id).map((x) => x.id))}
  dragSourceId={connecting?.from.id ?? null}
  previewTo={connecting?.to}
  onPortDown={startConnect}
/>
))}
      </div>

      {/* Marquee selection */}
      {marquee && Math.abs(marquee.x1 - marquee.x0) > 3 && (
        <div
          className="bp-marquee"
          style={{
            left: Math.min(marquee.x0, marquee.x1),
            top: Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0),
            height: Math.abs(marquee.y1 - marquee.y0),
          }}
        />
      )}

      {/* Empty state */}
{isEmpty && (
  <div className="bp-empty-state">
    <div className="bp-empty-icon">📌</div>
    <h2>This board is clear</h2>
    <p>Double-click to pin a note, or use the toolbar to add shapes and strings</p>
  </div>
)}
    </div>
  )
}
