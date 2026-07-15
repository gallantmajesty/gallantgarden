import { useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { useBlueprint } from '../../store/blueprint'
import { mediaBackgroundStyle, mediaImageStyle, noteSurfaceStyle } from '../../lib/blueprint/style'
import type { BlueprintNode } from '../../lib/blueprint/types'
import { RichText } from './RichText'

interface NoteNodeProps {
  node: BlueprintNode
  selected?: boolean
  dimmed?: boolean
  /** true when this node is the armed source of a pending thread */
  connectSource?: boolean
  onDoubleTap?: (nodeId: string) => void
  /** start a drag-to-connect from this note's bottom port */
  onPortDown?: (nodeId: string, e: React.PointerEvent) => void
}

export function NoteNode({ node, selected, dimmed, connectSource, onDoubleTap, onPortDown }: NoteNodeProps) {
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
  // colour the bottom port with the active connection type
  const activeYarnColor = useBlueprint((s) => s.activeYarnColor)
  const activeTypeId = useBlueprint((s) => s.activeTypeId)
  const connectionTypes = useBlueprint((s) => s.doc.connectionTypes)
  const portColor =
    activeYarnColor ?? connectionTypes.find((t) => t.id === activeTypeId)?.color ?? '#B79CFF'

  const [editing, setEditing] = useState(false)
  const drag = useRef<{ set: string[]; lastX: number; lastY: number; ax: number; ay: number } | null>(null)
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

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
      data-node-id={node.id}
      className={`bp-node shape-${node.style.shape} ${selected ? 'selected' : ''} ${editing ? 'editing' : ''} ${dimmed ? 'dimmed' : ''} ${node.locked ? 'locked' : ''} ${connectSource ? 'connect-source' : ''}`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onBodyPointerMove}
      onPointerUp={onBodyPointerUp}
      onPointerEnter={() => setHoverNode(node.id)}
      onPointerLeave={() => setHoverNode(null)}
      onDoubleClick={(e) => {
        if (editing || node.locked) return
        e.stopPropagation()
        onDoubleTap?.(node.id)
      }}
    >
      <div className="bp-node-surface" style={surface}>
        {bgMedia && <span className="bp-node-media-bg" style={mediaBackgroundStyle(media!)} aria-hidden />}
        {media?.url && media.place !== 'background' && (
          <img className="bp-node-media" src={media.url} alt="" draggable={false} style={mediaImageStyle(media)} />
        )}

        {/* Header bar */}
        <div className="bp-node-header">
          <span className="bp-node-menu" title="Menu">☰</span>
          <div className="bp-node-actions">
            <button className="bp-node-action" title="More" onPointerDown={(e) => e.stopPropagation()}>⋯</button>
            <button className="bp-node-action" title="Pin" onPointerDown={(e) => e.stopPropagation()}>📌</button>
            {!node.locked && (
              <button className="bp-node-action" title="Delete" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); select(node.id); /* trigger delete */ }}>✕</button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bp-node-body">
          {editing ? (
            <RichText html={node.html} onChange={(html) => setNodeHtml(node.id, html)} autoFocus />
          ) : (
            <div className="bp-node-html" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(node.html) }} />
          )}
        </div>

        {/* Bottom toolbar */}
        {editing && (
          <div className="bp-node-toolbar">
            <button className="bp-toolbar-btn" title="Bold" onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold') }}><b>B</b></button>
            <button className="bp-toolbar-btn" title="Italic" onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic') }}><i>I</i></button>
            <button className="bp-toolbar-btn" title="Underline" onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline') }}><u>U</u></button>
            <button className="bp-toolbar-btn" title="Strikethrough" onMouseDown={(e) => { e.preventDefault(); document.execCommand('strikethrough') }}><s>S</s></button>
            <button className="bp-toolbar-btn" title="List" onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList') }}>≡</button>
          </div>
        )}

        {node.locked && (
          <span className="bp-node-lock" title="Locked" aria-label="Locked">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
              <path d="M12 2a4 4 0 0 0-4 4v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm-2 7V6a2 2 0 1 1 4 0v3h-4z" />
            </svg>
          </span>
        )}
      </div>

      {/* edit button — double-click is reserved for connecting threads */}
      {!editing && !node.locked && (
        <button
          type="button"
          className="bp-node-edit"
          title="Edit note"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            if (!selected) select(node.id)
            setEditing(true)
          }}
        >
          ✎
        </button>
      )}

      {/* resize handle */}
      {selected && !node.locked && (
        <span
          className="bp-resize"
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
        />
      )}

      {/* single connection port — drag from here onto another note to link */}
      {!node.locked && (
        <div
          className={`bp-node-port ${connectSource ? 'is-source' : ''}`}
          title="Drag to another note to connect"
          style={{ ['--port' as string]: portColor } as React.CSSProperties}
          onPointerDown={(e) => {
            e.stopPropagation()
            onPortDown?.(node.id, e)
          }}
        />
      )}
    </div>
  )
}
