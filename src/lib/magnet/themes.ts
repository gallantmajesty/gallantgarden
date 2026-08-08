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
  // ---------------- Nature Paradise ----------------
  {
    id: 'mystic-forest',
    name: 'Mystic Forest',
    category: 'Nature Paradise',
    unlockLevel: 0,
    leafPrice: 0,
    mood: 'Deep green hush and floating fireflies',
    particle: 'fireflies',
    particleColor: '#c8ff9e',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #0f2a22 0%, #133b2c 45%, #0a1f1a 100%)',
      glowA: 'rgba(96,200,140,0.30)',
      glowB: 'rgba(40,120,90,0.35)',
      panel: 'rgba(20,46,38,0.72)',
      panelSoft: 'rgb(28, 58, 48)',
      border: 'rgba(120,200,150,0.25)',
      text: '#e6f6ec',
      textSoft: '#a7c8b5',
      accent: '#6fe0a0',
      accent2: '#d8f06a',
      shadow: 'rgba(0,0,0,0.4)',
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
    particleColor: 'rgba(180,205,230,0.6)',
    scene: 'rain-window',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #20262f 0%, #2a3340 50%, #181d24 100%)',
      glowA: 'rgba(255,190,120,0.26)',
      glowB: 'rgba(120,150,190,0.28)',
      panel: 'rgba(34,41,52,0.80)',
      panelSoft: 'rgb(46, 55, 68)',
      border: 'rgba(170,190,215,0.2)',
      text: '#f0e8da',
      textSoft: '#b9bfca',
      accent: '#ffb867',
      accent2: '#8fb4e0',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: 'rgba(120,220,255,0.5)',
    scene: 'deep-sea',
    dark: true,
    vars: {
      bg: 'linear-gradient(180deg, #062235 0%, #08344c 45%, #03141f 100%)',
      glowA: 'rgba(40,180,220,0.30)',
      glowB: 'rgba(30,120,200,0.32)',
      panel: 'rgba(10,42,60,0.78)',
      panelSoft: 'rgb(16, 56, 78)',
      border: 'rgba(90,200,230,0.24)',
      text: '#e2faff',
      textSoft: '#92c2d4',
      accent: '#28c8e6',
      accent2: '#19c7b0',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#c69bff',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #1c1830 0%, #2a2147 48%, #130f22 100%)',
      glowA: 'rgba(160,120,255,0.30)',
      glowB: 'rgba(90,200,140,0.26)',
      panel: 'rgba(30,24,52,0.78)',
      panelSoft: 'rgb(42, 34, 70)',
      border: 'rgba(170,140,235,0.26)',
      text: '#efe7ff',
      textSoft: '#b6a7d2',
      accent: '#a877ff',
      accent2: '#79e0a4',
      shadow: 'rgba(0,0,0,0.48)',
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
    particleColor: '#dffaff',
    scene: 'aurora',
    dark: true,
    vars: {
      bg: 'linear-gradient(180deg, #04101f 0%, #071a30 45%, #02080f 100%)',
      glowA: 'rgba(60,240,180,0.28)',
      glowB: 'rgba(120,120,255,0.28)',
      panel: 'rgba(10,26,44,0.80)',
      panelSoft: 'rgb(16, 36, 58)',
      border: 'rgba(120,230,210,0.26)',
      text: '#e8fbff',
      textSoft: '#9fc4cf',
      accent: '#4fe6c0',
      accent2: '#8aa0ff',
      shadow: 'rgba(0,0,0,0.55)',
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
    particleColor: '#ffcf7a',
    scene: 'bookshelf',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #2a1d3d 0%, #3a2654 45%, #1d1430 100%)',
      glowA: 'rgba(255,190,110,0.3)',
      glowB: 'rgba(150,110,255,0.35)',
      panel: 'rgba(46,33,66,0.78)',
      panelSoft: 'rgb(60, 44, 84)',
      border: 'rgba(200,160,255,0.25)',
      text: '#f1e7ff',
      textSoft: '#bda9d8',
      accent: '#c89bff',
      accent2: '#ffc46b',
      shadow: 'rgba(0,0,0,0.45)',
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
      bg: 'radial-gradient(120% 120% at 70% 10%, #1b2f5e 0%, #121a3a 45%, #070a1c 100%)',
      glowA: 'rgba(120,150,255,0.3)',
      glowB: 'rgba(255,180,220,0.25)',
      panel: 'rgba(22,30,58,0.78)',
      panelSoft: 'rgb(32, 42, 76)',
      border: 'rgba(150,180,255,0.25)',
      text: '#eaf0ff',
      textSoft: '#a9b6da',
      accent: '#7aa2ff',
      accent2: '#ff9ad0',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#bff3ff',
    scene: 'aurora',
    dark: true,
    vars: {
      bg: 'linear-gradient(160deg, #143a4d 0%, #1d5570 45%, #0e2533 100%)',
      glowA: 'rgba(140,240,255,0.32)',
      glowB: 'rgba(180,140,255,0.3)',
      panel: 'rgba(20,55,72,0.76)',
      panelSoft: 'rgb(28, 72, 92)',
      border: 'rgba(150,230,255,0.28)',
      text: '#e6fbff',
      textSoft: '#a3cfdb',
      accent: '#4fe0ff',
      accent2: '#b78bff',
      shadow: 'rgba(0,0,0,0.4)',
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
    particleColor: '#ff8a3c',
    scene: 'mountains',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #2a1110 0%, #3d1c14 48%, #150807 100%)',
      glowA: 'rgba(255,120,40,0.32)',
      glowB: 'rgba(180,40,40,0.30)',
      panel: 'rgba(46,22,18,0.82)',
      panelSoft: 'rgb(62, 32, 24)',
      border: 'rgba(255,150,80,0.26)',
      text: '#ffece0',
      textSoft: '#d0a890',
      accent: '#ff6a3a',
      accent2: '#ffc24a',
      shadow: 'rgba(0,0,0,0.55)',
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
    particleColor: '#caa46a',
    scene: 'bookshelf',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #2a2117 0%, #342a1c 50%, #1d1710 100%)',
      glowA: 'rgba(200,160,90,0.22)',
      glowB: 'rgba(120,90,60,0.3)',
      panel: 'rgba(48,39,27,0.82)',
      panelSoft: 'rgb(62, 51, 36)',
      border: 'rgba(190,160,110,0.25)',
      text: '#f1e6cf',
      textSoft: '#c2ab86',
      accent: '#cda35a',
      accent2: '#b56a4a',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#c8a06a',
    scene: 'bookshelf',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #3a2a20 0%, #4a3528 50%, #2a1d15 100%)',
      glowA: 'rgba(220,170,110,0.25)',
      glowB: 'rgba(150,100,60,0.3)',
      panel: 'rgba(58,42,32,0.82)',
      panelSoft: 'rgb(74, 54, 42)',
      border: 'rgba(210,170,120,0.25)',
      text: '#f3e6d4',
      textSoft: '#c8ab8e',
      accent: '#d89a5c',
      accent2: '#a9c47a',
      shadow: 'rgba(0,0,0,0.45)',
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
    particleColor: 'rgba(200,210,225,0.4)',
    scene: 'skyline',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #101216 0%, #181b22 50%, #090a0d 100%)',
      glowA: 'rgba(180,190,210,0.16)',
      glowB: 'rgba(90,110,150,0.22)',
      panel: 'rgba(22,25,31,0.84)',
      panelSoft: 'rgb(32, 36, 44)',
      border: 'rgba(150,165,190,0.2)',
      text: '#eef1f6',
      textSoft: '#9aa3b2',
      accent: '#cfd6e2',
      accent2: '#7f93b8',
      shadow: 'rgba(0,0,0,0.6)',
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
    particleColor: '#9aa0a8',
    scene: 'mountains',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #1a1d22 0%, #24282f 52%, #121417 100%)',
      glowA: 'rgba(190,200,215,0.16)',
      glowB: 'rgba(120,140,160,0.2)',
      panel: 'rgba(28,32,38,0.82)',
      panelSoft: 'rgb(40, 45, 54)',
      border: 'rgba(160,175,195,0.2)',
      text: '#eef0f3',
      textSoft: '#a4adb8',
      accent: '#c0492f',
      accent2: '#7f9aa6',
      shadow: 'rgba(0,0,0,0.55)',
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
    particleColor: '#ff9ad6',
    scene: 'none',
    dark: true,
    vars: {
      bg: 'linear-gradient(160deg, #241431 0%, #34163f 45%, #181028 100%)',
      glowA: 'rgba(255,130,205,0.30)',
      glowB: 'rgba(140,170,255,0.28)',
      panel: 'rgba(44,26,58,0.80)',
      panelSoft: 'rgb(58, 36, 74)',
      border: 'rgba(255,150,210,0.26)',
      text: '#ffe9f6',
      textSoft: '#cda6c4',
      accent: '#ff77c2',
      accent2: '#8fb0ff',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#ffe6ff',
    scene: 'shooting-stars',
    dark: true,
    vars: {
      bg: 'linear-gradient(160deg, #1a1838 0%, #271f4a 50%, #120f26 100%)',
      glowA: 'rgba(180,160,255,0.30)',
      glowB: 'rgba(255,150,210,0.26)',
      panel: 'rgba(30,26,56,0.80)',
      panelSoft: 'rgb(42, 36, 72)',
      border: 'rgba(180,160,235,0.26)',
      text: '#efe9ff',
      textSoft: '#b3a8d0',
      accent: '#a89bff',
      accent2: '#ff93c8',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#ffe6a8',
    scene: 'none',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #3a2c3e 0%, #463350 50%, #2a2030 100%)',
      glowA: 'rgba(255,200,140,0.3)',
      glowB: 'rgba(200,140,220,0.3)',
      panel: 'rgba(58,44,62,0.8)',
      panelSoft: 'rgb(72, 56, 78)',
      border: 'rgba(230,190,230,0.22)',
      text: '#f6e9f4',
      textSoft: '#cbb0c8',
      accent: '#ffba73',
      accent2: '#e08fd6',
      shadow: 'rgba(0,0,0,0.4)',
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
    particleColor: 'rgba(120,240,255,0.5)',
    scene: 'skyline',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #14081f 0%, #1d0b34 45%, #0a0518 100%)',
      glowA: 'rgba(255,60,170,0.32)',
      glowB: 'rgba(60,220,255,0.32)',
      panel: 'rgba(26,14,40,0.8)',
      panelSoft: 'rgb(38, 20, 58)',
      border: 'rgba(255,80,200,0.3)',
      text: '#f2e9ff',
      textSoft: '#b79ad6',
      accent: '#ff3da6',
      accent2: '#37e6ff',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#cfe0ff',
    scene: 'shooting-stars',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #0c1320 0%, #14213a 50%, #070b14 100%)',
      glowA: 'rgba(80,180,255,0.28)',
      glowB: 'rgba(140,160,200,0.25)',
      panel: 'rgba(18,28,46,0.82)',
      panelSoft: 'rgb(26, 40, 64)',
      border: 'rgba(120,180,255,0.25)',
      text: '#e6eeff',
      textSoft: '#9fb0cc',
      accent: '#46b6ff',
      accent2: '#7affd0',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#aef0a0',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #102a1a 0%, #163a24 50%, #0a1c12 100%)',
      glowA: 'rgba(140,240,120,0.28)',
      glowB: 'rgba(240,220,90,0.25)',
      panel: 'rgba(18,42,28,0.82)',
      panelSoft: 'rgb(26, 56, 38)',
      border: 'rgba(150,230,120,0.25)',
      text: '#eafbe2',
      textSoft: '#a9cca0',
      accent: '#7ce05a',
      accent2: '#ffd84a',
      shadow: 'rgba(0,0,0,0.45)',
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
    particleColor: '#ff5fae',
    scene: 'sun-grid',
    dark: true,
    vars: {
      bg: 'linear-gradient(180deg, #1a0a2e 0%, #2a0f42 40%, #120627 100%)',
      glowA: 'rgba(255,90,170,0.32)',
      glowB: 'rgba(90,120,255,0.30)',
      panel: 'rgba(30,14,52,0.82)',
      panelSoft: 'rgb(44, 22, 72)',
      border: 'rgba(255,110,200,0.28)',
      text: '#fbe9ff',
      textSoft: '#c1a0d8',
      accent: '#ff5fae',
      accent2: '#3fd2ff',
      shadow: 'rgba(0,0,0,0.55)',
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
    particleColor: '#e0822c',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #2a1a10 0%, #3a2414 50%, #1c1109 100%)',
      glowA: 'rgba(240,150,70,0.28)',
      glowB: 'rgba(180,90,40,0.30)',
      panel: 'rgba(46,30,20,0.82)',
      panelSoft: 'rgb(60, 40, 26)',
      border: 'rgba(220,150,80,0.26)',
      text: '#f6e6d2',
      textSoft: '#c8a888',
      accent: '#e2702a',
      accent2: '#d9a23a',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#eaf4ff',
    scene: 'moon',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #0e1a2c 0%, #16263f 50%, #081120 100%)',
      glowA: 'rgba(150,200,255,0.26)',
      glowB: 'rgba(100,140,210,0.28)',
      panel: 'rgba(18,32,52,0.82)',
      panelSoft: 'rgb(26, 44, 68)',
      border: 'rgba(150,190,235,0.24)',
      text: '#eaf3ff',
      textSoft: '#a3bad6',
      accent: '#6fb0f0',
      accent2: '#8ac6ff',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#fff4d6',
    scene: 'forest',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #0e2a1e 0%, #163a28 50%, #0a1f16 100%)',
      glowA: 'rgba(255,90,90,0.28)',
      glowB: 'rgba(255,210,120,0.3)',
      panel: 'rgba(20,46,34,0.82)',
      panelSoft: 'rgb(28, 58, 42)',
      border: 'rgba(220,180,120,0.25)',
      text: '#f3ecdc',
      textSoft: '#b6c9b6',
      accent: '#e8505b',
      accent2: '#ffce6a',
      shadow: 'rgba(0,0,0,0.45)',
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
    particleColor: '#ff9a3c',
    scene: 'moon',
    dark: true,
    vars: {
      bg: 'linear-gradient(165deg, #271433 0%, #3a1c20 55%, #160c1c 100%)',
      glowA: 'rgba(255,130,40,0.3)',
      glowB: 'rgba(150,80,200,0.3)',
      panel: 'rgba(40,22,46,0.82)',
      panelSoft: 'rgb(54, 30, 40)',
      border: 'rgba(255,150,70,0.25)',
      text: '#f6e7d6',
      textSoft: '#c4a890',
      accent: '#ff7a1a',
      accent2: '#a86cff',
      shadow: 'rgba(0,0,0,0.5)',
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
    particleColor: '#ff6a5a',
    scene: 'moon',
    dark: true,
    vars: {
      bg: 'linear-gradient(180deg, #170810 0%, #2a0d14 45%, #0c0407 100%)',
      glowA: 'rgba(255,70,60,0.30)',
      glowB: 'rgba(140,30,50,0.32)',
      panel: 'rgba(34,12,18,0.84)',
      panelSoft: 'rgb(50, 18, 26)',
      border: 'rgba(255,90,80,0.26)',
      text: '#ffe6e0',
      textSoft: '#d09c98',
      accent: '#ff5246',
      accent2: '#ffae57',
      shadow: 'rgba(0,0,0,0.6)',
    },
  },
]

export const DEFAULT_THEME_ID = 'mystic-forest'

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
