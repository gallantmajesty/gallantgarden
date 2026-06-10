// Live, continuously-changing world state — kept OUTSIDE React so day/night and
// weather can update every frame without triggering re-renders. The
// DayNightWeather component writes these each frame; other components (sky,
// lights, rain, glass) read them in their own useFrame loops.
//
// `t` is the time of day in [0,1): 0 = midnight, 0.25 = sunrise, 0.5 = noon,
// 0.75 = sunset.

export const env = {
  t: 0.78, // start at a cosy golden evening (lamps on, sunset glow)
  // derived each frame by DayNightWeather:
  sun: { x: 0.4, y: 0.5, z: 0.2 }, // normalised sun direction
  dayFactor: 0.3, // 0 night … 1 full day
  // weather (current values lerp toward targets set from settings)
  rain: 0.5, // 0..1 visible rain intensity
  rainTarget: 0.5,
  fog: 0.4, // 0..1 extra haze
  fogTarget: 0.4,
  lightning: 0, // 0..1 flash envelope
}

export function resetEnv() {
  env.t = 0.3
  env.rain = env.rainTarget
  env.fog = env.fogTarget
  env.lightning = 0
}
