import { useMemo } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { anchorToward, smoothPath, smoothPoint, type Pt } from '../../lib/blueprint/geom'
import { resolveEdgeStyle, type BlueprintNode } from '../../lib/blueprint/types'

interface ConnectingPreview {
  from: BlueprintNode
  fromPort: 'top' | 'right' | 'bottom' | 'left'
  to: Pt
}

interface EdgesLayerProps {
  preview: ConnectingPreview | null
}

// The connection layer — the hero of the canvas. Every link is a smooth
// "blueprint" cubic anchored to the nearest point on each card's border (no
// fixed ports). Each thread renders in three stacked passes so it reads from a
// distance and feels alive:
//   1. a wide, soft colour halo (always faintly lit, brighter on hover/select)
//   2. a crisp coloured core stroke
//   3. an animated energy-flow overlay that switches on when selected/lit
// Hovering a card traces its whole cluster; everything else fades back.
export function EdgesLayer({ preview }: EdgesLayerProps) {
  const nodes = useBlueprint((s) => s.doc.nodes)
  const edges = useBlueprint((s) => s.doc.edges)
  const types = useBlueprint((s) => s.doc.connectionTypes)
  const selectedEdgeId = useBlueprint((s) => s.selectedEdgeId)
  const focusTypeId = useBlueprint((s) => s.focus.typeId)
  const hoverNodeId = useBlueprint((s) => s.hoverNodeId)
  const selectEdge = useBlueprint((s) => s.selectEdge)

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // nodes one hop from the hovered card (the active cluster)
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
        const d = smoothPath(p1, p2)

        const onCluster = !traced || (traced.has(edge.from) && traced.has(edge.to))
        const focusOk = !focusTypeId || edge.typeId === focusTypeId
        const isSel = edge.id === selectedEdgeId
        const lit = onCluster && focusOk && (!!traced || !!focusTypeId)
        const dimmed = (traced && !onCluster) || (focusTypeId && !focusOk)
        const energetic = isSel || lit // when to run the energy-flow animation

        const dash = st.lineStyle === 'dashed' ? '8 7' : undefined
        // halo intensity: a faint base so threads read at rest, lifting on hover/select
        const baseGlow = 0.22 + st.glow * 0.5
        const haloOpacity = dimmed ? 0.04 : isSel ? 0.85 : lit ? 0.6 : baseGlow * 0.6
        const haloWidth = (st.thickness + 9) + (isSel ? 6 : lit ? 3 : 0)
        const coreWidth = st.thickness + (isSel ? 1.4 : 0)
        const mid = smoothPoint(p1, p2, 0.5)

        return (
          <g
            key={edge.id}
            className={`bp-edge ${st.lineStyle} ${dimmed ? 'dimmed' : ''} ${isSel ? 'sel' : ''} ${lit ? 'lit' : ''} ${energetic ? 'flow' : ''}`}
            style={{ color: st.color }}
          >
            {/* fat invisible hit-thread for easy selection */}
            <path
              d={d}
              stroke="transparent"
              strokeWidth={Math.max(18, st.thickness + 16)}
              fill="none"
              style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
              onPointerDown={(e) => { e.stopPropagation(); selectEdge(edge.id) }}
            />
            {/* 1 — soft colour halo (the glow that makes strings the hero) */}
            <path
              className="bp-edge-halo"
              d={d}
              stroke={st.color}
              strokeWidth={haloWidth}
              fill="none"
              strokeLinecap="round"
              style={{ opacity: haloOpacity }}
            />
            {/* 2 — crisp coloured core */}
            <path
              className="bp-edge-core"
              d={d}
              stroke={st.color}
              strokeWidth={coreWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={dash}
              style={{ opacity: dimmed ? 0.18 : 1 }}
            />
            {/* 3 — animated energy flow, only when selected / cluster-lit */}
            {energetic && (
              <path
                className="bp-edge-flow"
                d={d}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={Math.max(1.4, coreWidth - 0.6)}
                fill="none"
                strokeLinecap="round"
              />
            )}
            {/* anchor pins at each end */}
            <circle cx={p1.x} cy={p1.y} r={st.thickness + 2.2} className="bp-pin" style={{ fill: st.color, opacity: dimmed ? 0.18 : 1 }} />
            <circle cx={p2.x} cy={p2.y} r={st.thickness + 2.2} className="bp-pin" style={{ fill: st.color, opacity: dimmed ? 0.18 : 1 }} />
            {edge.label && (
              <g className="bp-edge-labelwrap" style={{ opacity: dimmed ? 0.2 : 1 }} transform={`translate(${mid.x} ${mid.y})`}>
                <rect
                  className="bp-edge-labelbg"
                  x={-(edge.label.length * 3.6 + 9)}
                  y={-11}
                  width={edge.label.length * 7.2 + 18}
                  height={22}
                  rx={11}
                  style={{ stroke: st.color }}
                />
                <text className="bp-edge-label" fill={st.color} textAnchor="middle" dominantBaseline="central">
                  {edge.label}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* live drag-to-connect preview thread */}
      {preview && (() => {
        const from = preview.from
        const p1 = anchorToward(from, preview.to)
        const d = smoothPath(p1, preview.to)
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
