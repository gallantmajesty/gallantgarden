import { useSettings } from '../store/settings'
import { detectDeviceProfile, getCachedDeviceProfile, benchmarkFps, type DeviceTier } from '../lib/deviceProfile'

/**
 * Realm-entry quality flow + login-time device auto-detection.
 *
 * DETECTION STARTS AT LOGIN (App mounts with an authenticated user): we probe
 * the device once, cache the profile, and — when Auto quality is ON — apply a
 * fitting, LOD-free preset immediately so even the Lobby feels right.
 *
 * On realm entry the resolution is dropped to 0.5 for a fast settle, then —
 * once the scene is ready — stepped back up to the detected tier. This is
 * intentionally the ONLY axis auto-quality touches at entry: textures,
 * shadows, post-processing, LOD and view distance stay exactly as the player
 * set them, so the *look* never changes — only how many pixels are shaded.
 *
 *   autoQuality ON  (default): detect at login → open realm low → step up.
 *   autoQuality OFF          : the player's own choices are fully respected.
 *
 * LOD GUARANTEE: nothing here ever writes `lodBias` or `impostorLod`. The
 * LOD systems in settings/scenePreset are untouched by auto-quality.
 */

/** Opening resolution scale — the cheapest axis to drop for a fast first settle. */
const LOW_RES = 0.5
/** Auto-detected resolution scale by device tier. Kept at/below 1.0: the DPR
 *  ceiling in scenePreset() already clamps to 1.0, and pushing past it only
 *  multiplies frame-buffer memory (the main cause of GPU context-loss / blank
 *  screens). We step UP gently rather than jumping straight to a heavy tier. */
const RES_BY_TIER: Record<Exclude<DeviceTier, 'blocked'>, number> = {
  low: 0.6,
  medium: 0.8,
  high: 0.9,
}

/** LOD-free quality axes applied at LOGIN for weak devices. Deliberately
 *  omits `lodBias` and `impostorLod` — those always stay at the user's values. */
interface LodaFreeAxes {
  resolutionScale: number
  viewDistance: number
  shadowQuality: 'off' | 'low' | 'high'
  postProcessing: 'off' | 'low' | 'high'
  textureQuality: 'low' | 'medium' | 'high'
}
const LOGIN_AXES: Record<'low' | 'medium', LodaFreeAxes> = {
  low: { resolutionScale: 0.7, viewDistance: 0.6, shadowQuality: 'off', postProcessing: 'low', textureQuality: 'low' },
  medium: { resolutionScale: 0.85, viewDistance: 0.8, shadowQuality: 'low', postProcessing: 'low', textureQuality: 'medium' },
}

/** Call once at login (App mount with a user). Detects the device, caches the
 *  profile, and — when Auto quality is ON — applies a fitting LOD-free preset
 *  for weak devices. Auto-detect only ever LOWERS quality below the user's
 *  current choice (a strong device never overrides a user who picked Low), so
 *  it is safe to run for any quality label. Never touches LOD axes. */
export function runLoginAutoQuality(): void {
  const s = useSettings.getState()
  if (!s.autoQuality) return
  void detectDeviceProfile().then((p) => {
    if (!useSettings.getState().autoQuality) return
    if (p.tier === 'blocked') return
    const st = useSettings.getState()
    // A high-tier device never needs downgrading; a weak device only ever
    // brings the user DOWN from what they currently have (never up).
    const axes = p.tier === 'high' ? null : LOGIN_AXES[p.tier]
    if (!axes) return
    // Respect a user who deliberately chose a LOW preset — auto-detect should
    // not raise them to Medium just because their machine could handle it.
    const tierRank: Record<string, number> = { low: 0, medium: 1, high: 2, custom: 2 }
    if (tierRank[st.quality] <= tierRank[p.tier]) return
    // Seed the LOD-free axes but preserve the user's LOD values explicitly.
    st.setQualityAxes({
      resolutionScale: axes.resolutionScale ?? st.resolutionScale,
      viewDistance: axes.viewDistance ?? st.viewDistance,
      shadowQuality: axes.shadowQuality ?? st.shadowQuality,
      postProcessing: axes.postProcessing ?? st.postProcessing,
      textureQuality: axes.textureQuality ?? st.textureQuality,
      lodBias: st.lodBias,
      impostorLod: st.impostorLod,
    })
    // setQualityAxes flips the label to 'custom'; restore the honest tier name.
    st.set('quality', p.tier)
  })
}

/** Call once when a realm screen mounts. Drops resolution for a fast first settle
 *  when auto-quality is enabled; otherwise leaves the player's choice untouched. */
export function enterRealmLowFirst(): void {
  const s = useSettings.getState()
  if (s.autoQuality) s.setQualityAxis('resolutionScale', LOW_RES)
}

/** Call once the 3D scene signals ready. Steps the resolution up to the
 *  auto-detected level (only when auto-quality is on).
 *
 *  This is the right place for the live FPS check: the scene is actually
 *  rendering now, so a frame-rate sample measures real headroom — not the
 *  boot jank a login-time sample would read. A weak-but-many-core machine that
 *  looked 'high' on paper can still stutter here, so a low FPS pulls the
 *  resolution down one step. It only ever LOWERS, never raises.
 */
export function settleRealmQuality(): void {
  const s = useSettings.getState()
  if (!s.autoQuality) return
  // Prefer the login-time profile (pure hardware); detect as a fallback for
  // guests who skipped login.
  const cached = getCachedDeviceProfile()
  const promise = cached ? Promise.resolve(cached) : detectDeviceProfile()
  void promise.then(async (p) => {
    // Guard against the setting flipping mid-flight.
    if (!useSettings.getState().autoQuality) return
    if (p.tier === 'blocked') {
      useSettings.getState().setQualityAxis('resolutionScale', LOW_RES)
      return
    }
    let res = RES_BY_TIER[p.tier]
    // Live FPS check while the world renders: only pull DOWN one step. We
    // sample at low resolution first (we just opened low), so this reflects
    // the device's honest headroom.
    try {
      const fps = await benchmarkFps(1200)
      if (!useSettings.getState().autoQuality) return
      if (fps < 20 && res > RES_BY_TIER.medium) res = RES_BY_TIER.medium
      else if (fps < 12) res = RES_BY_TIER.low
    } catch {
      /* benchmark failure — keep the hardware tier */
    }
    useSettings.getState().setQualityAxis('resolutionScale', res)
  })
}
