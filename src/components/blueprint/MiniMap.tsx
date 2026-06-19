import { useBlueprint } from '../../store/blueprint'
import { nodesBounds } from '../../lib/blueprint/geom'

const W = 200
const H = 132

// A corner overview of the whole board with a draggable viewport rectangle.
export function MiniMap() {
  const nodes = useBlueprint((s) => s.doc.nodes)
  const vp = useBlueprint((s) => s.doc.viewport)
  const setViewport = useBlueprint((s) => s.setViewport)

  if (nodes.length === 0) return null

  const b = nodesBounds(nodes, 120)
  const scale = Math.min(W / b.w, H / b.h)
  const ox = (W - b.w * scale) / 2
  const oy = (H - b.h * scale) / 2
  const toMini = (wx: number, wy: number) => ({ x: ox + (wx - b.x) * scale, y: oy + (wy - b.y) * scale })

  // visible world rectangle
  const viewW = window.innerWidth / vp.zoom
  const viewH = window.innerHeight / vp.zoom
  const viewWorldX = -vp.x / vp.zoom
  const viewWorldY = -vp.y / vp.zoom
  const vTL = toMini(viewWorldX, viewWorldY)

  function jump(e: React.MouseEvent) {
    const rect = (e.currentTarget as Element).getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    // mini → world, then centre the viewport there
    const wx = (mx - ox) / scale + b.x
    const wy = (my - oy) / scale + b.y
    setViewport({ ...vp, x: window.innerWidth / 2 - wx * vp.zoom, y: window.innerHeight / 2 - wy * vp.zoom })
    useBlueprint.getState().flush()
  }

  return (
    <div className="bp-minimap bp-surface" style={{ width: W, height: H }} onMouseDown={jump}>
      <svg width={W} height={H}>
        {nodes.map((n) => {
          const p = toMini(n.x, n.y)
          return (
            <rect key={n.id} x={p.x} y={p.y} width={Math.max(2, n.w * scale)} height={Math.max(2, n.h * scale)}
              rx={2} className="bp-mini-node" />
          )
        })}
        <rect x={vTL.x} y={vTL.y} width={viewW * scale} height={viewH * scale} className="bp-mini-view" />
      </svg>
    </div>
  )
}
