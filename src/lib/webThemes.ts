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
      { id: 'dark-fantasy-castle', label: 'Shadow Citadel', src: '/themes/dark-fantasy-castle.png' },
      { id: 'fantasy-kingdom', label: 'Royal Dominion', src: '/themes/fantasy-kingdom.png' },
    ],
    palette: {
      accent: '#c2a878',
      accentDark: '#94794d',
      accent2: '#d8c49a',
      glassFill: 'linear-gradient(135deg, rgba(150,146,138,0.18), rgba(30,28,26,0.40))',
      glassFillStrong: 'linear-gradient(135deg, rgba(168,162,150,0.28), rgba(34,32,30,0.54))',
      glassBorder: 'rgba(210,200,182,0.42)',
      glassShadow:
        '0 12px 36px rgba(6,5,4,0.55), inset 0 1px 0 rgba(236,230,218,0.42), inset 0 -14px 30px rgba(120,104,72,0.18)',
      glassShadowHover:
        '0 20px 50px rgba(6,5,4,0.65), inset 0 1px 0 rgba(236,230,218,0.52), inset 0 -14px 30px rgba(120,104,72,0.24)',
      ink: '#f1eee7',
      inkSoft: '#c6c1b6',
      onGlass: '#f7f3ea',
      woodSolid: '#4a463f',
      panelTop: 'rgba(38,36,34,0.91)',
      panelBot: 'rgba(22,21,20,0.93)',
      scrim:
        'linear-gradient(180deg, rgba(8,7,6,0.40) 0%, rgba(10,9,8,0.14) 45%, rgba(6,5,4,0.52) 100%)',
      glowA: 'rgba(194,168,120,0.24)',
      glowB: 'rgba(154,167,184,0.18)',
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
      { id: 'reed-field', label: 'Whispering Reeds', src: '/themes/love-reed-field.jpg' },
      { id: 'moonlit-oak', label: 'Moonlit Oak', src: '/themes/rain-moonlit-oak.jpg' },
    ],
    palette: {
      accent: '#ff6f9c',
      accentDark: '#d6447a',
      accent2: '#ff9ec4',
      glassFill: 'linear-gradient(135deg, rgba(255,255,255,0.42), rgba(255,198,219,0.22))',
      glassFillStrong: 'linear-gradient(135deg, rgba(255,251,253,0.58), rgba(255,196,220,0.32))',
      glassBorder: 'rgba(255,226,236,0.62)',
      glassShadow:
        '0 10px 34px rgba(120,30,70,0.28), inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -14px 30px rgba(230,120,170,0.16)',
      glassShadowHover:
        '0 18px 46px rgba(120,30,70,0.36), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -14px 30px rgba(230,120,170,0.2)',
      ink: '#5a2740',
      inkSoft: '#955a76',
      onGlass: '#56213c',
      woodSolid: '#9a4068',
      panelTop: 'rgba(255,248,251,0.93)',
      panelBot: 'rgba(255,234,243,0.93)',
      scrim:
        'radial-gradient(120% 90% at 50% 12%, rgba(255,160,200,0.06) 0%, rgba(80,20,50,0) 45%, rgba(70,16,44,0.32) 100%)',
      glowA: 'rgba(255,140,185,0.30)',
      glowB: 'rgba(226,62,92,0.22)',
    },
  },

  // -------------------------------------------------------------------- Cyber
  {
    id: 'cyber',
    name: 'Cyber',
    emoji: '💻',
    mood: 'Neon code, electric circuits and digital frontiers.',
    dark: true,
    accents: ['#00ff88', '#00ccff', '#ff0066'],
    backgrounds: [
      { id: 'hacker-matrix', label: 'Matrix Rain', src: '/themes/hacker-matrix.png' },
      { id: 'trading-terminal', label: 'Trading Floor', src: '/themes/trading-terminal.png' },
    ],
    palette: {
      accent: '#00ff88',
      accentDark: '#00cc6a',
      accent2: '#00ccff',
      glassFill: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(10,20,15,0.40))',
      glassFillStrong: 'linear-gradient(135deg, rgba(0,230,120,0.25), rgba(15,30,22,0.54))',
      glassBorder: 'rgba(0,255,136,0.35)',
      glassShadow:
        '0 12px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(0,255,136,0.35), inset 0 -14px 30px rgba(0,180,90,0.15)',
      glassShadowHover:
        '0 20px 50px rgba(0,0,0,0.65), inset 0 1px 0 rgba(0,255,136,0.45), inset 0 -14px 30px rgba(0,180,90,0.22)',
      ink: '#e0ffe8',
      inkSoft: '#a0d0b0',
      onGlass: '#e8fff0',
      woodSolid: '#0a2818',
      panelTop: 'rgba(10,25,18,0.91)',
      panelBot: 'rgba(5,15,10,0.93)',
      scrim:
        'linear-gradient(180deg, rgba(0,10,5,0.40) 0%, rgba(0,8,4,0.14) 45%, rgba(0,6,3,0.52) 100%)',
      glowA: 'rgba(0,255,136,0.22)',
      glowB: 'rgba(0,204,255,0.18)',
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
      { id: 'anime-study-night', label: 'Night Scholar', src: '/themes/anime-study-night.png' },
    ],
    palette: {
      accent: '#ffb347',
      accentDark: '#e09030',
      accent2: '#ff6b6b',
      glassFill: 'linear-gradient(135deg, rgba(255,179,71,0.18), rgba(40,30,20,0.40))',
      glassFillStrong: 'linear-gradient(135deg, rgba(255,190,90,0.28), rgba(48,36,24,0.54))',
      glassBorder: 'rgba(255,200,130,0.42)',
      glassShadow:
        '0 12px 36px rgba(10,8,4,0.55), inset 0 1px 0 rgba(255,220,160,0.42), inset 0 -14px 30px rgba(180,120,50,0.18)',
      glassShadowHover:
        '0 20px 50px rgba(10,8,4,0.65), inset 0 1px 0 rgba(255,220,160,0.52), inset 0 -14px 30px rgba(180,120,50,0.24)',
      ink: '#fff5e6',
      inkSoft: '#d4b896',
      onGlass: '#fff8ee',
      woodSolid: '#4a3828',
      panelTop: 'rgba(42,32,22,0.91)',
      panelBot: 'rgba(25,18,12,0.93)',
      scrim:
        'linear-gradient(180deg, rgba(15,10,5,0.40) 0%, rgba(12,8,4,0.14) 45%, rgba(8,5,2,0.52) 100%)',
      glowA: 'rgba(255,179,71,0.24)',
      glowB: 'rgba(255,107,107,0.18)',
    },
  },
]

/** Placeholder themes shown as "coming soon" in the picker. */
export const WEB_THEMES_SOON: { id: string; name: string; emoji: string }[] = [
  { id: 'sakura', name: 'Sakura', emoji: '🌸' },
  { id: 'ember', name: 'Ember', emoji: '🔥' },
]

export const DEFAULT_WEB_THEME_ID = 'rain'
export const DEFAULT_WEB_BG_ID = 'moonlit-oak'

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
 */
export function applyWebTheme(
  themeId: string,
  accentOverride?: string | null,
  fontColor?: string | null,
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

  s.setProperty('--glass-fill', p.glassFill)
  s.setProperty('--glass-fill-strong', p.glassFillStrong)
  s.setProperty('--glass-border', p.glassBorder)
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
