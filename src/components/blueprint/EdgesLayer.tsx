import { useMemo } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { anchorToward, threadPath, threadPoint, type Pt } from '../../lib/blueprint/geom'
import { resolveEdgeStyle, type BlueprintNode } from '../../lib/blueprint/types'

interface ConnectingPreview {
  from: BlueprintNode
  fromPort: 'top' | 'right' | 'bottom' | 'left'
  to: Pt
}

interface EdgesLayerProps {
  preview: ConnectingPreview | null
}

// The investigation wall's "string" layer. Every connection is drawn as a
// pinned, gently-sagging thread (threadPath) anchored to the nearest point on
// each card's border — no fixed ports. Hovering a card traces its full case:
// connected threads + cards stay lit, everything else fades back into the wall.
export function EdgesLayer({ preview }: EdgesLayerProps) {
  const nodes = useBlueprint((s) => s.doc.nodes)
  const edges = useBlueprint((s) => s.doc.edges)
  const types = useBlueprint((s) => s.doc.connectionTypes)
  const selectedEdgeId = useBlueprint((s) => s.selectedEdgeId)
  const focusTypeId = useBlueprint((s) => s.focus.typeId)
  const hoverNodeId = useBlueprint((s) => s.hoverNodeId)
  const selectEdge = useBlueprint((s) => s.selectEdge)

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // nodes one hop from the hovered card (the active "case")
  const traced = useMemo(() => {
    if (!hoverNodeId) return null
    const ids = new Set<string>([hoverNodeId])
    edges.forEach((e) => {
      if (e.from === hoverNodeId) ids.add(e.to)
      if (e.to === hoverNodeId) ids.add(e.from)
    })
    return ids
  }, [hoverNodeId, edges])

  const hidden = useMemo(() => {
    const set = new Set<string>()
    types.forEach((t) => {
      if ((t as { hidden?: boolean }).hidden) set.add(t.id)
    })
    return set
  }, [types])

  return (
    <svg className="bp-edges" width="0" height="0">
      <defs>
        <marker id="bp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const a = byId.get(edge.from)
        const b = byId.get(edge.to)
        if (!a || !b) return null
        if (hidden.has(edge.typeId)) return null
        const type = types.find((t) => t.id === edge.typeId)
        const st = resolveEdgeStyle(edge, type)

        // free anchors: each end attaches to the border point facing the other card
        const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
        const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
        const p1 = anchorToward(a, cb)
        const p2 = anchorToward(b, ca)
        const sag = st.curve === 'straight' ? 0 : 1
        const d = threadPath(p1, p2, sag)

        const onCase = !traced || (traced.has(edge.from) && traced.has(edge.to))
        const focusOk = !focusTypeId || edge.typeId === focusTypeId
        const lit = onCase && focusOk
        const dimmed = (traced && !onCase) || (focusTypeId && !focusOk)
        const isSel = edge.id === selectedEdgeId
        const dash = st.lineStyle === 'dashed' ? '7 6' : st.lineStyle === 'animated' ? '9 7' : undefined
        const glowAmt = lit ? st.glow : 0
        const mid = threadPoint(p1, p2, 0.5, sag)

        return (
          <g
            key={edge.id}
            className={`bp-edge ${st.lineStyle} ${dimmed ? 'dimmed' : ''} ${isSel ? 'sel' : ''} ${lit && (traced || focusTypeId) ? 'lit' : ''}`}
          >
            {/* fat invisible hit-thread for easy selection */}
            <path
              d={d}
              stroke="transparent"
              strokeWidth={Math.max(16, st.thickness + 14)}
              fill="none"
              style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
              onPointerDown={(e) => { e.stopPropagation(); selectEdge(edge.id) }}
            />
            {/* soft shadow of the thread on the wall just beneath it */}
            <path
              d={threadPath({ x: p1.x, y: p1.y + 2.5 }, { x: p2.x, y: p2.y + 2.5 }, sag)}
              stroke="rgba(0,0,0,0.28)"
              strokeWidth={st.thickness + 0.5}
              fill="none"
              strokeLinecap="round"
              style={{ opacity: dimmed ? 0.05 : 0.4, pointerEvents: 'none' }}
            />
            {/* the thread itself */}
            <path
              d={d}
              stroke={st.color}
              strokeWidth={st.thickness + (isSel ? 1.2 : 0)}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={dash}
              style={{
                filter: glowAmt > 0 ? `drop-shadow(0 0 ${3 + glowAmt * 8}px ${st.color})` : undefined,
                opacity: dimmed ? 0.16 : 1,
              }}
            />
            {/* subtle pin heads at each end (UI anchor, not chrome metal) */}
            <circle cx={p1.x} cy={p1.y} r={st.thickness + 2.2} className="bp-pin" style={{ fill: st.color, opacity: dimmed ? 0.18 : 1 }} />
            <circle cx={p2.x} cy={p2.y} r={st.thickness + 2.2} className="bp-pin" style={{ fill: st.color, opacity: dimmed ? 0.18 : 1 }} />
            {edge.label && (
              <text x={mid.x} y={mid.y - 4} className="bp-edge-label" fill={st.color} textAnchor="middle" style={{ opacity: dimmed ? 0.2 : 1 }}>
                {edge.label}
              </text>
            )}
          </g>
        )
      })}

      {/* live drag-to-connect preview thread */}
      {preview && (() => {
        const from = preview.from
        const p1 = anchorToward(from, preview.to)
        const d = threadPath(p1, preview.to, 1)
        return (
          <g className="bp-edge-preview-g">
            <path d={d} className="bp-edge-preview" stroke="var(--mg-accent, #c0392b)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <circle cx={p1.x} cy={p1.y} r={4} className="bp-pin" style={{ fill: 'var(--mg-accent, #c0392b)' }} />
          </g>
        )
      })()}
    </svg>
  )
}
