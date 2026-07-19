import type { AuthUser } from '../store/auth'
import { snapshotSettings, useSettings } from '../store/settings'
import { useProfile } from '../store/profile'
import { useSocial } from '../store/social'
import { useFriends } from '../store/friends'
import { useChat } from '../store/chat'
import { usePomodoro, setPomodoroFocusSink } from '../store/pomodoro'
import { useMagnet } from '../store/magnet'
import { startHeartbeat, stopHeartbeat, setStudyStatus } from './presence'
import { clearProfileSettingsCache, loadProfileSettings, patchProfileSettings } from './profileStore'
import { globalRunOnce, userRunOnce } from './runOnce'
import { awardFocusSessionBonuses } from './xpEngine'
import { rankForTotalXp } from './ranks'

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
  await useProfile.getState().hydrate(user.id, user.profile?.name)

  // 2c. Hydrate the social graph (who I follow + my counts) so Follow buttons
  //     and the profile header render correct state immediately. Non-blocking.
  void useSocial.getState().hydrate(user.id)

  // 2d. Hydrate the friend graph + chat summaries and start the presence
  //     heartbeat. All non-blocking — chat is ambient, never gates app entry.
  void useFriends.getState().hydrate(user.id)
  void useChat.getState().hydrate(user.id)
  startHeartbeat()
  bindFocusPresence()

  // 2e. Hydrate Task Magnet here (not only on the /magnet screen) so the
  //     student's "second brain" is live everywhere — most importantly so
  //     completed focus blocks log into analytics no matter where they study.
  useMagnet.getState().hydrate(user.id)
  bindFocusLogging()

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

// Bridge the focus timer into Task Magnet analytics: every completed study block
// becomes a dated, subject-tagged focus session (and earns world-growing XP).
// Also tracks tab visibility and awards focus quality bonuses.
let focusTabAlwaysVisible = true
let focusVisibilityHandler: (() => void) | null = null

function bindFocusLogging(): void {
  setPomodoroFocusSink((minutes, subject) => {
    useMagnet.getState().logFocus(minutes, subject)

    // Award focus session quality bonuses
    try {
      const { xp, premiumXp, data } = useProfile.getState()
      const isLibrary = false // Pomodoro is not library-specific
      const currentRank = rankForTotalXp(xp + premiumXp)
      const { result } = awardFocusSessionBonuses(
        xp, premiumXp, minutes, focusTabAlwaysVisible, isLibrary, 'pomodoro', currentRank.id,
      )
      if (result.goldenLeaves > 0) {
        const newPremiumXp = premiumXp + result.goldenLeaves
        useProfile.setState({ premiumXp: newPremiumXp })
        const userId = useProfile.getState().userId
        if (userId) {
          import('./insforge').then(({ insforge }) =>
            insforge.from('profiles').upsert([{ id: userId, premium_xp: newPremiumXp }], { onConflict: 'id' })
          ).catch(() => {})
        }
      }
    } catch { /* ignore — bonus is best-effort */ }

    // Reset tab visibility tracking for next session
    focusTabAlwaysVisible = true
  })

  // Track tab visibility during focus sessions
  if (!focusVisibilityHandler) {
    focusVisibilityHandler = () => {
      if (document.hidden) focusTabAlwaysVisible = false
    }
    document.addEventListener('visibilitychange', focusVisibilityHandler)
  }
}

/** Tear down per-user state on sign-out so the next user starts clean. */
export function runUserTeardown(): void {
  unbindFocus?.()
  unbindFocus = null
  setPomodoroFocusSink(null)
  if (focusVisibilityHandler) {
    document.removeEventListener('visibilitychange', focusVisibilityHandler)
    focusVisibilityHandler = null
  }
  focusTabAlwaysVisible = true
  useSettings.getState().unbindCloud()
  useProfile.getState().reset()
  useSocial.getState().reset()
  useFriends.getState().reset()
  useChat.getState().reset()
  stopHeartbeat()
  clearProfileSettingsCache()
}
