import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { screenToWorld, autoPorts, type Pt } from '../../lib/blueprint/geom'
import type { BlueprintNode, Port } from '../../lib/blueprint/types'
import { NoteNode } from './NoteNode'
import { EdgesLayer } from './EdgesLayer'

interface Connecting {
  from: BlueprintNode
  fromPort: Port
  to: Pt // world
}

interface Marquee {
  x0: number
  y0: number
  x1: number
  y1: number
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2.6

export function Canvas() {
  const ref = useRef<HTMLDivElement>(null)
  const vp = useBlueprint((s) => s.doc.viewport)
  const nodes = useBlueprint((s) => s.doc.nodes)
  const edges = useBlueprint((s) => s.doc.edges)
  const selection = useBlueprint((s) => s.selection)
  const focusTypeId = useBlueprint((s) => s.focus.typeId)
  const hoverNodeId = useBlueprint((s) => s.hoverNodeId)
  const setViewport = useBlueprint((s) => s.setViewport)
  const selectMany = useBlueprint((s) => s.selectMany)
  const clearSelection = useBlueprint((s) => s.clearSelection)
  const setFocus = useBlueprint((s) => s.setFocus)
  const addEdge = useBlueprint((s) => s.addEdge)

  const [connecting, setConnecting] = useState<Connecting | null>(null)
  const [connectTarget, setConnectTarget] = useState<string | null>(null)
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const marqueeRef = useRef<Marquee | null>(null)

  // which nodes are highlighted in focus mode (touched by an edge of the type)
  const focusNodes = useMemo(() => {
    if (!focusTypeId) return null
    const ids = new Set<string>()
    edges.forEach((e) => {
      if (e.typeId === focusTypeId) {
        ids.add(e.from)
        ids.add(e.to)
      }
    })
    return ids
  }, [focusTypeId, edges])

  // the "case" being traced: the hovered card + everything one thread away.
  const tracedNodes = useMemo(() => {
    if (!hoverNodeId) return null
    const ids = new Set<string>([hoverNodeId])
    edges.forEach((e) => {
      if (e.from === hoverNodeId) ids.add(e.to)
      if (e.to === hoverNodeId) ids.add(e.from)
    })
    return ids
  }, [hoverNodeId, edges])

  // ---- zoom (wheel, toward cursor) ----
  useEffect(() => {
    const el = ref.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = el!.getBoundingClientRect()
      const cur = useBlueprint.getState().doc.viewport
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
        const factor = Math.exp(-e.deltaY * 0.0016)
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * factor))
        // keep the world point under the cursor fixed
        const wx = (mx - cur.x) / cur.zoom
        const wy = (my - cur.y) / cur.zoom
        setViewport({ zoom, x: mx - wx * zoom, y: my - wy * zoom })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setViewport])

  // ---- background pointer: pan (right/middle/space) or marquee (left) ----
  function onBgPointerDown(e: React.PointerEvent) {
    if (e.target !== e.currentTarget) return // only when hitting empty canvas
    const spacePan = (e as unknown as { getModifierState?: (k: string) => boolean }).getModifierState?.('Space')
    if (e.button === 1 || e.button === 2 || spacePan) {
      pan.current = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y }
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      return
    }
    if (e.button === 0) {
      clearSelection()
      if (focusTypeId) setFocus(null)
      const rect = ref.current!.getBoundingClientRect()
      const m = { x0: e.clientX - rect.left, y0: e.clientY - rect.top, x1: e.clientX - rect.left, y1: e.clientY - rect.top }
      setMarquee(m)
      marqueeRef.current = m
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    }
  }

  function onBgPointerMove(e: React.PointerEvent) {
    if (pan.current) {
      const p = pan.current
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
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  // ---- drag-to-connect from a node port ----
  // Find the note under (or nearest to, within tolerance) a world point — so a
  // string snaps to a card even on a slightly-loose drop. Returns null on empty.
  function nodeAt(w: Pt, excludeId: string): BlueprintNode | null {
    const list = useBlueprint.getState().doc.nodes
    // direct hit first (top-most wins)
    for (let i = list.length - 1; i >= 0; i--) {
      const n = list[i]
      if (n.id !== excludeId && w.x >= n.x && w.x <= n.x + n.w && w.y >= n.y && w.y <= n.y + n.h) return n
    }
    // else snap to the nearest card whose centre is within a forgiving radius
    let best: BlueprintNode | null = null
    let bestD = Infinity
    const tol = 90 // world units of slack around a card
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
    const from = useBlueprint.getState().doc.nodes.find((n) => n.id === nodeId)
    if (!from) return
    const rect = ref.current!.getBoundingClientRect()
    const cur = useBlueprint.getState().doc.viewport
    const to = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, cur)
    setConnecting({ from, fromPort: port, to })
    setConnectTarget(null)
    // Drive the whole gesture off window listeners (no pointer capture on the
    // canvas — capturing there fought with the canvas's own pointer handlers and
    // could swallow the drop). Window-level move/up never miss the gesture.
    function move(ev: PointerEvent) {
      const c = useBlueprint.getState().doc.viewport
      const w = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, c)
      setConnecting((p) => (p ? { ...p, to: w } : p))
      const t = nodeAt(w, nodeId)
      setConnectTarget(t ? t.id : null)
    }
    function up(ev: PointerEvent) {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const c = useBlueprint.getState().doc.viewport
      const w = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, c)
      const target = nodeAt(w, nodeId)
      if (target) {
        const { fromPort, toPort } = autoPorts(from!, target)
        addEdge(from!.id, fromPort, target.id, toPort, useBlueprint.getState().activeTypeId)
      }
      setConnecting(null)
      setConnectTarget(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const gridStyle = {
    backgroundSize: `${vp.zoom * 24}px ${vp.zoom * 24}px`,
    backgroundPosition: `${vp.x}px ${vp.y}px`,
  }

  return (
    <div
      ref={ref}
      className="bp-canvas"
      onPointerDown={onBgPointerDown}
      onPointerMove={onBgPointerMove}
      onPointerUp={onBgPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="bp-grid" style={gridStyle} />
      <div
        className="bp-world"
        style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` }}
      >
        <EdgesLayer preview={connecting} />
        {nodes.map((n) => (
          <NoteNode
            key={n.id}
            node={n}
            selected={selection.includes(n.id)}
            dimmed={(!!focusNodes && !focusNodes.has(n.id)) || (!!tracedNodes && !tracedNodes.has(n.id))}
            connecting={!!connecting}
            connectTarget={connectTarget === n.id}
            onPortDown={startConnect}
          />
        ))}
      </div>

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
    </div>
  )
}
