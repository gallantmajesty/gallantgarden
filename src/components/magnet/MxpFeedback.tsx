import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Floating "+N" Magnet Power chips.
//
// usage: const float = useMxpFloat();  float.push(e, 12);  ... {float.node}
// The chip renders at the exact click coordinates (fixed position), floats up
// and fades — identical behaviour on task checks, habit toggles, milestones.

interface FloatItem {
  key: string
  value: number
  x: number
  y: number
}

export function useMxpFloat() {
  const [items, setItems] = useState<FloatItem[]>([])
  const seq = useRef(0)

  const push = useCallback((e: { clientX: number; clientY: number }, value: number) => {
    if (!value || value <= 0) return
    const key = `mxp-${seq.current++}`
    setItems((cur) => [...cur.slice(-4), { key, value, x: e.clientX, y: e.clientY }])
    setTimeout(() => setItems((cur) => cur.filter((i) => i.key !== key)), 950)
  }, [])

  const node: ReactNode = items.map((i) => (
    <span key={i.key} className="mg-floatxp" style={{ left: i.x, top: i.y }}>
      +{i.value}
    </span>
  ))

  return { push, node }
}