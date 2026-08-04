// Burst of green leaves flying from a point to the top leaves counter after a
// claim. Rendered through a portal to <body> so CSS transforms on profile
// ancestors can't break `position: fixed`. Pure Web Animations API.

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './LeafBurst.css'

interface LeafBurstProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  count?: number
  onDone: () => void
}

export function LeafBurst({ from, to, count = 9, onDone }: LeafBurstProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) {
      onDone()
      return
    }
    const leafCount = count || 1
    const leaves: HTMLElement[] = []
    for (let i = 0; i < leafCount; i++) {
      const leaf = document.createElement('span')
      leaf.className = 'leaf-fly'
      const img = document.createElement('img')
      img.src = '/icons/golden-leaf.png'
      img.alt = ''
      img.draggable = false
      leaf.appendChild(img)
      root.appendChild(leaf)

      // Small random arc so they don't all take an identical straight line.
      const swingX = (Math.random() - 0.5) * 90
      const swingY = -24 - Math.random() * 46
      const midX = from.x + (to.x - from.x) * 0.5 + swingX
      const midY = from.y + (to.y - from.y) * 0.25 + swingY

      leaf.style.left = `${from.x}px`
      leaf.style.top = `${from.y}px`

      const anim = leaf.animate(
        [
          { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
          { transform: `translate(${midX - from.x}px, ${midY - from.y}px) scale(1.2) rotate(170deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(0.15) rotate(330deg)`, opacity: 0.45 },
        ],
        {
          duration: 700 + Math.random() * 280,
          easing: 'cubic-bezier(0.35, 0, 0.25, 1)',
          fill: 'forwards',
        },
      )
      anim.onfinish = () => leaf.remove()
      leaves.push(leaf)
    }

    const timer = window.setTimeout(onDone, 1200)
    return () => {
      window.clearTimeout(timer)
      leaves.forEach((el) => {
        el.getAnimations().forEach((a) => a.cancel())
        el.remove()
      })
    }
  }, [from.x, from.y, to.x, to.y, count, onDone])

  return createPortal(<div ref={rootRef} className="leaf-burst" />, document.body)
}