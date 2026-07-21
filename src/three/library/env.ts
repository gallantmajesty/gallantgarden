// Live, continuously-changing world state — kept OUTSIDE React so day/night and
// weather can update every frame without triggering re-renders. The
// DayNightWeather component writes these each frame; other components (sky,
// lights, rain, glass) read them in their own useFrame loops.
//
// NIGHT ONLY: `t` is frozen at midnight. dayFactor is always 0.
// The world is perpetually dark — lanterns, rain and stars set the mood.

export const env = {
  t: 0.0, // frozen at midnight — night only, no day cycle
  // derived each frame by DayNightWeather:
  sun: { x: 0.4, y: 0.5, z: 0.2 }, // normalised sun direction (unused at night, kept for compat)
  dayFactor: 0.0, // always 0 — permanent night
  // weather (current values lerp toward targets set from settings)
  rain: 0.5, // 0..1 visible rain intensity
  rainTarget: 0.5,
  fog: 0.4, // 0..1 extra haze
  fogTarget: 0.4,
  lightning: 0, // 0..1 flash envelope
}

export function resetEnv() {
  env.t = 0.0
  env.dayFactor = 0.0
  env.rain = env.rainTarget
  env.fog = env.fogTarget
  env.lightning = 0
}
