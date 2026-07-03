/** Lightweight seasonal / festival atmosphere system for the Library realm.
 *
 *  No user toggles, no settings — this is automatic based on the real-world
 *  calendar. Effects are purely atmospheric (colour tint + particles) so they
 *  never change collision or gameplay.
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Festival = string | null

export interface SeasonConfig {
  id: Season
  label: string
  /** Hex colour multiplied into the ambient light tone */
  ambientTint: string
  /** Particle colour for falling leaves / snow / petals */
  particleColor: string
  /** How many particles to spawn (respects quality preset) */
  particleCount: number
  /** Gravity / fall speed modifier */
  fallSpeed: number
  /** Subtle horizontal drift */
  drift: number
}

export const SEASON_CONFIG: Record<Season, SeasonConfig> = {
  spring: {
    id: 'spring',
    label: 'Spring',
    ambientTint: '#ffe8f0', // soft pink warmth
    particleColor: '#ffb7d5',
    particleCount: 40,
    fallSpeed: 0.3,
    drift: 0.5,
  },
  summer: {
    id: 'summer',
    label: 'Summer',
    ambientTint: '#fff5e0', // golden warmth
    particleColor: '#ffe8b0',
    particleCount: 24,
    fallSpeed: 0.2,
    drift: 0.3,
  },
  autumn: {
    id: 'autumn',
    label: 'Autumn',
    ambientTint: '#ffeedd',
    particleColor: '#ff8c42',
    particleCount: 50,
    fallSpeed: 0.5,
    drift: 0.8,
  },
  winter: {
    id: 'winter',
    label: 'Winter',
    ambientTint: '#e0f0ff', // cold blue
    particleColor: '#ffffff',
    particleCount: 60,
    fallSpeed: 0.4,
    drift: 0.4,
  },
}

/** Derive the current real-world season from the system date. */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/** Return the full config for the current season. */
export function getSeasonConfig(): SeasonConfig {
  return SEASON_CONFIG[getCurrentSeason()]
}

/* ------------------------------------------------------------------ */
/* Festivals — lightweight calendar events                            */
/* ------------------------------------------------------------------ */

export interface FestivalConfig {
  id: string
  label: string
  month: number // 1-12
  /** Override season ambient tint */
  ambientTint: string
  particleColor: string
  particleBoost: number // multiplier on season particle count
  lightShift: [number, number, number] // RGB shift for directional light
}

export const FESTIVALS: FestivalConfig[] = [
  { id: 'halloween', label: 'Halloween', month: 10, ambientTint: '#2a1a30', particleColor: '#ff8c42', particleBoost: 1.5, lightShift: [0.2, 0.05, 0.3] },
  { id: 'winter-festival', label: 'Winter Festival', month: 12, ambientTint: '#1a2a3a', particleColor: '#aeeeff', particleBoost: 2.0, lightShift: [0.1, 0.2, 0.4] },
  { id: 'spring-festival', label: 'Spring Festival', month: 4, ambientTint: '#2a3a1a', particleColor: '#ffb7d5', particleBoost: 1.8, lightShift: [0.2, 0.4, 0.1] },
]

export function getCurrentFestival(): FestivalConfig | null {
  const month = new Date().getMonth() + 1
  return FESTIVALS.find((f) => f.month === month) ?? null
}

/** Combined config: season base + optional festival override. */
export function getAtmosphereConfig() {
  const season = getCurrentSeason()
  const festival = getCurrentFestival()
  const base = SEASON_CONFIG[season]
  if (!festival) return { ...base, festival: null as string | null }
  return {
    ...base,
    festival: festival.id,
    label: festival.label,
    ambientTint: festival.ambientTint,
    particleColor: festival.particleColor,
    particleCount: Math.round(base.particleCount * festival.particleBoost),
  }
}
