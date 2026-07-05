import { memo, useCallback, useRef, useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import type { BlueprintNode, Port } from '../../lib/blueprint/types'

interface N8nNoteNodeProps {
  node: BlueprintNode
  selected: boolean
  validInputs: Set<string>
  dragSourceId: string | null
  onPortDown: (nodeId: string, port: Port, e: React.PointerEvent) => void
  previewTo?: { x: number; y: number }
}

export const N8nNoteNode = memo(function N8nNoteNode({
  node,
  selected,
  validInputs,
  dragSourceId,
  onPortDown,
  previewTo,
}: N8nNoteNodeProps) {
  const select = useBlueprint((s) => s.select)
  const moveBy = useBlueprint((s) => s.moveBy)
  const setNodeHtml = useBlueprint((s) => s.setNodeHtml)
  const zoom = useBlueprint((s) => s.doc.viewport.zoom)
  const [editing, setEditing] = useState(false)
  const dragRef = useRef<{ set: string[]; lastX: number; lastY: number } | null>(null)
  const isOutputActive = dragSourceId === node.id
  const isInputTarget = validInputs.has(node.id) && dragSourceId !== null && dragSourceId !== node.id

  const label = node.label || 'Untitled'
  const headerIcon = node.icon || '⚡'

  // ---- output ports (right side) -------------------------------------------------
  const outputs: { id: string; label: string }[] = [
    { id: 'output_main', label: 'output' },
  ]

  // ---- input ports (left side) ---------------------------------------------------
  const inputs: { id: string; label: string }[] = [
    { id: 'input_main', label: 'input' },
  ]

  const onBodyPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (editing) return
      if (e.button !== 0) return
      // ignore if user clicked a port
      if ((e.target as HTMLElement).closest('.n8n-port')) return
      e.stopPropagation()
      const state = useBlueprint.getState()
      const sel = state.selection
      const set = sel.includes(node.id) ? [...sel] : [node.id]
      select(node.id, e.shiftKey)
      dragRef.current = { set, lastX: e.clientX, lastY: e.clientY }
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    },
    [editing, node.id, select],
  )

  const onBodyPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = (e.clientX - d.lastX) / zoom
      const dy = (e.clientY - d.lastY) / zoom
      d.lastX = e.clientX
      d.lastY = e.clientY
      moveBy(d.set, dx, dy)
    },
    [zoom, moveBy],
  )

  const onBodyPointerUp = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = null
      try { ;(e.currentTarget as Element).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    },
    [],
  )

  const handlePortDown = useCallback(
    (portType: 'input' | 'output', _portId: string, e: React.PointerEvent) => {
      e.stopPropagation()
      const mappedPort: Port = portType === 'output' ? 'right' : 'left'
      onPortDown(node.id, mappedPort, e)
    },
    [node.id, onPortDown],
  )

  return (
    <div
      className={`n8n-node ${selected ? 'selected' : ''} ${isInputTarget ? 'input-target' : ''} ${isOutputActive ? 'output-active' : ''}`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      onPointerDown={onBodyPointerDown}
      onPointerMove={onBodyPointerMove}
      onPointerUp={onBodyPointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (!selected) select(node.id)
        setEditing(true)
      }}
    >
      {/* ── header ─────────────────────────────────────────────────── */}
      <div className="n8n-node-header">
        <span className="n8n-node-icon">{headerIcon}</span>
        <span className="n8n-node-label">{label}</span>
      </div>

      {/* ── body ───────────────────────────────────────────────────── */}
      <div className="n8n-node-body">
        {editing ? (
          <textarea
            className="n8n-editor"
            defaultValue={node.html}
            autoFocus
            onBlur={(e) => setNodeHtml(node.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditing(false)
                e.currentTarget.blur()
              }
            }}
          />
        ) : (
          <div className="n8n-node-text">{node.label || node.icon || 'New node'}</div>
        )}
      </div>

      {/* ── input ports (left) ─────────────────────────────────────── */}
      <div className="n8n-ports-left">
        {inputs.map((p) => (
          <div
            key={p.id}
            className={`n8n-port n8n-port-in ${isInputTarget && !dragSourceId ? 'pulse' : ''}`}
            style={{ top: `${20 + inputs.indexOf(p) * 32}%` }}
            onPointerDown={(e) => handlePortDown('input', p.id, e)}
            title={`Input: ${p.label}`}
          >
            <span className="n8n-port-dot" />
            <span className="n8n-port-label">{p.label}</span>
          </div>
        ))}
      </div>

      {/* ── output ports (right) ───────────────────────────────────── */}
      <div className="n8n-ports-right">
        {outputs.map((p) => (
          <div
            key={p.id}
            className={`n8n-port n8n-port-out ${isOutputActive ? 'active' : ''}`}
            style={{ top: `${20 + outputs.indexOf(p) * 32}%` }}
            onPointerDown={(e) => handlePortDown('output', p.id, e)}
            title={`Output: ${p.label}`}
          >
            <span className="n8n-port-label">{p.label}</span>
            <span className="n8n-port-dot" />
          </div>
        ))}
      </div>

      {previewTo && (
        <svg className="n8n-node-preview-svg" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible' }}>
          <path
            d={(() => {
              const outX = node.w
              const outY = node.h * 0.5
              const toX = previewTo.x - node.x
              const toY = previewTo.y - node.y
              const dx = Math.abs(toX - outX) * 0.5
              return `M ${outX} ${outY} C ${outX + dx} ${outY}, ${toX - dx} ${toY}, ${toX} ${toY}`
            })()}
            fill="none"
            stroke="var(--n8n-accent, #f59e0b)"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity="0.7"
          />
        </svg>
      )}
    </div>
  )
})
