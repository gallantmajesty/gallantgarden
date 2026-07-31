// ============================================================================
//  Web Customization themes
//  ---------------------------------------------------------------------------
//  These are the image-backed "environment" themes the user picks from the
//  Lobby's Web Customization panel (Rain / Love / Forest, more later). Each
//  theme bundles:
//    • several full-screen background images (the user picks one),
//    • a curated accent palette, and
//    • a full set of adaptive UI tokens (glass, ink, panels, glows) so every
//      widget re-tints to complement the background while staying high-contrast
//      and readable.
//
//  applyWebTheme() writes these as CSS custom properties straight onto <html>
//  (inline, so they win over the stylesheet's defaults and dark-mode rules).
//  The whole lobby area cascades off these vars, so one call re-skins the app.
// ============================================================================

export interface WebBackground {
  id: string
  label: string
  /** path under /public */
  src: string
  /** optional glass color overrides for this specific background */
  glassFill?: string
  glassFillStrong?: string
  glassBorder?: string
}

/** Every value here maps to a CSS custom property consumed across the UI. */
export interface WebPalette {
  // accent (drives buttons, focus rings, the gold-aliased highlights)
  accent: string
  accentDark: string
  accent2: string
  // water-morphism glass surfaces
  glassFill: string
  glassFillStrong: string
  glassBorder: string
  glassShadow: string
  glassShadowHover: string
  // text — tuned for contrast against the glass, not the photo
  ink: string
  inkSoft: string
  onGlass: string // primary label colour on glass (maps to --wood-dark usages)
  woodSolid: string // deep solid theme tone for panel frames / badges (--wood)
  // opaque panel surfaces (modals / drawers)
  panelTop: string
  panelBot: string
  // background dressing painted by <WebBackground>
  scrim: string // overlay gradient for legibility + mood
  glowA: string
  glowB: string
}

export interface WebTheme {
  id: string
  name: string
  emoji: string
  mood: string
  /** dark photo → light text. Tunes a couple of contrast defaults. */
  dark: boolean
  /** curated accent choices for the swatch picker (first = theme default). */
  accents: string[]
  backgrounds: WebBackground[]
  palette: WebPalette
}

// ----------------------------------------------------------------------------
//  Theme definitions
// ----------------------------------------------------------------------------

export const WEB_THEMES: WebTheme[] = [
  // ---------------------------------------------------------------- Fantasy
  {
    id: 'fantasy',
    name: 'Fantasy',
    emoji: '🏛️',
    mood: 'Silent ruins, drifting fog and one shaft of ancient light.',
    dark: true,
    accents: ['#c2a878', '#9aa7b8', '#d8c49a'],
    backgrounds: [
      { id: 'silent-ruins', label: 'Silent Ruins', src: '/themes/fantasy-silent-ruins.jpg' },
      { id: 'dark-fantasy-castle', label: 'Shadow Citadel', src: '/themes/dark-fantasy-castle.png',
        glassFill: 'linear-gradient(135deg, rgba(60,70,110,0.45), rgba(40,50,90,0.55))',
        glassFillStrong: 'linear-gradient(135deg, rgba(70,80,120,0.52), rgba(50,60,100,0.62))',
        glassBorder: 'rgba(120,140,200,0.25)' },
      { id: 'fantasy-kingdom', label: 'Royal Dominion', src: '/themes/fantasy-kingdom.png',
        glassFill: 'linear-gradient(135deg, rgba(50,70,100,0.45), rgba(35,55,85,0.55))',
        glassFillStrong: 'linear-gradient(135deg, rgba(60,80,110,0.52), rgba(45,65,95,0.62))',
        glassBorder: 'rgba(100,130,180,0.25)' },
      { id: 'crystal-cave', label: 'Crystal Cave', src: '/themes/crystal_cave_lobby_1.webp',
        glassFill: 'linear-gradient(135deg, rgba(80,60,120,0.45), rgba(50,40,90,0.55))',
        glassFillStrong: 'linear-gradient(135deg, rgba(95,75,135,0.52), rgba(65,50,100,0.62))',
        glassBorder: 'rgba(140,100,200,0.25)' },
      { id: 'enchanted-forest', label: 'Enchanted Forest', src: '/themes/enchanted_forest_lobby_1.webp',
        glassFill: 'linear-gradient(135deg, rgba(30,60,40,0.45), rgba(20,45,30,0.55))',
        glassFillStrong: 'linear-gradient(135deg, rgba(40,75,50,0.52), rgba(25,55,35,0.62))',
        glassBorder: 'rgba(80,140,100,0.25)' },
      { id: 'floating-islands', label: 'Floating Islands', src: '/themes/floating_islands_sunset_1.webp',
        glassFill: 'linear-gradient(135deg, rgba(100,70,40,0.45), rgba(80,55,30,0.55))',
        glassFillStrong: 'linear-gradient(135deg, rgba(115,85,50,0.52), rgba(90,65,35,0.62))',
        glassBorder: 'rgba(200,160,100,0.25)' },
      { id: 'medieval-castle', label: 'Medieval Castle', src: '/themes/medieval_castle_lobby_watercolor.webp',
        glassFill: 'linear-gradient(135deg, rgba(60,50,40,0.45), rgba(40,35,25,0.55))',
        glassFillStrong: 'linear-gradient(135deg, rgba(75,60,50,0.52), rgba(50,40,30,0.62))',
        glassBorder: 'rgba(160,130,100,0.25)' },
      { id: 'dragon-lair', label: "Dragon's Lair", src: '/themes/dragon_lair_watercolor.webp',
        glassFill: 'linear-gradient(135deg, rgba(80,40,20,0.45), rgba(60,25,10,0.55))',
        glassFillStrong: 'linear-gradient(135deg, rgba(95,50,25,0.52), rgba(70,30,15,0.62))',
        glassBorder: 'rgba(200,100,50,0.25)' },
    ],
     palette: {
       accent: '#c2a878',
       accentDark: '#94794d',
       accent2: '#d8c49a',
       glassFill: 'linear-gradient(135deg, rgba(60,50,35,0.38), rgba(30,24,16,0.48))',
       glassFillStrong: 'linear-gradient(135deg, rgba(75,62,42,0.45), rgba(40,32,20,0.55))',
       glassBorder: 'rgba(194,168,120,0.15)',
       glassShadow: '0 2px 8px rgba(0,0,0,0.18)',
       glassShadowHover: '0 4px 12px rgba(0,0,0,0.24)',
       ink: '#f1eee7',
       inkSoft: '#c6c1b6',
       onGlass: '#f7f3ea',
       woodSolid: '#4a463f',
       panelTop: 'rgba(38,36,34,0.90)',
       panelBot: 'rgba(22,21,20,0.92)',
       scrim: 'linear-gradient(180deg, rgba(8,7,6,0.35) 0%, rgba(10,9,8,0.10) 45%, rgba(6,5,4,0.42) 100%)',
       glowA: 'rgba(194,168,120,0.10)',
       glowB: 'rgba(154,167,184,0.08)',
     },
  },

  // ------------------------------------------------------------------- Love
  {
    id: 'love',
    name: 'Love',
    emoji: '💗',
    mood: 'Rose, crimson and a soft magical glow.',
    dark: false,
    accents: ['#ff6f9c', '#e23e5c', '#ff9ec4'],
    backgrounds: [
      { id: 'moonlit-oak', label: 'Moonlit Oak', src: '/themes/rain-moonlit-oak.jpg',
        glassFill: 'linear-gradient(135deg, rgba(80,90,120,0.48), rgba(65,75,105,0.58))',
        glassFillStrong: 'linear-gradient(135deg, rgba(95,105,135,0.55), rgba(78,88,120,0.65))',
        glassBorder: 'rgba(140,155,200,0.28)' },
      { id: 'abandoned-greenhouse', label: 'Golden Greenhouse', src: '/themes/abandoned_greenhouse_golden_hour_1.webp',
        glassFill: 'linear-gradient(135deg, rgba(120,80,40,0.42), rgba(100,65,30,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(140,95,50,0.50), rgba(115,75,35,0.60))',
        glassBorder: 'rgba(220,180,100,0.22)' },
      { id: 'love-reed-field', label: 'Reed Field', src: '/themes/love-reed-field.jpg',
        glassFill: 'linear-gradient(135deg, rgba(140,100,80,0.42), rgba(120,80,60,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(160,115,95,0.50), rgba(135,90,70,0.60))',
        glassBorder: 'rgba(240,180,160,0.22)' },
      { id: 'love-pink-cloud', label: 'Pink Clouds', src: '/themes/love-pink-cloud.jpg',
        glassFill: 'linear-gradient(135deg, rgba(160,80,100,0.42), rgba(140,60,80,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(180,95,115,0.50), rgba(155,70,90,0.60))',
        glassBorder: 'rgba(255,150,180,0.22)' },
    ],
     palette: {
       accent: '#ff6f9c',
       accentDark: '#d6447a',
       accent2: '#ff9ec4',
       glassFill: 'linear-gradient(135deg, rgba(255,210,195,0.35), rgba(255,180,170,0.45))',
       glassFillStrong: 'linear-gradient(135deg, rgba(255,225,215,0.42), rgba(255,195,185,0.52))',
       glassBorder: 'rgba(255,190,170,0.30)',
       glassShadow: '0 2px 8px rgba(120,30,70,0.12)',
       glassShadowHover: '0 4px 12px rgba(120,30,70,0.18)',
       ink: '#5a2740',
       inkSoft: '#955a76',
       onGlass: '#56213c',
       woodSolid: '#9a4068',
       panelTop: 'rgba(255,248,251,0.92)',
       panelBot: 'rgba(255,234,243,0.92)',
       scrim: 'radial-gradient(120% 90% at 50% 12%, rgba(255,160,200,0.04) 0%, rgba(80,20,50,0) 45%, rgba(70,16,44,0.22) 100%)',
       glowA: 'rgba(255,140,185,0.08)',
       glowB: 'rgba(226,62,92,0.06)',
     },
  },

  // -------------------------------------------------------------------- Sci-Fi
  {
    id: 'sci-fi',
    name: 'Sci-Fi',
    emoji: '💻',
    mood: 'Neon code, electric circuits and digital frontiers.',
    dark: true,
    accents: ['#00ff88', '#00ccff', '#ff0066'],
    backgrounds: [
      { id: 'cyberpunk-rooftop', label: 'Cyber Rooftop', src: '/themes/cyberpunk_rooftop_watercolor.webp',
        glassFill: 'linear-gradient(135deg, rgba(40,20,60,0.42), rgba(25,10,45,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(55,30,75,0.50), rgba(35,15,55,0.60))',
        glassBorder: 'rgba(100,50,180,0.22)' },
      { id: 'futuristic-gaming', label: 'Gaming Room', src: '/themes/futuristic_gaming_watercolor.webp',
        glassFill: 'linear-gradient(135deg, rgba(30,30,50,0.42), rgba(20,20,40,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(45,45,65,0.50), rgba(30,30,50,0.60))',
        glassBorder: 'rgba(80,80,140,0.22)' },
      { id: 'space-station', label: 'Space Station', src: '/themes/space_station_lobby.webp',
        glassFill: 'linear-gradient(135deg, rgba(10,20,40,0.42), rgba(5,15,35,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(20,30,55,0.50), rgba(10,20,45,0.60))',
        glassBorder: 'rgba(60,80,140,0.22)' },
    ],
     palette: {
       accent: '#00ff88',
       accentDark: '#00cc6a',
       accent2: '#00ccff',
       glassFill: 'linear-gradient(135deg, rgba(0,40,25,0.38), rgba(0,25,18,0.48))',
       glassFillStrong: 'linear-gradient(135deg, rgba(0,55,35,0.45), rgba(0,35,25,0.55))',
       glassBorder: 'rgba(0,255,136,0.15)',
       glassShadow: '0 2px 8px rgba(0,0,0,0.20)',
       glassShadowHover: '0 4px 12px rgba(0,0,0,0.26)',
       ink: '#e0ffe8',
       inkSoft: '#a0d0b0',
       onGlass: '#e8fff0',
       woodSolid: '#0a2818',
       panelTop: 'rgba(10,25,18,0.90)',
       panelBot: 'rgba(5,15,10,0.92)',
       scrim: 'linear-gradient(180deg, rgba(0,10,5,0.35) 0%, rgba(0,8,4,0.10) 45%, rgba(0,6,3,0.42) 100%)',
       glowA: 'rgba(0,255,136,0.08)',
       glowB: 'rgba(0,204,255,0.06)',
     },
  },

  // -------------------------------------------------------------- Cozy Night
  {
    id: 'cozy-night',
    name: 'Cozy Night',
    emoji: '🌙',
    mood: 'Warm lamplight, quiet focus and starry windows.',
    dark: true,
    accents: ['#ffb347', '#ff6b6b', '#74b9ff'],
    backgrounds: [
      { id: 'cozy-study-desk', label: 'Study Nook', src: '/themes/cozy-study-desk.png' },
      { id: 'anime-study-night', label: 'Night Scholar', src: '/themes/anime-study-night.png',
        glassFill: 'linear-gradient(135deg, rgba(50,65,100,0.42), rgba(35,48,80,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(60,78,115,0.50), rgba(42,58,92,0.60))',
        glassBorder: 'rgba(90,115,170,0.22)' },
      { id: 'cozy-cabin', label: 'Cozy Cabin', src: '/themes/cozy_cabin_watercolor.webp',
        glassFill: 'linear-gradient(135deg, rgba(100,60,30,0.42), rgba(80,45,20,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(115,70,35,0.50), rgba(90,55,25,0.60))',
        glassBorder: 'rgba(200,140,80,0.22)' },
      { id: 'serene-tea-room', label: 'Serene Tea Room', src: '/themes/serene_tea_room.webp',
        glassFill: 'linear-gradient(135deg, rgba(80,90,60,0.42), rgba(60,70,40,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(95,105,70,0.50), rgba(70,80,50,0.60))',
        glassBorder: 'rgba(160,180,120,0.22)' },
      { id: 'rooftop-terrace', label: 'Rooftop Terrace', src: '/themes/rooftop_terrace_sunset_1.webp',
        glassFill: 'linear-gradient(135deg, rgba(120,80,40,0.42), rgba(100,60,30,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(140,95,50,0.50), rgba(115,70,35,0.60))',
        glassBorder: 'rgba(220,160,100,0.22)' },
    ],
     palette: {
       accent: '#ffb347',
       accentDark: '#e09030',
       accent2: '#ff6b6b',
       glassFill: 'linear-gradient(135deg, rgba(180,120,50,0.32), rgba(140,90,30,0.42))',
       glassFillStrong: 'linear-gradient(135deg, rgba(200,135,60,0.40), rgba(160,105,40,0.50))',
       glassBorder: 'rgba(255,179,71,0.18)',
       glassShadow: '0 2px 8px rgba(0,0,0,0.20)',
       glassShadowHover: '0 4px 12px rgba(0,0,0,0.26)',
       ink: '#fff5e6',
       inkSoft: '#d4b896',
       onGlass: '#fff8ee',
       woodSolid: '#4a3828',
       panelTop: 'rgba(42,32,22,0.90)',
       panelBot: 'rgba(25,18,12,0.92)',
       scrim: 'linear-gradient(180deg, rgba(15,10,5,0.35) 0%, rgba(12,8,4,0.10) 45%, rgba(8,5,2,0.42) 100%)',
       glowA: 'rgba(255,179,71,0.08)',
       glowB: 'rgba(255,107,107,0.06)',
     },
  },

  // -------------------------------------------------------------- Nature
  {
    id: 'nature',
    name: 'Nature',
    emoji: '🌿',
    mood: 'Mountain air, misty forests and calm waters.',
    dark: true,
    accents: ['#6bbf4f', '#4a9e8a', '#8ac9a8'],
    backgrounds: [
      { id: 'dawn-mountain', label: 'Dawn Mountain', src: '/themes/dawn_mountain_cloudscape.webp',
        glassFill: 'linear-gradient(135deg, rgba(80,60,80,0.42), rgba(60,40,60,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(95,70,95,0.50), rgba(70,50,70,0.60))',
        glassBorder: 'rgba(160,120,160,0.22)' },
      { id: 'misty-jungle', label: 'Misty Jungle', src: '/themes/misty_jungle_waterfall.webp',
        glassFill: 'linear-gradient(135deg, rgba(30,70,40,0.42), rgba(20,55,30,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(40,85,50,0.50), rgba(25,65,35,0.60))',
        glassBorder: 'rgba(80,160,100,0.22)' },
      { id: 'northern-lights', label: 'Northern Lights', src: '/themes/northern_lights_lake.webp',
        glassFill: 'linear-gradient(135deg, rgba(20,40,60,0.42), rgba(10,30,50,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(30,55,75,0.50), rgba(15,40,60,0.60))',
        glassBorder: 'rgba(60,100,160,0.22)' },
      { id: 'forest-green-lagoon', label: 'Green Lagoon', src: '/themes/forest-green-lagoon.jpg',
        glassFill: 'linear-gradient(135deg, rgba(40,80,60,0.42), rgba(25,60,45,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(50,95,70,0.50), rgba(35,70,55,0.60))',
        glassBorder: 'rgba(80,180,120,0.22)' },
      { id: 'forest-misty-laurel', label: 'Misty Laurel', src: '/themes/forest-misty-laurel.jpg',
        glassFill: 'linear-gradient(135deg, rgba(60,70,50,0.42), rgba(45,55,35,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(75,85,60,0.50), rgba(55,65,45,0.60))',
        glassBorder: 'rgba(140,160,100,0.22)' },
      { id: 'forest-viking-lake', label: 'Viking Lake', src: '/themes/forest-viking-lake.jpg',
        glassFill: 'linear-gradient(135deg, rgba(50,60,70,0.42), rgba(35,45,55,0.52))',
        glassFillStrong: 'linear-gradient(135deg, rgba(65,75,85,0.50), rgba(45,55,65,0.60))',
        glassBorder: 'rgba(100,140,180,0.22)' },
    ],
     palette: {
        accent: '#6bbf4f',
        accentDark: '#4a9e30',
        accent2: '#8ac9a8',
        glassFill: 'linear-gradient(135deg, rgba(30,50,35,0.38), rgba(20,35,25,0.48))',
        glassFillStrong: 'linear-gradient(135deg, rgba(40,65,45,0.45), rgba(25,45,30,0.55))',
        glassBorder: 'rgba(107,191,79,0.15)',
        glassShadow: '0 2px 8px rgba(0,0,0,0.18)',
        glassShadowHover: '0 4px 12px rgba(0,0,0,0.24)',
        ink: '#e8f0e0',
        inkSoft: '#b0c8a0',
        onGlass: '#edf5e5',
        woodSolid: '#2a4028',
        panelTop: 'rgba(20,35,22,0.90)',
        panelBot: 'rgba(12,22,14,0.92)',
        scrim: 'linear-gradient(180deg, rgba(8,16,10,0.35) 0%, rgba(10,18,12,0.10) 45%, rgba(6,12,8,0.42) 100%)',
        glowA: 'rgba(107,191,79,0.08)',
        glowB: 'rgba(138,201,168,0.06)',
     },
  },
]

/** Placeholder themes shown as "coming soon" in the picker. */
export const WEB_THEMES_SOON: { id: string; name: string; emoji: string }[] = [
  { id: 'ember', name: 'Ember', emoji: '🔥' },
]

export const DEFAULT_WEB_THEME_ID = 'cozy-night'
export const DEFAULT_WEB_BG_ID = 'cozy-study-desk'

/** Quick text-colour choices for the font-colour picker (plus "Auto" = null and
 *  a custom colour wheel, handled in the UI). */
export const FONT_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: 'White', hex: '#ffffff' },
  { label: 'Cream', hex: '#f5ecd8' },
  { label: 'Charcoal', hex: '#1c1712' },
  { label: 'Ink', hex: '#0f1a24' },
]

export function getWebTheme(id: string): WebTheme {
  return WEB_THEMES.find((t) => t.id === id) ?? WEB_THEMES[0]
}

export function getWebBackground(theme: WebTheme, bgId: string | null): WebBackground {
  return theme.backgrounds.find((b) => b.id === bgId) ?? theme.backgrounds[0]
}

/**
 * Apply a web theme to <html> as inline CSS custom properties. Inline props on
 * the document element beat any stylesheet `:root` / `[data-theme]` rule, so the
 * active theme is always authoritative for the lobby area. Pure DOM, no React.
 *
 * @param accentOverride optional user-chosen accent (hex) that wins over the
 *        theme's default accent.
 * @param fontColor optional user-chosen text colour (hex) that overrides the
 *        theme's default ink — used to keep text legible on any background.
 * @param bgId optional background ID to use background-specific glass colors
 */
export function applyWebTheme(
  themeId: string,
  accentOverride?: string | null,
  fontColor?: string | null,
  bgId?: string | null,
): void {
  const theme = getWebTheme(themeId)
  const p = theme.palette
  const el = document.documentElement
  const s = el.style

  el.dataset.webtheme = theme.id
  el.dataset.webdark = String(theme.dark)

  const accent = accentOverride || p.accent
  // Derive a darker shade for custom accents (theme default keeps its own).
  const accentDark = accentOverride ? shade(accentOverride, -0.22) : p.accentDark

  s.setProperty('--accent', accent)
  s.setProperty('--accent-dark', accentDark)
  s.setProperty('--accent-2', p.accent2)
  // legacy "gold" aliases used throughout the storybook UI
  s.setProperty('--gold', accent)
  s.setProperty('--gold-dark', accentDark)

  // Check for background-specific glass color overrides
  let glassFill = p.glassFill
  let glassFillStrong = p.glassFillStrong
  let glassBorder = p.glassBorder
  
  if (bgId) {
    const bg = theme.backgrounds.find((b) => b.id === bgId)
    if (bg) {
      if (bg.glassFill) glassFill = bg.glassFill
      if (bg.glassFillStrong) glassFillStrong = bg.glassFillStrong
      if (bg.glassBorder) glassBorder = bg.glassBorder
    }
  }

  s.setProperty('--glass-fill', glassFill)
  s.setProperty('--glass-fill-strong', glassFillStrong)
  s.setProperty('--glass-border', glassBorder)
  s.setProperty('--glass-shadow', p.glassShadow)
  s.setProperty('--glass-shadow-hover', p.glassShadowHover)

  // Text colour: a custom font colour (if set) overrides every primary text
  // token so labels stay legible on any background; otherwise use the theme's
  // tuned ink. The "soft" caption tone is muted slightly toward the theme's
  // light/dark base so it still reads as secondary text.
  if (fontColor) {
    const soft = `color-mix(in srgb, ${fontColor} 78%, ${theme.dark ? '#000000' : '#ffffff'})`
    s.setProperty('--ink', fontColor)
    s.setProperty('--ink-soft', soft)
    s.setProperty('--wood-dark', fontColor)
    s.setProperty('--on-glass', fontColor)
  } else {
    s.setProperty('--ink', p.ink)
    s.setProperty('--ink-soft', p.inkSoft)
    s.setProperty('--wood-dark', p.onGlass)
    s.setProperty('--on-glass', p.onGlass)
  }
  s.setProperty('--wood', p.woodSolid)

  s.setProperty('--parchment', p.panelTop)
  s.setProperty('--parchment-dark', p.panelBot)

  s.setProperty('--web-scrim', p.scrim)
  s.setProperty('--web-glow-a', p.glowA)
  s.setProperty('--web-glow-b', p.glowB)
}

/** Lighten (t>0) or darken (t<0) a #rrggbb hex by fraction t. */
function shade(hex: string, t: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  const k = t < 0 ? 0 : 255
  const f = Math.abs(t)
  r = Math.round(r + (k - r) * f)
  g = Math.round(g + (k - g) * f)
  b = Math.round(b + (k - b) * f)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
