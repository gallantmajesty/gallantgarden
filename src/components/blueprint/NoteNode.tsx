import { memo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { useBlueprint } from '../../store/blueprint'
import { mediaBackgroundStyle, mediaImageStyle, noteSurfaceStyle } from '../../lib/blueprint/style'
import type { BlueprintNode } from '../../lib/blueprint/types'
import { RichText } from './RichText'

interface NoteNodeProps {
  node: BlueprintNode
  /** current viewport zoom — passed from Canvas so this node never subscribes to viewport */
  zoom: number
  selected?: boolean
  dimmed?: boolean
  /** true when this node is the armed source of a pending thread */
  connectSource?: boolean
  onDoubleTap?: (nodeId: string) => void
  /** start a drag-to-connect from this note's bottom port */
  onPortDown?: (nodeId: string, e: React.PointerEvent) => void
}

export const NoteNode = memo(function NoteNode({ node, zoom, selected, dimmed, connectSource, onDoubleTap, onPortDown }: NoteNodeProps) {
  const select = useBlueprint((s) => s.select)
  const setHoverNode = useBlueprint((s) => s.setHoverNode)

  const [editing, setEditing] = useState(false)
  const drag = useRef<{ set: string[]; lastX: number; lastY: number; ax: number; ay: number } | null>(null)
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  function onBodyPointerDown(e: React.PointerEvent) {
    if (editing || node.locked) return
    if (e.button !== 0) return
    e.stopPropagation()
    const st = useBlueprint.getState()
    const isSel = st.selection.includes(node.id)
    if (!isSel) st.select(node.id, e.shiftKey)
    const set = useBlueprint.getState().selection.includes(node.id)
      ? useBlueprint.getState().selection
      : [node.id]
    st.pushHistory()
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
    useBlueprint.getState().moveBy(d.set, dx, dy)
  }

  function onBodyPointerUp(e: React.PointerEvent) {
    if (!drag.current) return
    drag.current = null
    const st = useBlueprint.getState()
    if (st.doc.snap) {
      const sx = Math.round(node.x / st.doc.grid) * st.doc.grid
      const sy = Math.round(node.y / st.doc.grid) * st.doc.grid
      st.setNodeRect(node.id, { x: sx, y: sy })
    }
    st.flush()
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
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
    const w = Math.max(120, r.w + (e.clientX - r.x) / zoom)
    const h = Math.max(70, r.h + (e.clientY - r.y) / zoom)
    useBlueprint.getState().setNodeRect(node.id, { w, h })
  }
  function onResizeUp() {
    if (!resize.current) return
    resize.current = null
    useBlueprint.getState().flush()
  }

  const surface = noteSurfaceStyle(node.style)
  const media = node.media
  const bgMedia = media?.url && media.place === 'background'
  const st = useBlueprint.getState()
  const portColor = st.activeYarnColor ?? st.doc.connectionTypes.find((t) => t.id === st.activeTypeId)?.color ?? '#B79CFF'

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
          <button className="bp-node-menu" title="Menu" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); select(node.id) }}>☰</button>
          <div className="bp-node-actions">
            <button className="bp-node-action" title="Lock" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); useBlueprint.getState().setLocked([node.id], !node.locked) }}>{node.locked ? '🔒' : '🔓'}</button>
            {!node.locked && (
              <button className="bp-node-action" title="Delete" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); useBlueprint.getState().deleteNodes([node.id]) }}>✕</button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bp-node-body">
          {editing ? (
            <RichText html={node.html} onChange={(html) => useBlueprint.getState().setNodeHtml(node.id, html)} autoFocus />
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

        {/* Sticker overlay */}
        {node.style.stickerUrl && (
          <img
            className={`bp-node-sticker bp-node-sticker--${node.style.stickerPos}`}
            src={node.style.stickerUrl}
            alt=""
            draggable={false}
            style={{
              width: node.style.stickerSize,
              height: node.style.stickerSize,
              transform: `rotate(${node.style.stickerRotation}deg)`,
            }}
          />
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
})
