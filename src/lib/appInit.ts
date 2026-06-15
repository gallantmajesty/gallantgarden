import type { AuthUser } from '../store/auth'
import { snapshotSettings, useSettings } from '../store/settings'
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

  // 3. One-time per-user seeding: create the profile row with the current
  //    settings the first time we ever see this account.
  await userRunOnce(user.id, 'profile-seed.v1', async () => {
    await patchProfileSettings(user.id, { app: snapshotSettings() })
  })
}

/** Tear down per-user state on sign-out so the next user starts clean. */
export function runUserTeardown(): void {
  useSettings.getState().unbindCloud()
  clearProfileSettingsCache()
}
