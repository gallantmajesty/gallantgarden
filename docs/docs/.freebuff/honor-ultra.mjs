import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/three/library/LibraryScene.tsx'
let src = readFileSync(path, 'utf8')

const edits = [
  // 1) Update the doc comment — governor only steps resolution now.
  {
    from: ` * Live FPS governor (P2 — transient, never persisted). Active only when the
 * player has auto-quality ON (manual-quality users keep full control of the six
 * axes). Samples a smoothed FPS and, when it sits below ~45 for 3 s, steps quality
 * DOWN to recover framerate — first dropping the heavy ` + '`ultra`' + ` post-FX (GodRays /
 * SSAO), then lowering the resolution scale. When FPS is healthy (>55 for 3 s) it
 * steps back UP toward the auto-detected tier. Hysteresis + a 3 s dwell prevent
 * oscillation. On a strong GPU at the High preset this does nothing — the look is
 * untouched; cost is only shed transiently when the device is genuinely struggling
 * (weak laptop, busy room, heavy night post-FX).`,
    to: ` * Live FPS governor (P2 — transient, never persisted). Active only when the
 * player has auto-quality ON (manual-quality users keep full control of the six
 * axes). Samples a smoothed FPS and, when it sits below ~45 for 3 s, steps the
 * RESOLUTION SCALE DOWN to recover framerate; when FPS is healthy (>55 for 3 s)
 * it steps back up toward the auto-detected tier. Hysteresis + a 3 s dwell
 * prevent oscillation. The governor NEVER touches the user's explicit Ultra
 * choice (SSAO/GodRays/DoF) — that toggle is the player's own, so "Ultra on"
 * stays on regardless of device speed. On a strong GPU at the High preset this
 * does nothing — the look is untouched; cost is only shed transiently when the
 * device is genuinely struggling (weak laptop, busy room, heavy night post-FX).`,
  },
  // 2) Drop the now-unused refs.
  {
    from: `  const baseScale = useRef<number | null>(null)
  const baseUltra = useRef(false)
  const ultraOff = useRef(false)
  const primed = useRef(false)`,
    to: `  const baseScale = useRef<number | null>(null)
  const primed = useRef(false)`,
  },
  // 3) Drop the baseUltra capture in the prime block.
  {
    from: `        primed.current = true
        baseScale.current = useSettings.getState().resolutionScale
        baseUltra.current = useSettings.getState().ultra
        curScale.current = baseScale.current`,
    to: `        primed.current = true
        baseScale.current = useSettings.getState().resolutionScale
        curScale.current = baseScale.current`,
  },
  // 4) Low-FPS branch: only step resolution, never flip ultra.
  {
    from: `        lowSince.current = now
        // 1) drop the heaviest post-FX first (zero look change on most screens;
        //    only trims GodRays/SSAO at night / ultra).
        if (!ultraOff.current && useSettings.getState().ultra) {
          useSettings.setState({ ultra: false })
          ultraOff.current = true
        } else if (curScale.current > 0.5) {
          // 2) then lower resolution scale (transient softness under load only).
          curScale.current = Math.max(0.5, curScale.current * 0.85)
          useSettings.setState({ resolutionScale: curScale.current })
        }`,
    to: `        lowSince.current = now
        // Lower the resolution scale only (transient softness under load).
        // Ultra post-FX is the user's explicit choice — never flip it.
        if (curScale.current > 0.5) {
          curScale.current = Math.max(0.5, curScale.current * 0.85)
          useSettings.setState({ resolutionScale: curScale.current })
        }`,
  },
  // 5) Recovery branch: raise resolution only.
  {
    from: `        highSince.current = now
        // Recover toward the auto tier: raise resolution first, then restore ultra.
        if (curScale.current < (baseScale.current ?? 1)) {
          curScale.current = Math.min(baseScale.current ?? 1, curScale.current / 0.85)
          useSettings.setState({ resolutionScale: curScale.current })
        } else if (ultraOff.current) {
          useSettings.setState({ ultra: baseUltra.current })
          ultraOff.current = false
        }`,
    to: `        highSince.current = now
        // Recover toward the auto tier: raise resolution back up.
        if (curScale.current < (baseScale.current ?? 1)) {
          curScale.current = Math.min(baseScale.current ?? 1, curScale.current / 0.85)
          useSettings.setState({ resolutionScale: curScale.current })
        }`,
  },
]

let applied = 0
for (const e of edits) {
  if (!src.includes(e.from)) {
    console.error('NOT FOUND:\n---\n' + e.from.slice(0, 300) + '\n---')
    continue
  }
  src = src.replace(e.from, e.to)
  applied++
}
writeFileSync(path, src, 'utf8')
console.log(`Applied ${applied}/${edits.length} edits`)
