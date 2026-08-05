// The five magical train lines of the Train Station Realm — FocusLily's third
// flagship world. Each line is one platform: a scheduled journey of a fixed
// study length, with its own destination, palette, lighting mood and outside
// world. This is the single source of truth that the station geometry, the live
// schedule, the journey manager and the reward maths all read, so the platform
// you see, the countdown that ticks and the session you commit to always agree.
//
// Axis convention (shared with colliders/layout): the platforms run along +X
// (east), the concourse is at −Z (south), the tracks at +Z (north). Platform 1
// is the southern-most, platform 5 the northern-most.

import { getOverride, getNestedOverride } from '../ownerOverrides'

export type LineId = 'express' | 'regional' | 'mountain' | 'night' | 'grand'

/** A lighting / atmosphere mood per platform so each feels unmistakably its own. */
export interface LineMood {
  /** dominant lantern / signage glow */
  glow: string
  /** secondary accent (trim, destination board, steam tint) */
  accent: string
  /** ambient platform light colour */
  ambient: string
  /** sky/time-of-day this route departs into (drives the moving-world lighting) */
  timeOfDay: 'noon' | 'afternoon' | 'dusk' | 'night' | 'dawn'
  /** headline weather the route travels through */
  weather: 'clear' | 'autumn' | 'rain' | 'snow' | 'aurora'
}

export interface TrainLine {
  id: LineId
  /** platform number shown on signage (1..5) */
  platform: number
  /** short line name on the departure board, e.g. "Express" */
  name: string
  /** full route name, e.g. "20 Minute Express" */
  route: string
  /** where the train is bound — pure flavour, shown on signage + reward screen */
  destination: string
  /** the committed study length, in minutes — the journey's real duration */
  minutes: number
  /** how often (seconds) a train cycles through this platform — ambient cadence,
   *  independent of the journey length; keeps the station alive. */
  cadenceSec: number
  /** how long (seconds) the doors stay open for boarding within each cadence. */
  boardSec: number
  /** a per-line phase offset (seconds) so the five platforms never pulse in
   *  lockstep — staggered arrivals read as a living timetable. */
  phaseSec: number
  mood: LineMood
  /** one-line evocative blurb for the platform sign + boarding card. */
  blurb: string
}

/** The five lines, southern platform (1) to northern platform (5). Durations
 *  climb 20m → 1h → 3h → 7h → 12h; cadence and board windows widen with the
 *  grandeur of the route so a 12-hour Grand Journey feels rarer and more special
 *  than the little Express that shuttles in every few minutes. */
export const TRAIN_LINES: TrainLine[] = [
  {
    id: 'express',
    platform: 1,
    name: 'Express',
    route: '20 Minute Express',
    destination: 'Brightwater Halt',
    minutes: 20,
    cadenceSec: 8 * 60,
    boardSec: 90,
    phaseSec: 0,
    mood: { glow: '#ffd27a', accent: '#ff9d5c', ambient: '#fff0d6', timeOfDay: 'noon', weather: 'clear' },
    blurb: 'A quick shuttle through sunlit meadows — perfect for one focused sprint.',
  },
  {
    id: 'regional',
    platform: 2,
    name: 'Regional',
    route: '1 Hour Regional',
    destination: 'Amber Vale',
    minutes: 60,
    cadenceSec: 12 * 60,
    boardSec: 120,
    phaseSec: 140,
    mood: { glow: '#ffc46b', accent: '#d98a4a', ambient: '#ffe6c2', timeOfDay: 'afternoon', weather: 'autumn' },
    blurb: 'A gentle hour rolling through autumn forests and quiet villages.',
  },
  {
    id: 'mountain',
    platform: 3,
    name: 'Mountain Route',
    route: '3 Hour Mountain Route',
    destination: 'Cloudridge Summit',
    minutes: 180,
    cadenceSec: 18 * 60,
    boardSec: 150,
    phaseSec: 300,
    mood: { glow: '#bfe3ff', accent: '#7fb6e6', ambient: '#dcefff', timeOfDay: 'afternoon', weather: 'rain' },
    blurb: 'Climb past waterfalls and rain-washed peaks on a long, steady haul.',
  },
  {
    id: 'night',
    platform: 4,
    name: 'Night Express',
    route: '7 Hour Night Express',
    destination: 'Starfall Junction',
    minutes: 420,
    cadenceSec: 30 * 60,
    boardSec: 180,
    phaseSec: 520,
    mood: { glow: '#9db4ff', accent: '#6c7cff', ambient: '#cdd6ff', timeOfDay: 'night', weather: 'snow' },
    blurb: 'A sleeper through snowfields under a vast, star-strewn sky.',
  },
  {
    id: 'grand',
    platform: 5,
    name: 'Grand Journey',
    route: '12 Hour Grand Journey',
    destination: 'The Far Meridian',
    minutes: 720,
    cadenceSec: 45 * 60,
    boardSec: 240,
    phaseSec: 760,
    mood: { glow: '#c9a7ff', accent: '#8a6cff', ambient: '#efe2ff', timeOfDay: 'dawn', weather: 'aurora' },
    blurb: 'The legendary overnight haul to the edge of the map — for the deepest of deep work.',
  },
]

export function lineById(id: LineId): TrainLine {
  const l = TRAIN_LINES.find((x) => x.id === id)
  if (!l) throw new Error(`unknown train line: ${id}`)
  // Apply owner overrides for minutes, cadenceSec, boardSec
  const minutes = getNestedOverride('train', 'lines', id, 'minutes', l.minutes)
  const cadenceSec = getNestedOverride('train', 'lines', id, 'cadenceSec', l.cadenceSec)
  const boardSec = getNestedOverride('train', 'lines', id, 'boardSec', l.boardSec)
  return { ...l, minutes, cadenceSec, boardSec }
}

export function lineByPlatform(platform: number): TrainLine | undefined {
  return TRAIN_LINES.find((x) => x.platform === platform)
}
