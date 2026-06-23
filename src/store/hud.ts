import { create } from 'zustand'

/**
 * Transient in-world HUD state for the Explore (library) screen. Deliberately NOT
 * persisted and NOT cloud-synced — these are momentary view states, not
 * preferences:
 *
 *  - `widgetsHidden` — Tab hides/shows every overlay so the world is the focus.
 *  - `perfMode`      — Ctrl+F Performance Mode: the scene reads PERF_OVERRIDE on
 *                      top of the user's quality axes while this is on, and the UI
 *                      enters fullscreen with widgets hidden. Released instantly.
 *
 * Kept out of the settings store so a quick "hide UI" or "perf burst" never
 * writes to localStorage or echoes to the per-user cloud profile.
 */
interface HudState {
  widgetsHidden: boolean
  perfMode: boolean
  setWidgetsHidden: (v: boolean) => void
  toggleWidgets: () => void
  setPerfMode: (v: boolean) => void
}

export const useHud = create<HudState>((set) => ({
  widgetsHidden: false,
  perfMode: false,
  setWidgetsHidden: (v) => set({ widgetsHidden: v }),
  toggleWidgets: () => set((s) => ({ widgetsHidden: !s.widgetsHidden })),
  setPerfMode: (v) => set({ perfMode: v }),
}))
