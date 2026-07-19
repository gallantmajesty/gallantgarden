/**
 * A tiny frame-rate throttle for `useFrame` animation loops.
 *
 * Many decorative loops (candle bob, rune drift, lantern pulse, rain, sky/storm)
 * rewrite GPU buffers or recompute lighting every single frame even though the
 * motion is slow and the camera is often idle. Running them at the full 60fps is
 * pure wasted GPU/CPU on integrated laptops and is the main driver of the
 * Library realm's low FPS / "hang" feel.
 *
 * Wrapping the body in `throttle(hz)` drops the update to `~hz` times per second.
 * Because these effects animate slowly, the visual result is identical — but the
 * per-frame cost collapses. `useFrame` still fires every frame; we just skip the
 * expensive work on the off-frames, so nothing freezes and the look is unchanged.
 */

const REFRESH_INTERVAL: Record<number, number> = {}

/** Returns true only on frames where `hz` updates should run (once per ~1/hz s). */
export function throttle(hz: number, now: number): boolean {
  const interval = 1000 / hz
  const last = REFRESH_INTERVAL[hz] ?? -Infinity
  if (now - last >= interval - 0.5) {
    REFRESH_INTERVAL[hz] = now
    return true
  }
  return false
}
