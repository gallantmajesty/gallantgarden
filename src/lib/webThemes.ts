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
  // ----------------------------------------------------------------- Forest
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    mood: 'Emerald valleys, mossy hush and warm gold light.',
    dark: false,
    accents: ['#34b06a', '#ffce54', '#8fae4d'],
    backgrounds: [
      { id: 'viking-lake', label: 'Hidden Lagoon', src: '/themes/forest-viking-lake.jpg' },
      { id: 'misty-laurel', label: 'Misty Laurels', src: '/themes/forest-misty-laurel.jpg' },
      { id: 'green-lagoon', label: 'Emerald Shore', src: '/themes/forest-green-lagoon.jpg' },
    ],
    palette: {
      accent: '#34b06a',
      accentDark: '#1f8a4f',
      accent2: '#ffce54',
      glassFill: 'linear-gradient(135deg, rgba(255,255,255,0.40), rgba(168,222,190,0.20))',
      glassFillStrong: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(168,222,190,0.30))',
      glassBorder: 'rgba(255,255,255,0.58)',
      glassShadow:
        '0 10px 34px rgba(12,46,28,0.30), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -14px 30px rgba(90,170,120,0.16)',
      glassShadowHover:
        '0 18px 46px rgba(12,46,28,0.38), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -14px 30px rgba(90,170,120,0.2)',
      ink: '#1d3a28',
      inkSoft: '#3f6b50',
      onGlass: '#173524',
      woodSolid: '#236b43',
      panelTop: 'rgba(247,253,247,0.92)',
      panelBot: 'rgba(228,243,228,0.92)',
      scrim:
        'radial-gradient(120% 90% at 50% 8%, rgba(20,50,30,0) 40%, rgba(12,34,20,0.30) 100%)',
      glowA: 'rgba(90,200,130,0.30)',
      glowB: 'rgba(255,206,84,0.24)',
    },
  },

  // ------------------------------------------------------------------- Rain
  {
    id: 'rain',
    name: 'Rain',
    emoji: '🌧️',
    mood: 'Cool blues, silver mist and quiet moonlight.',
    dark: true,
    accents: ['#7fb8e6', '#9fb4d8', '#c7d6e0'],
    backgrounds: [
      { id: 'moonlit-oak', label: 'Moonlit Oak', src: '/themes/rain-moonlit-oak.jpg' },
    ],
    palette: {
      accent: '#7fb8e6',
      accentDark: '#3d7fb8',
      accent2: '#c7d6e0',
      glassFill: 'linear-gradient(135deg, rgba(150,185,225,0.22), rgba(40,70,110,0.30))',
      glassFillStrong: 'linear-gradient(135deg, rgba(165,200,235,0.32), rgba(45,80,120,0.46))',
      glassBorder: 'rgba(196,220,244,0.5)',
      glassShadow:
        '0 12px 36px rgba(6,18,38,0.45), inset 0 1px 0 rgba(220,235,255,0.5), inset 0 -14px 30px rgba(60,110,170,0.2)',
      glassShadowHover:
        '0 20px 50px rgba(6,18,38,0.55), inset 0 1px 0 rgba(220,235,255,0.6), inset 0 -14px 30px rgba(60,110,170,0.26)',
      ink: '#eef4fc',
      inkSoft: '#c2d4e8',
      onGlass: '#f4f9ff',
      woodSolid: '#34516e',
      panelTop: 'rgba(34,48,68,0.9)',
      panelBot: 'rgba(22,33,50,0.92)',
      scrim:
        'linear-gradient(180deg, rgba(10,20,40,0.30) 0%, rgba(10,18,34,0.12) 45%, rgba(8,16,30,0.42) 100%)',
      glowA: 'rgba(120,180,235,0.28)',
      glowB: 'rgba(180,200,225,0.22)',
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
      { id: 'pink-cloud', label: 'Rose Dusk', src: '/themes/love-pink-cloud.jpg' },
      { id: 'reed-field', label: 'Whispering Reeds', src: '/themes/love-reed-field.jpg' },
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
]

/** Placeholder themes shown as "coming soon" in the picker. */
export const WEB_THEMES_SOON: { id: string; name: string; emoji: string }[] = [
  { id: 'sakura', name: 'Sakura', emoji: '🌸' },
  { id: 'celestial', name: 'Celestial', emoji: '✨' },
  { id: 'ember', name: 'Ember', emoji: '🔥' },
]

export const DEFAULT_WEB_THEME_ID = 'forest'
export const DEFAULT_WEB_BG_ID = 'viking-lake'

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
  } else {
    s.setProperty('--ink', p.ink)
    s.setProperty('--ink-soft', p.inkSoft)
    s.setProperty('--wood-dark', p.onGlass)
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
