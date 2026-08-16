import { useEffect, useRef, useState } from 'react'
import { GhostMascot } from './GhostMascot'
import type { GhostMood } from '../lib/mascotGhost'
import './MascotTour.css'

/* Max's guided tour spotlight — dims everything except the element the new
   player should click, rings it, and floats Max next to it with a guide line.
   Reuses the same GhostMascot (same bubble, same voice, same bounce) as the
   onboarding steps. */

interface Rect { x: number; y: number; w: number; h: number }

/** Track the bounding rect of a selector (viewport coords) live — re-measures
 *  on scroll, resize, and layout changes of the target. */
function useTargetRect(selector: string): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)
  const raf = useRef(0)

  useEffect(() => {
    let disposed = false
    let firstMeasure = true
    const measureNow = () => {
      if (disposed) return
      const el = document.querySelector(selector) as HTMLElement | null
      if (!el) return
      // Mark the target so the tour can strip its own glass blur and make
      // it pop crisply against the dimmed background.
      el.classList.add('mt-spotlight')
      const b = el.getBoundingClientRect()
      if (b.width > 0 && b.height > 0) {
        setRect({ x: b.left, y: b.top, w: b.width, h: b.height })
        // Bring a below-the-fold target (e.g. mobile world cards) into view.
        if (firstMeasure && (b.top < 0 || b.bottom > window.innerHeight)) {
          firstMeasure = false
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
      }
    }
    // Measure synchronously on mount (rAF can be paused in a backgrounded
    // webview, which would otherwise leave the tour invisible).
    measureNow()
    const rafMeasure = () => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(measureNow)
    }
    window.addEventListener('resize', rafMeasure)
    window.addEventListener('scroll', rafMeasure, true)
    const el = document.querySelector(selector)
    const ro = el ? new ResizeObserver(rafMeasure) : null
    if (el && ro) ro.observe(el)
    return () => {
      disposed = true
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', rafMeasure)
      window.removeEventListener('scroll', rafMeasure, true)
      ro?.disconnect()
      document.querySelector(selector)?.classList.remove('mt-spotlight')
    }
  }, [selector])

  return rect
}

function mascotStyle(
  rect: Rect,
  side: 'right' | 'left' | 'top',
): React.CSSProperties {
  const vw = window.innerWidth
  const cx = rect.x + rect.w / 2
  if (side === 'top') {
    const left = Math.max(8, Math.min(cx - 105, vw - 218))
    return { left, right: 'auto', top: Math.max(4, rect.y - 60), display: 'flex' }
  }
  if (side === 'left') {
    return { right: vw - rect.x + 18, left: 'auto', top: rect.y + rect.h / 2, display: 'flex' }
  }
  // right
  return { left: rect.x + rect.w + 18, right: 'auto', top: rect.y + rect.h / 2, display: 'flex' }
}

export function MascotTour({
  target,
  hint,
  mood = 'happy',
  side = 'right',
  step,
  total,
  onSkip,
}: {
  /** CSS selector of the element to spotlight. */
  target: string
  /** Max's guide line (same casual voice as onboarding). */
  hint: string
  mood?: GhostMood
  /** Where Max floats relative to the target. */
  side?: 'right' | 'left' | 'top'
  /** Optional "1 of 3" chip. */
  step?: number
  total?: number
  onSkip: () => void
}) {
  const rect = useTargetRect(target)

  // Don't flash a full-screen dim before we know where the target is.
  if (!rect) return null

  const W = window.innerWidth
  const H = window.innerHeight
  // Four region rectangles around the target (top / bottom / left / right) —
  // blur + dim only the SURROUNDINGS, with nothing covering the target itself
  // so it stays bright and crisp.
  const regions = [
    { top: 0, left: 0, width: W, height: rect.y },
    { top: rect.y + rect.h, left: 0, width: W, height: Math.max(0, H - rect.y - rect.h) },
    { top: rect.y, left: 0, width: rect.x, height: rect.h },
    { top: rect.y, left: rect.x + rect.w, width: Math.max(0, W - rect.x - rect.w), height: rect.h },
  ].filter((r) => r.width > 0.5 && r.height > 0.5)

  return (
    <div className="mt-root" aria-hidden>
      {regions.map((r, i) => (
        <div
          key={i}
          className="mt-dim"
          style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
        />
      ))}
      {/* Warm brightness wash over the target so its interior pops. */}
      <div
        className="mt-light"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      />
      <div
        className="mt-ring"
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      />
      {(step !== undefined || total !== undefined) && (
        <div className="mt-chip">
          {step !== undefined && total !== undefined ? `${step} of ${total}` : ''}
        </div>
      )}
      <button className="mt-skip" onClick={onSkip} type="button">
        Skip tour
      </button>
      <GhostMascot name="" hint={hint} mood={mood} style={mascotStyle(rect, side)} />
    </div>
  )
}
