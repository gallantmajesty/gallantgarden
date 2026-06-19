// Pure geometry helpers for the canvas: coordinate conversion, port anchors,
// and the SVG path for an edge. Kept dependency-free so both the canvas and the
// PNG exporter can share them.

import type { BlueprintNode, Curve, Port, Viewport } from './types'

export interface Pt {
  x: number
  y: number
}

/** Screen (client) point → world point, given the current viewport. */
export function screenToWorld(sx: number, sy: number, vp: Viewport): Pt {
  return { x: (sx - vp.x) / vp.zoom, y: (sy - vp.y) / vp.zoom }
}

/** World point → screen (client) point. */
export function worldToScreen(wx: number, wy: number, vp: Viewport): Pt {
  return { x: wx * vp.zoom + vp.x, y: wy * vp.zoom + vp.y }
}

/** The world-space anchor for one of a node's four ports. */
export function portPoint(n: Pick<BlueprintNode, 'x' | 'y' | 'w' | 'h'>, port: Port): Pt {
  switch (port) {
    case 'top':
      return { x: n.x + n.w / 2, y: n.y }
    case 'bottom':
      return { x: n.x + n.w / 2, y: n.y + n.h }
    case 'left':
      return { x: n.x, y: n.y + n.h / 2 }
    case 'right':
    default:
      return { x: n.x + n.w, y: n.y + n.h / 2 }
  }
}

const NORMALS: Record<Port, Pt> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

/** SVG path `d` for an edge between two world points (curved cubic or straight). */
export function edgePath(a: Pt, b: Pt, fromPort: Port, toPort: Port, curve: Curve): string {
  if (curve === 'straight') return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  const k = Math.min(160, Math.max(60, dist * 0.42))
  const na = NORMALS[fromPort]
  const nb = NORMALS[toPort]
  const c1 = { x: a.x + na.x * k, y: a.y + na.y * k }
  const c2 = { x: b.x + nb.x * k, y: b.y + nb.y * k }
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`
}

/**
 * SVG path for a "pulled thread" between two world points — a single quadratic
 * whose control point sags downward under gravity, like real yarn pinned to a
 * board. `sag` scales the droop (0 = taut). The sag grows with span so long
 * runs hang more, short links stay tight.
 */
export function threadPath(a: Pt, b: Pt, sag = 1): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  const droop = Math.min(120, 14 + dist * 0.12) * sag
  return `M ${a.x} ${a.y} Q ${mx} ${my + droop}, ${b.x} ${b.y}`
}

/** Point on the quadratic thread at parameter t (0..1) — for label / mid pins. */
export function threadPoint(a: Pt, b: Pt, t: number, sag = 1): Pt {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  const droop = Math.min(120, 14 + dist * 0.12) * sag
  const cy = my + droop
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * mx + t * t * b.x,
    y: u * u * a.y + 2 * u * t * cy + t * t * b.y,
  }
}

/**
 * The point on a node's border closest to an external target point — lets a
 * thread attach "anywhere" on a card edge (no fixed ports). Clamps the target
 * to the rectangle border, biased to the side it approaches from.
 */
export function anchorToward(
  n: Pick<BlueprintNode, 'x' | 'y' | 'w' | 'h'>,
  target: Pt,
): Pt {
  const cx = n.x + n.w / 2
  const cy = n.y + n.h / 2
  const dx = target.x - cx
  const dy = target.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: n.y }
  const hw = n.w / 2
  const hh = n.h / 2
  // scale the direction vector to the rectangle border
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

/** The midpoint of an edge path (for placing labels), approximated. */
export function edgeMid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Pick the best port pair so the string leaves/enters from facing sides. */
export function autoPorts(from: BlueprintNode, to: BlueprintNode): { fromPort: Port; toPort: Port } {
  const dx = to.x + to.w / 2 - (from.x + from.w / 2)
  const dy = to.y + to.h / 2 - (from.y + from.h / 2)
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { fromPort: 'right', toPort: 'left' } : { fromPort: 'left', toPort: 'right' }
  }
  return dy >= 0 ? { fromPort: 'bottom', toPort: 'top' } : { fromPort: 'top', toPort: 'bottom' }
}

/** Axis-aligned bounding box of a set of nodes (world space), with padding. */
export function nodesBounds(nodes: BlueprintNode[], pad = 0): { x: number; y: number; w: number; h: number } {
  if (nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.w)
    maxY = Math.max(maxY, n.y + n.h)
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}
