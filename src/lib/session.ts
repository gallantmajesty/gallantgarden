import { insforge } from './insforge'

/**
 * Single-session enforcement: only ONE tab/browser/device active at a time per user.
 *
 * Architecture:
 *  • Each tab generates a random session_id (UUID) on mount.
 *  • On sign-in: claim_session(session_id) → server writes this token into the user's
 *    single active_session row, instantly locking out every other instance.
 *  • Heartbeat (~10s): session_heartbeat(session_id) → returns false if another
 *    instance stole the lock, triggering the lock overlay.
 *  • BroadcastChannel: same-browser tabs coordinate for instant detection (no 10s wait).
 *  • Lock overlay: shows "Use Focus Lily here" → resumeHere() → claim_session() steals
 *    the lock and the old tab gets locked out within one heartbeat.
 */

let sessionId: string | null = null
let deviceLabel: string | null = null

/**
 * Initialize session for multi-device support. Call once on mount.
 * Each device gets a unique session ID for multiplayer identification.
 */
export function initSession(): void {
  sessionId = crypto.randomUUID()
  deviceLabel = getDeviceLabel()
}

/** Get device label for multiplayer identification. */
export function getDeviceLabel(): string {
  if (deviceLabel) return deviceLabel
  deviceLabel = getDeviceLabelInternal()
  return deviceLabel
}

/** Get device label for multiplayer identification. */
function getDeviceLabelInternal(): string {
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android phone' : 'Android tablet'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac'
  if (/Linux/i.test(ua)) return 'Linux PC'
  return 'another device'
}

/** Get current session ID for multiplayer. */
export function getSessionId(): string | null {
  return sessionId
}

/** Claim the single-session lock for this device. Returns true if successful. */
export async function claimSession(): Promise<boolean> {
  const id = getSessionId()
  if (!id) return false
  try {
    const { data, error } = await insforge.functions.invoke('claim_session', { session_id: id })
    if (error) throw error
    return data?.success === true
  } catch {
    return false
  }
}