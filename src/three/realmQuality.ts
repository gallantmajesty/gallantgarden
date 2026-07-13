import { useSettings } from '../store/settings'

/**
 * Realm-entry quality flow — pixel quality only.
 *
 * The 3D realms are heavy to spin up, so on entry we drop the *resolution scale*
 * (pixel density) for a fast settle, then — once the scene is ready — auto-detect
 * the device and step the resolution back up. This is intentionally the ONLY axis
 * auto-quality touches: textures, shadows, post-processing, LOD and view distance
 * stay exactly as the player set them, so the *look* never changes — only how
 * many pixels are shaded.
 *
 *   autoQuality ON  (default): open at low resolution → benchmark + device → step up.
 *   autoQuality OFF          : the player's own resolution choice is respected.
 */

/** Opening resolution scale — the cheapest axis to drop for a fast first settle. */
const LOW_RES = 0.5
/** Auto-detected resolution scale by device tier. Kept at/below 1.0: the DPR
 *  ceiling in scenePreset() already clamps to 1.0, and pushing past it only
 *  multiplies frame-buffer memory (the main cause of GPU context-loss / blank
 *  screens). We step UP gently rather than jumping straight to a heavy tier. */
const RES_BY_TIER: Record<'low' | 'medium' | 'high', number> = {
  low: 0.6,
  medium: 0.8,
  high: 0.9,
}

/** Call once when a realm screen mounts. Drops resolution for a fast first settle
 *  when auto-quality is enabled; otherwise leaves the player's choice untouched. */
export function enterRealmLowFirst(): void {
  const s = useSettings.getState()
  if (s.autoQuality) s.setQualityAxis('resolutionScale', LOW_RES)
}

/** Call once the 3D scene signals ready. Steps the resolution up to the
 *  auto-detected level (only when auto-quality is on). */
export function settleRealmQuality(): void {
  const s = useSettings.getState()
  if (!s.autoQuality) return
  void runAutoDetect().then((res) => {
    // Guard against the setting flipping mid-flight.
    if (useSettings.getState().autoQuality) useSettings.getState().setQualityAxis('resolutionScale', res)
  })
}

/** Sample the real frame-rate for a short window (runs while we're already at
 *  low resolution, so it reflects the device's headroom honestly). */
function benchmarkFps(ms = 1000): Promise<number> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'undefined') {
      resolve(60)
      return
    }
    let frames = 0
    const start = performance.now()
    const tick = () => {
      frames++
      const now = performance.now()
      if (now - start >= ms) resolve((frames * 1000) / (now - start))
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

/** Coarse device capability estimate — the primary auto signal. */
function deviceTier(): 'low' | 'medium' | 'high' {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency || 4
  const mem = nav.deviceMemory
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (mobile) return mem !== undefined && mem <= 3 ? 'low' : 'medium'
  if (cores <= 2) return 'low'
  if (cores <= 4 || (mem !== undefined && mem <= 4)) return 'medium'
  if (cores >= 8 && (mem === undefined || mem >= 8)) return 'high'
  return 'medium'
}

async function runAutoDetect(): Promise<number> {
  const fps = await benchmarkFps(1000)
  let tier = deviceTier()
  // The live benchmark is the honest signal: a weak-but-many-core device may
  // report 'high' on paper yet actually stutter, so let the measured FPS pull
  // the tier DOWN. We never step above 'medium' on a sub-45fps device, which is
  // what kept slamming the GPU into a context-losing resolution spike.
  if (fps < 28) tier = 'low'
  else if (fps < 45) tier = 'medium'
  return RES_BY_TIER[tier]
}
