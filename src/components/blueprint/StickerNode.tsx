import { memo, useRef } from 'react'
import { useBlueprint } from '../../store/blueprint'
import type { BlueprintNode } from '../../lib/blueprint/types'

interface StickerNodeProps {
  node: BlueprintNode
  zoom: number
  selected?: boolean
  dimmed?: boolean
}

export const StickerNode = memo(function StickerNode({ node, zoom, selected, dimmed }: StickerNodeProps) {
  const select = useBlueprint((s) => s.select)
  const setHoverNode = useBlueprint((s) => s.setHoverNode)
  const drag = useRef<{ set: string[]; lastX: number; lastY: number } | null>(null)
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    if (node.locked) return
    if (e.button !== 0) return
    e.stopPropagation()
    const st = useBlueprint.getState()
    const isSel = st.selection.includes(node.id)
    if (!isSel) st.select(node.id, e.shiftKey)
    const set = st.selection.includes(node.id) ? st.selection : [node.id]
    st.pushHistory()
    drag.current = { set: [...set], lastX: e.clientX, lastY: e.clientY }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.lastX) / zoom
    const dy = (e.clientY - d.lastY) / zoom
    d.lastX = e.clientX
    d.lastY = e.clientY
    useBlueprint.getState().moveBy(d.set, dx, dy)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!drag.current) return
    drag.current = null
    const st = useBlueprint.getState()
    if (st.doc.snap) {
      const sx = Math.round(node.x / st.doc.grid) * st.doc.grid
      const sy = Math.round(node.y / st.doc.grid) * st.doc.grid
      st.setNodeRect(node.id, { x: sx, y: sy })
    }
    st.flush()
    try { (e.target as Element).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }

  function onResizeDown(e: React.PointerEvent) {
    e.stopPropagation()
    if (node.locked) return
    useBlueprint.getState().pushHistory()
    resize.current = { x: e.clientX, y: e.clientY, w: node.w, h: node.h }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function onResizeMove(e: React.PointerEvent) {
    const r = resize.current
    if (!r) return
    const sz = Math.max(40, r.w + (e.clientX - r.x) / zoom)
    useBlueprint.getState().setNodeRect(node.id, { w: sz, h: sz })
  }
  function onResizeUp() {
    if (!resize.current) return
    resize.current = null
    useBlueprint.getState().flush()
  }

  const stickerUrl = node.style.stickerUrl
  const text = node.style.stickerText
  const rotation = node.style.stickerRotation ?? 0

  return (
    <div
      data-node-id={node.id}
      className={`bp-sticker-node ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${node.locked ? 'locked' : ''}`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerEnter={() => setHoverNode(node.id)}
      onPointerLeave={() => setHoverNode(null)}
    >
      {stickerUrl && (
        <img
          src={stickerUrl}
          alt=""
          draggable={false}
          className="bp-sticker-img"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      )}
      {text && <span className="bp-sticker-text">{text}</span>}

      {selected && !node.locked && (
        <>
          <button
            className="bp-sticker-delete"
            title="Delete sticker"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); useBlueprint.getState().deleteNodes([node.id]) }}
          >✕</button>
          <span
            className="bp-resize"
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
          />
        </>
      )}
    </div>
  )
})
