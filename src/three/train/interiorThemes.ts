// Per-line carriage interior themes — each of the five train lines gets a
// distinct carriage purpose, palette and mood so boarding any line feels like
// stepping into a different world. The theme drives colour, lighting, and
// decorative density inside CarriageInterior.tsx.
//
// Themes:
//   Express   → Study Car      (bright, warm wood, quick-sprint energy)
//   Regional  → Lounge          (autumn tones, plush seating, afternoon reading nook)
//   Mountain  → Panoramic Car   (cool blues, rain-washed, oversized windows)
//   Night     → Silent Sleeper  (deep indigo, starry, minimal light, deep focus)
//   Grand     → Library Car     (purple/gold, ornate, legendary status)

import type { LineId } from '../../lib/train/lines'

export interface InteriorTheme {
  /** carriage purpose label shown on interior signage */
  purpose: string
  /** floor colour (carpet / runner) */
  floor: string
  /** aisle runner stripe colour */
  runner: string
  /** wall panelling base colour */
  walls: string
  /** ceiling colour */
  ceiling: string
  /** seat upholstery colour */
  seat: string
  /** curtain colour */
  curtain: string
  /** luggage rack / trim colour */
  trim: string
  /** table surface colour */
  table: string
  /** lamp glow colour */
  lampGlow: string
  /** emissive intensity for lamps (higher = cozier) */
  lampIntensity: number
  /** extra decorative density multiplier (1 = normal, 1.4 = rich) */
  decorDensity: number
  /** whether to show curtains on windows */
  curtains: boolean
  /** whether to show luggage racks */
  luggageRacks: boolean
  /** ambient fill light colour for the cabin */
  ambientFill: string
}

export const INTERIOR_THEMES: Record<LineId, InteriorTheme> = {
  express: {
    purpose: 'Study Car',
    floor: '#6b4423',
    runner: '#ffd27a',
    walls: '#5a3a22',
    ceiling: '#4a3020',
    seat: '#c48040',
    curtain: '#e8d4b8',
    trim: '#b8943c',
    table: '#6b4a2e',
    lampGlow: '#fff0c0',
    lampIntensity: 1.2,
    decorDensity: 1.0,
    curtains: true,
    luggageRacks: true,
    ambientFill: '#fff8e8',
  },
  regional: {
    purpose: 'Lounge',
    floor: '#5a3520',
    runner: '#d98a4a',
    walls: '#4a2e1a',
    ceiling: '#3d2614',
    seat: '#8b5e3c',
    curtain: '#c9a87a',
    trim: '#a07840',
    table: '#5c3d22',
    lampGlow: '#ffe0a0',
    lampIntensity: 1.0,
    decorDensity: 1.2,
    curtains: true,
    luggageRacks: true,
    ambientFill: '#fff0d0',
  },
  mountain: {
    purpose: 'Panoramic Car',
    floor: '#3a4a55',
    runner: '#7fb6e6',
    walls: '#2e3d4a',
    ceiling: '#253540',
    seat: '#5a7a8c',
    curtain: '#8aa8b8',
    trim: '#6a8a9c',
    table: '#3a4a55',
    lampGlow: '#d0e8ff',
    lampIntensity: 0.8,
    decorDensity: 0.8,
    curtains: false,
    luggageRacks: false,
    ambientFill: '#e0f0ff',
  },
  night: {
    purpose: 'Silent Sleeper',
    floor: '#1a1a2e',
    runner: '#4a4a7a',
    walls: '#16162a',
    ceiling: '#121224',
    seat: '#2a2a4a',
    curtain: '#1a1a30',
    trim: '#3a3a6a',
    table: '#1e1e34',
    lampGlow: '#8090c0',
    lampIntensity: 0.5,
    decorDensity: 0.6,
    curtains: true,
    luggageRacks: false,
    ambientFill: '#202040',
  },
  grand: {
    purpose: 'Library Car',
    floor: '#3a2040',
    runner: '#c9a7ff',
    walls: '#2e1838',
    ceiling: '#241230',
    seat: '#5a3870',
    curtain: '#8a6cb0',
    trim: '#c9a7ff',
    table: '#3a2040',
    lampGlow: '#e0c8ff',
    lampIntensity: 1.4,
    decorDensity: 1.5,
    curtains: true,
    luggageRacks: true,
    ambientFill: '#f0e0ff',
  },
}

export function getInteriorTheme(lineId: LineId): InteriorTheme {
  return INTERIOR_THEMES[lineId] ?? INTERIOR_THEMES.express
}
