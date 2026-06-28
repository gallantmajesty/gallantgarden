// The live departure board. Every platform runs a real, ticking schedule derived
// purely from the wall clock + each line's cadence, so it needs no server and
// every player who looks at the board sees the same countdowns at the same moment
// (clocks are within a second or two of each other — close enough for a station
// timetable). A train cycles through four phases inside each cadence window:
//
//   approaching → boarding → departing → away (until the next approach)
//
// This drives the departure-board UI, the platform signage, and — when a real
// train is mid-cycle — the arrival/boarding cinematic on that platform. It is
// deliberately independent of a player's own journey length: the timetable is
// ambient life, while committing to board starts a private session of the line's
// full study duration (see journeys.ts / store/train.ts).

import { TRAIN_LINES, type LineId, type TrainLine } from './lines'

export type TrainPhase = 'approaching' | 'boarding' | 'departing' | 'away'

/** Seconds the arrival approach takes (whistle → headlight → brakes → stop) and
 *  the departure takes (doors close → pull away). Shared across lines so the
 *  cinematic timing is consistent; the rest of the cadence is "away". */
export const APPROACH_SEC = 18
export const DEPART_SEC = 12

export interface PlatformStatus {
  line: TrainLine
  phase: TrainPhase
  /** seconds remaining in the CURRENT phase */
  phaseRemaining: number
  /** seconds until the next boarding window opens (0 while boarding) */
  untilBoarding: number
  /** seconds until the next arrival begins (0 while a train is present) */
  untilArrival: number
  /** true while doors are open and a player may board the live train */
  boardable: boolean
  /** this arrival is running late (~5% of cycles, deterministic per cadence) */
  delayed: boolean
  /** how many seconds late, when `delayed` (0 otherwise) */
  delaySec: number
}

/** Deterministic 0..1 hash of a string (FNV-1a → normalised). Used so "is this
 *  arrival delayed?" is computed identically on every client without any RNG or
 *  server state — the same cadence cycle reads the same value everywhere. */
function hash01(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h >>> 0) / 4294967296
}

/** Where we are inside this line's repeating cadence, in seconds [0, cadence). */
function cyclePos(line: TrainLine, nowMs: number): number {
  const t = Math.floor(nowMs / 1000) + line.phaseSec
  return ((t % line.cadenceSec) + line.cadenceSec) % line.cadenceSec
}

/** Live status for one line at time `nowMs`. The cadence is laid out as:
 *    [0 .. APPROACH)            approaching   (train rolling in)
 *    [APPROACH .. +boardSec)    boarding      (doors open)
 *    [.. +DEPART)               departing     (doors closed, pulling out)
 *    [.. cadence)               away          (next arrival counts down)
 */
export function platformStatus(line: TrainLine, nowMs = Date.now()): PlatformStatus {
  const p = cyclePos(line, nowMs)
  // Which repeat of this line's cadence we're in — keys the deterministic delay.
  const cycleIndex = Math.floor((Math.floor(nowMs / 1000) + line.phaseSec) / line.cadenceSec)
  const delayed = hash01(`${line.id}:${cycleIndex}`) < 0.05
  const delaySec = delayed ? 60 + Math.floor(hash01(`${line.id}:${cycleIndex}:d`) * 661) : 0 // 1–12 min
  const boardStart = APPROACH_SEC
  const boardEnd = boardStart + line.boardSec
  const departEnd = boardEnd + DEPART_SEC

  let phase: TrainPhase
  let phaseRemaining: number
  if (p < boardStart) {
    phase = 'approaching'
    phaseRemaining = boardStart - p
  } else if (p < boardEnd) {
    phase = 'boarding'
    phaseRemaining = boardEnd - p
  } else if (p < departEnd) {
    phase = 'departing'
    phaseRemaining = departEnd - p
  } else {
    phase = 'away'
    phaseRemaining = line.cadenceSec - p
  }

  const untilBoarding = phase === 'boarding' ? 0 : phase === 'approaching' ? boardStart - p : line.cadenceSec - p + boardStart
  const untilArrival = p < boardEnd ? 0 : line.cadenceSec - p
  return {
    line,
    phase,
    phaseRemaining: Math.max(0, phaseRemaining),
    untilBoarding: Math.max(0, untilBoarding),
    untilArrival: Math.max(0, untilArrival),
    boardable: phase === 'boarding',
    delayed,
    delaySec,
  }
}

/** The whole board, one row per platform, sorted by platform number. */
export function departureBoard(nowMs = Date.now()): PlatformStatus[] {
  return TRAIN_LINES.map((l) => platformStatus(l, nowMs)).sort((a, b) => a.line.platform - b.line.platform)
}

export function statusById(id: LineId, nowMs = Date.now()): PlatformStatus {
  return platformStatus(TRAIN_LINES.find((l) => l.id === id)!, nowMs)
}

/** mm:ss for short countdowns, H:MM:SS for long ones. */
export function fmtCountdown(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** A human label for the board, matching the brief's examples
 *  ("Next Arrival 01:43", "Boarding", "Departed · returns in 2h 18m"). */
export function statusLabel(s: PlatformStatus): { tag: string; detail: string } {
  switch (s.phase) {
    case 'approaching':
      return s.delayed
        ? { tag: 'Delayed', detail: `${fmtHuman(s.delaySec)} late` }
        : { tag: 'Arriving', detail: fmtCountdown(s.phaseRemaining) }
    case 'boarding':
      return { tag: 'Boarding', detail: `closes ${fmtCountdown(s.phaseRemaining)}` }
    case 'departing':
      return { tag: 'Departing', detail: 'doors closed' }
    default:
      return { tag: 'Departed', detail: `returns ${fmtHuman(s.untilArrival)}` }
  }
}

/** "2h 18m" / "4m" style for the longer "returns in" copy. */
export function fmtHuman(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}
