// @ts-nocheck
// Break Integration — pomodoro-aware game availability, break timer, and state

import { create } from 'zustand'
import { usePomodoro } from '../../store/pomodoro'
import { useSettings } from '../../store/settings'

export type BreakPhase = 'focus' | 'break-available' | 'break-active' | 'break-ending' | 'returning'

interface BreakState {
  phase: BreakPhase
  breakTimeRemaining: number
  breakDuration: number
  focusSessionCompleted: boolean
  showBreakNotification: boolean
  showEndingWarning: boolean
  currentMatchSurvivalTime: number
  currentMatchPlacement: number

  checkBreak: () => void
  dismissBreakNotification: () => void
  setMatchResult: (survivalTime: number, placement: number) => void
  reset: () => void
}

export const useBreakIntegration = create<BreakState>((set, get) => ({
  phase: 'focus',
  breakTimeRemaining: 0,
  breakDuration: 0,
  focusSessionCompleted: false,
  showBreakNotification: false,
  showEndingWarning: false,
  currentMatchSurvivalTime: 0,
  currentMatchPlacement: 0,

  checkBreak: () => {
    const pomo = usePomodoro.getState()
    const settings = useSettings.getState()

    if (pomo.mode === 'break' || pomo.mode === 'long') {
      const breakTotalSec = (pomo.mode === 'long' ? settings.pomo.longBreak : settings.pomo.break) * 60
      const remaining = pomo.remaining
      const elapsed = breakTotalSec - remaining

      set({
        phase: remaining <= 30 ? 'break-ending' : 'break-active',
        breakTimeRemaining: remaining,
        breakDuration: breakTotalSec,
        focusSessionCompleted: true,
        showBreakNotification: elapsed < 5,
        showEndingWarning: remaining <= 30,
      })
    } else if (pomo.mode === 'study' || pomo.mode === 'idle') {
      set({
        phase: 'focus',
        showBreakNotification: false,
        showEndingWarning: false,
      })
    }
  },

  dismissBreakNotification: () => set({ showBreakNotification: false }),

  setMatchResult: (survivalTime, placement) => set({
    currentMatchSurvivalTime: survivalTime,
    currentMatchPlacement: placement,
  }),

  reset: () => set({
    phase: 'focus',
    breakTimeRemaining: 0,
    breakDuration: 0,
    focusSessionCompleted: false,
    showBreakNotification: false,
    showEndingWarning: false,
    currentMatchSurvivalTime: 0,
    currentMatchPlacement: 0,
  }),
}))

/** Check if the game can be played right now. Re-exported for convenience. */
export function isBreakActive(): boolean {
  const pomo = usePomodoro.getState()
  return pomo.mode === 'break' || pomo.mode === 'long'
}

/** Seconds remaining in the current break. */
export function breakRemaining(): number {
  return usePomodoro.getState().remaining
}
