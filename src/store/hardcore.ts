// Focus Mode enforcement store — Easy / Medium / Hardcore.
//
// Three tiers of focus commitment, each with its own XP rate and enforcement:
//   🟢 Easy     — tab tracking only, no fullscreen, no wager. Split rewards when
//                 breaks are chosen (each completed segment banks its leaves).
//   🟡 Medium   — fullscreen required, no wager. Rewards are granted ONLY at the
//                 end of the session (no per-segment splits).
//   🔴 Hardcore — fullscreen required + a green-leaf wager (escrow). Rewards +
//                 wager are granted only on a win. The multiplier scales with
//                 session length (10× → 14×) and the minimum wager scales too.
//
// Every mode shares a 20-second warning: if you leave the enforced surface
// (tab for Easy, fullscreen for Medium/Hardcore) and don't return in time, the
// session fails. In Hardcore the wagered leaves are lost; in Medium/Easy you
// simply forfeit the unearned reward.
//
// Tab switching is allowed and NEVER pauses Medium/Hardcore — only leaving
// fullscreen can fail them. If the page refreshes mid-session, the wager is
// refunded (no unfair loss from an accidental refresh).

import { create } from 'zustand'
import { useProfile } from './profile'
import { supabase } from '../lib/supabase'
import { getOverride } from '../lib/ownerOverrides'

// ---- Mode model -------------------------------------------------------------

export type FocusMode = 'easy' | 'medium' | 'hardcore'

/** Base green-leaf rate for the free (Easy) tier — 1.32 leaves/min. */
export const EASY_RATE = 1.32
/** Medium tier = 2× Easy. */
export const MEDIUM_RATE = 2.64
/** Hardcore base = 10× Easy at 1-hour sessions. */
export const HARDCORE_BASE_RATE = 13.2

/** Seconds of grace before an enforced session fails. Universal across modes. */
export const GRACE_SEC = 20

// ---- Hardcore scaling by session length -------------------------------------
// 1h=10× · 2h=11× · 3h=12.5× · 4h+=14×. Below 1h uses the 1h tier.

export function hardcoreMultiplier(minutes: number): number {
  if (minutes >= 240) return 14
  if (minutes >= 180) return 12.5
  if (minutes >= 120) return 11
  return 10
}

/** Actual leaves/min for a hardcore session of the given length. */
export function hardcoreRateFor(minutes: number): number {
  const baseRate = getOverride('hardcore', 'baseRate', HARDCORE_BASE_RATE)
  return (baseRate * hardcoreMultiplier(minutes)) / 10
}

/** Minimum wager required for a hardcore session length. Progressive: the
 *  longer you commit, the higher the stake (more risk → more reward).
 *  ~0.85 leaves per minute, rounded to the nearest 5, floor 15. */
export function minWagerFor(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 15
  return Math.max(15, Math.round((minutes * 0.85) / 5) * 5)
}

// ---- Risk bonus: the more you wager, the more you earn ----------------------
// On top of the duration multiplier, wagering above the minimum adds a bonus
// multiplier. This is the "more you give, the more you risk and the more you
// get" loop — a big wager visibly boosts the payout, not just the stake.

/** Bonus multiplier for wagering above the session's minimum. */
export function wagerBonusMultiplier(wager: number, minutes: number): number {
  if (!Number.isFinite(wager) || wager <= 0) return 0
  const min = minWagerFor(minutes)
  const ratio = wager / min
  if (ratio >= 5) return 2
  if (ratio >= 3) return 1
  if (ratio >= 1.5) return 0.5
  return 0
}

// ---- Device boost: the more devices you connect, the more you earn ----------
// Each verified connector device adds +DEVICE_BOOST_PCT to the effective
// multiplier, up to DEVICE_BOOST_MAX_DEVICES. See src/lib/deviceBoost.ts.

export const DEVICE_BOOST_PCT = 0.05 // +5% per connected device
export const DEVICE_BOOST_MAX_DEVICES = 5 // cap at 5 devices = +25%

export function deviceBoostMultiplier(deviceCount: number): number {
  const n = Math.max(0, Math.min(DEVICE_BOOST_MAX_DEVICES, deviceCount))
  return n * DEVICE_BOOST_PCT
}

/** Final effective multiplier = duration × wager bonus + device boost. */
export function effectiveMultiplier(minutes: number, wager: number, devices = 0): number {
  const base = hardcoreMultiplier(minutes)
  const risk = wagerBonusMultiplier(wager, minutes)
  const boost = deviceBoostMultiplier(devices)
  return base + risk + boost
}

/** Effective leaves/min for any mode at a given session length. */
export function rateForMode(mode: FocusMode, minutes: number): number {
  if (mode === 'hardcore') return hardcoreRateFor(minutes)
  if (mode === 'medium') return getOverride('hardcore', 'mediumRate', MEDIUM_RATE)
  return getOverride('hardcore', 'easyRate', EASY_RATE)
}

/** Backward-compatible alias (the deep-dive's "10× crown jewel" at 1 hour). */
export const HARDCORE_RATE = HARDCORE_BASE_RATE
/** Backward-compatible alias for the shared grace period. */
export const HARDCORE_GRACE_SEC = GRACE_SEC

// ---- Persisted session ------------------------------------------------------

const STORAGE_KEY = 'sf.hardcore.v1'

interface PersistedSession {
  active: boolean
  mode: FocusMode
  wager: number
  sessionMinutes: number
  startedAt: number | null
  devices?: number
}

export type HardcoreStatus = 'idle' | 'active' | 'won' | 'failed'

interface HardcoreState {
  mode: FocusMode
  active: boolean
  status: HardcoreStatus
  /** leaves held in escrow (deducted from balance at start, hardcore only) */
  wager: number
  sessionMinutes: number
  startedAt: number | null
  /** seconds of fullscreen grace remaining (0 = none running) */
  graceLeft: number
  /** total leaves returned on a win (wager + earnings) */
  wonAmount: number
  /** number of connector devices boosting this session (best-effort realtime) */
  devices: number
  /** the effective multiplier that was active on the last win (for summary) */
  lastMultiplier: number

  /** Begin an enforced session. medium→wager 0, hardcore→wager >= minWagerFor. */
  start: (mode: FocusMode, sessionMinutes: number, wager: number, devices?: number) => boolean
  /** Session completed successfully. Hardcore: credit wager + scaled earnings. */
  win: () => void
  /** Enforcement failed (fullscreen grace expired or forfeit). */
  fail: () => void
  /** end + refund the wager (refresh recovery only, never mid-session UI) */
  refundAndEnd: () => void
  /** dismiss a won/failed result and return to idle */
  acknowledge: () => void
  enterFullscreen: () => void
  exitFullscreen: () => void
}

// ---- Escrow / DB helpers ----------------------------------------------------

function persistXp(xp: number, rankXp?: number): void {
  const { userId, isGuest } = useProfile.getState()
  if (!userId || isGuest) return
  const payload: Record<string, unknown> = { id: userId, xp }
  if (typeof rankXp === 'number') payload.rank_xp = rankXp
  // Offline / transient errors are fine — the profile store (localStorage) is
  // still authoritative. Use the await-in-try pattern (the SDK builder has no
  // .catch()).
  void (async () => {
    try {
      await supabase
        .from('profiles')
        .upsert([payload], { onConflict: 'id' })
    } catch {
      /* offline — localStorage via profile store is still authoritative */
    }
  })()
}

function creditLeaves(amount: number): void {
  const { xp, rankXp } = useProfile.getState()
  const newXp = Math.round(xp + amount)
  // A win credits earnings (lifetime rank XP climbs too); a loss/refund only
  // moves the spendable wallet, never the rank.
  const delta = Math.max(0, Math.round(amount))
  const newRankXp = (rankXp || newXp - delta) + delta
  useProfile.setState({ xp: newXp, rankXp: newRankXp })
  persistXp(newXp, newRankXp)
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
  mode: 'easy',
  active: false,
  status: 'idle',
  wager: 0,
  sessionMinutes: 0,
  startedAt: null,
  graceLeft: 0,
  wonAmount: 0,
  devices: 0,
  lastMultiplier: 0,

  start: (mode, sessionMinutes, wager, devices = 0) => {
    const { xp } = useProfile.getState()
    const minWager = mode === 'hardcore' ? minWagerFor(sessionMinutes) : 0
    const effWager = mode === 'hardcore' ? wager : 0

    // Hardcore: wager must meet the minimum for the session length.
    if (mode === 'hardcore') {
      if (!Number.isFinite(effWager) || effWager < minWager) return false
      if (effWager > xp) return false
    }

    // Escrow: deduct the wager immediately (hardcore only).
    if (effWager > 0) creditLeaves(-effWager)

    saveSession({ active: true, mode, wager: effWager, sessionMinutes, startedAt: Date.now(), devices })
    set({
      mode,
      active: true,
      status: 'active',
      wager: effWager,
      sessionMinutes,
      startedAt: Date.now(),
      graceLeft: 0,
      wonAmount: 0,
      devices,
      lastMultiplier: mode === 'hardcore' ? effectiveMultiplier(sessionMinutes, effWager, devices) : 0,
    })
    get().enterFullscreen()
    return true
  },

  win: () => {
    const s = get()
    if (!s.active) return
    clearGrace()
    let credited = 0
    if (s.mode === 'hardcore') {
      const mult = effectiveMultiplier(s.sessionMinutes, s.wager, s.devices)
      const rate = (HARDCORE_BASE_RATE * mult) / 10
      const earnings = Math.round(s.sessionMinutes * rate)
      credited = s.wager + earnings
      creditLeaves(credited)
      set({ lastMultiplier: mult })
    }
    // Medium/Easy leaves are granted by the pomodoro end-award; this only ends
    // the enforcement (and exits fullscreen) once the timer finished.
    clearSession()
    get().exitFullscreen()
    set({ active: false, status: 'won', wonAmount: credited, graceLeft: 0 })
  },

  fail: () => {
    const s = get()
    if (!s.active) return
    clearGrace()
    // Hardcore loses its escrowed wager. Medium/Easy lose nothing extra — the
    // unearned reward is simply not granted (end-only crediting).
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
    set({ active: false, status: 'idle', mode: 'easy', wager: 0, sessionMinutes: 0, startedAt: null, wonAmount: 0, graceLeft: 0, devices: 0, lastMultiplier: 0 })
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
      beginGrace(Date.now() + GRACE_SEC * 1000)
    }
  })
}
