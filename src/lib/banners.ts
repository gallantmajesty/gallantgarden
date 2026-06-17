// Profile banner catalog. Each banner is a magical CSS gradient (no image asset
// needed) so the header reskins instantly and stays crisp at any width. The
// chosen id is stored in profiles.public_profile.banner.

export interface Banner {
  id: string
  name: string
  /** CSS background for the banner strip. */
  css: string
  /** an accent used for the glowing rim / overlaid chips. */
  glow: string
}

export const BANNERS: Banner[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    css: 'linear-gradient(120deg, #1b2a4a 0%, #2e5b8f 38%, #4fd1c5 72%, #8a6cff 100%)',
    glow: '#4fd1c5',
  },
  {
    id: 'ember',
    name: 'Ember',
    css: 'linear-gradient(120deg, #2a1206 0%, #7a3410 40%, #e0699b 78%, #ffba49 100%)',
    glow: '#ff6a1a',
  },
  {
    id: 'forest',
    name: 'Greenwood',
    css: 'linear-gradient(120deg, #10241a 0%, #2f6b3c 45%, #6bbf4f 80%, #d8e88a 100%)',
    glow: '#6bbf4f',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    css: 'linear-gradient(120deg, #3a1430 0%, #8f3a6b 42%, #ff9ec4 78%, #ffd6e6 100%)',
    glow: '#ff9ec4',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    css: 'linear-gradient(120deg, #0a0e1f 0%, #232a52 45%, #5a52d6 82%, #8a6cff 100%)',
    glow: '#8a6cff',
  },
  {
    id: 'dawn',
    name: 'Dawn',
    css: 'linear-gradient(120deg, #2a1a3a 0%, #8a5ad6 40%, #ffba49 80%, #ffe6b0 100%)',
    glow: '#ffba49',
  },
  {
    id: 'tide',
    name: 'Tide',
    css: 'linear-gradient(120deg, #04212e 0%, #0a5a74 45%, #2a90b8 78%, #6fc7d8 100%)',
    glow: '#5ec6e6',
  },
  {
    id: 'mystic',
    name: 'Mystic',
    css: 'linear-gradient(120deg, #1a0f2e 0%, #4a2b7a 42%, #c065e0 78%, #ff9ec4 100%)',
    glow: '#c065e0',
  },
]

export const DEFAULT_BANNER_ID = 'aurora'

const BY_ID = new Map(BANNERS.map((b) => [b.id, b]))

export function getBanner(id: string | null | undefined): Banner {
  return (id && BY_ID.get(id)) || BANNERS[0]
}
