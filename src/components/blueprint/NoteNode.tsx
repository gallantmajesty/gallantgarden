import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { useBlueprint } from '../../store/blueprint'
import { mediaBackgroundStyle, mediaImageStyle, noteSurfaceStyle } from '../../lib/blueprint/style'
import type { BlueprintNode, Port } from '../../lib/blueprint/types'
import { RichText } from './RichText'

interface NoteNodeProps {
  node: BlueprintNode
  selected: boolean
  dimmed: boolean
  /** true while a string is being dragged from any node */
  connecting?: boolean
  /** true when THIS node is the card the dragged string would drop onto */
  connectTarget?: boolean
  onPortDown: (nodeId: string, port: Port, e: React.PointerEvent) => void
}

export function NoteNode({ node, selected, dimmed, connecting, connectTarget, onPortDown }: NoteNodeProps) {
  const zoom = useBlueprint((s) => s.doc.viewport.zoom)
  const snap = useBlueprint((s) => s.doc.snap)
  const grid = useBlueprint((s) => s.doc.grid)
  const select = useBlueprint((s) => s.select)
  const setHoverNode = useBlueprint((s) => s.setHoverNode)
  const moveBy = useBlueprint((s) => s.moveBy)
  const setNodeRect = useBlueprint((s) => s.setNodeRect)
  const setNodeHtml = useBlueprint((s) => s.setNodeHtml)
  const pushHistory = useBlueprint((s) => s.pushHistory)
  const flush = useBlueprint((s) => s.flush)

  const [editing, setEditing] = useState(false)
  const drag = useRef<{ set: string[]; lastX: number; lastY: number; ax: number; ay: number } | null>(null)
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // leave edit mode when this note is no longer the selection
  useEffect(() => {
    if (!selected && editing) setEditing(false)
  }, [selected, editing])

  function onBodyPointerDown(e: React.PointerEvent) {
    if (editing || node.locked) return
    if (e.button !== 0) return
    e.stopPropagation()
    const state = useBlueprint.getState()
    const isSel = state.selection.includes(node.id)
    if (!isSel) select(node.id, e.shiftKey)
    const set = useBlueprint.getState().selection.includes(node.id)
      ? useBlueprint.getState().selection
      : [node.id]
    pushHistory()
    drag.current = { set: [...set], lastX: e.clientX, lastY: e.clientY, ax: 0, ay: 0 }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function onBodyPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.lastX) / zoom
    const dy = (e.clientY - d.lastY) / zoom
    d.lastX = e.clientX
    d.lastY = e.clientY
    moveBy(d.set, dx, dy)
  }

  function onBodyPointerUp(e: React.PointerEvent) {
    if (!drag.current) return
    drag.current = null
    if (snap) {
      // snap the dragged node's top-left to the grid
      const sx = Math.round(node.x / grid) * grid
      const sy = Math.round(node.y / grid) * grid
      setNodeRect(node.id, { x: sx, y: sy })
    }
    flush()
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  function onResizeDown(e: React.PointerEvent) {
    e.stopPropagation()
    if (node.locked) return
    pushHistory()
    resize.current = { x: e.clientX, y: e.clientY, w: node.w, h: node.h }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function onResizeMove(e: React.PointerEvent) {
    const r = resize.current
    if (!r) return
    const w = Math.max(120, r.w + (e.clientX - r.x) / zoom)
    const h = Math.max(70, r.h + (e.clientY - r.y) / zoom)
    setNodeRect(node.id, { w, h })
  }
  function onResizeUp() {
    if (!resize.current) return
    resize.current = null
    flush()
  }

  const surface = noteSurfaceStyle(node.style)
  const media = node.media
  const bgMedia = media?.url && media.place === 'background'

  return (
    <div
      ref={rootRef}
      className={`bp-node shape-${node.style.shape} ${selected ? 'selected' : ''} ${editing ? 'editing' : ''} ${dimmed ? 'dimmed' : ''} ${node.locked ? 'locked' : ''} ${connecting ? 'connecting' : ''} ${connectTarget ? 'drop-target' : ''}`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onBodyPointerMove}
      onPointerUp={onBodyPointerUp}
      onPointerEnter={() => setHoverNode(node.id)}
      onPointerLeave={() => setHoverNode(null)}
      onDoubleClick={(e) => {
        if (node.locked) return
        e.stopPropagation()
        select(node.id)
        setEditing(true)
      }}
    >
      {/* pin head — holds the card to the wall AND is the single string anchor:
          drag it onto another card to thread them together. Shown on every shape
          so linking is one consistent gesture everywhere. */}
      {!node.locked && (
        <span
          className="bp-node-pin"
          title="Drag onto another note to thread them"
          onPointerDown={(e) => {
            e.stopPropagation()
            onPortDown(node.id, 'top', e)
          }}
        >
          <span className="bp-node-pin-ring" />
        </span>
      )}
      <div className="bp-node-surface" style={surface}>
        {node.style.shape === 'folder' && <span className="bp-folder-tab" />}
        {bgMedia && <span className="bp-node-media-bg" style={mediaBackgroundStyle(media!)} aria-hidden />}
        {node.sticker && <span className="bp-node-sticker">{node.sticker}</span>}
        {media?.url && media.place !== 'background' && (
          <img className="bp-node-media" src={media.url} alt="" draggable={false} style={mediaImageStyle(media)} />
        )}
        <div className="bp-node-body">
          {editing ? (
            <RichText html={node.html} onChange={(html) => setNodeHtml(node.id, html)} autoFocus />
          ) : (
            <div className="bp-node-html" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(node.html) }} />
          )}
        </div>
        {node.icon && <span className="bp-node-icon">{node.icon}</span>}
        {node.locked && <span className="bp-node-lock" title="Locked">🔒</span>}
        {node.tags.length > 0 && (
          <div className="bp-node-tags">
            {node.tags.slice(0, 4).map((t) => (
              <span key={t} className="bp-node-tag">#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* resize handle */}
      {selected && !node.locked && (
        <span
          className="bp-resize"
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
        />
      )}

      {/* single "pull a thread" handle — appears on hover, drops anywhere on a
          target card. No fixed port dots. */}
      {!node.locked && (
        <span
          className="bp-connect-handle"
          title="Drag to link this to another note"
          onPointerDown={(e) => {
            e.stopPropagation()
            onPortDown(node.id, 'right', e)
          }}
        >
          <span className="bp-connect-dot" />
        </span>
      )}
    </div>
  )
}
