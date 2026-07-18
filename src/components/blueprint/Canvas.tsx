import { memo, useEffect, useRef, useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { autoPorts, screenToWorld } from '../../lib/blueprint/geom'
import type { Pt } from '../../lib/blueprint/geom'

import { NoteNode } from './NoteNode'
import { EdgesLayer } from './EdgesLayer'
import { MiniMap } from './MiniMap'

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3.0
const ZOOM_SENSITIVITY = 0.0012
const GRID_SIZE = 28

interface WorldLayerProps {
  vp: { x: number; y: number; zoom: number }
  nodes: ReturnType<typeof useBlueprint.getState>['doc']['nodes']
  selection: string[]
  pendingFrom: string | null
  preview: { from: ReturnType<typeof useBlueprint.getState>['doc']['nodes'][number]; fromPort: 'top' | 'right' | 'bottom' | 'left'; to: Pt } | null
  onDoubleTap: (id: string) => void
  onPortDown: (id: string, e: React.PointerEvent) => void
}

// Isolated so viewport changes (pan/zoom) only re-render THIS component, not
// Canvas — and the memoized <NoteNode> children skip re-render when their
// `node` prop is unchanged.
const WorldLayer = memo(function WorldLayer({ vp, nodes, selection, pendingFrom, preview, onDoubleTap, onPortDown }: WorldLayerProps) {
  const selectionSet = new Set(selection)
  return (
    <div
      className="bp-world"
      style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` }}
    >
      <EdgesLayer preview={preview} />
      {nodes.map((n) => (
        <NoteNode
          key={n.id}
          node={n}
          zoom={vp.zoom}
          selected={selectionSet.has(n.id)}
          dimmed={false}
          connectSource={pendingFrom === n.id}
          onDoubleTap={onDoubleTap}
          onPortDown={onPortDown}
        />
      ))}
    </div>
  )
})

export function Canvas() {
  const ref = useRef<HTMLDivElement>(null)
  const vp = useBlueprint((s) => s.viewport)
  const nodes = useBlueprint((s) => s.doc.nodes)
  const selection = useBlueprint((s) => s.selection)
  const focusTypeId = useBlueprint((s) => s.focus.typeId)
  const pendingFrom = useBlueprint((s) => s.pendingFrom)
  const setViewport = useBlueprint((s) => s.setViewport)
  const selectMany = useBlueprint((s) => s.selectMany)
  const clearSelection = useBlueprint((s) => s.clearSelection)
  const setFocus = useBlueprint((s) => s.setFocus)
  const addEdge = useBlueprint((s) => s.addEdge)
  const setPendingFrom = useBlueprint((s) => s.setPendingFrom)

  function arm(id: string | null) {
    setPendingFrom(id)
  }
  const [cursor, setCursor] = useState<Pt | null>(null)
  // note hovered by the bottom-center drag tool (preview source before arming)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)

  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)

  const pan = useRef<{ x: number; y: number; vx: number; vy: number; lastX: number; lastY: number } | null>(null)
  const marqueeRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const wheelTimeout = useRef<number>(0)

  const isEmpty = nodes.length === 0

  // Keyboard: Space for pan mode, Escape cancels a pending connection
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat && document.activeElement === document.body) {
        e.preventDefault()
        setSpacePressed(true)
      }
      if (e.code === 'Escape') {
        arm(null)
        setCursor(null)
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
      const cur = useBlueprint.getState().viewport
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

    // a click on empty canvas cancels any pending thread
    if (e.button === 0) {
      arm(null)
      setCursor(null)
    }

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

  const cursorThrottle = useRef<number>(0)

  function onBgPointerMove(e: React.PointerEvent) {
    if (pan.current) {
      const p = pan.current
      p.lastX = e.clientX
      p.lastY = e.clientY
      setViewport({ ...useBlueprint.getState().viewport, x: p.vx + (e.clientX - p.x), y: p.vy + (e.clientY - p.y) })
      return
    }
    if (marqueeRef.current) {
      const rect = ref.current!.getBoundingClientRect()
      const m = { ...marqueeRef.current, x1: e.clientX - rect.left, y1: e.clientY - rect.top }
      setMarquee(m)
      marqueeRef.current = m
    }
    // while a thread is pending, track the cursor so its preview follows (throttled)
    if (pendingFrom) {
      const now = performance.now()
      if (now - cursorThrottle.current < 16) return
      cursorThrottle.current = now
      const rect = ref.current!.getBoundingClientRect()
      const c = useBlueprint.getState().viewport
      setCursor(screenToWorld(e.clientX - rect.left, e.clientY - rect.top, c))
    }
  }

  function onBgPointerUp(e: React.PointerEvent) {
    if (pan.current) {
      pan.current = null
      useBlueprint.getState().flush()
    }
    if (marqueeRef.current) {
      const m = marqueeRef.current
      const cur = useBlueprint.getState().viewport
      const a = screenToWorld(Math.min(m.x0, m.x1), Math.min(m.y0, m.y1), cur)
      const b = screenToWorld(Math.max(m.x0, m.x1), Math.max(m.y0, m.y1), cur)
      const hit = nodes.filter((n) => n.x + n.w >= a.x && n.x <= b.x && n.y + n.h >= a.y && n.y <= b.y)
      if (Math.abs(m.x1 - m.x0) > 6 && hit.length) selectMany(hit.map((n) => n.id))
      marqueeRef.current = null
      setMarquee(null)
    }
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }

  // Double-tap a note to arm it as a hub; keep double-tapping other notes
  // to thread them all (each link uses the active type from the bar).
  // Disarm by double-tapping the source again, clicking empty space, or Esc.
  function handleDoubleTap(nodeId: string) {
    if (pendingFrom == null) {
      arm(nodeId)
      return
    }
    if (pendingFrom === nodeId) {
      arm(null)
      setCursor(null)
      return
    }
    const from = useBlueprint.getState().doc.nodes.find((n) => n.id === pendingFrom)
    const to = useBlueprint.getState().doc.nodes.find((n) => n.id === nodeId)
    const activeTypeId = useBlueprint.getState().activeTypeId || 'link'
    if (from && to) {
      const { fromPort, toPort } = autoPorts(from, to)
      addEdge(from.id, fromPort, to.id, toPort, activeTypeId)
    }
    // stay armed so the hub can connect to many notes in a row
    setCursor(null)
  }

  // Drag directly from a note's bottom port onto another note to link them
  // (node-graph style, one-step). Arms this note as the source, tracks the
  // cursor for the live preview, and draws the edge on release.
  function onPortDown(nodeId: string, e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    arm(nodeId)
    const rect = ref.current!.getBoundingClientRect()
    const move = (ev: PointerEvent) => {
      const c = useBlueprint.getState().viewport
      const w = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, c)
      setCursor(w)
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const tid = (el?.closest('[data-node-id]') as HTMLElement | null)?.getAttribute('data-node-id') || null
      setDragSourceId(tid && tid !== nodeId ? tid : null)
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const st = useBlueprint.getState()
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const tid = (el?.closest('[data-node-id]') as HTMLElement | null)?.getAttribute('data-node-id') || null
      const activeTypeId = st.activeTypeId || 'link'
      if (tid && tid !== nodeId) {
        const from = st.doc.nodes.find((n) => n.id === nodeId)
        const to = st.doc.nodes.find((n) => n.id === tid)
        if (from && to) {
          const { fromPort, toPort } = autoPorts(from, to)
          addEdge(from.id, fromPort, to.id, toPort, activeTypeId)
        }
      }
      arm(null)
      setCursor(null)
      setDragSourceId(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const pendingNode = pendingFrom ? nodes.find((n) => n.id === pendingFrom) ?? null : null
  const dragSourceNode = dragSourceId ? nodes.find((n) => n.id === dragSourceId) ?? null : null
  const previewFrom = pendingNode ?? dragSourceNode
  const preview = previewFrom && cursor ? { from: previewFrom, fromPort: 'right' as const, to: cursor } : null

  const gridStyle = {
    backgroundSize: `${vp.zoom * GRID_SIZE}px ${vp.zoom * GRID_SIZE}px`,
    backgroundPosition: `${vp.x}px ${vp.y}px`,
    opacity: Math.min(1, vp.zoom * 0.8),
  }

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
    'radial-gradient(circle, rgba(35,37,47,0.05) 1px, transparent 1px)',
}} />

{/* World container — isolated so viewport changes don't re-render Canvas */}
<WorldLayer
  vp={vp}
  nodes={nodes}
  selection={selection}
  pendingFrom={pendingFrom}
  preview={preview}
  onDoubleTap={handleDoubleTap}
  onPortDown={onPortDown}
/>

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
    <p>Add a note or use the connection bar to link your ideas. Press Esc or click empty space to finish.</p>
  </div>
)}

      {/* Minimap */}
      <MiniMap />

    </div>
  )
}
