// Lava Pad Match Schedule — session types, break windows, and pause/rise logic

export type SessionType = 'sprint' | 'standard' | 'extended' | 'marathon'
export type PlayMode = 'single' | 'multi'

/** A window of time inside a match schedule. */
export interface ScheduleSegment {
  /** Segment start time in minutes from match start */
  startMin: number
  /** Segment end time in minutes from match start */
  endMin: number
  /** Whether lava is rising during this segment (gameplay) or paused (break) */
  active: boolean
  /** Label shown in the UI */
  label: string
}

/** Definition of a match session type. Durations are in minutes. */
export interface MatchTypeConfig {
  id: SessionType
  name: string
  description: string
  totalMinutes: number
  segments: ScheduleSegment[]
}

const SEG = (startMin: number, endMin: number, active: boolean, label: string): ScheduleSegment => ({
  startMin, endMin, active, label,
})

// 1. Sprint — 30 min total: 15 game, 5 break, 10 game
const SPRINT: MatchTypeConfig = {
  id: 'sprint',
  name: 'Sprint',
  description: '30 minutes · 1 break',
  totalMinutes: 30,
  segments: [
    SEG(0, 15, true, 'Game 1'),
    SEG(15, 20, false, 'Break'),
    SEG(20, 30, true, 'Game 2'),
  ],
}

// 2. Standard — 60 min total: 25 game, 5 break, 30 game
const STANDARD: MatchTypeConfig = {
  id: 'standard',
  name: 'Standard',
  description: '60 minutes · 1 break',
  totalMinutes: 60,
  segments: [
    SEG(0, 25, true, 'Game 1'),
    SEG(25, 30, false, 'Break'),
    SEG(30, 60, true, 'Game 2'),
  ],
}

// 3. Extended — 120 min total: two 60-min cycles with breaks
const EXTENDED: MatchTypeConfig = {
  id: 'extended',
  name: 'Extended',
  description: '120 minutes · 2 breaks',
  totalMinutes: 120,
  segments: [
    SEG(0, 25, true, 'Game 1'),
    SEG(25, 30, false, 'Break 1'),
    SEG(30, 55, true, 'Game 2'),
    SEG(55, 60, false, 'Break 2'),
    SEG(60, 120, true, 'Game 3'),
  ],
}

// 4. Marathon — 180 min total: four 5-minute breaks (at 25-30, 55-60, 80-85? -> spec: 25-30, 55-60, 75-80, 115-120)
// Spec says breaks at: 25-30, 55-60, 75-80, 115-120 -> 3 cycles + final break
const MARATHON: MatchTypeConfig = {
  id: 'marathon',
  name: 'Marathon',
  description: '180 minutes · 4 breaks',
  totalMinutes: 180,
  segments: [
    SEG(0, 25, true, 'Game 1'),
    SEG(25, 30, false, 'Break 1'),
    SEG(30, 55, true, 'Game 2'),
    SEG(55, 60, false, 'Break 2'),
    SEG(60, 75, true, 'Game 3'),
    SEG(75, 80, false, 'Break 3'),
    SEG(80, 115, true, 'Game 4'),
    SEG(115, 120, false, 'Break 4'),
    SEG(120, 180, true, 'Game 5'),
  ],
}

export const MATCH_TYPES: Record<SessionType, MatchTypeConfig> = {
  sprint: SPRINT,
  standard: STANDARD,
  extended: EXTENDED,
  marathon: MARATHON,
}

export const MATCH_TYPE_LIST: MatchTypeConfig[] = [SPRINT, STANDARD, EXTENDED, MARATHON]

export function getMatchType(id: SessionType): MatchTypeConfig {
  return MATCH_TYPES[id] ?? SPRINT
}

/** Find the active segment at a given elapsed minute. Returns null if past the end. */
export function getActiveSegment(matchType: MatchTypeConfig, elapsedMinutes: number): ScheduleSegment | null {
  if (elapsedMinutes < 0 || elapsedMinutes >= matchType.totalMinutes) return null
  for (const seg of matchType.segments) {
    if (elapsedMinutes >= seg.startMin && elapsedMinutes < seg.endMin) {
      return seg
    }
  }
  // Fall back to the last segment if rounding lands exactly on the boundary
  return matchType.segments[matchType.segments.length - 1] ?? null
}

/** True if the lava should be rising at the given elapsed minute. */
export function isLavaActive(matchType: MatchTypeConfig, elapsedMinutes: number): boolean {
  const seg = getActiveSegment(matchType, elapsedMinutes)
  return seg ? seg.active : false
}

/** Seconds remaining in the current break, or 0 if not on a break. */
export function currentBreakRemaining(matchType: MatchTypeConfig, elapsedMinutes: number): number {
  const seg = getActiveSegment(matchType, elapsedMinutes)
  if (!seg || seg.active) return 0
  return Math.max(0, (seg.endMin - elapsedMinutes) * 60)
}

/** Seconds remaining until the match ends. */
export function matchTimeRemaining(matchType: MatchTypeConfig, elapsedMinutes: number): number {
  return Math.max(0, (matchType.totalMinutes - elapsedMinutes) * 60)
}

/** Total gameplay minutes (sum of active segments). */
export function totalGameplayMinutes(matchType: MatchTypeConfig): number {
  return matchType.segments.filter(s => s.active).reduce((sum, s) => sum + (s.endMin - s.startMin), 0)
}

/** Total break minutes (sum of inactive segments). */
export function totalBreakMinutes(matchType: MatchTypeConfig): number {
  return matchType.segments.filter(s => !s.active).reduce((sum, s) => sum + (s.endMin - s.startMin), 0)
}