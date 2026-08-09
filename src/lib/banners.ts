// Profile banner catalog. Each banner is a magical CSS gradient (no image asset
// needed) so the header reskins instantly and stays crisp at any width. The
// chosen id is stored in profiles.public_profile.banner.

export type BannerCategory = 'default' | 'gradient' | 'others'

export interface Banner {
  id: string
  name: string
  /** CSS background for the banner strip (used when no image). */
  css: string
  /** an accent used for the glowing rim / overlaid chips. */
  glow: string
  /** optional image asset path (overrides css when set). */
  image?: string
  /** where this banner appears in the picker */
  category: BannerCategory
  /** price in leaves — 0 means free */
  price: number
  /** currency spent. 'green' (🍃 leaves) or 'gold' (🌟 gold leaves). Default green. */
  currency?: 'green' | 'gold'
  /** if true, banner is light-colored and name text should be dark */
  textDark?: boolean
  /** Shop visibility. Hidden banners stay functional (equip/display fine);
   *  they are just filtered out of the shop catalog until launch. */
  visible: boolean
}

export const BANNERS: Banner[] = [
  // ── Default ────────────────────────────────────────────────────────────
  {
    id: 'default_banner',
    name: 'Default',
    visible: true,
    css: 'linear-gradient(120deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    glow: '#e94560',
    image: '/banners/Default banner.webp',
    category: 'default',
    price: 0,
  },

  // ── Gradients (free) ────────────────────────────────────────────────────
  {
    id: 'aurora',
    name: 'Aurora',
    visible: true,
    css: 'linear-gradient(120deg, #1b2a4a 0%, #2e5b8f 38%, #4fd1c5 72%, #8a6cff 100%)',
    glow: '#4fd1c5',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'ember',
    name: 'Ember',
    visible: true,
    css: 'linear-gradient(120deg, #2a1206 0%, #7a3410 40%, #e0699b 78%, #ffba49 100%)',
    glow: '#ff6a1a',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'forest',
    name: 'Greenwood',
    visible: false,
    css: 'linear-gradient(120deg, #10241a 0%, #2f6b3c 45%, #6bbf4f 80%, #d8e88a 100%)',
    glow: '#6bbf4f',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    visible: false,
    css: 'linear-gradient(120deg, #0a0e1f 0%, #232a52 45%, #5a52d6 82%, #8a6cff 100%)',
    glow: '#8a6cff',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'dawn',
    name: 'Dawn',
    visible: false,
    css: 'linear-gradient(120deg, #2a1a3a 0%, #8a5ad6 40%, #ffba49 80%, #ffe6b0 100%)',
    glow: '#ffba49',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'tide',
    name: 'Tide',
    visible: false,
    css: 'linear-gradient(120deg, #04212e 0%, #0a5a74 45%, #2a90b8 78%, #6fc7d8 100%)',
    glow: '#5ec6e6',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'mystic',
    name: 'Mystic',
    visible: false,
    css: 'linear-gradient(120deg, #1a0f2e 0%, #4a2b7a 42%, #c065e0 78%, #ff9ec4 100%)',
    glow: '#c065e0',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    visible: false,
    css: 'linear-gradient(120deg, #2a0e1e 0%, #7a2a4a 38%, #ff7a4a 74%, #ffd08a 100%)',
    glow: '#ff7a4a',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'arctic',
    name: 'Arctic',
    visible: false,
    css: 'linear-gradient(120deg, #0e1e2a 0%, #1e4a6b 45%, #9adbe8 82%, #eaf6fb 100%)',
    glow: '#9adbe8',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'candy',
    name: 'Candy',
    visible: false,
    css: 'linear-gradient(120deg, #3a1230 0%, #c65a8a 40%, #ff9ec4 70%, #ffd6ec 100%)',
    glow: '#ff86b0',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'neonlight',
    name: 'Neon',
    visible: false,
    css: 'linear-gradient(120deg, #05030f 0%, #1a0f4a 40%, #ba2bd6 78%, #00ffd0 100%)',
    glow: '#00ffd0',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    visible: false,
    css: 'linear-gradient(120deg, #031a26 0%, #0a4a6b 45%, #2a9ac9 80%, #b8ecff 100%)',
    glow: '#4fc3e8',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'lilac',
    name: 'Lilac',
    visible: false,
    css: 'linear-gradient(120deg, #1a1030 0%, #5a3a7a 42%, #b08ad6 80%, #ffe0f0 100%)',
    glow: '#b08ad6',
    category: 'gradient',
    price: 0,
  },

  // ── Others (premium) ───────────────────────────────────────────────────
  {
    id: 'neon_glitch',
    name: 'Neon Glitch',
    visible: true,
    css: 'linear-gradient(120deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
    glow: '#00ff88',
    image: '/banners/neon_glitch_banner_1.webp',
    category: 'others',
    // launch tier: cheap green
    price: 1200,
  },
  {
    id: 'crimson_flame',
    name: 'Crimson Flame',
    visible: false,
    css: 'linear-gradient(120deg, #1a0505 0%, #6b1010 35%, #d4380d 70%, #ff6b35 100%)',
    glow: '#ff4500',
    category: 'others',
    price: 2000,
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    visible: true,
    css: 'linear-gradient(120deg, #0a0015 0%, #2a0040 40%, #ff00aa 80%, #00ffff 100%)',
    glow: '#ff00aa',
    image: '/banners/cyberpunk_neon_banner.webp',
    category: 'others',
    // launch tier: medium green
    price: 1500,
  },
  {
    id: 'ethereal_angel',
    name: 'Ethereal Angel',
    visible: false,
    css: 'linear-gradient(120deg, #0d0a1a 0%, #2a1a4a 40%, #c9a4e0 80%, #ffe6f0 100%)',
    glow: '#d4a8f0',
    image: '/banners/ethereal_angel_wing_banner.webp',
    category: 'others',
    price: 2000,
    textDark: true,
  },
  {
    id: 'moonlit_celestial',
    name: 'Moonlit Celestial',
    visible: false,
    css: 'linear-gradient(120deg, #0a0a1a 0%, #1a2a5a 40%, #5a8ac9 80%, #c9e0ff 100%)',
    glow: '#7aaae0',
    image: '/banners/moonlit_celestial_panorama.webp',
    category: 'others',
    price: 2000,
  },
  {
    id: 'neon_glitch_explosion',
    name: 'Neon Explosion',
    visible: false,
    css: 'linear-gradient(120deg, #0a0000 0%, #2a0040 35%, #ff0088 70%, #ffff00 100%)',
    glow: '#ff0088',
    image: '/banners/neon_glitch_explosion.webp',
    category: 'others',
    price: 2000,
  },
  {
    id: 'neon_rainy',
    name: 'Neon Rain',
    visible: false,
    css: 'linear-gradient(120deg, #0a0a1a 0%, #1a2a5a 40%, #ff66aa 80%, #66ddff 100%)',
    glow: '#ff66aa',
    image: '/banners/neon_rainy_cityscape.webp',
    category: 'others',
    price: 2000,
  },
{
    id: 'vaporwave_glitch',
    name: 'Vaporwave Glitch',
    visible: false,
    css: 'linear-gradient(120deg, #0a0015 0%, #2a004a 35%, #ff66ff 70%, #66ffff 100%)',
    glow: '#ff66ff',
    image: '/banners/vaporwave_glitch_banner.webp',
    category: 'others',
    price: 2000,
  },

]

export const DEFAULT_BANNER_ID = 'default_banner'

// ============================================================================
//  LOGO CATALOG — profile picture options (independent from banner choice)
// ============================================================================
export type LogoCategory = 'default' | 'others'

export interface LogoFilter {
  brightness?: number
  contrast?: number
  saturate?: number
  sepia?: number
  hueRotate?: number
}

export interface Logo {
  id: string
  name: string
  image?: string
  /** CSS fallback when no image asset */
  css?: string
  /** reduce brightness for overly bright logos */
  dim?: boolean
  /** 0–2 brightness multiplier (default 1.0). Overrides dim when set. */
  brightness?: number
  /** Deep filter controls — all optional, 0–2 range (hueRotate in degrees). */
  filter?: LogoFilter
  category: LogoCategory
  price: number
  /** currency spent. 'green' (🍃) or 'gold' (🌟). Default green. */
  currency?: 'green' | 'gold'
  /** Shop visibility. Hidden logos stay functional; filtered from the shop
   *  catalog until launch. */
  visible: boolean
}

/** Build a CSS filter string from a LogoFilter + legacy dim/brightness fields. */
export function logoFilter(l: Logo): string | undefined {
  const f: LogoFilter = {}
  // precedence: deep filter > brightness > dim
  if (l.filter) {
    Object.assign(f, l.filter)
  } else {
    if (l.brightness !== undefined) f.brightness = l.brightness
    else if (l.dim) f.brightness = 0.85
  }
  const parts: string[] = []
  if (f.brightness !== undefined) parts.push(`brightness(${f.brightness})`)
  if (f.contrast !== undefined) parts.push(`contrast(${f.contrast})`)
  if (f.saturate !== undefined) parts.push(`saturate(${f.saturate})`)
  if (f.sepia !== undefined) parts.push(`sepia(${f.sepia})`)
  if (f.hueRotate !== undefined) parts.push(`hue-rotate(${f.hueRotate}deg)`)
  return parts.length ? parts.join(' ') : undefined
}

export const LOGOS: Logo[] = [
  { id: 'default_logo', visible: true, name: 'Default', image: '/banners/default logo.webp', category: 'default', price: 0 },
  { id: 'neon_avatar', visible: true, name: 'Neon', image: '/banners/neon_anime_avatar.webp', category: 'others', price: 1200,
    filter: { brightness: 0.68, contrast: 1.15, saturate: 1.2 } },
  { id: 'angel_logo', visible: true, name: 'Angel', image: '/banners/chibi_angel_logo_1.webp', category: 'others', price: 1200,
    filter: { brightness: 0.78, contrast: 1.1, saturate: 0.9 } },
  { id: 'chibi_angel_2', visible: false, name: 'Angel II', image: '/banners/chibi_angel_logo_2.webp', category: 'others', price: 1200,
    filter: { brightness: 0.78, contrast: 1.1, saturate: 0.9 } },
  { id: 'chibi_angel_3', visible: false, name: 'Angel III', image: '/banners/chibi_angel_logo_3.webp', category: 'others', price: 1200,
    filter: { brightness: 0.8, contrast: 1.1, saturate: 0.92 } },
  { id: 'chibi_cat_girl', visible: false, name: 'Cat Girl', image: '/banners/chibi_cat_girl_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.78, contrast: 1.12, saturate: 1.05 } },
  { id: 'chibi_cyberpunk', visible: false, name: 'Cyber Chibi', image: '/banners/chibi_cyberpunk_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.72, contrast: 1.2, saturate: 1.3, hueRotate: -5 } },
  { id: 'cyberpunk_warrior', visible: false, name: 'Cyber Warrior', image: '/banners/chibi_cyberpunk_warrior_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.82, contrast: 1.15, saturate: 1.1 } },
  { id: 'chibi_mage', visible: false, name: 'Mage', image: '/banners/chibi_mage_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.6, contrast: 1.2, saturate: 1.15, hueRotate: 10 } },
  { id: 'chibi_moon_spirit', visible: false, name: 'Moon Spirit', image: '/banners/chibi_moon_spirit_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.55, contrast: 1.25, saturate: 1.1, hueRotate: -10 } },
  { id: 'chibi_dragon', visible: false, name: 'Rainbow Dragon', image: '/banners/chibi_rainbow_dragon_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.85, contrast: 1.1, saturate: 1.25 } },
  { id: 'chibi_robot', visible: false, name: 'Robot', image: '/banners/chibi_robot_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 1.0, contrast: 1.15, saturate: 0.9 } },
  { id: 'chibi_samurai', visible: false, name: 'Samurai', image: '/banners/chibi_samurai_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.85, contrast: 1.12, saturate: 1.05 } },
  { id: 'cloud_angel', visible: false, name: 'Cloud Angel', image: '/banners/cloud_angel_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.6, contrast: 1.2, saturate: 0.85 } },
  { id: 'glitch_chibi', visible: false, name: 'Glitch Chibi', image: '/banners/glitch_chibi_avatar_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.8, contrast: 1.18, saturate: 1.1, hueRotate: 5 } },
  { id: 'kawaii_angel', visible: false, name: 'Kawaii Angel', image: '/banners/kawaii_angel_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.6, contrast: 1.15, saturate: 0.9 } },
  { id: 'neon_chibi_warrior', visible: false, name: 'Neon Warrior', image: '/banners/neon_chibi_warrior_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.7, contrast: 1.2, saturate: 1.35, hueRotate: -8 } },
  { id: 'star_child', visible: false, name: 'Star Child', image: '/banners/star_child_logo.webp', category: 'others', price: 1200,
    filter: { brightness: 0.82, contrast: 1.12, saturate: 1.1 } },
]

export const DEFAULT_LOGO_ID = ''

const BY_ID = new Map(BANNERS.map((b) => [b.id, b]))

export function getBanner(id: string | null | undefined): Banner {
  return (id && BY_ID.get(id)) || BANNERS[0]
}

// ────────────────────────────────────────────────────────────
// Override-aware effective catalogs — every player-facing screen
// reads these so /owner pricing changes apply instantly.
// ────────────────────────────────────────────────────────────
import { getOverride } from './ownerOverrides'

/** Banners with /owner price + currency + visibility overrides applied. */
export function effectiveBanners(): Banner[] {
  return BANNERS.map((b) => {
    const ov = getOverride('banners', b.id, {} as { price?: number; currency?: 'green' | 'gold'; visible?: boolean })
    if (!ov || (ov.price === undefined && ov.currency === undefined && ov.visible === undefined)) return b
    return {
      ...b,
      price: ov.price ?? b.price,
      currency: ov.currency ?? b.currency,
      visible: ov.visible ?? b.visible,
    }
  })
}

/** Logos with /owner price + currency + visibility overrides applied. */
export function effectiveLogos(): Logo[] {
  return LOGOS.map((l) => {
    const ov = getOverride('logos', l.id, {} as { price?: number; currency?: 'green' | 'gold'; visible?: boolean })
    if (!ov || (ov.price === undefined && ov.currency === undefined && ov.visible === undefined)) return l
    return {
      ...l,
      price: ov.price ?? l.price,
      currency: ov.currency ?? l.currency,
      visible: ov.visible ?? l.visible,
    }
  })
}

/** Effective banner by id (falls back to the default banner). */
export function getEffectiveBanner(id: string | null | undefined): Banner {
  const b = effectiveBanners().find((x) => x.id === id)
  return b || effectiveBanners()[0]
}
