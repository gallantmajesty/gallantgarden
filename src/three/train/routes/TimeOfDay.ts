// TimeOfDay — sun/moon arc and lighting shifts throughout the journey.
// The directional light rotates across the sky based on journey progress
// and the route's starting time-of-day. Provides color temperature shifts
// (warm sunrise → cool midday → warm sunset → dark night) and intensity
// curves that simulate the natural arc of daylight.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DirectionalLight, HemisphereLight } from 'three'
import type { TimeOfDayPreset } from './RouteManager'

export interface TimeState {
  /** sun elevation angle in degrees (-90 = below horizon, 90 = zenith) */
  sunAngle: number
  /** sun/moon color as hex string */
  sunColor: string
  /** directional light intensity */
  sunIntensity: number
  /** hemisphere light intensity */
  ambientIntensity: number
  /** sky color */
  skyColor: string
  /** whether it's dark (night time) */
  isNight: boolean
}

/** Time-of-day arc definitions — where in the journey each time period falls */
const TIME_ARCS: Record<TimeOfDayPreset, { start: number; end: number }> = {
  morning: { start: 0.25, end: 0.75 },
  afternoon: { start: 0.50, end: 1.0 },
  evening: { start: 0.70, end: 1.0 },
  night: { start: 0.0, end: 0.50 },
  sunset: { start: 0.75, end: 1.0 },
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

/** Color temperature (Kelvin) to RGB approximation — warm 2000K to cool 6500K */
function tempToColor(kelvin: number): string {
  const t = kelvin / 100
  let r: number, g: number, b: number

  // Red
  if (t <= 66) {
    r = 255
  } else {
    r = t - 60
    r = 329.698727446 * Math.pow(r, -0.1332047592)
    r = Math.max(0, Math.min(255, r))
  }

  // Green
  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661
  } else {
    g = t - 60
    g = 288.1221695283 * Math.pow(g, -0.0755148492)
  }
  g = Math.max(0, Math.min(255, g))

  // Blue
  if (t >= 66) {
    b = 255
  } else if (t <= 19) {
    b = 0
  } else {
    b = t - 10
    b = 138.5177312231 * Math.log(b) - 305.0447927307
    b = Math.max(0, Math.min(255, b))
  }

  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Compute the full time-of-day state from journey progress and route config */
export function computeTimeState(progress: number, timeOfDay: TimeOfDayPreset): TimeState {
  const { start, end } = TIME_ARCS[timeOfDay]
  const t = lerp(start, end, progress)

  // Sun angle: arcs from -90 (horizon) through 90 (zenith) back to -90
  const sunAngle = Math.sin(t * Math.PI) * 90

  // Color temperature: warm (2000K) at edges, cool (6500K) at zenith
  const tempT = Math.sin(t * Math.PI)
  const kelvin = lerp(2000, 6500, tempT)
  const sunColor = tempToColor(kelvin)

  // Intensity: peaks at zenith, zero at horizon
  const sunIntensity = Math.sin(t * Math.PI) * 1.5

  // Ambient: brighter during day, dim at night
  const ambientIntensity = lerp(0.1, 0.4, Math.sin(t * Math.PI))

  // Sky color: warm at horizon, blue at zenith
  const isNight = tempT < 0.3
  const skyColor = isNight ? '#0a1225' : tempToColor(lerp(4000, 8000, tempT))

  return {
    sunAngle,
    sunColor,
    sunIntensity,
    ambientIntensity,
    skyColor,
    isNight,
  }
}

/** Animated lighting component that drives the sun/moon directional + hemisphere lights
 *  based on journey progress. Reads progress from zustand. */
export function TimeOfDayLighting({
  progress,
  timeOfDay,
  sunLightRef,
  hemiLightRef,
}: {
  progress: number
  timeOfDay: TimeOfDayPreset
  sunLightRef: React.RefObject<DirectionalLight | null>
  hemiLightRef: React.RefObject<HemisphereLight | null>
}) {
  const time = computeTimeState(progress, timeOfDay)

  useFrame(() => {
    // Update sun directional light
    const sun = sunLightRef.current
    if (sun) {
      const rad = (time.sunAngle * Math.PI) / 180
      sun.position.set(
        Math.cos(rad) * 40,
        Math.sin(rad) * 40 + 10,
        -20,
      )
      sun.color.set(time.sunColor)
      sun.intensity = time.sunIntensity
    }

    // Update hemisphere light
    const hemi = hemiLightRef.current
    if (hemi) {
      hemi.intensity = time.ambientIntensity
      hemi.color.set(time.skyColor)
      hemi.groundColor.set('#5a4530')
    }
  })

  return null
}

/** Simple non-animated time state for static rendering */
export function useTimeState(progress: number, timeOfDay: TimeOfDayPreset): TimeState {
  return computeTimeState(progress, timeOfDay)
}
