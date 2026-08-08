import { useEffect, useState, type ReactNode } from 'react'
import './RoomLoader.css'

interface RoomLoaderProps {
  /** True when the 3D scene underneath has fully signalled ready. */
  ready: boolean
  /** Name of the room being entered, shown in the centre. */
  roomName?: string | null
  /** Accent colour for the loading bar and name glow (per-room theme). */
  accent?: string
  /** Minimum time the loader is shown (ms) so it never blinks. */
  minDuration?: number
  /** When false the overlay is hidden (e.g. during seat selection, which
   *  should come first — the loading screen appears only after a seat is
   *  picked). Children still mount so the room loads behind. */
  show?: boolean
  /** The scene children — mounted immediately so they load behind the loader. */
  children: ReactNode
}

/**
 * RoomLoader — full-screen loading overlay shown while joining a room inside
 * a realm. A quiet night-forest backdrop, the room name glowing in the centre,
 * and a thin golden bar that fills with real progress. Seat selection comes
 * FIRST (see `show`) — the loading screen only appears once a seat is picked,
 * so entering a room feels like: pick seat → doors open → you're in.
 * Lifts only after BOTH the minimum duration AND the scene's own onReady
 * signal. The bar fills to ~92% while waiting, then snaps full the instant the
 * scene signals ready.
 */
export function RoomLoader({
  ready,
  roomName,
  accent,
  minDuration = 1200,
  show = true,
  children,
}: RoomLoaderProps) {
  const [minDone, setMinDone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), minDuration)
    return () => clearTimeout(t)
  }, [minDuration])

  // Fill the bar toward ~92% while waiting (capped so the user knows it's not
  // finished yet — the last stretch only completes once the room is ready).
  const [pct, setPct] = useState(0)
  useEffect(() => {
    if (ready) { setPct(1); return }
    const start = performance.now()
    const dur = minDuration
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(0.92, (now - start) / dur * 0.92)
      setPct(p)
      if (p < 0.92) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ready, minDuration])

  // Small grace beat after everything is ready, then a soft fade-out.
  const done = minDone && ready
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setLeaving(true), 250)
    return () => clearTimeout(t)
  }, [done])

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setGone(true), 550)
    return () => clearTimeout(t)
  }, [leaving])

  return (
    <>
      {show && !gone && (
        <div
          className={`room-loader ${leaving ? 'room-loader--leaving' : ''}`}
          style={accent ? ({ '--rl-accent': accent } as React.CSSProperties) : undefined}
          role="status"
          aria-live="polite"
        >
          <div className="rl-card">
            <span className="rl-eyebrow">Entering</span>
            <h1 className="rl-name">{roomName || 'The Great Library'}</h1>

            <div className="rl-divider">
              <span /><em /><span />
            </div>

            <div className="rl-track">
              <div className="rl-fill" style={{ transform: `scaleX(${pct})` }} />
            </div>
            <div className="rl-sub">
              {ready ? 'Opening the doors…' : 'Loading the room…'}
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  )
}
