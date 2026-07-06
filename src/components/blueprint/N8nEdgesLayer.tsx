import { useCallback, useMemo, useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { smoothPoint, type Pt } from '../../lib/blueprint/geom'
import { resolveEdgeStyle, type BlueprintNode, type ResolvedEdgeStyle } from '../../lib/blueprint/types'

interface ConnectingPreview {
  from: BlueprintNode
  fromPort: string
  to: Pt
}

interface N8nEdgesLayerProps {
  preview: ConnectingPreview | null
}

export function N8nEdgesLayer({ preview }: N8nEdgesLayerProps) {
  const nodes = useBlueprint((s) => s.doc.nodes)
  const edges = useBlueprint((s) => s.doc.edges)
  const types = useBlueprint((s) => s.doc.connectionTypes)
  const selectedEdgeId = useBlueprint((s) => s.selectedEdgeId)
  const focusTypeId = useBlueprint((s) => s.focus.typeId)
  const hoverNodeId = useBlueprint((s) => s.hoverNodeId)
  const selectEdge = useBlueprint((s) => s.selectEdge)
  const deleteEdge = useBlueprint((s) => s.deleteEdge)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const traced = useMemo(() => {
    if (!hoverNodeId) return null
    const ids = new Set<string>([hoverNodeId])
    edges.forEach((e) => {
      if (e.from === hoverNodeId) ids.add(e.to)
      if (e.to === hoverNodeId) ids.add(e.from)
    })
    return ids
  }, [hoverNodeId, edges])

const handleDoubleClick = useCallback((edgeId: string) => {
    deleteEdge(edgeId)
    setHoveredEdgeId(null)
  }, [deleteEdge])

  function edgeStyle(edge: typeof edges[number]): ResolvedEdgeStyle {
    const type = types.find((t) => t.id === edge.typeId)
    return resolveEdgeStyle(edge, type)
  }

  function typeColor(typeId: string): string {
    return types.find((t) => t.id === typeId)?.color ?? '#9a6cff'
  }

  const isArrow = (st: ResolvedEdgeStyle) => st.lineStyle === 'arrow'
  const dashArray = (st: ResolvedEdgeStyle) => {
    if (st.lineStyle === 'dashed') return '9 7'
    if (st.lineStyle === 'dotted') return '2 7'
    return undefined
  }

  return (
    <svg className="n8n-edges" width="0" height="0">
      <defs>
        <marker
          id="n8n-arrow"
          viewBox="0 0 12 12"
          refX="9.5"
          refY="6"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L12,6 L0,12 L3.5,6 z" fill="currentColor" />
        </marker>
        <filter id="n8n-edge-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {edges.map((edge) => {
        const a = byId.get(edge.from)
        const b = byId.get(edge.to)
        if (!a || !b) return null

        const st = edgeStyle(edge)
        const arrow = isArrow(st)
        const dash = dashArray(st)

        const outX = a.x + a.w
        const outY = a.y + a.h * 0.5
        const inX = b.x
        const inY = b.y + b.h * 0.5
        const dx = Math.max(60, Math.abs(inX - outX) * 0.45)
        const d = `M ${outX} ${outY} C ${outX + dx} ${outY}, ${inX - dx} ${inY}, ${inX} ${inY}`

        const onCluster =
          !traced || (traced.has(edge.from) && traced.has(edge.to))
        const focusOk = !focusTypeId || edge.typeId === focusTypeId
        const isSel = edge.id === selectedEdgeId
        const isHov = edge.id === hoveredEdgeId
        const dimmed = (traced && !onCluster) || (focusTypeId && !focusOk)
        const active = isSel || isHov

        const color = st.color
        const coreW = st.thickness + (isSel ? 1.2 : 0)
        const haloW = coreW + 8

        return (
          <g
            key={edge.id}
            className={`n8n-edge ${dimmed ? 'dimmed' : ''} ${active ? 'active' : ''}`}
            style={{ color }}
            onDoubleClick={() => handleDoubleClick(edge.id)}
          >
            {/* fat hit area */}
            <path d={d} fill="none" stroke="transparent" strokeWidth={18 + haloW} style={{ cursor: 'pointer', pointerEvents: 'stroke' }} onPointerDown={(e) => { e.stopPropagation(); selectEdge(edge.id) }} />

            {/* glow halo */}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={haloW}
              strokeLinecap="round"
              opacity={dimmed ? 0.06 : active ? 0.35 : 0.14}
              filter="url(#n8n-edge-glow)"
            />

            {/* core line */}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={coreW}
              strokeLinecap="round"
              strokeDasharray={dash}
              markerEnd={arrow ? 'url(#n8n-arrow)' : undefined}
              opacity={dimmed ? 0.15 : 1}
            />

            {/* animated flow on active */}
            {active && !arrow && (
              <path
                d={d}
                fill="none"
                stroke="rgba(255,255,255,.85)"
                strokeWidth={Math.max(1.2, coreW - 0.6)}
                strokeLinecap="round"
                strokeDasharray="4 8"
                className="n8n-edge-flow"
              />
            )}

            {/* midpoint tools */}
            {isHov && (
              <g transform={`translate(${smoothPoint(
                { x: outX, y: outY },
                { x: inX, y: inY },
                0.5,
              ).x}, ${smoothPoint({ x: outX, y: outY }, { x: inX, y: inY }, 0.5).y})`}>
                <rect x={-44} y={-14} width={88} height={28} rx={8} fill="#0f172a" opacity="0.85" />
                <g onPointerDown={(e) => e.stopPropagation()}>
                  <text x={-24} y={4} textAnchor="middle" dominantBaseline="central" fill="#e5e7eb" fontSize={11} className="n8n-edge-tool">✕</text>
                </g>
              </g>
            )}
          </g>
        )
      })}

      {/* live rubber-band while dragging */}
      {preview && (() => {
        const fromNode = byId.get(preview.from.id)
        if (!fromNode) return null
        const outX = fromNode.x + fromNode.w
        const outY = fromNode.y + fromNode.h * 0.5
        const inX = preview.to.x
        const inY = preview.to.y
        const dx = Math.max(50, Math.abs(inX - outX) * 0.45)
        const d = `M ${outX} ${outY} C ${outX + dx} ${outY}, ${inX - dx} ${inY}, ${inX} ${inY}`
        const col = typeColor(preview.fromPort as string)
        return (
          <g className="n8n-edge-preview">
            <path d={d} fill="none" stroke={col} strokeWidth={2} strokeDasharray="7 5" strokeLinecap="round" opacity="0.75" />
            <circle cx={outX} cy={outY} r={4} fill={col} />
          </g>
        )
      })()}
    </svg>
  )
}
