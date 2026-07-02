// RouteManager — route selection, lifecycle, and configuration.
// Defines the 5 magical routes with scenery, weather, time-of-day, speed,
// milestones, and tunnel configs. Provides helpers to get the current route
// config from the active TrainLine, compute journey progress, and determine
// which milestones have been passed.

import type { LineId, TrainLine } from '../../../lib/train/lines'

export interface RouteConfig {
  id: LineId
  name: string
  destination: string
  /** total journey duration in seconds */
  durationSec: number
  /** how often a train cycles (cadence) in seconds */
  cadenceSec: number
  /** track number */
  track: number
  maxSeats: number
  /** which scenery set to use */
  scenery: 'countryside' | 'forest_river' | 'alpine_snow' | 'night_city' | 'desert_coast'
  /** weather preset key */
  weather: WeatherPreset
  /** starting time-of-day */
  timeOfDay: TimeOfDayPreset
  /** ambient music style */
  music: string
  /** journey progress points (0→1) where scenic highlights occur */
  milestones: number[]
  /** tunnel positions and durations */
  tunnels: TunnelConfig
  /** scroll speed multiplier (1.0 = base) */
  speed: number
}

export type WeatherPreset = 'clear' | 'autumn' | 'rain' | 'snow' | 'clear_night' | 'golden_hour' | 'aurora'
export type TimeOfDayPreset = 'morning' | 'afternoon' | 'evening' | 'night' | 'sunset'

export interface TunnelConfig {
  count: number
  positions: number[]
  durationSec: number
}

export const ROUTE_CONFIGS: Record<LineId, RouteConfig> = {
  express: {
    id: 'express',
    name: 'Express',
    destination: 'Brightwater Halt',
    durationSec: 20 * 60,
    cadenceSec: 8 * 60,
    track: 1,
    maxSeats: 20,
    scenery: 'countryside',
    weather: 'clear',
    timeOfDay: 'morning',
    music: 'light_strings',
    milestones: [0.25, 0.50, 0.75],
    tunnels: { count: 1, positions: [0.50], durationSec: 3 },
    speed: 1.4,
  },
  regional: {
    id: 'regional',
    name: 'Regional',
    destination: 'Thornwood Junction',
    durationSec: 60 * 60,
    cadenceSec: 12 * 60,
    track: 2,
    maxSeats: 20,
    scenery: 'forest_river',
    weather: 'autumn',
    timeOfDay: 'afternoon',
    music: 'acoustic_guitar',
    milestones: [0.10, 0.25, 0.50, 0.75, 0.90],
    tunnels: { count: 2, positions: [0.30, 0.70], durationSec: 4 },
    speed: 1.0,
  },
  mountain: {
    id: 'mountain',
    name: 'Mountain Route',
    destination: 'Eagle Peak Summit',
    durationSec: 3 * 60 * 60,
    cadenceSec: 18 * 60,
    track: 3,
    maxSeats: 20,
    scenery: 'alpine_snow',
    weather: 'snow',
    timeOfDay: 'evening',
    music: 'orchestral',
    milestones: [0.05, 0.15, 0.25, 0.50, 0.75, 0.90, 0.95],
    tunnels: { count: 3, positions: [0.20, 0.50, 0.80], durationSec: 6 },
    speed: 0.8,
  },
  night: {
    id: 'night',
    name: 'Night Express',
    destination: 'Moonhaven Terminus',
    durationSec: 7 * 60 * 60,
    cadenceSec: 30 * 60,
    track: 1,
    maxSeats: 20,
    scenery: 'night_city',
    weather: 'clear_night',
    timeOfDay: 'night',
    music: 'ambient_piano',
    milestones: [0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95],
    tunnels: { count: 2, positions: [0.40, 0.85], durationSec: 5 },
    speed: 0.9,
  },
  grand: {
    id: 'grand',
    name: 'Grand Journey',
    destination: 'Sandsea Oasis',
    durationSec: 12 * 60 * 60,
    cadenceSec: 45 * 60,
    track: 2,
    maxSeats: 20,
    scenery: 'desert_coast',
    weather: 'golden_hour',
    timeOfDay: 'sunset',
    music: 'world_fusion',
    milestones: [0.02, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.98],
    tunnels: { count: 1, positions: [0.60], durationSec: 8 },
    speed: 0.7,
  },
}

/** Get the RouteConfig for a TrainLine */
export function getRouteConfig(line: TrainLine): RouteConfig {
  return ROUTE_CONFIGS[line.id]
}

/** Compute journey progress (0→1) from the zustand store values */
export function computeProgress(
  departureSec: number,
  arrivalSec: number,
  startedAt: number | null,
  endsAt: number | null,
): number {
  if (departureSec > 0) return 1 - departureSec / 15
  if (arrivalSec > 0) return 1
  if (!startedAt || !endsAt || endsAt <= startedAt) return 0
  return Math.min(1, Math.max(0, (Date.now() - startedAt) / (endsAt - startedAt)))
}

/** Determine which milestones have been passed given current progress */
export function passedMilestones(progress: number, milestones: number[]): number[] {
  return milestones.filter((m) => progress >= m)
}

/** Check if the train is currently in a tunnel at the given progress */
export function isInTunnel(progress: number, tunnels: TunnelConfig): { active: boolean; tunnelIndex: number } {
  for (let i = 0; i < tunnels.count; i++) {
    const pos = tunnels.positions[i]
    const halfDur = (tunnels.durationSec / 60) * 0.01 // approximate duration in progress space
    if (Math.abs(progress - pos) < halfDur) {
      return { active: true, tunnelIndex: i }
    }
  }
  return { active: false, tunnelIndex: -1 }
}

/** Get the effective scroll speed for a route (base SPEED * route multiplier) */
export function getRouteSpeed(config: RouteConfig, baseSpeed: number): number {
  return baseSpeed * config.speed
}
