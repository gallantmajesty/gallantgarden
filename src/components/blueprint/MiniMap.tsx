import { memo, useRef, useCallback } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { nodesBounds } from '../../lib/blueprint/geom'

const W = 200
const H = 132

// Interactive minimap — click/drag to pan, scroll to zoom, touch two-finger to pan.
export const MiniMap = memo(function MiniMap() {
  const nodes = useBlueprint((s) => s.doc.nodes)
  const vp = useBlueprint((s) => s.viewport)
  const setViewport = useBlueprint((s) => s.setViewport)
  const dragRef = useRef(false)

  if (nodes.length === 0) return null

  const b = nodesBounds(nodes, 120)
  const scale = Math.min(W / b.w, H / b.h)
  const ox = (W - b.w * scale) / 2
  const oy = (H - b.h * scale) / 2
  const toMini = (wx: number, wy: number) => ({ x: ox + (wx - b.x) * scale, y: oy + (wy - b.y) * scale })

  // visible world rectangle
  const viewW = window.innerWidth / vp.zoom
  const viewH = window.innerHeight / vp.zoom
  const viewWorldX = -vp.x / vp.zoom
  const viewWorldY = -vp.y / vp.zoom
  const vTL = toMini(viewWorldX, viewWorldY)

  function miniToWorld(mx: number, my: number) {
    return { x: (mx - ox) / scale + b.x, y: (my - oy) / scale + b.y }
  }

  function jumpTo(wx: number, wy: number) {
    setViewport({ ...vp, x: window.innerWidth / 2 - wx * vp.zoom, y: window.innerHeight / 2 - wy * vp.zoom })
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault()
    dragRef.current = true
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const rect = (e.currentTarget as Element).getBoundingClientRect()
    const { x: wx, y: wy } = miniToWorld(e.clientX - rect.left, e.clientY - rect.top)
    jumpTo(wx, wy)
    useBlueprint.getState().flush()
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const rect = (e.currentTarget as Element).getBoundingClientRect()
    const { x: wx, y: wy } = miniToWorld(e.clientX - rect.left, e.clientY - rect.top)
    jumpTo(wx, wy)
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = false
    try { (e.target as Element).releasePointerCapture(e.pointerId) } catch {}
    useBlueprint.getState().flush()
  }

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(5, Math.max(0.1, vp.zoom * factor))
    setViewport({ ...vp, zoom: newZoom })
    useBlueprint.getState().flush()
  }, [vp, setViewport])

  return (
    <div
      className="bp-minimap bp-surface"
      style={{ width: W, height: H, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      <svg width={W} height={H}>
        {nodes.map((n) => {
          const p = toMini(n.x, n.y)
          return (
            <rect key={n.id} x={p.x} y={p.y} width={Math.max(2, n.w * scale)} height={Math.max(2, n.h * scale)}
              rx={2} className="bp-mini-node" />
          )
        })}
        <rect x={vTL.x} y={vTL.y} width={viewW * scale} height={viewH * scale} className="bp-mini-view" />
      </svg>
      <div className="bp-minimap-label">{Math.round(vp.zoom * 100)}%</div>
    </div>
  )
})
