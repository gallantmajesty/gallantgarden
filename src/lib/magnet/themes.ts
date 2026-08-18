// Visual themes that transform the whole Task Magnet world — background,
// panels, accents, glow, an ambient particle field and an optional animated
// "scene" drawn behind everything (moon, skyline, aurora, mountains…). Each
// theme is a small bundle of CSS custom properties plus a particle + scene
// style. New categories and themes can be appended freely; the engine reads
// whatever is here.
//
// Art direction: the world leans dark and atmospheric — deep, moody palettes
// that are easy on the eyes for long study sessions. (The old washed-out light
// themes were retired.) Higher levels unlock richer, more cinematic worlds.

export type ParticleKind =
  | 'petals'
  | 'snow'
  | 'stars'
  | 'rain'
  | 'embers'
  | 'bubbles'
  | 'fireflies'
  | 'leaves'
  | 'sparkles'
  | 'none'

// An optional drawn, animated layer behind the particles.
export type SceneKind =
  | 'none'
  | 'moon'
  | 'skyline'
  | 'aurora'
  | 'mountains'
  | 'shooting-stars'
  | 'sun-grid'
  | 'forest'
  | 'rain-window'
  | 'bookshelf'
  | 'deep-sea'
  | 'bedroom'

export interface ThemeVars {
  bg: string // full-screen background (gradient)
  glowA: string // soft radial glow color a
  glowB: string // soft radial glow color b
  panel: string // panel background
  panelSoft: string // softer raised surface
  border: string // panel/border color
  text: string // primary text
  textSoft: string // muted text
  accent: string // main accent
  accent2: string // secondary accent
  shadow: string // panel shadow color
}

export interface MagnetTheme {
  id: string
  name: string
  category: string
  unlockLevel: number // 0 = available from the start
  leafPrice: number // cost in leaves to purchase (0 = free/starter)
  mood: string // one-line feeling
  particle: ParticleKind
  particleColor: string
  scene: SceneKind // drawn animated backdrop layer
  dark: boolean // tunes default control contrast
  vars: ThemeVars
}

export const THEME_CATEGORIES = [
  'Nature Paradise',
  'Fantasy Realm',
  'Aesthetic',
  'Cute',
  'Gaming',
  'Seasonal',
] as const

export const THEMES: MagnetTheme[] = [
  // ---------------- Studio (default) ----------------
  // The single professional theme every account uses — a calm, crisp
  // black-and-white world in the spirit of a minimal dark video player.
  {
    id: 'studio',
    name: 'Studio',
    category: 'Aesthetic',
    unlockLevel: 0,
    leafPrice: 0,
    mood: 'Monochrome studio calm — crisp black, white, zero noise',
    particle: 'none',
    particleColor: '#ffffff',
    scene: 'none',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 150% at 30% 0%, #161616 0%, #101010 55%, #0a0a0a 100%)',
      glowA: 'rgba(255,255,255,0.05)',
      glowB: 'rgba(255,255,255,0.03)',
      panel: 'rgba(31,31,31,0.92)',
      panelSoft: 'rgb(39, 39, 39)',
      border: 'rgba(255,255,255,0.14)',
      text: '#f1f1f1',
      textSoft: '#a7a7a7',
      accent: '#ffffff',
      accent2: '#e0e0e0',
      shadow: 'rgba(0,0,0,0.62)',
    },
  },

  // ---------------- Nature Paradise ----------------
  {
    id: 'mystic-forest',
    name: 'Mystic Forest',
    category: 'Nature Paradise',
    unlockLevel: 0,
    leafPrice: 0,
    mood: 'Deep green hush and floating fireflies',
    particle: 'fireflies',
    particleColor: '#c9ff9f',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'radial-gradient(120% 130% at 18% 0%, #134129 0%, #0c2b1e 42%, #081a12 78%, #05100b 100%)',
      glowA: 'rgba(120,240,160,0.38)',
      glowB: 'rgba(60,160,110,0.42)',
      panel: 'rgba(16,52,38,0.74)',
      panelSoft: 'rgb(26, 72, 52)',
      border: 'rgba(130,215,160,0.30)',
      text: '#eafff2',
      textSoft: '#a9d8ba',
      accent: '#7cf0ab',
      accent2: '#e2ff7c',
      shadow: 'rgba(0,0,0,0.5)',
    },
  },
  {
    id: 'rainy-cabin',
    name: 'Rainy Cabin',
    category: 'Nature Paradise',
    unlockLevel: 0,
    leafPrice: 0,
    mood: 'Warm lamplight against falling rain',
    particle: 'rain',
    particleColor: 'rgba(190,215,240,0.65)',
    scene: 'rain-window',
    dark: true,
    vars: {
      bg: 'radial-gradient(120% 150% at 70% 0%, #2d3644 0%, #232b37 38%, #181e28 72%, #10141b 100%)',
      glowA: 'rgba(255,205,130,0.40)',
      glowB: 'rgba(130,165,205,0.36)',
      panel: 'rgba(38,46,58,0.82)',
      panelSoft: 'rgb(52, 63, 78)',
      border: 'rgba(180,205,235,0.24)',
      text: '#f6efe1',
      textSoft: '#bfc6d2',
      accent: '#ffc079',
      accent2: '#96bde8',
      shadow: 'rgba(0,0,0,0.58)',
    },
  },
  {
    id: 'ocean-depths',
    name: 'Ocean Depths',
    category: 'Nature Paradise',
    unlockLevel: 2,
    leafPrice: 200,
    mood: 'Bioluminescent drift in the deep',
    particle: 'bubbles',
    particleColor: 'rgba(140,235,255,0.6)',
    scene: 'deep-sea',
    dark: true,
    vars: {
      bg: 'radial-gradient(120% 140% at 30% 0%, #08324d 0%, #062337 45%, #041627 74%, #020a12 100%)',
      glowA: 'rgba(70,210,240,0.42)',
      glowB: 'rgba(40,150,225,0.44)',
      panel: 'rgba(8,44,66,0.80)',
      panelSoft: 'rgb(14, 62, 88)',
      border: 'rgba(110,215,240,0.30)',
      text: '#e6fbff',
      textSoft: '#9ccad9',
      accent: '#38d9f5',
      accent2: '#1fd4b8',
      shadow: 'rgba(0,0,0,0.55)',
    },
  },
  {
    id: 'enchanted-grove',
    name: 'Enchanted Grove',
    category: 'Nature Paradise',
    unlockLevel: 3,
    leafPrice: 400,
    mood: 'Violet dusk between ancient trees',
    particle: 'leaves',
    particleColor: '#d2aaff',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'radial-gradient(120% 140% at 25% 0%, #2c2150 0%, #21183c 46%, #151027 76%, #0c0918 100%)',
      glowA: 'rgba(190,140,255,0.42)',
      glowB: 'rgba(110,220,160,0.34)',
      panel: 'rgba(36,29,62,0.80)',
      panelSoft: 'rgb(50, 40, 84)',
      border: 'rgba(185,155,245,0.32)',
      text: '#f2ecff',
      textSoft: '#bfb1db',
      accent: '#b083ff',
      accent2: '#86e8ae',
      shadow: 'rgba(0,0,0,0.55)',
    },
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    category: 'Nature Paradise',
    unlockLevel: 9,
    leafPrice: 1500,
    mood: 'Ribbons of light over a frozen night',
    particle: 'stars',
    particleColor: '#e8fcff',
    scene: 'aurora',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 150% at 30% 0%, #0a2140 0%, #061631 40%, #030d20 72%, #01050c 100%)',
      glowA: 'rgba(100,255,200,0.42)',
      glowB: 'rgba(150,150,255,0.44)',
      panel: 'rgba(10,32,54,0.84)',
      panelSoft: 'rgb(18, 46, 74)',
      border: 'rgba(140,240,225,0.32)',
      text: '#eeffff',
      textSoft: '#a8d0da',
      accent: '#5ff2cb',
      accent2: '#9aa8ff',
      shadow: 'rgba(0,0,0,0.6)',
    },
  },

  // ---------------- Fantasy Realm ----------------
  {
    id: 'wizard-library',
    name: 'Wizard Library',
    category: 'Fantasy Realm',
    unlockLevel: 0,
    leafPrice: 0,
    mood: 'Candlelit tomes and drifting sparks',
    particle: 'embers',
    particleColor: '#ffd188',
    scene: 'bookshelf',
    dark: true,
    vars: {
      bg: 'radial-gradient(120% 150% at 30% 0%, #3a2658 0%, #2b1b42 44%, #1c122c 74%, #0f0918 100%)',
      glowA: 'rgba(255,205,125,0.42)',
      glowB: 'rgba(170,120,255,0.4)',
      panel: 'rgba(52,38,76,0.80)',
      panelSoft: 'rgb(70, 52, 98)',
      border: 'rgba(210,170,255,0.30)',
      text: '#f5ecff',
      textSoft: '#c6b4e0',
      accent: '#d1a3ff',
      accent2: '#ffcf7c',
      shadow: 'rgba(0,0,0,0.54)',
    },
  },
  {
    id: 'celestial',
    name: 'Celestial Observatory',
    category: 'Fantasy Realm',
    unlockLevel: 4,
    leafPrice: 500,
    mood: 'A quiet dome beneath shooting stars',
    particle: 'stars',
    particleColor: '#ffffff',
    scene: 'shooting-stars',
    dark: true,
    vars: {
      bg: 'radial-gradient(140% 140% at 70% 8%, #27406f 0%, #19254f 40%, #0e1434 72%, #070a1e 100%)',
      glowA: 'rgba(130,165,255,0.40)',
      glowB: 'rgba(255,190,230,0.32)',
      panel: 'rgba(24,34,66,0.82)',
      panelSoft: 'rgb(36, 48, 88)',
      border: 'rgba(165,195,255,0.30)',
      text: '#eef3ff',
      textSoft: '#b0bedd',
      accent: '#8cb0ff',
      accent2: '#ffa4d4',
      shadow: 'rgba(0,0,0,0.58)',
    },
  },
  {
    id: 'crystal-kingdom',
    name: 'Crystal Kingdom',
    category: 'Fantasy Realm',
    unlockLevel: 6,
    leafPrice: 800,
    mood: 'Shimmering facets of frozen light',
    particle: 'sparkles',
    particleColor: '#c9f6ff',
    scene: 'aurora',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 140% at 25% 0%, #1d5570 0%, #153f55 44%, #0d2a3a 75%, #071a24 100%)',
      glowA: 'rgba(150,250,255,0.44)',
      glowB: 'rgba(200,150,255,0.4)',
      panel: 'rgba(22,62,80,0.78)',
      panelSoft: 'rgb(32, 82, 104)',
      border: 'rgba(165,240,255,0.32)',
      text: '#eaffff',
      textSoft: '#acd6e2',
      accent: '#55ecff',
      accent2: '#c493ff',
      shadow: 'rgba(0,0,0,0.48)',
    },
  },
  {
    id: 'dragons-keep',
    name: "Dragon's Keep",
    category: 'Fantasy Realm',
    unlockLevel: 8,
    leafPrice: 1500,
    mood: 'Embers rising over a molten throne',
    particle: 'embers',
    particleColor: '#ff9a4a',
    scene: 'mountains',
    dark: true,
    vars: {
      bg: 'radial-gradient(125% 150% at 30% 0%, #4a2116 0%, #331611 44%, #1e0b08 75%, #100503 100%)',
      glowA: 'rgba(255,130,60,0.44)',
      glowB: 'rgba(220,60,60,0.40)',
      panel: 'rgba(54,26,22,0.84)',
      panelSoft: 'rgb(74, 38, 30)',
      border: 'rgba(255,160,90,0.32)',
      text: '#ffefe4',
      textSoft: '#d6b198',
      accent: '#ff7a40',
      accent2: '#ffd459',
      shadow: 'rgba(0,0,0,0.62)',
    },
  },

  // ---------------- Aesthetic ----------------
  {
    id: 'dark-academia',
    name: 'Dark Academia',
    category: 'Aesthetic',
    unlockLevel: 0,
    leafPrice: 0,
    mood: 'Old leather, ink and quiet ambition',
    particle: 'none',
    particleColor: '#d4b078',
    scene: 'bookshelf',
    dark: true,
    vars: {
      bg: 'radial-gradient(125% 140% at 25% 0%, #3d3122 0%, #2e2519 46%, #201a11 76%, #140f0a 100%)',
      glowA: 'rgba(210,170,100,0.34)',
      glowB: 'rgba(140,100,70,0.40)',
      panel: 'rgba(56,46,32,0.84)',
      panelSoft: 'rgb(74, 60, 42)',
      border: 'rgba(205,175,125,0.30)',
      text: '#f6ecd8',
      textSoft: '#cdb893',
      accent: '#ddb06a',
      accent2: '#c57a55',
      shadow: 'rgba(0,0,0,0.58)',
    },
  },
  {
    id: 'coffee-house',
    name: 'Coffee House',
    category: 'Aesthetic',
    unlockLevel: 2,
    leafPrice: 200,
    mood: 'Espresso warmth and low chatter',
    particle: 'none',
    particleColor: '#d3a878',
    scene: 'bookshelf',
    dark: true,
    vars: {
      bg: 'radial-gradient(125% 140% at 25% 0%, #543e2e 0%, #40301f 46%, #2c2114 76%, #1d1509 100%)',
      glowA: 'rgba(236,186,120,0.38)',
      glowB: 'rgba(170,110,65,0.42)',
      panel: 'rgba(70,51,38,0.84)',
      panelSoft: 'rgb(90, 66, 50)',
      border: 'rgba(225,185,130,0.30)',
      text: '#f8ecd9',
      textSoft: '#d2b597',
      accent: '#e6a968',
      accent2: '#b8d087',
      shadow: 'rgba(0,0,0,0.54)',
    },
  },
  {
    id: 'noir',
    name: 'Noir',
    category: 'Aesthetic',
    unlockLevel: 3,
    leafPrice: 400,
    mood: 'Rain on glass and a single streetlight',
    particle: 'rain',
    particleColor: 'rgba(210,220,235,0.45)',
    scene: 'skyline',
    dark: true,
    vars: {
      bg: 'radial-gradient(120% 140% at 25% 0%, #1f2229 0%, #171a20 50%, #0f1116 78%, #0a0b0e 100%)',
      glowA: 'rgba(220,225,240,0.22)',
      glowB: 'rgba(120,140,180,0.30)',
      panel: 'rgba(26,30,37,0.88)',
      panelSoft: 'rgb(38, 43, 53)',
      border: 'rgba(165,180,205,0.24)',
      text: '#f3f5f9',
      textSoft: '#a6afbe',
      accent: '#dfe6f0',
      accent2: '#8ea2c6',
      shadow: 'rgba(0,0,0,0.65)',
    },
  },
  {
    id: 'ink-wash',
    name: 'Ink Wash',
    category: 'Aesthetic',
    unlockLevel: 5,
    leafPrice: 600,
    mood: 'Sumi-e mountains under a pale moon',
    particle: 'leaves',
    particleColor: '#a8b0b8',
    scene: 'mountains',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 150% at 30% 0%, #2b3038 0%, #22262d 48%, #181b21 76%, #111317 100%)',
      glowA: 'rgba(210,220,235,0.24)',
      glowB: 'rgba(140,160,185,0.28)',
      panel: 'rgba(33,38,46,0.86)',
      panelSoft: 'rgb(47, 53, 64)',
      border: 'rgba(175,190,215,0.24)',
      text: '#f2f4f6',
      textSoft: '#aeb7c2',
      accent: '#d05a3a',
      accent2: '#8ba6b2',
      shadow: 'rgba(0,0,0,0.62)',
    },
  },

  // ---------------- Cute ----------------
  {
    id: 'kawaii-night',
    name: 'Kawaii Night',
    category: 'Cute',
    unlockLevel: 0,
    leafPrice: 0,
    mood: 'Soft neon pastels in the dark',
    particle: 'sparkles',
    particleColor: '#ffa5da',
    scene: 'none',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 160% at 25% 0%, #38204a 0%, #2a1738 45%, #1d102a 74%, #120a1c 100%)',
      glowA: 'rgba(255,145,215,0.42)',
      glowB: 'rgba(155,185,255,0.40)',
      panel: 'rgba(54,32,72,0.82)',
      panelSoft: 'rgb(72, 44, 94)',
      border: 'rgba(255,165,220,0.32)',
      text: '#fff0f9',
      textSoft: '#d8b2d0',
      accent: '#ff84c9',
      accent2: '#9db6ff',
      shadow: 'rgba(0,0,0,0.56)',
    },
  },
  {
    id: 'starlit-plush',
    name: 'Starlit Plush',
    category: 'Cute',
    unlockLevel: 1,
    leafPrice: 200,
    mood: 'A blanket fort beneath the stars',
    particle: 'stars',
    particleColor: '#fff0ff',
    scene: 'shooting-stars',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 150% at 30% 0%, #2c2354 0%, #221b44 46%, #171232 75%, #0e0b21 100%)',
      glowA: 'rgba(190,170,255,0.42)',
      glowB: 'rgba(255,160,220,0.38)',
      panel: 'rgba(38,33,70,0.82)',
      panelSoft: 'rgb(52, 45, 92)',
      border: 'rgba(195,175,240,0.30)',
      text: '#f3eeff',
      textSoft: '#bcb2d6',
      accent: '#b4a4ff',
      accent2: '#ff9fd2',
      shadow: 'rgba(0,0,0,0.56)',
    },
  },
  {
    id: 'cozy-bedroom',
    name: 'Cozy Bedroom',
    category: 'Cute',
    unlockLevel: 3,
    leafPrice: 400,
    mood: 'Fairy lights and a soft blanket',
    particle: 'fireflies',
    particleColor: '#ffecb0',
    scene: 'bedroom',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 150% at 28% 0%, #533a5c 0%, #3f2d4a 44%, #2d2038 75%, #1f1526 100%)',
      glowA: 'rgba(255,210,150,0.44)',
      glowB: 'rgba(215,150,230,0.42)',
      panel: 'rgba(72,55,78,0.82)',
      panelSoft: 'rgb(92, 70, 100)',
      border: 'rgba(240,200,240,0.28)',
      text: '#faeef8',
      textSoft: '#d6bcd4',
      accent: '#ffc685',
      accent2: '#e89fd9',
      shadow: 'rgba(0,0,0,0.5)',
    },
  },

  // ---------------- Gaming ----------------
  {
    id: 'cyberpunk',
    name: 'Cyberpunk City',
    category: 'Gaming',
    unlockLevel: 0,
    leafPrice: 0,
    mood: 'Neon rain over an electric skyline',
    particle: 'rain',
    particleColor: 'rgba(130,250,255,0.6)',
    scene: 'skyline',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 150% at 25% 0%, #291440 0%, #1e0d30 46%, #140820 76%, #0a0412 100%)',
      glowA: 'rgba(255,80,190,0.46)',
      glowB: 'rgba(80,230,255,0.44)',
      panel: 'rgba(32,18,50,0.82)',
      panelSoft: 'rgb(48, 26, 72)',
      border: 'rgba(255,95,215,0.36)',
      text: '#f7ecff',
      textSoft: '#c0a6e0',
      accent: '#ff4ab2',
      accent2: '#4de8ff',
      shadow: 'rgba(0,0,0,0.6)',
    },
  },
  {
    id: 'space-station',
    name: 'Space Station',
    category: 'Gaming',
    unlockLevel: 2,
    leafPrice: 200,
    mood: 'Cold steel and the silence of orbit',
    particle: 'stars',
    particleColor: '#d8e6ff',
    scene: 'shooting-stars',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 160% at 30% 0%, #182641 0%, #111c31 46%, #0b1322 76%, #070c16 100%)',
      glowA: 'rgba(90,190,255,0.40)',
      glowB: 'rgba(155,175,215,0.36)',
      panel: 'rgba(22,34,56,0.84)',
      panelSoft: 'rgb(32, 48, 76)',
      border: 'rgba(130,190,255,0.30)',
      text: '#eaf1ff',
      textSoft: '#a7b8d4',
      accent: '#57c0ff',
      accent2: '#8dffd8',
      shadow: 'rgba(0,0,0,0.6)',
    },
  },
  {
    id: 'pixel-kingdom',
    name: 'Pixel Kingdom',
    category: 'Gaming',
    unlockLevel: 4,
    leafPrice: 500,
    mood: 'Retro greens and a hero’s quest',
    particle: 'sparkles',
    particleColor: '#b6f2a4',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 150% at 28% 0%, #1c4126 0%, #143020 46%, #0c1f14 76%, #071209 100%)',
      glowA: 'rgba(150,250,130,0.42)',
      glowB: 'rgba(250,230,100,0.36)',
      panel: 'rgba(22,54,34,0.84)',
      panelSoft: 'rgb(32, 72, 46)',
      border: 'rgba(160,240,130,0.30)',
      text: '#ecffe6',
      textSoft: '#add2a6',
      accent: '#86ea66',
      accent2: '#ffdf58',
      shadow: 'rgba(0,0,0,0.56)',
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    category: 'Gaming',
    unlockLevel: 7,
    leafPrice: 1000,
    mood: 'A chrome sun sinking into the grid',
    particle: 'none',
    particleColor: '#ff6ab8',
    scene: 'sun-grid',
    dark: true,
    vars: {
      bg: 'radial-gradient(150% 140% at 50% 0%, #35123f 0%, #261033 42%, #180a26 72%, #0c0514 100%)',
      glowA: 'rgba(255,110,175,0.48)',
      glowB: 'rgba(110,130,255,0.44)',
      panel: 'rgba(40,18,64,0.84)',
      panelSoft: 'rgb(56, 28, 90)',
      border: 'rgba(255,125,210,0.34)',
      text: '#fdecff',
      textSoft: '#c9a8de',
      accent: '#ff6ab8',
      accent2: '#4fd6ff',
      shadow: 'rgba(0,0,0,0.62)',
    },
  },

  // ---------------- Seasonal ----------------
  {
    id: 'autumn-dusk',
    name: 'Autumn Dusk',
    category: 'Seasonal',
    unlockLevel: 0,
    leafPrice: 0,
    mood: 'Falling leaves and amber lanterns',
    particle: 'leaves',
    particleColor: '#ef9440',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'radial-gradient(125% 150% at 28% 0%, #432918 0%, #34200f 46%, #241609 75%, #170d05 100%)',
      glowA: 'rgba(255,170,85,0.42)',
      glowB: 'rgba(200,105,50,0.44)',
      panel: 'rgba(62,40,26,0.84)',
      panelSoft: 'rgb(82, 54, 34)',
      border: 'rgba(235,165,95,0.32)',
      text: '#faead5',
      textSoft: '#d3b492',
      accent: '#ef8535',
      accent2: '#e5b44c',
      shadow: 'rgba(0,0,0,0.56)',
    },
  },
  {
    id: 'winter-night',
    name: 'Winter Night',
    category: 'Seasonal',
    unlockLevel: 1,
    leafPrice: 200,
    mood: 'Quiet snowfall under a blue moon',
    particle: 'snow',
    particleColor: '#f0f7ff',
    scene: 'moon',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 160% at 30% 0%, #1e3050 0%, #16243f 46%, #0e1829 76%, #080e1a 100%)',
      glowA: 'rgba(170,215,255,0.40)',
      glowB: 'rgba(115,155,225,0.42)',
      panel: 'rgba(22,38,62,0.84)',
      panelSoft: 'rgb(32, 52, 82)',
      border: 'rgba(160,200,245,0.30)',
      text: '#eef6ff',
      textSoft: '#aec3dc',
      accent: '#83bcf1',
      accent2: '#9cd2ff',
      shadow: 'rgba(0,0,0,0.58)',
    },
  },
  {
    id: 'christmas',
    name: 'Christmas',
    category: 'Seasonal',
    unlockLevel: 5,
    leafPrice: 600,
    mood: 'Pine, gold light and gentle snow',
    particle: 'snow',
    particleColor: '#fff7dc',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 150% at 28% 0%, #17472f 0%, #113622 46%, #0a2417 76%, #051409 100%)',
      glowA: 'rgba(255,105,105,0.42)',
      glowB: 'rgba(255,225,135,0.44)',
      panel: 'rgba(26,60,44,0.84)',
      panelSoft: 'rgb(36, 76, 56)',
      border: 'rgba(235,195,135,0.30)',
      text: '#f6f0e0',
      textSoft: '#c0d2c0',
      accent: '#ef5c66',
      accent2: '#ffd978',
      shadow: 'rgba(0,0,0,0.54)',
    },
  },
  {
    id: 'halloween',
    name: 'Halloween',
    category: 'Seasonal',
    unlockLevel: 6,
    leafPrice: 800,
    mood: 'A blood-orange moon and a haunted hush',
    particle: 'embers',
    particleColor: '#ffa24a',
    scene: 'moon',
    dark: true,
    vars: {
      bg: 'radial-gradient(130% 150% at 28% 0%, #3d2331 0%, #2e1a28 44%, #20111d 75%, #140a12 100%)',
      glowA: 'rgba(255,145,55,0.44)',
      glowB: 'rgba(170,90,215,0.42)',
      panel: 'rgba(56,30,52,0.84)',
      panelSoft: 'rgb(74, 40, 54)',
      border: 'rgba(255,165,85,0.32)',
      text: '#f9ead9',
      textSoft: '#cdb196',
      accent: '#ff8b28',
      accent2: '#b87aff',
      shadow: 'rgba(0,0,0,0.58)',
    },
  },
  {
    id: 'blood-moon',
    name: 'Blood Moon',
    category: 'Seasonal',
    unlockLevel: 10,
    leafPrice: 2000,
    mood: 'A crimson moon over a sleeping world',
    particle: 'embers',
    particleColor: '#ff7368',
    scene: 'moon',
    dark: true,
    vars: {
      bg: 'radial-gradient(150% 170% at 32% 0%, #3a0f18 0%, #2a0b12 44%, #1c070c 74%, #11040a 100%)',
      glowA: 'rgba(255,90,80,0.46)',
      glowB: 'rgba(170,40,60,0.48)',
      panel: 'rgba(48,16,24,0.86)',
      panelSoft: 'rgb(66, 24, 34)',
      border: 'rgba(255,105,95,0.34)',
      text: '#ffe9e4',
      textSoft: '#d6a5a2',
      accent: '#ff5f52',
      accent2: '#ffc06e',
      shadow: 'rgba(0,0,0,0.68)',
    },
  },
]

export const DEFAULT_THEME_ID = 'studio'

/** Player IDs granted every magnet theme free (store shows them all as owned
 *  and applying never costs Power). Used to gift the full catalog to a
 *  specific account. The dev FREE_PLAYER in the shop is separate. */
export const FREE_THEME_ACCESS_PLAYER_IDS: number[] = [173371235]

/** True when this player has been granted the full theme catalog for free. */
export function hasFreeThemeAccess(playerId: number | null | undefined): boolean {
  if (playerId == null || !Number.isFinite(playerId)) return false
  return FREE_THEME_ACCESS_PLAYER_IDS.includes(playerId)
}

/** Every theme id in the effective catalog. */
export function allThemeIds(): string[] {
  return effectiveThemes().map((t) => t.id)
}

// Themes that are free from the start (level 0) — everyone owns these.
export const STARTER_THEME_IDS = THEMES.filter((t) => t.unlockLevel === 0).map((t) => t.id)

// ────────────────────────────────────────────────────────────
// Override-aware effective catalog — /owner pricing changes in
// the Pricing tab apply instantly to every player-facing screen.
// ────────────────────────────────────────────────────────────
import { getOverride } from '../ownerOverrides'

/** Themes with /owner price + unlock-level overrides applied. */
export function effectiveThemes(): MagnetTheme[] {
  return THEMES.map((t) => {
    const ov = getOverride('themes', t.id, {} as { price?: number; unlockLevel?: number })
    if (!ov || (ov.price === undefined && ov.unlockLevel === undefined)) return t
    return {
      ...t,
      leafPrice: ov.price ?? t.leafPrice,
      unlockLevel: ov.unlockLevel ?? t.unlockLevel,
    }
  })
}

export function getTheme(id: string): MagnetTheme {
  const effective = effectiveThemes()
  return effective.find((t) => t.id === id) ?? effective.find((t) => t.id === DEFAULT_THEME_ID) ?? effective[0]
}

// ────────────────────────────────────────────────────────────
// Magnet-local store pricing — themes are bought with Magnet
// Power (MXP) inside the Task Magnet, never with global leaves.
// ────────────────────────────────────────────────────────────

/** Cost in Magnet Power. leafPrice 0 => free starter theme. */
export function mxpPrice(theme: MagnetTheme): number {
  return theme.leafPrice * 3
}

/** Theme applied for every account on first run — calm, minimal default. */
export const MAGNET_DEFAULT_THEME_ID = 'studio'

/** Themes every account owns from the start. */
export function starterThemeIds(): string[] {
  const ids = effectiveThemes()
    .filter((t) => mxpPrice(t) === 0)
    .map((t) => t.id)
  if (!ids.includes(MAGNET_DEFAULT_THEME_ID)) ids.push(MAGNET_DEFAULT_THEME_ID)
  return ids
}
