import type { AuthUser } from '../store/auth'
import { snapshotSettings, useSettings } from '../store/settings'
import { useProfile } from '../store/profile'
import { useSocial } from '../store/social'
import { useFriends } from '../store/friends'
import { useChat } from '../store/chat'
import { usePomodoro } from '../store/pomodoro'
import { startHeartbeat, stopHeartbeat, setStudyStatus } from './presence'
import { clearProfileSettingsCache, loadProfileSettings, patchProfileSettings } from './profileStore'
import { globalRunOnce, userRunOnce } from './runOnce'

/**
 * App initialization orchestrator. Centralises the "run once" wiring so the UI
 * layer doesn't have to know about run-once keys or storage details.
 *
 *  - {@link runGlobalInit}  runs once per device (first launch config).
 *  - {@link runUserInit}    runs each sign-in: hydrates per-user settings from
 *    the cloud, enables cloud sync, and performs per-user one-time setup/seeding.
 */

/** Once-per-device first-launch configuration. Idempotent. */
export async function runGlobalInit(): Promise<void> {
  await globalRunOnce('first-launch.v1', () => {
    // On a brand-new device, respect the OS "reduce motion" preference as a
    // sensible default the user can later override in settings.
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) useSettings.getState().set('reduceMotion', true)
  })
}

/** Per-user init. Call whenever a user becomes authenticated. */
export async function runUserInit(user: AuthUser): Promise<void> {
  // 1. Pull the user's cloud settings document (also primes the run-once cache).
  const cloud = await loadProfileSettings(user.id)

  // 2. Hydrate the settings store from the cloud copy, THEN enable sync so we
  //    don't immediately echo the freshly-loaded values back to the server.
  useSettings.getState().hydrateFromCloud(cloud.app)
  useSettings.getState().bindCloud(user.id)

  // 2b. Hydrate the onboarding/profile store from the same cloud document. This
  //     finishes before `loading` flips false (auth awaits runUserInit), so the
  //     onboarding gate reads `onboarded` with no default-then-swap flash.
  await useProfile.getState().hydrate(user.id)

  // 2c. Hydrate the social graph (who I follow + my counts) so Follow buttons
  //     and the profile header render correct state immediately. Non-blocking.
  void useSocial.getState().hydrate(user.id)

  // 2d. Hydrate the friend graph + chat summaries and start the presence
  //     heartbeat. All non-blocking — chat is ambient, never gates app entry.
  void useFriends.getState().hydrate(user.id)
  void useChat.getState().hydrate(user.id)
  startHeartbeat()
  bindFocusPresence()

  // 3. One-time per-user seeding: create the profile row with the current
  //    settings the first time we ever see this account.
  await userRunOnce(user.id, 'profile-seed.v1', async () => {
    await patchProfileSettings(user.id, { app: snapshotSettings() })
  })
}

// Map the focus timer onto presence + chat silencing. A running study block →
// status 'focus' and chat popups/sound suppressed (messages still persist and
// show in the panel). Breaks → 'break'; otherwise 'available'.
let unbindFocus: (() => void) | null = null
function bindFocusPresence(): void {
  if (unbindFocus) return
  const apply = (s: { mode: string; running: boolean }) => {
    const focusing = s.mode === 'study' && s.running
    const status = focusing ? 'focus' : s.mode === 'break' || s.mode === 'long' ? 'break' : 'available'
    useChat.getState().setFocusSilent(focusing)
    setStudyStatus(status)
    useChat.getState().mirrorStatus(status)
  }
  apply(usePomodoro.getState())
  unbindFocus = usePomodoro.subscribe(apply)
}

/** Tear down per-user state on sign-out so the next user starts clean. */
export function runUserTeardown(): void {
  unbindFocus?.()
  unbindFocus = null
  useSettings.getState().unbindCloud()
  useProfile.getState().reset()
  useSocial.getState().reset()
  useFriends.getState().reset()
  useChat.getState().reset()
  stopHeartbeat()
  clearProfileSettingsCache()
}
