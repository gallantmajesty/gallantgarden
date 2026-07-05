import { useCallback, useMemo, useRef, useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { anchorToward, autoPorts, smoothPath, smoothPoint, type Pt } from '../../lib/blueprint/geom'
import { resolveEdgeStyle, type BlueprintNode } from '../../lib/blueprint/types'

interface ConnectingPreview {
  from: BlueprintNode
  fromPort: 'top' | 'right' | 'bottom' | 'left'
  to: Pt
}

interface EdgesLayerProps {
  preview: ConnectingPreview | null
}

export function EdgesLayer({ preview }: EdgesLayerProps) {
  const nodes = useBlueprint((s) => s.doc.nodes)
  const edges = useBlueprint((s) => s.doc.edges)
  const types = useBlueprint((s) => s.doc.connectionTypes)
  const selectedEdgeId = useBlueprint((s) => s.selectedEdgeId)
  const focusTypeId = useBlueprint((s) => s.focus.typeId)
  const hoverNodeId = useBlueprint((s) => s.hoverNodeId)
  const selectEdge = useBlueprint((s) => s.selectEdge)
  const deleteEdge = useBlueprint((s) => s.deleteEdge)
  const pushHistory = useBlueprint((s) => s.pushHistory)
  const addNode = useBlueprint((s) => s.addNode)
  const addEdge = useBlueprint((s) => s.addEdge)
  const activeYarnColor = useBlueprint((s) => s.activeYarnColor)
  const activeTypeId = useBlueprint((s) => s.activeTypeId)

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const hidden = useMemo(() => {
    const set = new Set<string>()
    types.forEach((t) => {
      if ((t as { hidden?: boolean }).hidden) set.add(t.id)
    })
    return set
  }, [types])

  const onEdgeEnter = useCallback((edgeId: string) => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
    setHoveredEdgeId(edgeId)
  }, [])

  const onEdgeLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHoveredEdgeId(null), 200)
  }, [])

  const onToolbarEnter = useCallback(() => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
  }, [])

  const onToolbarLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHoveredEdgeId(null), 200)
  }, [])

  // Delete edge from toolbar
  const handleDelete = useCallback((edgeId: string) => {
    deleteEdge(edgeId)
    setHoveredEdgeId(null)
  }, [deleteEdge])

  // Add a node between two connected nodes, rewiring the edge through it
  const handleAddBetween = useCallback((edgeId: string) => {
    const edge = edges.find((e) => e.id === edgeId)
    if (!edge) return
    const src = byId.get(edge.from)
    const dst = byId.get(edge.to)
    if (!src || !dst) return
    // Place the new node at the midpoint
    const mx = (src.x + src.w / 2 + dst.x + dst.w / 2) / 2 - 110
    const my = (src.y + src.h / 2 + dst.y + dst.h / 2) / 2 - 65
    pushHistory()
    const newNode = addNode({ x: mx, y: my })
    // Remove old edge, create two new edges through the new node
    deleteEdge(edgeId)
    const p1 = autoPorts(src, newNode)
    addEdge(src.id, p1.fromPort, newNode.id, p1.toPort, edge.typeId)
    const p2 = autoPorts(newNode, dst)
    addEdge(newNode.id, p2.fromPort, dst.id, p2.toPort, edge.typeId)
    setHoveredEdgeId(null)
  }, [edges, byId, pushHistory, addNode, deleteEdge, addEdge])

  return (
    <svg className="bp-edges" width="0" height="0">
      <defs>
        <marker id="bp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,1 L8,5 L0,9 z" fill="context-stroke" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const a = byId.get(edge.from)
        const b = byId.get(edge.to)
        if (!a || !b) return null
        if (hidden.has(edge.typeId)) return null
        const type = types.find((t) => t.id === edge.typeId)
        const st = resolveEdgeStyle(edge, type)

        const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
        const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
        const p1 = anchorToward(a, cb)
        const p2 = anchorToward(b, ca)
        const d = smoothPath(p1, p2)

        const onCluster = !traced || (traced.has(edge.from) && traced.has(edge.to))
        const focusOk = !focusTypeId || edge.typeId === focusTypeId
        const isSel = edge.id === selectedEdgeId
        const isHovered = edge.id === hoveredEdgeId
        const lit = onCluster && focusOk && (!!traced || !!focusTypeId)
        const dimmed = (traced && !onCluster) || (focusTypeId && !focusOk)
        const energetic = isSel || lit

        const dash = (st.lineStyle === 'dashed' || st.lineStyle === 'dotted') ? '8 7' : undefined
        const baseGlow = 0.22 + st.glow * 0.5
        const haloOpacity = dimmed ? 0.04 : isSel ? 0.85 : lit ? 0.6 : baseGlow * 0.6
        const haloWidth = (st.thickness + 9) + (isSel ? 6 : lit ? 3 : 0)
        const coreWidth = st.thickness + (isSel ? 1.4 : 0)
        const mid = smoothPoint(p1, p2, 0.5)

        return (
          <g
            key={edge.id}
            className={`bp-edge ${st.lineStyle} ${dimmed ? 'dimmed' : ''} ${isSel ? 'sel' : ''} ${lit ? 'lit' : ''} ${energetic ? 'flow' : ''} ${isHovered ? 'hovered' : ''}`}
            style={{ color: st.color }}
            onPointerEnter={() => onEdgeEnter(edge.id)}
            onPointerLeave={onEdgeLeave}
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
            {/* 1 — soft colour halo */}
            <path
              className="bp-edge-halo"
              d={d}
              stroke={st.color}
              strokeWidth={haloWidth}
              fill="none"
              strokeLinecap="round"
              style={{ opacity: haloOpacity }}
            />
{/* 2 — crisp coloured core — arrow marker only when yarn style is arrow */}
<path
  className="bp-edge-core"
  d={d}
  stroke={st.color}
  strokeWidth={coreWidth}
  fill="none"
  strokeLinecap="round"
  strokeDasharray={dash}
  markerEnd={(edge.yarnStyle ?? (type?.yarnStyle ?? st.lineStyle)) === 'arrow' ? 'url(#bp-arrow)' : undefined}
  style={{ opacity: dimmed ? 0.18 : 1 }}
/>
            {/* 3 — animated energy flow */}
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

            {/* hover toolbar at midpoint */}
            {isHovered && (
              <g
                className="bp-edge-toolbar"
                transform={`translate(${mid.x}, ${mid.y})`}
                onPointerEnter={onToolbarEnter}
                onPointerLeave={onToolbarLeave}
              >
                <rect className="bp-edge-toolbar-bg" x={-36} y={-16} width={72} height={32} rx={8} />
                {/* add node between */}
                <g className="bp-edge-toolbar-btn" transform="translate(-18, 0)"
                  onPointerDown={(e) => { e.stopPropagation(); handleAddBetween(edge.id) }}>
                  <circle r={11} />
                  <text textAnchor="middle" dominantBaseline="central" className="bp-edge-toolbar-icon">+</text>
                </g>
                {/* delete edge */}
                <g className="bp-edge-toolbar-btn bp-edge-toolbar-danger" transform="translate(18, 0)"
                  onPointerDown={(e) => { e.stopPropagation(); handleDelete(edge.id) }}>
                  <circle r={11} />
                  <text textAnchor="middle" dominantBaseline="central" className="bp-edge-toolbar-icon">✕</text>
                </g>
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
  const previewType = types.find(t => t.id === activeTypeId)
  const previewStyle = resolveEdgeStyle(
    { yarnColor: activeYarnColor ?? undefined, typeId: activeTypeId } as any,
    previewType,
  )
  const previewColor = previewStyle.color
  return (
    <g className="bp-edge-preview-g">
      <path d={d} className="bp-edge-preview" stroke={previewColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <circle cx={p1.x} cy={p1.y} r={4} className="bp-pin" style={{ fill: previewColor }} />
    </g>
  )
})()}
    </svg>
  )
}
