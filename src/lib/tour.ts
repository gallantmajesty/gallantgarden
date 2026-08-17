// Max's guided tour for new players — one short walk from the Lobby into the
// Realm, with everything dimmed except the next thing to click.
//
// The tour is a simple localStorage state machine so it survives navigation:
//   lobby-realm  → on the Lobby, click the Realm card
//   realm-pick   → on /lobby/realm/choose, click Public Realm
//   realm-enter  → on the Public Realm world picker, click Library
//   done         → tour finished (or skipped), never shown again
//
// The key is per-account (`sf.tour.v1.<userId>`) so every new user gets
// guided once — completing it on one account never hides it for another
// account on the same device. Guests use their stored guest id; the plain
// device-wide key is only a fallback for the brief moment before the user
// loads, and for any caller without a user.

export type TourStep = 'lobby-realm' | 'realm-pick' | 'realm-enter'
export type TourState = TourStep | 'done'

const TOUR_KEY = 'sf.tour.v1'
const TOUR_LIVE_KEY = 'sf.tour.active.v1'

function keyFor(uid?: string | null): string {
  return uid ? `${TOUR_KEY}.${uid}` : TOUR_KEY
}

function liveKeyFor(uid?: string | null): string {
  return uid ? `${TOUR_LIVE_KEY}.${uid}` : TOUR_LIVE_KEY
}

/** Read the current tour state for an account. `null` = never started. */
export function readTour(uid?: string | null): TourState | null {
  try {
    const raw = localStorage.getItem(keyFor(uid))
    if (!raw) return null
    const v = raw as TourState
    return v === 'lobby-realm' || v === 'realm-pick' || v === 'realm-enter' || v === 'done' ? v : null
  } catch {
    return null
  }
}

/** Advance / set the tour for an account to a specific step. */
export function setTourStep(step: TourState, uid?: string | null): void {
  try {
    localStorage.setItem(keyFor(uid), step)
    if (step !== 'done') markTourLive(uid)
  } catch {
    /* storage blocked — the tour just replays next time */
  }
}

/** Finish (or skip) the tour for an account for good. */
export function completeTour(uid?: string | null): void {
  setTourStep('done', uid)
}

/** Mark that the tour is actively being walked RIGHT NOW (this browser tab).
 *  Used to tell a live mid-tour walk (which may keep resuming as the player
 *  navigates) apart from a leftover mid-tour state from a PREVIOUS visit —
 *  the guide is a first-time-only helper, so stale visits must never replay
 *  it. sessionStorage (not localStorage) keeps the marker tied to the tab. */
export function markTourLive(uid?: string | null): void {
  try {
    sessionStorage.setItem(liveKeyFor(uid), '1')
  } catch {
    /* storage blocked — stale tour states just get retired next visit */
  }
}

/** True when this tab is currently walking the tour (setTourStep or a prior
 *  step was called since this tab opened). */
export function isTourLive(uid?: string | null): boolean {
  try {
    return sessionStorage.getItem(liveKeyFor(uid)) === '1'
  } catch {
    return false
  }
}
