// @ts-nocheck
// Avatar customization catalogs, config type, and the shared geometry/material
// caches that keep the system cheap: N avatars that share a palette share the
// exact same THREE material and geometry instances (no per-avatar allocation),
// which is the single biggest lever for staying at 60 FPS with many avatars.

import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three'
// v3 reframed clothing as predefined cosmetic ITEMS rather than free colour
// swaps: garments (top/bottom/shoes) are item ids whose colour is baked into the
// item (GARMENT_HEX) and unlocked via progression — there are no per-garment
// colour pickers. Free customization is limited to appearance: body type,
// height, skin, hair (style + colour) and eye colour. Older persisted blobs are
// brought forward by normalizeAvatar (the dropped *Color keys are simply ignored
// by the {...DEFAULT} spread).
export const AVATAR_SCHEMA_VERSION = 6

export type BodyType = 'male' | 'female'

/** Persisted, multiplayer-serializable avatar description. Plain JSON only.
 *  Appearance fields are freely customizable; garment fields are owned cosmetic
 *  item ids (colour is a fixed property of the item, see GARMENT_HEX). */
export interface AvatarConfig {
  v: number // schema version (for safe future migrations)
  // --- freely customizable appearance ---
  bodyType: BodyType
  height: number // cm
  skin: string // -> SKINS id
  hair: string // -> HAIRS id ('none' allowed)
  hairColor: string // -> HAIR_COLORS id
  eyes: string // -> EYE_COLORS id (iris colour; a material/colour swap)
  // --- owned cosmetic items (predefined colour, no picker) ---
  top: string // -> TOPS id
  bottom: string // -> BOTTOMS id
  shoes: string // -> SHOES id
  // --- character selection ---
  characterId?: string
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

// Iris colours — a material/colour swap on the procedural rig's eyes (and, later,
// the base-body GLB's eye material). Small fixed set keeps shared-material count low.
export const EYE_COLORS: Swatch[] = [
  { id: 'brown', name: 'Brown', hex: '#5b3a22' },
  { id: 'hazel', name: 'Hazel', hex: '#7a5230' },
  { id: 'amber', name: 'Amber', hex: '#a76b2e' },
  { id: 'blue', name: 'Blue', hex: '#3a6ea5' },
  { id: 'green', name: 'Green', hex: '#3f7d52' },
  { id: 'grey', name: 'Grey', hex: '#5d6470' },
  { id: 'violet', name: 'Violet', hex: '#6e4bb0' },
]

/* ------------------------------------------------------------------- styles */

export interface StyleOption {
  id: string
  name: string
}

// Hair styles map to parametric cap/strand shapes built in AvatarRig. Libraries
// are gender-aware: a set of neutral cuts shared by both bodies, plus a distinct
// masculine and feminine library so the two silhouettes never read identically.
// The editor's hairstyle picker only offers hairsFor(bodyType); the rig renders
// any id (see AvatarRig Hair()). Every id here MUST have a matching render case.

/** Neutral cuts available to every body type. */
export const SHARED_HAIRS: StyleOption[] = [
  { id: 'none', name: 'None' },
  { id: 'crop', name: 'Cropped' },
  { id: 'pixie', name: 'Pixie' },
  { id: 'bob', name: 'Short Bob' },
]

export const MALE_HAIRS: StyleOption[] = [
  { id: 'short_messy', name: 'Short Messy' },
  { id: 'side_part', name: 'Side Part' },
  { id: 'curly', name: 'Curly' },
  { id: 'fade', name: 'Fade' },
  { id: 'medium_layered', name: 'Medium Layered' },
  { id: 'spiky', name: 'Spiky' },
  { id: 'academic_neat', name: 'Academic Neat' },
  { id: 'wavy', name: 'Wavy' },
]

export const FEMALE_HAIRS: StyleOption[] = [
  { id: 'long_straight', name: 'Long Straight' },
  { id: 'ponytail', name: 'Ponytail' },
  { id: 'twintails', name: 'Twin Tails' },
  { id: 'bun', name: 'Bun' },
  { id: 'braided', name: 'Braided' },
  { id: 'shoulder', name: 'Shoulder Length' },
  { id: 'wavy_long', name: 'Wavy Long' },
  { id: 'curly_long', name: 'Curly Long' },
]

/** The hairstyle library offered for a body type: shared cuts + that gender's. */
export function hairsFor(bodyType: BodyType): StyleOption[] {
  return [...SHARED_HAIRS, ...(bodyType === 'female' ? FEMALE_HAIRS : MALE_HAIRS)]
}

// Garments are cosmetic ITEMS: each ships with its own baked colour (`hex`), so
// there is no per-garment colour picker. New looks = new items (unlocked via
// progression), not recolours of existing ones.
export interface GarmentOption extends StyleOption {
  hex: string
}

export const TOPS: GarmentOption[] = [
  { id: 'tee', name: 'T-Shirt', hex: '#cdd3da' },
  { id: 'hoodie', name: 'Hoodie', hex: '#34507a' },
  { id: 'jacket', name: 'Jacket', hex: '#4a4f5c' },
  { id: 'blazer', name: 'Academic Blazer', hex: '#243049' },
  { id: 'robe', name: 'Scholar Robe', hex: '#2a1a3a' },
  { id: 'frock', name: 'Frock', hex: '#e88faa' },
]

// Skirt removed: clothing determines appearance, not body type, and no body type
// auto-wears a skirt. Bottoms are leg garments only (pants / shorts / leggings);
// academic vs casual is a TOP concern (see TOPS: tee/hoodie = casual, blazer/robe
// = academic). Older saves with `bottom:'skirt'` are coerced in normalizeAvatar.
export const BOTTOMS: GarmentOption[] = [
  { id: 'pants', name: 'Pants', hex: '#3a4257' },
  { id: 'shorts', name: 'Shorts', hex: '#6e6256' },
  { id: 'leggings', name: 'Leggings', hex: '#2b2d3a' },
]

const ALL_BOTTOM_IDS = new Set<string>(BOTTOMS.map((b) => b.id))

export const SHOES: GarmentOption[] = [
  { id: 'sneakers', name: 'Sneakers', hex: '#e9e6df' },
  { id: 'boots', name: 'Boots', hex: '#5c3518' },
]

export const HEIGHT_MIN = 150
export const HEIGHT_MAX = 195
export const HEIGHT_REF = 170 // config height that maps to rig scale 1.0

// Starter COSMETICS per body type. Clothing + hair are no longer freely picked in
// "Customize" — they come from owned items — so a brand-new avatar is given a
// distinct, recognizable starter look for its gender (the silhouettes read apart
// at a glance: male = short-messy + hoodie + pants; female = ponytail + tee +
// leggings). Switching gender in the editor swaps these starter cosmetics while
// leaving the player's chosen height/skin alone (see starterCosmetics).
type StarterCosmetics = Pick<AvatarConfig, 'hair' | 'top' | 'bottom' | 'shoes'>

const STARTER_MALE: StarterCosmetics = { hair: 'short_messy', top: 'hoodie', bottom: 'pants', shoes: 'sneakers' }
const STARTER_FEMALE: StarterCosmetics = { hair: 'bob', top: 'frock', bottom: 'leggings', shoes: 'sneakers' }

export function starterCosmetics(bodyType: BodyType): StarterCosmetics {
  return bodyType === 'female' ? { ...STARTER_FEMALE } : { ...STARTER_MALE }
}

export const DEFAULT_AVATAR: AvatarConfig = {
  v: AVATAR_SCHEMA_VERSION,
  bodyType: 'male',
  height: 170,
  skin: 'light',
  hairColor: 'brown',
  eyes: 'brown',
  ...STARTER_MALE,
}

/* ----------------------------------------------------------- swatch helpers */

function hexOf(list: Swatch[], id: string, fallback: string): string {
  return list.find((s) => s.id === id)?.hex ?? fallback
}

function garmentHexOf(list: GarmentOption[], id: string, fallback: string): string {
  return list.find((g) => g.id === id)?.hex ?? fallback
}

export const skinHex = (id: string) => hexOf(SKINS, id, '#edbf9b')
export const hairHex = (id: string) => hexOf(HAIR_COLORS, id, '#5a3a22')
export const eyeHex = (id: string) => hexOf(EYE_COLORS, id, '#5b3a22')

// Garment colour is a fixed property of the cosmetic item (no picker).
export const topHex = (id: string) => garmentHexOf(TOPS, id, '#48505c')
export const bottomHex = (id: string) => garmentHexOf(BOTTOMS, id, '#3a4257')
export const shoeHex = (id: string) => garmentHexOf(SHOES, id, '#2a2622')

// Legacy hair ids (pre-library split) → their nearest current id. Anything that
// maps to a style outside the avatar's gender library is then caught by the
// validity check below and falls back to that gender's starter hair.
const LEGACY_HAIR: Record<string, string> = {
  buzz: 'crop',
  short: 'short_messy',
  medium: 'medium_layered',
  long: 'long_straight',
  // bun + twintails keep their ids (now female-library) — valid as-is for female,
  // coerced to the male starter for a male body by the validity check.
}

/** Bring any persisted/partial blob up to a complete, valid config. Coerces
 *  retired cosmetic ids (legacy hair names, the removed `skirt`) onto valid
 *  current ids so old saves never render a missing/floating cosmetic. */
export function normalizeAvatar(input: Partial<AvatarConfig> | null | undefined): AvatarConfig {
  const merged = { ...DEFAULT_AVATAR, ...(input ?? {}), v: AVATAR_SCHEMA_VERSION }

  // hair: map legacy ids, then ensure the result is in this body's library.
  const mappedHair = LEGACY_HAIR[merged.hair] ?? merged.hair
  const validHair = hairsFor(merged.bodyType).some((h) => h.id === mappedHair)
  merged.hair = validHair ? mappedHair : starterCosmetics(merged.bodyType).hair

  // bottom: the removed `skirt` (and any unknown id) coerces to pants.
  if (!ALL_BOTTOM_IDS.has(merged.bottom)) merged.bottom = 'pants'

  return merged
}

/* --------------------------------------------------------------- randomize */
// Rolls appearance + currently-available cosmetic items. (Once item ownership
// lands, this should be constrained to owned items so it never grants cosmetics.)

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomizeAvatar(): AvatarConfig {
  // Roll APPEARANCE only (body type, height, skin, eyes). Clothing + hair are
  // owned cosmetics, so a random roll applies that gender's starter look rather
  // than granting random items.
  const bodyType: BodyType = Math.random() < 0.5 ? 'male' : 'female'
  return {
    v: AVATAR_SCHEMA_VERSION,
    bodyType,
    height: HEIGHT_MIN + Math.round(Math.random() * (HEIGHT_MAX - HEIGHT_MIN)),
    skin: pick(SKINS).id,
    hairColor: pick(HAIR_COLORS).id,
    eyes: pick(EYE_COLORS).id,
    ...starterCosmetics(bodyType),
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
    m = new MeshStandardMaterial({ color: hex, roughness, metalness, flatShading: false })
    matCache.set(key, m)
  }
  return m
}

/**
 * Skin-specific material with subtle subsurface-like warmth.
 */
export function skinMaterial(hex: string): MeshStandardMaterial {
  const key = `skin:${hex}`
  let m = matCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, roughness: 0.72, metalness: 0, flatShading: false })
    matCache.set(key, m)
  }
  return m
}

/**
 * Hair material with subtle sheen.
 */
export function hairMaterial(hex: string): MeshStandardMaterial {
  const key = `hair:${hex}`
  let m = matCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, roughness: 0.58, metalness: 0.02, flatShading: false })
    matCache.set(key, m)
  }
  return m
}

/**
 * Eye material — glossy with a slight reflective quality.
 */
export function eyeMaterial(hex: string): MeshStandardMaterial {
  const key = `eye:${hex}`
  let m = matCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, roughness: 0.15, metalness: 0.05, flatShading: false })
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
  return cachedGeo(key, () => new CapsuleGeometry(radius, length, 12, 24))
}

export function sphereGeo(radius: number): BufferGeometry {
  const key = `sph:${radius}`
  return cachedGeo(key, () => new SphereGeometry(radius, 48, 36))
}

/** High-resolution sphere for detailed features (eyes, nose, etc.) */
export function detailSphereGeo(radius: number): BufferGeometry {
  const key = `dsph:${radius}`
  return cachedGeo(key, () => new SphereGeometry(radius, 64, 48))
}

/** Half-sphere (dome), opening downward — used for shoulders, hoods, shoe toes. */
export function domeGeo(radius: number): BufferGeometry {
  const key = `dome:${radius}`
  return cachedGeo(key, () => new SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2))
}

/**
 * Tapered cylinder for anatomical limbs: a smooth tube whose top and bottom radii
 * differ (thigh→knee, bicep→elbow). `rTop`/`rBot` in world units, `len` along Y,
 * centred on its own origin so it hangs cleanly below a joint group.
 */
export function taperGeo(rTop: number, rBot: number, len: number): BufferGeometry {
  const key = `tap:${rTop}:${rBot}:${len}`
  return cachedGeo(key, () => new CylinderGeometry(rTop, rBot, len, 32, 1, false))
}

/** A flowing skirt / robe-hem cone: open-ended truncated cone, wider at the bottom. */
export function skirtGeo(rTop: number, rBot: number, len: number): BufferGeometry {
  const key = `skirt:${rTop}:${rBot}:${len}`
  return cachedGeo(key, () => new CylinderGeometry(rTop, rBot, len, 40, 1, true))
}

export function torusGeo(radius: number, tube: number): BufferGeometry {
  const key = `tor:${radius}:${tube}`
  return cachedGeo(key, () => new TorusGeometry(radius, tube, 24, 48))
}

/**
 * A lathe-revolved profile — used for the head so it reads as an egg/jaw shape
 * rather than a plain sphere. `profile` is a list of [x,y] points (x = radius from
 * the central axis, y = height) revolved around Y. Cached by a rounded signature.
 */
export function latheGeo(profile: Array<[number, number]>): BufferGeometry {
  const key = `lat:${profile.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('|')}`
  return cachedGeo(key, () => buildLathe(profile))
}

function buildLathe(profile: Array<[number, number]>): BufferGeometry {
  const seg = 48
  const n = profile.length
  const pos: number[] = []
  const idx: number[] = []

  for (const [r, y] of profile) {
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2
      pos.push(r * Math.cos(a), y, r * Math.sin(a))
    }
  }

  for (let ri = 0; ri < n - 1; ri++) {
    const a0 = ri * seg
    const a1 = (ri + 1) * seg
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg
      idx.push(a0 + i, a1 + i, a1 + j, a0 + i, a1 + j, a0 + j)
    }
  }

  const [bx, by] = profile[0]
  const bC = pos.length / 3
  pos.push(0, by, 0)
  for (let i = 0; i < seg; i++) idx.push(bC, (i + 1) % seg, i)

  const [tx, ty] = profile[n - 1]
  const tStart = (n - 1) * seg
  const tC = pos.length / 3
  pos.push(0, ty, 0)
  for (let i = 0; i < seg; i++) idx.push(tC, tStart + i, tStart + ((i + 1) % seg))

  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * ONE continuous body loft through a small list of cross-section rings — the
 * torso as a single clean volume (Roblox-style readability) rather than a stack
 * of ellipsoids that reads as "segmented / caterpillar / blob". Each ring is
 * { y, hw, hd } (height; half-width X; half-depth Z) with an optional `cz`
 * front/back centre offset (used to push the chest forward for a bust without
 * thickening the back). Rings are sampled as a SQUIRCLE (superellipse) so the
 * cross-section is a soft-cornered rectangle — boxy and readable, not a round
 * tube — then lofted bottom→top with flat end caps. Cached by a rounded
 * signature, like every other geometry here (no per-avatar allocation).
 */
export interface TorsoRing {
  y: number
  hw: number
  hd: number
  cz?: number
}

const TORSO_SEG = 48 // radial samples per ring (increased for smoother silhouette)
const TORSO_EXP = 3 // superellipse exponent: higher = boxier (squarer) corners

export function torsoGeo(rings: TorsoRing[]): BufferGeometry {
  const key = `torso:${TORSO_SEG}:${TORSO_EXP}:${rings
    .map((r) => `${r.y.toFixed(3)},${r.hw.toFixed(3)},${r.hd.toFixed(3)},${(r.cz ?? 0).toFixed(3)}`)
    .join('|')}`
  return cachedGeo(key, () => buildTorso(rings))
}

function buildTorso(rings: TorsoRing[]): BufferGeometry {
  const seg = TORSO_SEG
  const e = 2 / TORSO_EXP // exponent applied to |cos|/|sin| for the squircle param
  const pos: number[] = []
  const idx: number[] = []

  // ring vertices (squircle: soft-cornered rectangle of half-size hw × hd)
  for (const r of rings) {
    const cz = r.cz ?? 0
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const x = r.hw * Math.sign(ca) * Math.pow(Math.abs(ca), e)
      const z = cz + r.hd * Math.sign(sa) * Math.pow(Math.abs(sa), e)
      pos.push(x, r.y, z)
    }
  }

  // side quads between consecutive rings (winding -> outward normals)
  for (let ri = 0; ri < rings.length - 1; ri++) {
    const a0 = ri * seg
    const a1 = (ri + 1) * seg
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg
      idx.push(a0 + i, a1 + i, a1 + j, a0 + i, a1 + j, a0 + j)
    }
  }

  // bottom cap (normal -Y) and top cap (normal +Y)
  const first = rings[0]
  const last = rings[rings.length - 1]
  const botC = pos.length / 3
  pos.push(0, first.y, first.cz ?? 0)
  for (let i = 0; i < seg; i++) idx.push(botC, i, (i + 1) % seg)

  const topStart = (rings.length - 1) * seg
  const topC = pos.length / 3
  pos.push(0, last.y, last.cz ?? 0)
  for (let i = 0; i < seg; i++) idx.push(topC, topStart + i, topStart + ((i + 1) % seg))

  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
