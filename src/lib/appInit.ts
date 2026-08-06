import type { AuthUser } from '../store/auth'
import { snapshotSettings, useSettings } from '../store/settings'
import { useProfile } from '../store/profile'
import { useSocial } from '../store/social'
import { useFriends } from '../store/friends'
import { useChat } from '../store/chat'
import { usePomodoro, setPomodoroFocusSink } from '../store/pomodoro'
import { useMagnet } from '../store/magnet'
import { useAchievements } from '../store/achievements'
import { useHardcore, applyPendingRefund } from '../store/hardcore'
import { startHeartbeat, stopHeartbeat, setStudyStatus } from './presence'
import { clearProfileSettingsCache, loadProfileSettings, patchProfileSettings } from './profileStore'
import { globalRunOnce, userRunOnce } from './runOnce'
import { awardFocusLeaves } from './xpEngine'
import { rankForTotalXp } from './ranks'
import { boostCodeFromUrl, useDeviceBoost } from './deviceBoost'

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
  const guest = !!user.isGuest

  // Guests skip all cloud operations — local-only state.
  if (guest) {
    await useProfile.getState().hydrate(user.id, user.profile?.name, true)
    // Achievements work locally for guests (cloud read fails silently).
    useAchievements.getState().hydrate(user.id)
    // Guest devices can still act as connectors (?boost=CODE).
    const boostCode = boostCodeFromUrl()
    if (boostCode) useDeviceBoost.getState().connect(boostCode)
    // Guests still earn XP, log focus blocks and mirror focus status locally:
    // the sinks write to the local profile/magnet stores (setStudyStatus is a
    // no-op without a Supabase session), so the timer is fully functional.
    useMagnet.getState().hydrate(user.id)
    bindFocusPresence()
    bindFocusLogging()
    return
  }

  // 1. Pull the user's cloud settings document (also primes the run-once cache).
  const cloud = await loadProfileSettings(user.id)

  // 2. Hydrate the settings store from the cloud copy, THEN enable sync so we
  //    don't immediately echo the freshly-loaded values back to the server.
  useSettings.getState().hydrateFromCloud(cloud.app)
  useSettings.getState().bindCloud(user.id)

  // 2a. If this page was opened with ?boost=CODE, this tab is a connector device
  //     for a hardcore session (multi-device boost). Connect automatically.
  const boostCode = boostCodeFromUrl()
  if (boostCode) {
    useDeviceBoost.getState().connect(boostCode)
  }

  // 2b. Hydrate the onboarding/profile store from the same cloud document. This
  //     finishes before `loading` flips false (auth awaits runUserInit), so the
  //     onboarding gate reads `onboarded` with no default-then-swap flash.
  await useProfile.getState().hydrate(user.id, user.profile?.name)

  // 2b2. Refund any hardcore wager orphaned by a page refresh mid-session.
  applyPendingRefund()

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

  // 2f. Hydrate the achievement store (counters + claimed, local + cloud) so
  //     the profile panel + event tracking are live from the first frame.
  useAchievements.getState().hydrate(user.id)

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
  const apply = (s: { phase: string; running: boolean }) => {
    const focusing = s.phase === 'running' && s.running
    const status = focusing ? 'focus' : s.phase === 'break' ? 'break' : 'available'
    useChat.getState().setFocusSilent(focusing)
    setStudyStatus(status)
    useChat.getState().mirrorStatus(status)
  }
  apply(usePomodoro.getState())
  unbindFocus = usePomodoro.subscribe(apply)
}

// Bridge the focus timer into Task Magnet analytics + XP awards: every completed
// study segment awards leaves and logs to Task Magnet's world-growing analytics.
function bindFocusLogging(): void {
  setPomodoroFocusSink((minutes, subject, opts) => {
    if (opts?.log !== false) {
      useMagnet.getState().logFocus(minutes, subject, { award: false })
    }

    // The sink can be invoked purely for analytics (Medium per-segment and
    // Hardcore segments) — those tiers credit leaves at session end instead.
    const award = opts?.award !== false
    const hc = useHardcore.getState()
    if (!award || (hc.active && hc.mode === 'hardcore')) return

    // Award leaves (regular GREEN XP) for the completed segment, applying the
    // deep-dive rebalance multipliers (subject bonus + first-session-of-day
    // + soft daily cap). Golden stays purchase/rank-up only.
    try {
      const { xp, premiumXp, rankXp } = useProfile.getState()
      const rankBase = rankXp > 0 ? rankXp : xp + premiumXp
      const currentRank = rankForTotalXp(rankBase)
      const result = awardFocusLeaves({
        currentLeaves: xp,
        currentGoldenLeaves: premiumXp,
        durationMin: minutes,
        currentRankId: currentRank.id,
        rankXp: rankBase,
        hasSubject: !!subject,
        ratePerMin: opts?.ratePerMin,
      })
      if (result.leaves > 0) {
        // Single write-through: updates profile, syncs the DB, mirrors Magnet.
        useProfile.getState().applyXp({ leaves: result.leaves })
      }
    } catch { /* ignore — award is best-effort */ }
  })
}

/** Tear down per-user state on sign-out so the next user starts clean. */
export function runUserTeardown(): void {
  unbindFocus?.()
  unbindFocus = null
  setPomodoroFocusSink(null)
  useSettings.getState().unbindCloud()
  useProfile.getState().reset()
  useSocial.getState().reset()
  useFriends.getState().reset()
  useChat.getState().reset()
  useAchievements.getState().reset()
  stopHeartbeat()
  clearProfileSettingsCache()
}
