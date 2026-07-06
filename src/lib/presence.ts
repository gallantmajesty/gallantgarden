import { insforge } from './insforge'
import { ONLINE_WINDOW_MS, type StudyStatus, type PublicProfile } from './types'

// Presence without a socket: a heartbeat updates the owner's last_seen_at (+
// study_status) on their profile row; everyone else reads it through the
// public_profiles view. "Online" = seen within ONLINE_WINDOW_MS. This is the
// poll-friendly counterpart to the persist-and-poll chat layer; realtime
// presence can replace it later without touching consumers.

const HEARTBEAT_MS = 45_000
let timer: number | null = null
let currentStatus: StudyStatus = 'available'

/** Write my presence (best-effort; never throws). */
async function beat(): Promise<void> {
  const { data } = await insforge.auth.getUser()
  const id = (data?.user as { id?: string } | undefined)?.id
  if (!id) return
        await insforge
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString(), study_status: currentStatus })
    .eq('id', id)
}

/** Start the heartbeat loop. Idempotent. */
export function startHeartbeat(): void {
  if (timer != null) return
  void beat()
  timer = window.setInterval(() => void beat(), HEARTBEAT_MS)
  // also refresh on tab focus so a returning user shows online promptly
  window.addEventListener('focus', beat)
}

/** Stop the heartbeat and mark offline (best-effort) on sign-out. */
export function stopHeartbeat(): void {
  if (timer != null) {
    window.clearInterval(timer)
    timer = null
  }
  window.removeEventListener('focus', beat)
}

/** Change the broadcast status and immediately flush a heartbeat. */
export function setStudyStatus(status: StudyStatus): void {
  currentStatus = status
  void beat()
}

export function getStudyStatus(): StudyStatus {
  return currentStatus
}

/** Is a profile currently online (recent heartbeat and not self-declared offline)? */
export function isOnline(p: Pick<PublicProfile, 'last_seen_at' | 'study_status'>): boolean {
  if (p.study_status === 'offline') return false
  if (!p.last_seen_at) return false
  return Date.now() - new Date(p.last_seen_at).getTime() < ONLINE_WINDOW_MS
}

/** Effective status to render: 'offline' if the heartbeat has gone stale. */
export function effectiveStatus(
  p: Pick<PublicProfile, 'last_seen_at' | 'study_status'>,
): StudyStatus {
  return isOnline(p) ? (p.study_status ?? 'available') : 'offline'
}

/** One calm colour per status — shared by the dot and the friend-row indicator. */
export const STATUS_COLOR: Record<StudyStatus, string> = {
  available: '#3ec46d',
  studying: '#4f9cff',
  focus: '#a07cff',
  break: '#ffb13d',
  offline: '#9aa0a6',
}
