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
}

export const BANNERS: Banner[] = [
  // ── Default ────────────────────────────────────────────────────────────
  {
    id: 'default_banner',
    name: 'Default',
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
    css: 'linear-gradient(120deg, #1b2a4a 0%, #2e5b8f 38%, #4fd1c5 72%, #8a6cff 100%)',
    glow: '#4fd1c5',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'ember',
    name: 'Ember',
    css: 'linear-gradient(120deg, #2a1206 0%, #7a3410 40%, #e0699b 78%, #ffba49 100%)',
    glow: '#ff6a1a',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'forest',
    name: 'Greenwood',
    css: 'linear-gradient(120deg, #10241a 0%, #2f6b3c 45%, #6bbf4f 80%, #d8e88a 100%)',
    glow: '#6bbf4f',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'sakura',
    name: 'Sakura',
    css: 'linear-gradient(120deg, #3a1430 0%, #8f3a6b 42%, #ff9ec4 78%, #ffd6e6 100%)',
    glow: '#ff9ec4',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    css: 'linear-gradient(120deg, #0a0e1f 0%, #232a52 45%, #5a52d6 82%, #8a6cff 100%)',
    glow: '#8a6cff',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'dawn',
    name: 'Dawn',
    css: 'linear-gradient(120deg, #2a1a3a 0%, #8a5ad6 40%, #ffba49 80%, #ffe6b0 100%)',
    glow: '#ffba49',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'tide',
    name: 'Tide',
    css: 'linear-gradient(120deg, #04212e 0%, #0a5a74 45%, #2a90b8 78%, #6fc7d8 100%)',
    glow: '#5ec6e6',
    category: 'gradient',
    price: 0,
  },
  {
    id: 'mystic',
    name: 'Mystic',
    css: 'linear-gradient(120deg, #1a0f2e 0%, #4a2b7a 42%, #c065e0 78%, #ff9ec4 100%)',
    glow: '#c065e0',
    category: 'gradient',
    price: 0,
  },

  // ── Others (premium) ───────────────────────────────────────────────────
  {
    id: 'neon_glitch',
    name: 'Neon Glitch',
    css: 'linear-gradient(120deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
    glow: '#00ff88',
    image: '/banners/neon_glitch_banner_1.webp',
    category: 'others',
    price: 1000,
  },
  {
    id: 'heavenly_gold',
    name: 'Heavenly Gold',
    css: 'linear-gradient(120deg, #1a1408 0%, #4a3a10 40%, #c9a44a 80%, #ffe6b0 100%)',
    glow: '#c9a44a',
    image: '/banners/heavenly_banner_golden_halo.webp',
    category: 'others',
    price: 1000,
  },
  {
    id: 'crimson_flame',
    name: 'Crimson Flame',
    css: 'linear-gradient(120deg, #1a0505 0%, #6b1010 35%, #d4380d 70%, #ff6b35 100%)',
    glow: '#ff4500',
    category: 'others',
    price: 1200,
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    css: 'linear-gradient(120deg, #0a0015 0%, #2a0040 40%, #ff00aa 80%, #00ffff 100%)',
    glow: '#ff00aa',
    image: '/banners/cyberpunk_neon_banner.webp',
    category: 'others',
    price: 1000,
  },
  {
    id: 'ethereal_angel',
    name: 'Ethereal Angel',
    css: 'linear-gradient(120deg, #0d0a1a 0%, #2a1a4a 40%, #c9a4e0 80%, #ffe6f0 100%)',
    glow: '#d4a8f0',
    image: '/banners/ethereal_angel_wing_banner.webp',
    category: 'others',
    price: 1000,
  },
  {
    id: 'moonlit_celestial',
    name: 'Moonlit Celestial',
    css: 'linear-gradient(120deg, #0a0a1a 0%, #1a2a5a 40%, #5a8ac9 80%, #c9e0ff 100%)',
    glow: '#7aaae0',
    image: '/banners/moonlit_celestial_panorama.webp',
    category: 'others',
    price: 1000,
  },
  {
    id: 'neon_glitch_explosion',
    name: 'Neon Explosion',
    css: 'linear-gradient(120deg, #0a0000 0%, #2a0040 35%, #ff0088 70%, #ffff00 100%)',
    glow: '#ff0088',
    image: '/banners/neon_glitch_explosion.webp',
    category: 'others',
    price: 1200,
  },
  {
    id: 'neon_rainy',
    name: 'Neon Rain',
    css: 'linear-gradient(120deg, #0a0a1a 0%, #1a2a5a 40%, #ff66aa 80%, #66ddff 100%)',
    glow: '#ff66aa',
    image: '/banners/neon_rainy_cityscape.webp',
    category: 'others',
    price: 1000,
  },
  {
    id: 'neon_sakura',
    name: 'Neon Sakura',
    css: 'linear-gradient(120deg, #1a0a14 0%, #4a1a3a 40%, #ff88cc 80%, #66ffcc 100%)',
    glow: '#ff88cc',
    image: '/banners/neon_sakura_banner.webp',
    category: 'others',
    price: 1000,
  },
  {
    id: 'shattered_glass',
    name: 'Shattered Glass',
    css: 'linear-gradient(120deg, #0a0a0a 0%, #1a1a3a 40%, #00ffff 75%, #ff00ff 100%)',
    glow: '#00ffff',
    image: '/banners/shattered_glass_cyber_banner.webp',
    category: 'others',
    price: 1200,
  },
  {
    id: 'synthwave_sunset',
    name: 'Synthwave Sunset',
    css: 'linear-gradient(120deg, #1a0a2a 0%, #4a1a6a 35%, #ff66aa 70%, #ffcc00 100%)',
    glow: '#ff66aa',
    image: '/banners/synthwave_sunset_banner.webp',
    category: 'others',
    price: 1000,
  },
  {
    id: 'vaporwave_glitch',
    name: 'Vaporwave Glitch',
    css: 'linear-gradient(120deg, #0a0015 0%, #2a004a 35%, #ff66ff 70%, #66ffff 100%)',
    glow: '#ff66ff',
    image: '/banners/vaporwave_glitch_banner.webp',
    category: 'others',
    price: 1000,
  },
]

export const DEFAULT_BANNER_ID = 'default_banner'

// ============================================================================
//  LOGO CATALOG — profile picture options (independent from banner choice)
// ============================================================================
export type LogoCategory = 'default' | 'others'

export interface Logo {
  id: string
  name: string
  image?: string
  /** CSS fallback when no image asset */
  css?: string
  /** reduce brightness for overly bright logos */
  dim?: boolean
  category: LogoCategory
  price: number
}

export const LOGOS: Logo[] = [
  { id: 'default_logo', name: 'Default', image: '/banners/default logo.webp', category: 'default', price: 0 },
  { id: 'neon_avatar', name: 'Neon', image: '/banners/neon_anime_avatar.webp', category: 'others', price: 800 },
  { id: 'angel_logo', name: 'Angel', image: '/banners/chibi_angel_logo_1.webp', dim: true, category: 'others', price: 800 },
  { id: 'mystic_star', name: 'Mystic Star', css: 'linear-gradient(135deg, #2a1a4a 0%, #8a45d6 50%, #ff9ec4 100%)', category: 'others', price: 1200 },
  { id: 'chibi_angel_2', name: 'Angel II', image: '/banners/chibi_angel_logo_2.webp', dim: true, category: 'others', price: 800 },
  { id: 'chibi_angel_3', name: 'Angel III', image: '/banners/chibi_angel_logo_3.webp', dim: true, category: 'others', price: 800 },
  { id: 'chibi_cat_girl', name: 'Cat Girl', image: '/banners/chibi_cat_girl_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'chibi_cyberpunk', name: 'Cyber Chibi', image: '/banners/chibi_cyberpunk_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'cyberpunk_warrior', name: 'Cyber Warrior', image: '/banners/chibi_cyberpunk_warrior_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'chibi_mage', name: 'Mage', image: '/banners/chibi_mage_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'chibi_moon_spirit', name: 'Moon Spirit', image: '/banners/chibi_moon_spirit_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'chibi_dragon', name: 'Rainbow Dragon', image: '/banners/chibi_rainbow_dragon_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'chibi_robot', name: 'Robot', image: '/banners/chibi_robot_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'chibi_samurai', name: 'Samurai', image: '/banners/chibi_samurai_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'cloud_angel', name: 'Cloud Angel', image: '/banners/cloud_angel_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'glitch_chibi', name: 'Glitch Chibi', image: '/banners/glitch_chibi_avatar_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'kawaii_angel', name: 'Kawaii Angel', image: '/banners/kawaii_angel_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'neon_chibi_warrior', name: 'Neon Warrior', image: '/banners/neon_chibi_warrior_logo.webp', dim: true, category: 'others', price: 800 },
  { id: 'star_child', name: 'Star Child', image: '/banners/star_child_logo.webp', dim: true, category: 'others', price: 800 },
]

export const DEFAULT_LOGO_ID = ''

const BY_ID = new Map(BANNERS.map((b) => [b.id, b]))

export function getBanner(id: string | null | undefined): Banner {
  return (id && BY_ID.get(id)) || BANNERS[0]
}
