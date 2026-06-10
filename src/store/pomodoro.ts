import { create } from 'zustand'
import { useSettings } from './settings'
import { getAmbient } from '../audio/ambient'

export type PomoMode = 'idle' | 'study' | 'break' | 'long'

interface PomodoroState {
  mode: PomoMode
  remaining: number // seconds
  running: boolean
  completed: number // finished study sessions
  toggle: () => void
  reset: () => void
  skip: () => void
  tick: () => void
}

function mins(n: number) {
  return Math.max(1, Math.round(n)) * 60
}

export const usePomodoro = create<PomodoroState>((set, get) => {
  const advance = () => {
    const { pomo } = useSettings.getState()
    const s = get()
    let mode: PomoMode
    let completed = s.completed
    if (s.mode === 'study') {
      completed += 1
      mode = completed % 4 === 0 ? 'long' : 'break'
    } else {
      mode = 'study'
    }
    const remaining = mode === 'study' ? mins(pomo.study) : mode === 'long' ? mins(pomo.longBreak) : mins(pomo.break)
    if (pomo.sound) getAmbient().chime()
    set({ mode, completed, remaining, running: pomo.autoStart })
  }

  return {
    mode: 'idle',
    remaining: 0,
    running: false,
    completed: 0,

    toggle: () => {
      const s = get()
      if (s.mode === 'idle') {
        set({ mode: 'study', remaining: mins(useSettings.getState().pomo.study), running: true })
      } else {
        set({ running: !s.running })
      }
    },
    reset: () => set({ mode: 'idle', remaining: 0, running: false, completed: 0 }),
    skip: () => advance(),
    tick: () => {
      const s = get()
      if (!s.running || s.mode === 'idle') return
      if (s.remaining > 1) set({ remaining: s.remaining - 1 })
      else advance()
    },
  }
})
