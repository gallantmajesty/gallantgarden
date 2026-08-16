// Max's guided tour for new players — one short walk from the Lobby into the
// Realm, with everything dimmed except the next thing to click.
//
// The tour is a simple localStorage state machine so it survives navigation:
//   lobby-realm  → on the Lobby, click the Realm card
//   realm-pick   → on /lobby/realm/choose, click Public Realm
//   realm-enter  → on the Public Realm world picker, click Library
//   done         → tour finished (or skipped), never shown again on this device
//
// Guests and signed-in users both keep this key locally, so it's per-device.

export type TourStep = 'lobby-realm' | 'realm-pick' | 'realm-enter'
export type TourState = TourStep | 'done'

const TOUR_KEY = 'sf.tour.v1'

/** Read the current tour state. `null` = never started (tour available). */
export function readTour(): TourState | null {
  try {
    const raw = localStorage.getItem(TOUR_KEY)
    if (!raw) return null
    const v = raw as TourState
    return v === 'lobby-realm' || v === 'realm-pick' || v === 'realm-enter' || v === 'done' ? v : null
  } catch {
    return null
  }
}

/** Advance / set the tour to a specific step. */
export function setTourStep(step: TourState): void {
  try {
    localStorage.setItem(TOUR_KEY, step)
  } catch {
    /* storage blocked — the tour just replays next time */
  }
}

/** Finish (or skip) the tour for good. */
export function completeTour(): void {
  setTourStep('done')
}
