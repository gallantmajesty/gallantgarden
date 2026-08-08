import { create } from 'zustand'
import {
  DEFAULT_WEB_BG_ID,
  DEFAULT_WEB_THEME_ID,
  getWebTheme,
} from '../lib/webThemes'
import { useProfile } from './profile'
import { useMagnet } from './magnet'

// Persistent store for the user's Web Customization choice: which environment
// theme, which background within it, an optional custom accent, and an optional
// custom font (text) colour. Source of truth lives in localStorage for instant,
// flicker-free startup (the background must be known before first paint). App
// subscribes to this store and re-applies the theme vars + background on change.

interface WebThemeState {
  themeId: string
  bgId: string
  accent: string | null // null = use the theme's default accent
  fontColor: string | null // null = use the theme's default text colour
  bgBrightness: number // 0.2 to 2.0 (default 1)
  bgContrast: number // 0.2 to 2.0 (default 1)
  bgSaturation: number // 0.0 to 2.0 (default 1)
  /** background ids the player has bought (free ones are implicitly owned). */
  ownedBgIds: string[]
  setTheme: (id: string) => void
  setBackground: (bgId: string) => void
  setAccent: (hex: string | null) => void
  setFontColor: (hex: string | null) => void
  setBgBrightness: (val: number) => void
  setBgContrast: (val: number) => void
  setBgSaturation: (val: number) => void
  /** days with at least one focus session (drives theme unlocks). */
  focusDays: () => number
  /** true once focusDays reaches the theme's unlockFocusDays. */
  isThemeUnlocked: (themeId: string) => boolean
  /** true for free backgrounds + owned ones. */
  isBgOwned: (bgId: string) => boolean
  /** buy a background with green leaves. Returns true on success. */
  buyBackground: (bgId: string) => boolean
}

const KEY = 'sg.webtheme.v1'

interface Persisted {
  themeId: string
  bgId: string
  accent: string | null
  fontColor: string | null
  bgBrightness: number
  bgContrast: number
  bgSaturation: number
  ownedBgIds: string[]
}

function load(): Persisted {
  const fallback: Persisted = {
    themeId: DEFAULT_WEB_THEME_ID,
    bgId: DEFAULT_WEB_BG_ID,
    accent: null,
    fontColor: null,
    bgBrightness: 0.7,
    bgContrast: 1.6,
    bgSaturation: 2,
    ownedBgIds: [],
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw) as Partial<Persisted>
    const theme = getWebTheme(p.themeId ?? fallback.themeId)
    // make sure the saved background still belongs to the saved theme
    const bgOk = theme.backgrounds.some((b) => b.id === p.bgId)
    return {
      themeId: theme.id,
      bgId: bgOk ? (p.bgId as string) : theme.backgrounds[0].id,
      accent: p.accent ?? null,
      fontColor: p.fontColor ?? null,
      bgBrightness: typeof p.bgBrightness === 'number' && Number.isFinite(p.bgBrightness) ? p.bgBrightness : 0.7,
      bgContrast: typeof p.bgContrast === 'number' && Number.isFinite(p.bgContrast) ? p.bgContrast : 1.6,
      bgSaturation: typeof p.bgSaturation === 'number' && Number.isFinite(p.bgSaturation) ? p.bgSaturation : 2,
      ownedBgIds: Array.isArray(p.ownedBgIds) ? p.ownedBgIds : [],
    }
  } catch {
    return fallback
  }
}

function save(s: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage full / blocked — ignore */
  }
}

/** Count days with at least one recorded focus session (magnet focus log is
 *  the single source of truth for completed focus, per "focus sessions count"). */
export function countFocusDays(): number {
  try {
    const focus = useMagnet.getState().data?.focus ?? []
    return new Set(focus.map((f) => f.date)).size
  } catch {
    return 0
  }
}

export const useWebTheme = create<WebThemeState>((set, get) => {
  const init = load()
  const persist = () => {
    const { themeId, bgId, accent, fontColor, bgBrightness, bgContrast, bgSaturation, ownedBgIds } = get()
    save({ themeId, bgId, accent, fontColor, bgBrightness, bgContrast, bgSaturation, ownedBgIds })
  }
  return {
    ...init,
    focusDays: countFocusDays,
    isThemeUnlocked: (themeId) => {
      const theme = getWebTheme(themeId)
      return countFocusDays() >= theme.unlockFocusDays
    },
    isBgOwned: (bgId) => {
      const theme = getWebTheme(get().themeId)
      const bg = theme.backgrounds.find((b) => b.id === bgId)
      if (!bg) return true
      if (!bg.leafPrice) return true
      return get().ownedBgIds.includes(bgId)
    },
    buyBackground: (bgId) => {
      const theme = getWebTheme(get().themeId)
      const bg = theme.backgrounds.find((b) => b.id === bgId)
      if (!bg || !bg.leafPrice) return false
      if (get().ownedBgIds.includes(bgId)) return true
      const xp = useProfile.getState().xp
      if (xp < bg.leafPrice) return false
      // deduct leaves (rank is never demoted — the wallet drop is the spend)
      useProfile.getState().applyXp({ leaves: -bg.leafPrice, rankXp: 0 })
      set({ ownedBgIds: [...get().ownedBgIds, bgId] })
      persist()
      return true
    },
    setTheme: (id) => {
      const theme = getWebTheme(id)
      // switching theme resets to that theme's first background; drop any
      // custom accent so the new theme's curated palette reads cleanly. The
      // font colour is kept — it's a readability preference, not a theme flavour.
      const patch: Partial<WebThemeState> = { themeId: theme.id, bgId: theme.backgrounds[0].id, accent: null }
      const bg = theme.backgrounds[0]
      if (bg.filter) {
        patch.bgBrightness = bg.filter.brightness
        patch.bgContrast = bg.filter.contrast
        patch.bgSaturation = bg.filter.saturation
      }
      set(patch)
      persist()
    },
    setBackground: (bgId) => {
      const theme = getWebTheme(get().themeId)
      const bg = theme.backgrounds.find((b) => b.id === bgId)
      // a background can define its own default appearance; applying it keeps
      // each background looking as designed until the player tunes it.
      const patch: Partial<WebThemeState> = { bgId }
      if (bg?.filter) {
        patch.bgBrightness = bg.filter.brightness
        patch.bgContrast = bg.filter.contrast
        patch.bgSaturation = bg.filter.saturation
      }
      set(patch)
      persist()
    },
    setAccent: (hex) => {
      set({ accent: hex })
      persist()
    },
    setFontColor: (hex) => {
      set({ fontColor: hex })
      persist()
    },
    setBgBrightness: (val) => {
      set({ bgBrightness: val })
      persist()
    },
    setBgContrast: (val) => {
      set({ bgContrast: val })
      persist()
    },
    setBgSaturation: (val) => {
      set({ bgSaturation: val })
      persist()
    },
  }
})

/** Read the persisted theme synchronously (before React mounts) so the very
 *  first paint already has the right background — no default-then-swap flash. */
export function initialWebTheme(): Persisted {
  return load()
}
