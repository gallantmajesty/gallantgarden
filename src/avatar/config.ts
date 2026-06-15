// Avatar customization catalogs, config type, and the shared geometry/material
// caches that keep the system cheap: N avatars that share a palette share the
// exact same THREE material and geometry instances (no per-avatar allocation),
// which is the single biggest lever for staying at 60 FPS with many avatars.

import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  LatheGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from 'three'

export const AVATAR_SCHEMA_VERSION = 1

export type BodyType = 'male' | 'female'

/** Persisted, multiplayer-serializable avatar description. Plain JSON only. */
export interface AvatarConfig {
  v: number // schema version (for safe future migrations)
  bodyType: BodyType
  height: number // cm
  skin: string // -> SKINS id
  hair: string // -> HAIRS id ('none' allowed)
  hairColor: string // -> HAIR_COLORS id
  top: string // -> TOPS id
  topColor: string // -> CLOTH_COLORS id
  bottom: string // -> BOTTOMS id
  bottomColor: string // -> CLOTH_COLORS id
  shoes: string // -> SHOES id
  shoesColor: string // -> SHOE_COLORS id
}

/* ----------------------------------------------------------------- palettes */
// Small fixed palettes on purpose: a bounded colour set means a bounded number
// of shared materials, so 30 avatars resolve to a handful of material instances.

export interface Swatch {
  id: string
  name: string
  hex: string
}

export const SKINS: Swatch[] = [
  { id: 'porcelain', name: 'Porcelain', hex: '#f3d3bd' },
  { id: 'light', name: 'Light', hex: '#edbf9b' },
  { id: 'tan', name: 'Tan', hex: '#d39c6e' },
  { id: 'olive', name: 'Olive', hex: '#b97f53' },
  { id: 'brown', name: 'Brown', hex: '#8a5a37' },
  { id: 'deep', name: 'Deep', hex: '#5e3a23' },
]

export const HAIR_COLORS: Swatch[] = [
  { id: 'black', name: 'Black', hex: '#221b1a' },
  { id: 'brown', name: 'Brown', hex: '#5a3a22' },
  { id: 'chestnut', name: 'Chestnut', hex: '#7b4a2b' },
  { id: 'blonde', name: 'Blonde', hex: '#d7a94b' },
  { id: 'auburn', name: 'Auburn', hex: '#8a3320' },
  { id: 'silver', name: 'Silver', hex: '#c9cdd2' },
  { id: 'violet', name: 'Mystic Violet', hex: '#6e4bb0' },
  { id: 'teal', name: 'Teal', hex: '#2f8f86' },
]

// One shared palette for tops & bottoms keeps the material count low.
export const CLOTH_COLORS: Swatch[] = [
  { id: 'plum', name: 'Plum', hex: '#6e3050' },
  { id: 'indigo', name: 'Indigo', hex: '#34507a' },
  { id: 'forest', name: 'Forest', hex: '#3c6b46' },
  { id: 'amber', name: 'Amber', hex: '#c6892f' },
  { id: 'rose', name: 'Rose', hex: '#b65a6e' },
  { id: 'slate', name: 'Slate', hex: '#48505c' },
  { id: 'cream', name: 'Cream', hex: '#e7dcc1' },
  { id: 'violet', name: 'Arcane', hex: '#5a3a8a' },
]

export const SHOE_COLORS: Swatch[] = [
  { id: 'black', name: 'Black', hex: '#2a2622' },
  { id: 'brown', name: 'Brown', hex: '#5c3518' },
  { id: 'white', name: 'White', hex: '#e9e6df' },
  { id: 'red', name: 'Red', hex: '#9a3326' },
]

/* ------------------------------------------------------------------- styles */

export interface StyleOption {
  id: string
  name: string
}

// Hair styles map to parametric cap/strand shapes built in AvatarRig.
export const HAIRS: StyleOption[] = [
  { id: 'none', name: 'None' },
  { id: 'buzz', name: 'Buzz' },
  { id: 'short', name: 'Short' },
  { id: 'medium', name: 'Swept' },
  { id: 'long', name: 'Long' },
  { id: 'bun', name: 'Top Bun' },
]

export const TOPS: StyleOption[] = [
  { id: 'tee', name: 'T-Shirt' },
  { id: 'hoodie', name: 'Hoodie' },
  { id: 'jacket', name: 'Jacket' },
  { id: 'robe', name: 'Scholar Robe' },
]

export const BOTTOMS: StyleOption[] = [
  { id: 'pants', name: 'Pants' },
  { id: 'shorts', name: 'Shorts' },
  { id: 'skirt', name: 'Skirt' },
]

export const SHOES: StyleOption[] = [
  { id: 'sneakers', name: 'Sneakers' },
  { id: 'boots', name: 'Boots' },
]

export const HEIGHT_MIN = 150
export const HEIGHT_MAX = 195
export const HEIGHT_REF = 170 // config height that maps to rig scale 1.0

export const DEFAULT_AVATAR: AvatarConfig = {
  v: AVATAR_SCHEMA_VERSION,
  bodyType: 'male',
  height: 170,
  skin: 'light',
  hair: 'short',
  hairColor: 'brown',
  top: 'hoodie',
  topColor: 'indigo',
  bottom: 'pants',
  bottomColor: 'slate',
  shoes: 'sneakers',
  shoesColor: 'black',
}

/* ----------------------------------------------------------- swatch helpers */

function hexOf(list: Swatch[], id: string, fallback: string): string {
  return list.find((s) => s.id === id)?.hex ?? fallback
}

export const skinHex = (id: string) => hexOf(SKINS, id, '#edbf9b')
export const hairHex = (id: string) => hexOf(HAIR_COLORS, id, '#5a3a22')
export const clothHex = (id: string) => hexOf(CLOTH_COLORS, id, '#48505c')
export const shoeHex = (id: string) => hexOf(SHOE_COLORS, id, '#2a2622')

/** Bring any persisted/partial blob up to a complete, valid config. */
export function normalizeAvatar(input: Partial<AvatarConfig> | null | undefined): AvatarConfig {
  return { ...DEFAULT_AVATAR, ...(input ?? {}), v: AVATAR_SCHEMA_VERSION }
}

/* --------------------------------------------------------------- randomize */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomizeAvatar(): AvatarConfig {
  return {
    v: AVATAR_SCHEMA_VERSION,
    bodyType: Math.random() < 0.5 ? 'male' : 'female',
    height: HEIGHT_MIN + Math.round(Math.random() * (HEIGHT_MAX - HEIGHT_MIN)),
    skin: pick(SKINS).id,
    hair: pick(HAIRS).id,
    hairColor: pick(HAIR_COLORS).id,
    top: pick(TOPS).id,
    topColor: pick(CLOTH_COLORS).id,
    bottom: pick(BOTTOMS).id,
    bottomColor: pick(CLOTH_COLORS).id,
    shoes: pick(SHOES).id,
    shoesColor: pick(SHOE_COLORS).id,
  }
}

/* ------------------------------------------------ shared material / geo cache */

const matCache = new Map<string, MeshStandardMaterial>()

/**
 * Returns a process-wide shared MeshStandardMaterial for a given colour/finish.
 * Avatars NEVER create their own materials — they look one up here, so every
 * avatar wearing "indigo" references one identical material instance. Cheap, and
 * lets three batch state changes.
 */
export function sharedMaterial(hex: string, roughness = 0.85, metalness = 0): MeshStandardMaterial {
  const key = `${hex}|${roughness}|${metalness}`
  let m = matCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, roughness, metalness })
    matCache.set(key, m)
  }
  return m
}

const geoCache = new Map<string, BufferGeometry>()

function cachedGeo(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = geoCache.get(key)
  if (!g) {
    g = make()
    geoCache.set(key, g)
  }
  return g
}

/** Shared rounded box (segments = 1; rounding faked via small bevel scale). */
export function boxGeo(w: number, h: number, d: number): BufferGeometry {
  const key = `box:${w}:${h}:${d}`
  return cachedGeo(key, () => new BoxGeometry(w, h, d))
}

export function capsuleGeo(radius: number, length: number): BufferGeometry {
  const key = `cap:${radius}:${length}`
  return cachedGeo(key, () => new CapsuleGeometry(radius, length, 4, 8))
}

export function sphereGeo(radius: number): BufferGeometry {
  const key = `sph:${radius}`
  return cachedGeo(key, () => new SphereGeometry(radius, 16, 12))
}

/** Half-sphere (dome), opening downward — used for shoulders, hoods, shoe toes. */
export function domeGeo(radius: number): BufferGeometry {
  const key = `dome:${radius}`
  return cachedGeo(key, () => new SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2))
}

/**
 * Tapered cylinder for anatomical limbs: a smooth tube whose top and bottom radii
 * differ (thigh→knee, bicep→elbow). `rTop`/`rBot` in world units, `len` along Y,
 * centred on its own origin so it hangs cleanly below a joint group.
 */
export function taperGeo(rTop: number, rBot: number, len: number): BufferGeometry {
  const key = `tap:${rTop}:${rBot}:${len}`
  return cachedGeo(key, () => new CylinderGeometry(rTop, rBot, len, 12, 1, false))
}

/** A flowing skirt / robe-hem cone: open-ended truncated cone, wider at the bottom. */
export function skirtGeo(rTop: number, rBot: number, len: number): BufferGeometry {
  const key = `skirt:${rTop}:${rBot}:${len}`
  return cachedGeo(key, () => new CylinderGeometry(rTop, rBot, len, 16, 1, true))
}

export function torusGeo(radius: number, tube: number): BufferGeometry {
  const key = `tor:${radius}:${tube}`
  return cachedGeo(key, () => new TorusGeometry(radius, tube, 8, 16))
}

/**
 * A lathe-revolved profile — used for the head so it reads as an egg/jaw shape
 * rather than a plain sphere. `profile` is a list of [x,y] points (x = radius from
 * the central axis, y = height) revolved around Y. Cached by a rounded signature.
 */
export function latheGeo(profile: Array<[number, number]>): BufferGeometry {
  const key = `lat:${profile.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('|')}`
  return cachedGeo(key, () => new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), 20))
}
