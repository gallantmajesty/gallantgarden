/**
 * Device profile — the "revolution GPU detection" every user gets from login.
 *
 * Runs once at login (App mounts with an authenticated user), classifies the
 * device into low / medium / high / blocked, and caches the result so the probe
 * (which creates a WebGL context) doesn't run on every page. The tier feeds:
 *   - login-time auto-quality: applies a fitting, LOD-free preset
 *   - the realm loader warning for weak devices
 *   - the LobbySettings "detected device" read-out
 *
 * LOD is deliberately OUT OF SCOPE here. `lodBias` and `impostorLod` are never
 * written by auto-quality — the user's own choices stay untouched.
 */

export type DeviceTier = 'low' | 'medium' | 'high' | 'blocked'

export interface DeviceProfile {
  tier: DeviceTier
  /** True when the GPU is a software rasterizer (SwiftShader / llvmpipe /
   *  Basic Render Driver) — a strong "this machine will struggle" signal. */
  softwareRenderer: boolean
  /** GL_MAX_TEXTURE_SIZE — a coarse GPU-strength proxy. */
  maxTextureSize: number
  cores: number
  /** navigator.deviceMemory in GiB, when exposed (Chromium). */
  memoryGiB?: number
  mobile: boolean
  /** When the renderer string is exposed (debug ext), keep it for the UI. */
  renderer?: string
}

const KEY = 'sf.deviceProfile.v1'

/** Tiny pub/sub so the settings UI can react when detection completes instead
 *  of showing "Detecting…" forever. detectDeviceProfile() notifies listeners
 *  after caching the result. */
type ProfileListener = (p: DeviceProfile) => void
const listeners = new Set<ProfileListener>()
export function onDeviceProfile(listener: ProfileListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function notify(p: DeviceProfile) {
  listeners.forEach((l) => {
    try {
      l(p)
    } catch {
      /* listener errors must not break detection */
    }
  })
}

/** Sample the live frame-rate for a short window. NOT used at login — the page
 *  is still booting there (lazy chunks, network), so an FPS sample reads jank
 *  instead of headroom and wrongly drags strong devices down. Used only at
 *  realm-ready, where the 3D scene is actually rendering and the number is real. */
export async function benchmarkFps(ms = 1500): Promise<number> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'undefined') {
      resolve(60)
      return
    }
    const start = performance.now()
    let frames = 0
    const tick = (now: number) => {
      frames++
      if (now - start >= ms) resolve((frames * 1000) / (now - start))
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

/** Create a throwaway WebGL context to read capability strings. Returns null
 *  when the browser can't make one at all (blocked device). */
function webglInfo(): { maxTextureSize: number; renderer?: string; software: boolean } | null {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return null
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    let renderer: string | undefined
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    if (dbg) {
      const raw = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '')
      renderer = raw
    }
    const software =
      !!renderer &&
      /swiftshader|llvmpipe|softpipe|basic render driver|software|microsoft basic/i.test(renderer)
    return { maxTextureSize, renderer, software }
  } catch {
    return null
  }
}

/** Classify from signals only — no FPS (which needs a warm page). */
function classify(
  info: { maxTextureSize: number; renderer?: string; software: boolean } | null,
  cores: number,
  memoryGiB: number | undefined,
  mobile: boolean,
): DeviceTier {
  if (!info) return 'blocked'
  if (info.software) return 'low'
  // Small texture cap ⇒ weak GPU. 4096 is the floor for any real dGPU.
  if (info.maxTextureSize < 4096) return 'low'
  if (mobile) return memoryGiB !== undefined && memoryGiB <= 3 ? 'low' : 'medium'
  if (cores <= 2) return 'low'
  if (cores <= 4 || (memoryGiB !== undefined && memoryGiB <= 4)) return 'medium'
  if (cores >= 8 && (memoryGiB === undefined || memoryGiB >= 8)) return 'high'
  return 'medium'
}

/** Run the full probe. Creates one WebGL context — call sparingly. */
export async function detectDeviceProfile(): Promise<DeviceProfile> {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency || 4
  const memoryGiB = nav.deviceMemory
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  let tier: DeviceTier
  let info: { maxTextureSize: number; renderer?: string; software: boolean } | null = null
  try {
    info = webglInfo()
  } catch {
    info = null
  }
  // Pure hardware classification at login. No FPS benchmark here: the page is
  // still booting, so a frame-rate sample measures load jank — it would wrongly
  // pull strong devices down (e.g. an 8-core / 16K-texture Radeon read as Low).
  // The live FPS check happens at realm-ready instead (see settleRealmQuality),
  // when the 3D scene is actually rendering.
  tier = classify(info, cores, memoryGiB, mobile)

  const profile: DeviceProfile = {
    tier,
    softwareRenderer: info?.software ?? false,
    maxTextureSize: info?.maxTextureSize ?? 0,
    cores,
    memoryGiB,
    mobile,
    renderer: info?.renderer,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    /* storage blocked — fine, detection just re-runs next time */
  }
  notify(profile)
  return profile
}

/** Cached profile from a previous login, if any. */
export function getCachedDeviceProfile(): DeviceProfile | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DeviceProfile) : null
  } catch {
    return null
  }
}

/** The profile for the current session: cached if fresh, else detected now. */
export async function getDeviceProfile(): Promise<DeviceProfile> {
  const cached = getCachedDeviceProfile()
  if (cached) return cached
  return detectDeviceProfile()
}

/** Sync tier — for the settings read-out without awaiting the probe. */
export function currentDeviceTier(): DeviceTier {
  return getCachedDeviceProfile()?.tier ?? 'high'
}
