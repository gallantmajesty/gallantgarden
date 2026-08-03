// @ts-nocheck
// Avatar customization catalogs, config type, and the shared geometry/material
// caches that keep the system cheap: N avatars that share a palette share the
// exact same THREE material and geometry instances (no per-avatar allocation),
// which is the single biggest lever for staying at 60 FPS with many avatars.

import {
BoxGeometry,
BufferGeometry,
CanvasTexture,
CapsuleGeometry,
CircleGeometry,
ConeGeometry,
Color,
CylinderGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
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
  // --- FREE colour recolouring (Stumble Guys / FF style) ---
  // When set, these hex overrides win over the item's baked colour / palette id.
  topColor?: string
  bottomColor?: string
  hairColorHex?: string
  skinColor?: string
  // --- equipped accessories (ids from ACCESSORIES) ---
  accessories?: string[]
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
  { id: 'light', name: 'Light', hex: '#F1D5B0' },
  { id: 'tan', name: 'Tan', hex: '#d39c6e' },
  { id: 'olive', name: 'Olive', hex: '#b97f53' },
  { id: 'brown', name: 'Brown', hex: '#8a5a37' },
  { id: 'deep', name: 'Deep', hex: '#5e3a23' },
]

export const HAIR_COLORS: Swatch[] = [
  { id: 'black', name: 'Black', hex: '#221b1a' },
  { id: 'brown', name: 'Brown', hex: '#5C3A21' },
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
  { id: 'robe', name: 'Scholar Robe', hex: '#1B2B5A' },
  { id: 'frock', name: 'Frock', hex: '#e88faa' },
  { id: 'sarafan', name: 'Sarafan', hex: '#b4202f' },
]

// Skirt removed: clothing determines appearance, not body type, and no body type
// auto-wears a skirt. Bottoms are leg garments only (pants / shorts / leggings);
// academic vs casual is a TOP concern (see TOPS: tee/hoodie = casual, blazer/robe
// = academic). Older saves with `bottom:'skirt'` are coerced in normalizeAvatar.
export const BOTTOMS: GarmentOption[] = [
  { id: 'pants', name: 'Pants', hex: '#3a4257' },
  { id: 'shorts', name: 'Shorts', hex: '#6e6256' },
  { id: 'leggings', name: 'Leggings', hex: '#2b2d3a' },
  { id: 'wizardpants', name: 'Wizard Pants', hex: '#141C3A' },
]

const ALL_BOTTOM_IDS = new Set<string>(BOTTOMS.map((b) => b.id))

export const SHOES: GarmentOption[] = [
  { id: 'sneakers', name: 'Sneakers', hex: '#e9e6df' },
  { id: 'boots', name: 'Boots', hex: '#5c3518' },
  { id: 'whiteshoes', name: 'White Shoes', hex: '#FFFFFF' },
]

/* ------------------------------------------------------------------ accessories */

export type AccessoryId =
  | 'laptop'
  | 'gaming_laptop'
  | 'phone'
  | 'book'
  | 'book_stack'
  | 'do_not_disturb_poster'
  | 'trading_laptop'
  | 'trading_desktop_3side'
  | 'piano'
  | 'mug'
  | 'flower_pot'
  | 'chair_balloon'
  | 'bento_box'
  | 'hourglass'
  | 'water_bottle'
  | 'headphones'
  | 'desk_lamp'
  | 'plant'
  | 'globe'
  | 'microscope'
  | 'art_palette'
  | 'game_controller'
  | 'plush_toy'
  | 'telescope'

export interface AccessoryDef {
  id: AccessoryId
  name: string
  /** emoji used as the picker thumbnail */
  icon: string
  /** base colour for the 3D model */
  color: string
  /** short blurb shown under the name */
  blurb: string
}

// The accessory wardrobe. Each can be toggled from the Avatar Creator's
// Accessories step and is rendered as a small 3D prop on the character's desk
// (visible in the library study hall). `color` is only a starting tint — the
// 3D model is built to read as a real object, not a flat chip.
export const ACCESSORIES: AccessoryDef[] = [
  { id: 'laptop', name: 'Laptop', icon: '💻', color: '#b8a48c', blurb: 'Study companion' },
  { id: 'gaming_laptop', name: 'Gaming Laptop', icon: '🎮', color: '#a06a3a', blurb: 'Amber-lit rig' },
  { id: 'phone', name: 'Phone', icon: '📱', color: '#5b3a22', blurb: 'Always in hand' },
  { id: 'book', name: 'Single Book', icon: '📖', color: '#7a3b22', blurb: 'Open textbook' },
  { id: 'book_stack', name: 'Book Stack', icon: '📚', color: '#6b4a2e', blurb: '20-book tower' },
  { id: 'do_not_disturb_poster', name: 'Do Not Disturb Sign', icon: '🚫', color: '#c9302c', blurb: 'Focus mode active' },
  { id: 'trading_laptop', name: 'Trading Laptop', icon: '📈', color: '#2a3b2c', blurb: 'Multi-screen charts' },
  { id: 'trading_desktop_3side', name: 'Tri-Monitor Trading Desk', icon: '🖥️', color: '#1a1a2e', blurb: '3-screen endpoint' },
  { id: 'mug', name: 'Coffee Mug', icon: '☕', color: '#c96f43', blurb: 'Warm sip' },
  { id: 'piano', name: 'Mini Piano', icon: '🎹', color: '#c9a17a', blurb: 'Keys to relax' },
  { id: 'flower_pot', name: 'Potted Flower', icon: '🌷', color: '#d9777f', blurb: 'Cozy botanic life' },
  { id: 'chair_balloon', name: 'Floating Balloon', icon: '🎈', color: '#e85d75', blurb: 'Gentle swaying joy' },
  { id: 'bento_box', name: 'Cozy Bento Box', icon: '🍱', color: '#8c4a32', blurb: 'Tasty study snack' },
  { id: 'hourglass', name: 'Focus Hourglass', icon: '⏳', color: '#d4af37', blurb: 'Sands of flow state' },
  { id: 'water_bottle', name: 'Water Bottle', icon: '🚰', color: '#7ba7c9', blurb: 'Stay hydrated' },
  { id: 'headphones', name: 'Headphones', icon: '🎧', color: '#2a2a35', blurb: 'Focus in sound' },
  { id: 'desk_lamp', name: 'Desk Lamp', icon: '💡', color: '#caa24a', blurb: 'Warm study glow' },
  { id: 'plant', name: 'Potted Plant', icon: '🪴', color: '#3f7d52', blurb: 'Lush desk greenery' },
  { id: 'globe', name: 'Globe', icon: '🌍', color: '#3a6ea5', blurb: 'Wander from your desk' },
  { id: 'microscope', name: 'Microscope', icon: '🔬', color: '#4a4f5c', blurb: 'Explore the tiny world' },
  { id: 'art_palette', name: 'Art Palette', icon: '🎨', color: '#d98e73', blurb: 'Paint your ideas' },
  { id: 'game_controller', name: 'Game Controller', icon: '🎮', color: '#2f3542', blurb: 'Break-time fun' },
  { id: 'plush_toy', name: 'Plush Toy', icon: '🧸', color: '#b98a5e', blurb: 'Comfort buddy' },
  { id: 'telescope', name: 'Telescope', icon: '🔭', color: '#6b4a2e', blurb: 'Reach for the stars' },
]

export function accessoryById(id: string): AccessoryDef | undefined {
  return ACCESSORIES.find((a) => a.id === id)
}

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

  // free colours: keep valid-looking hex overrides, drop anything malformed.
  const hexOk = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
  if (merged.topColor !== undefined && !hexOk(merged.topColor)) delete (merged as Partial<AvatarConfig>).topColor
  if (merged.bottomColor !== undefined && !hexOk(merged.bottomColor)) delete (merged as Partial<AvatarConfig>).bottomColor
  if (merged.hairColorHex !== undefined && !hexOk(merged.hairColorHex)) delete (merged as Partial<AvatarConfig>).hairColorHex
  if (merged.skinColor !== undefined && !hexOk(merged.skinColor)) delete (merged as Partial<AvatarConfig>).skinColor

  // accessories: keep only known ids.
  if (Array.isArray(merged.accessories)) {
    merged.accessories = merged.accessories.filter((a) => ACCESSORIES.some((d) => d.id === a))
  } else {
    merged.accessories = []
  }

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

/** Emissive (self-lit) material for glowing sci-fi accents — used by the Robot. */
export function glowMaterial(hex: string, intensity = 2.5): MeshStandardMaterial {
  const key = `glow|${hex}|${intensity}`
  let m = matCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({
      color: hex,
      roughness: 0.3,
      metalness: 0,
      emissive: new Color(hex),
      emissiveIntensity: intensity,
    })
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

/* ------------------------------------------ procedural tactile textures */
// Warm, hand-feel CanvasTextures so the accessories read as real materials
// (wood grain, glazed ceramic, pebbled leather, fibrous paper) rather than flat
// chips. Each kind is drawn once into a cached canvas; materials that use a kind
// are cached by signature so avatars never allocate per-frame.

type TexKind = 'wood' | 'ceramic' | 'leather' | 'paper'

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function drawTex(kind: TexKind, size = 256): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')!
  let seed = 1234567
  for (let i = 0; i < kind.length; i++) seed = (seed * 31 + kind.charCodeAt(i)) >>> 0
  const rnd = mulberry32(seed)

  switch (kind) {
    case 'wood': {
      ctx.fillStyle = '#efe9dd'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 80; i++) {
        const x = rnd() * size
        ctx.strokeStyle = `rgba(60,38,20,${0.06 + rnd() * 0.2})`
        ctx.lineWidth = 0.4 + rnd() * 1.8
        ctx.beginPath()
        ctx.moveTo(x, 0)
        for (let y = 0; y <= size; y += 5) {
          const wob = Math.sin(y * 0.035 + i) * 4 + Math.sin(y * 0.1 + i) * 2
          ctx.lineTo(x + wob, y)
        }
        ctx.stroke()
      }
      for (let i = 0; i < 34; i++) {
        const x = rnd() * size
        ctx.strokeStyle = `rgba(255,240,210,${0.03 + rnd() * 0.08})`
        ctx.lineWidth = 0.5 + rnd()
        ctx.beginPath()
        ctx.moveTo(x, 0)
        for (let y = 0; y <= size; y += 8) ctx.lineTo(x + Math.sin(y * 0.05 + i) * 3, y)
        ctx.stroke()
      }
      for (let k = 0; k < 3; k++) {
        const kx = rnd() * size
        const ky = rnd() * size
        const r = 3 + rnd() * 7
        for (let rr = r; rr > 0; rr -= 1.6) {
          ctx.strokeStyle = 'rgba(50,30,15,0.22)'
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.ellipse(kx, ky, rr, rr * 1.4, rnd() * Math.PI, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      break
    }
    case 'ceramic': {
      ctx.fillStyle = '#f2f2f2'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 46; i++) {
        const x = rnd() * size
        const y = rnd() * size
        const r = 18 + rnd() * 70
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        const dark = rnd() > 0.5
        g.addColorStop(0, dark ? `rgba(60,40,25,${0.04 + rnd() * 0.05})` : `rgba(255,255,255,${0.05 + rnd() * 0.06})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = `rgba(40,25,15,${rnd() * 0.04})`
        ctx.fillRect(rnd() * size, rnd() * size, 1, 1)
      }
      break
    }
    case 'leather': {
      ctx.fillStyle = '#ece7dd'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 1400; i++) {
        const r = 0.6 + rnd() * 1.6
        ctx.fillStyle = `rgba(50,32,18,${rnd() * 0.07})`
        ctx.beginPath()
        ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2)
        ctx.fill()
      }
      for (let i = 0; i < 16; i++) {
        const x = rnd() * size
        const y = rnd() * size
        ctx.strokeStyle = `rgba(40,25,12,${0.05 + rnd() * 0.06})`
        ctx.lineWidth = 0.6 + rnd()
        ctx.beginPath()
        ctx.moveTo(x, y)
        for (let s = 0; s < 5; s++) ctx.lineTo(x + rnd() * size * 0.3, y + rnd() * size * 0.3)
        ctx.stroke()
      }
      break
    }
    case 'paper': {
      ctx.fillStyle = '#f6efe0'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 2200; i++) {
        ctx.fillStyle = `rgba(120,90,50,${rnd() * 0.05})`
        ctx.fillRect(rnd() * size, rnd() * size, 1, 1)
      }
      for (let i = 0; i < 10; i++) {
        const y = rnd() * size
        ctx.strokeStyle = 'rgba(120,90,50,0.05)'
        ctx.lineWidth = 0.6
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(size, y)
        ctx.stroke()
      }
      break
    }
  }
  return cv
}

const canvasCache = new Map<TexKind, HTMLCanvasElement>()
function baseCanvas(kind: TexKind): HTMLCanvasElement {
  let cv = canvasCache.get(kind)
  if (!cv) {
    cv = drawTex(kind)
    canvasCache.set(kind, cv)
  }
  return cv
}

const texMatCache = new Map<string, MeshStandardMaterial>()

/**
 * A shared MeshStandardMaterial with a procedural `kind` texture (wood / ceramic
 * / leather / paper) tinted by `hex`. Cached by signature so reusing the same
 * material across many avatars costs a single instance. `rx`/`ry` set texture
 * repeat so big surfaces don't look stretched.
 */
export function texturedMaterial(
  hex: string,
  kind: TexKind,
  roughness = 0.85,
  metalness = 0,
  rx = 1,
  ry = 1,
): MeshStandardMaterial {
  const key = `${hex}|${kind}|${roughness}|${metalness}|${rx}|${ry}`
  let mat = texMatCache.get(key)
  if (mat) return mat
  const t = new CanvasTexture(baseCanvas(kind))
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(rx, ry)
  mat = new MeshStandardMaterial({ color: hex, map: t, roughness, metalness })
  texMatCache.set(key, mat)
  return mat
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

/** A flat 2D disc in the XY plane (faces +Z) — used for painted-on cat eyes
 *  that sit flush on the face with no 3D bulge. */
export function circleGeo(radius: number, seg = 48): BufferGeometry {
  const key = `cir:${radius}:${seg}`
  return cachedGeo(key, () => new CircleGeometry(radius, seg))
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

export function coneGeo(radius: number, height: number, seg = 32): BufferGeometry {
  const key = `con:${radius}:${height}:${seg}`
  return cachedGeo(key, () => new ConeGeometry(radius, height, seg))
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

  // bottom cap (normal -Y) closes the hips; the TOP is left open so the
  // torso doesn't show a flat plate disc under the chin (the neck covers it).
  const first = rings[0]
  const botC = pos.length / 3
  pos.push(0, first.y, first.cz ?? 0)
  for (let i = 0; i < seg; i++) idx.push(botC, (i + 1) % seg, i)

  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
