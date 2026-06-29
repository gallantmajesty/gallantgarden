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
let heartbeatTimer: number | null = null
let bc: BroadcastChannel | null = null
let lockCallback: ((locked: boolean, where?: string) => void) | null = null

const HEARTBEAT_MS = 10_000

/**
 * Initialize the session guard. Call once on mount (before sign-in check).
 * `onLockChange(locked, where)` — `where` is the human label of the device that
 * currently holds the session (e.g. "Windows PC", "iPhone"), so the locked-out
 * tab can tell the user exactly where their account is open.
 */
export function initSession(onLockChange: (locked: boolean, where?: string) => void): void {
  sessionId = crypto.randomUUID()
  lockCallback = onLockChange

  // BroadcastChannel for same-browser instant coordination.
  if ('BroadcastChannel' in window) {
    bc = new BroadcastChannel('focus-lily-session')
    bc.onmessage = (e) => {
      if (e.data?.type === 'claim' && e.data.sessionId !== sessionId) {
        // Another tab in this browser claimed the lock; it told us its device.
        lockCallback?.(true, e.data.deviceLabel || undefined)
      }
    }
  }
}

/** Claim the session lock for this tab. Call on sign-in or "Use here" button. */
export async function claimSession(deviceLabel = getDeviceLabel()): Promise<void> {
  if (!sessionId) return
  await insforge.database.rpc('claim_session', { p_session_id: sessionId, p_device_label: deviceLabel })
  bc?.postMessage({ type: 'claim', sessionId, deviceLabel })
  lockCallback?.(false)
  startHeartbeat()
}

/** Release the session lock on sign-out. */
export async function releaseSession(): Promise<void> {
  stopHeartbeat()
  await insforge.database.rpc('release_session')
  sessionId = null
}

/** Stop the heartbeat (used on sign-out or unmount). */
export function stopSessionGuard(): void {
  stopHeartbeat()
  bc?.close()
  bc = null
  lockCallback = null
}

function startHeartbeat(): void {
  if (heartbeatTimer) return
  const beat = async () => {
    if (!sessionId) return
    const { data } = await insforge.database.rpc('session_heartbeat', { p_session_id: sessionId })
    if (data === false) {
      // Lock stolen by another instance — look up where it's now active so the
      // overlay can say "open on your iPhone" instead of a generic message.
      lockCallback?.(true, await fetchHolderDevice())
    }
  }
  void beat()
  heartbeatTimer = window.setInterval(beat, HEARTBEAT_MS)
}

function stopHeartbeat(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

/** Read the device label of whoever currently holds my account's session.
 *  RLS lets a user read only their own active_session row, so this returns the
 *  holder we just lost the lock to. Returns undefined if it can't be read. */
async function fetchHolderDevice(): Promise<string | undefined> {
  try {
    const { data } = await insforge.database
      .from('active_session')
      .select('device_label')
      .single()
    const label = (data as { device_label?: string } | null)?.device_label
    return label || undefined
  } catch {
    return undefined
  }
}

/** Friendly "where am I" label, distinguishing PC from phone/tablet. */
function getDeviceLabel(): string {
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android phone' : 'Android tablet'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac'
  if (/Linux/i.test(ua)) return 'Linux PC'
  return 'another device'
}
