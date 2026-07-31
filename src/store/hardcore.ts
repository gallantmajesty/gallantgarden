// Hardcore Mode — wager/escrow store.
//
// Hardcore = a wager session: the player stakes `wager` leaves on completing a
// study session of `sessionMinutes` in fullscreen.
//   - On success (timer completes): wager is returned + hardcore earnings
//     (HARDCORE_RATE = 10x the normal 1.32 leaves/min) are credited.
//   - On failure (leaving fullscreen > HARDCORE_GRACE_SEC, or forfeiting):
//     only the wagered leaves are lost. Time earnings only exist on success.
//   - Tab switching is allowed and NEVER pauses the timer; only leaving
//     fullscreen can fail the session.
//   - If the page is refreshed mid-session, the wager is refunded (no unfair
//     loss from an accidental refresh).

import { create } from 'zustand'
import { useProfile } from './profile'
import { insforge } from '../lib/insforge'

/** Hardcore earnings per minute — 10x the normal 1.32 leaves/min. */
export const HARDCORE_RATE = 13.2
/** Seconds allowed outside fullscreen before the session fails. */
export const HARDCORE_GRACE_SEC = 20

const STORAGE_KEY = 'sf.hardcore.v1'

interface PersistedSession {
  active: boolean
  wager: number
  sessionMinutes: number
  startedAt: number | null
}

export type HardcoreStatus = 'idle' | 'active' | 'won' | 'failed'

interface HardcoreState {
  active: boolean
  status: HardcoreStatus
  /** leaves held in escrow (deducted from balance at start) */
  wager: number
  sessionMinutes: number
  startedAt: number | null
  /** seconds of fullscreen grace remaining (0 = none running) */
  graceLeft: number
  /** total leaves returned on a win (wager + earnings) */
  wonAmount: number

  start: (wager: number, sessionMinutes: number) => boolean
  win: () => void
  fail: () => void
  /** end + refund the wager (refresh recovery only, never mid-session UI) */
  refundAndEnd: () => void
  /** dismiss a won/failed result and return to idle */
  acknowledge: () => void
  enterFullscreen: () => void
  exitFullscreen: () => void
}

// ---- Escrow / DB helpers ----------------------------------------------------

function persistXp(xp: number): void {
  const { userId, isGuest } = useProfile.getState()
  if (!userId || isGuest) return
  insforge
    .from('profiles')
    .upsert([{ id: userId, xp }], { onConflict: 'id' })
    .catch(() => {
      /* offline — localStorage via profile store is still authoritative */
    })
}

function creditLeaves(amount: number): void {
  const { xp } = useProfile.getState()
  const newXp = Math.round(xp + amount)
  useProfile.setState({ xp: newXp })
  persistXp(newXp)
}

// ---- Persistence / refresh recovery -----------------------------------------

function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedSession) : null
  } catch {
    return null
  }
}

// If the page was refreshed mid-session, the wager is still in escrow. Refund
// it once the profile is hydrated (applyPendingRefund is called from appInit).
let pendingRefund = 0
const recovered = loadSession()
if (recovered && recovered.active && recovered.wager > 0) {
  pendingRefund = recovered.wager
  clearSession()
}

/** Refund a wager orphaned by a page refresh. Call after profile hydration. */
export function applyPendingRefund(): void {
  if (pendingRefund <= 0) return
  creditLeaves(pendingRefund)
  pendingRefund = 0
}

// ---- Fullscreen grace -------------------------------------------------------

let graceTimer: ReturnType<typeof setInterval> | null = null

function clearGrace(): void {
  if (graceTimer) {
    clearInterval(graceTimer)
    graceTimer = null
  }
  useHardcore.setState({ graceLeft: 0 })
}

function beginGrace(deadlineAt: number): void {
  clearGrace()
  const s = useHardcore.getState()
  if (!s.active || s.status !== 'active') return
  graceTimer = setInterval(() => {
    const cur = useHardcore.getState()
    if (!cur.active || cur.status !== 'active') {
      clearGrace()
      return
    }
    const left = Math.ceil((deadlineAt - Date.now()) / 1000)
    if (left <= 0) {
      useHardcore.getState().fail()
      return
    }
    useHardcore.setState({ graceLeft: left })
  }, 250)
}

// ---- Store ------------------------------------------------------------------

export const useHardcore = create<HardcoreState>((set, get) => ({
  active: false,
  status: 'idle',
  wager: 0,
  sessionMinutes: 0,
  startedAt: null,
  graceLeft: 0,
  wonAmount: 0,

  start: (wager, sessionMinutes) => {
    const { xp } = useProfile.getState()
    if (wager < 1 || wager > xp) return false

    // Escrow: deduct the wager immediately.
    creditLeaves(-wager)

    saveSession({ active: true, wager, sessionMinutes, startedAt: Date.now() })
    set({
      active: true,
      status: 'active',
      wager,
      sessionMinutes,
      startedAt: Date.now(),
      graceLeft: 0,
      wonAmount: 0,
    })
    get().enterFullscreen()
    return true
  },

  win: () => {
    const s = get()
    if (!s.active) return
    clearGrace()
    const earnings = Math.round(s.sessionMinutes * HARDCORE_RATE)
    const total = s.wager + earnings
    creditLeaves(total)
    clearSession()
    get().exitFullscreen()
    set({ active: false, status: 'won', wonAmount: total, graceLeft: 0 })
  },

  fail: () => {
    const s = get()
    if (!s.active) return
    clearGrace()
    clearSession()
    get().exitFullscreen()
    set({ active: false, status: 'failed', graceLeft: 0 })
  },

  refundAndEnd: () => {
    const s = get()
    if (s.wager > 0) creditLeaves(s.wager)
    clearGrace()
    clearSession()
    get().exitFullscreen()
    set({ active: false, status: 'idle', wager: 0, sessionMinutes: 0, startedAt: null, wonAmount: 0, graceLeft: 0 })
  },

  acknowledge: () => set({ status: 'idle', wonAmount: 0 }),

  enterFullscreen: () => {
    try {
      const el = document.documentElement
      if (el.requestFullscreen && !document.fullscreenElement) {
        el.requestFullscreen().catch(() => {
          /* blocked or unsupported */
        })
      }
    } catch {
      /* fullscreen may not be supported */
    }
  },

  exitFullscreen: () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          /* ignore */
        })
      }
    } catch {
      /* ignore */
    }
  },
}))

// ---- Module-level listeners -------------------------------------------------

if (typeof document !== 'undefined') {
  // Leaving fullscreen starts the grace countdown; returning clears it.
  document.addEventListener('fullscreenchange', () => {
    const s = useHardcore.getState()
    if (!s.active || s.status !== 'active') return
    if (document.fullscreenElement) {
      clearGrace()
    } else {
      beginGrace(Date.now() + HARDCORE_GRACE_SEC * 1000)
    }
  })
}
