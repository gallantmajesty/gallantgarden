// palettes.js — bounded colour sets used as TINT TARGETS for grayscale art.
//
// Every cosmetic layer is authored in grayscale (mid-grey = 100% tint, white =
// highlight, black = shadow). At runtime we multiply a swatch hex over it, so a
// small, fixed palette keeps the look coherent and the number of distinct GPU
// blends low. Swatch ids are GLOBALLY UNIQUE so `hexOf(id)` needs no group.

/** @typedef {{ id: string, name: string, hex: string }} Swatch */

/** @type {Swatch[]} */
export const SKIN = [
  { id: 'porcelain', name: 'Porcelain', hex: '#f3d3bd' },
  { id: 'light', name: 'Light', hex: '#edbf9b' },
  { id: 'tan', name: 'Tan', hex: '#d39c6e' },
  { id: 'olive', name: 'Olive', hex: '#b97f53' },
  { id: 'brown', name: 'Brown', hex: '#8a5a37' },
  { id: 'deep', name: 'Deep', hex: '#5e3a23' },
]

/** @type {Swatch[]} */
export const HAIR = [
  { id: 'hair_black', name: 'Black', hex: '#221b1a' },
  { id: 'hair_brown', name: 'Brown', hex: '#5a3a22' },
  { id: 'hair_chestnut', name: 'Chestnut', hex: '#7b4a2b' },
  { id: 'hair_blonde', name: 'Blonde', hex: '#d7a94b' },
  { id: 'hair_auburn', name: 'Auburn', hex: '#8a3320' },
  { id: 'hair_silver', name: 'Silver', hex: '#c9cdd2' },
  { id: 'hair_violet', name: 'Mystic Violet', hex: '#6e4bb0' },
  { id: 'hair_teal', name: 'Teal', hex: '#2f8f86' },
]

/** Shared palette for tops, sleeves, bottoms — keeps clothing harmonious. */
/** @type {Swatch[]} */
export const CLOTH = [
  { id: 'cloth_plum', name: 'Plum', hex: '#6e3050' },
  { id: 'cloth_indigo', name: 'Indigo', hex: '#34507a' },
  { id: 'cloth_forest', name: 'Forest', hex: '#3c6b46' },
  { id: 'cloth_amber', name: 'Amber', hex: '#c6892f' },
  { id: 'cloth_rose', name: 'Rose', hex: '#b65a6e' },
  { id: 'cloth_slate', name: 'Slate', hex: '#48505c' },
  { id: 'cloth_cream', name: 'Cream', hex: '#e7dcc1' },
  { id: 'cloth_arcane', name: 'Arcane', hex: '#5a3a8a' },
]

/** @type {Swatch[]} */
export const FEATURE = [
  { id: 'eye_ink', name: 'Ink', hex: '#2b2622' },
  { id: 'eye_hazel', name: 'Hazel', hex: '#7a5230' },
  { id: 'eye_blue', name: 'Blue', hex: '#3a6ea5' },
  { id: 'eye_green', name: 'Green', hex: '#3f7d52' },
]

/** Grouped palettes for building swatch pickers in a customizer UI. */
export const PALETTES = { skin: SKIN, hair: HAIR, cloth: CLOTH, feature: FEATURE }

// Flat id -> hex index. Built once; ids are unique across groups by convention.
const INDEX = new Map()
for (const group of Object.values(PALETTES)) {
  for (const s of group) INDEX.set(s.id, s.hex)
}

/** Resolve a swatch id to its hex. Falls back to neutral grey if unknown. */
export function hexOf(id) {
  return INDEX.get(id) || '#999999'
}
