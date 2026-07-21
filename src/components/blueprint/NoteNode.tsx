import { memo, useCallback, useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { useBlueprint } from '../../store/blueprint'
import { mediaBackgroundStyle, mediaImageStyle, noteSurfaceStyle } from '../../lib/blueprint/style'
import type { BlueprintNode } from '../../lib/blueprint/types'
import { RichText } from './RichText'

interface NoteNodeProps {
  node: BlueprintNode
  zoom: number
  selected?: boolean
  dimmed?: boolean
  connectSource?: boolean
  onDoubleTap?: (nodeId: string) => void
  onPortDown?: (nodeId: string, e: React.PointerEvent) => void
}

interface ContextMenu { x: number; y: number }

export const NoteNode = memo(function NoteNode({ node, zoom, selected, dimmed, connectSource, onDoubleTap, onPortDown }: NoteNodeProps) {
  const select = useBlueprint((s) => s.select)
  const setHoverNode = useBlueprint((s) => s.setHoverNode)

  const [editing, setEditing] = useState(false)
  const [ctx, setCtx] = useState<ContextMenu | null>(null)
  const drag = useRef<{ set: string[]; lastX: number; lastY: number; ax: number; ay: number; vpX: number; vpY: number; vpZoom: number } | null>(null)
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const closeCtx = useCallback(() => setCtx(null), [])

  // close context menu on any outside click
  useEffect(() => {
    if (!ctx) return
    const handler = () => setCtx(null)
    window.addEventListener('pointerdown', handler, { once: true })
    return () => window.removeEventListener('pointerdown', handler)
  }, [ctx])

  function onBodyPointerDown(e: React.PointerEvent) {
    closeCtx()
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
    const vp = useBlueprint.getState().viewport
    drag.current = { set: [...set], lastX: e.clientX, lastY: e.clientY, ax: 0, ay: 0, vpX: vp.x, vpY: vp.y, vpZoom: vp.zoom }
    rootRef.current?.setPointerCapture(e.pointerId)
  }

  function onBodyPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    e.preventDefault()
    const vp = useBlueprint.getState().viewport
    const worldX = (e.clientX - vp.x) / vp.zoom
    const worldY = (e.clientY - vp.y) / vp.zoom
    const lastWorldX = (d.lastX - d.vpX) / d.vpZoom
    const lastWorldY = (d.lastY - d.vpY) / d.vpZoom
    d.lastX = e.clientX
    d.lastY = e.clientY
    d.vpX = vp.x
    d.vpY = vp.y
    d.vpZoom = vp.zoom
    useBlueprint.getState().moveBy(d.set, worldX - lastWorldX, worldY - lastWorldY)
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
    try { rootRef.current?.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }

  function onBodyContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const st = useBlueprint.getState()
    if (!st.selection.includes(node.id)) st.select(node.id)
    setCtx({ x: e.clientX, y: e.clientY })
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

  function ctxAction(action: string) {
    closeCtx()
    const st = useBlueprint.getState()
    switch (action) {
      case 'edit': setEditing(true); break
      case 'lock': st.setLocked([node.id], !node.locked); break
      case 'duplicate': st.duplicateNodes([node.id]); break
      case 'delete': st.deleteNodes([node.id]); break
    }
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
      className={`bp-node shape-${node.style.shape} ${selected ? 'selected' : ''} ${editing ? 'editing' : ''} ${dimmed ? 'dimmed' : ''} ${node.locked ? 'locked' : ''} ${connectSource ? 'connect-source' : ''} ${node.groupId ? 'grouped' : ''}`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onBodyPointerMove}
      onPointerUp={onBodyPointerUp}
      onContextMenu={onBodyContextMenu}
      onPointerEnter={() => setHoverNode(node.id)}
      onPointerLeave={() => setHoverNode(null)}
      onDoubleClick={(e) => {
        if (editing || node.locked) return
        e.stopPropagation()
        setEditing(true)
      }}
    >
      <div className="bp-node-surface" style={surface}>
        {node.groupId && <span className="bp-node-group-badge" title={`Group: ${node.groupId}`}>⊞</span>}
        {bgMedia && <span className="bp-node-media-bg" style={mediaBackgroundStyle(media!)} aria-hidden />}
        {media?.url && media.place !== 'background' && (
          <img className="bp-node-media" src={media.url} alt="" draggable={false} style={mediaImageStyle(media)} />
        )}

        <div className="bp-node-body">
          {editing ? (
            <RichText html={node.html} onChange={(html) => useBlueprint.getState().setNodeHtml(node.id, html)} autoFocus />
          ) : (
            <div className="bp-node-html" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(node.html) }} />
          )}
        </div>

        {node.locked && (
          <span className="bp-node-lock" title="Locked" aria-label="Locked">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
              <path d="M12 2a4 4 0 0 0-4 4v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm-2 7V6a2 2 0 1 1 4 0v3h-4z" />
            </svg>
          </span>
        )}

        {node.style.stickerUrl && (
          <div
            className="bp-node-sticker"
            style={{
              left: `${node.style.stickerX ?? 70}%`,
              top: `${node.style.stickerY ?? 10}%`,
              transform: `translate(-50%, -50%) rotate(${node.style.stickerRotation ?? 0}deg)`,
            }}
          >
            <img src={node.style.stickerUrl} alt="" draggable={false} style={{ width: node.style.stickerSize, height: node.style.stickerSize }} />
            {node.style.stickerText && <span className="bp-node-sticker-text">{node.style.stickerText}</span>}
          </div>
        )}
      </div>

      {selected && !node.locked && (
        <span className="bp-resize" onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={onResizeUp} />
      )}

      {!node.locked && (
        <div
          className={`bp-node-port ${connectSource ? 'is-source' : ''}`}
          title="Drag to another note to connect"
          style={{ ['--port' as string]: portColor } as React.CSSProperties}
          onPointerDown={(e) => { e.stopPropagation(); onPortDown?.(node.id, e) }}
        />
      )}

      {ctx && (
        <div className="bp-ctx-menu" style={{ left: ctx.x, top: ctx.y }} onPointerDown={(e) => e.stopPropagation()}>
          <button className="bp-ctx-item" onClick={() => ctxAction('edit')}>✏️ Edit text</button>
          <button className="bp-ctx-item" onClick={() => ctxAction('lock')}>{node.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
          <button className="bp-ctx-item" onClick={() => ctxAction('duplicate')}>📋 Duplicate</button>
          <div className="bp-ctx-sep" />
          <button className="bp-ctx-item danger" onClick={() => ctxAction('delete')}>🗑️ Delete</button>
        </div>
      )}
    </div>
  )
})
