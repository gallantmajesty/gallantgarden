import { create } from 'zustand'
import {
  DEFAULT_WEB_BG_ID,
  DEFAULT_WEB_THEME_ID,
  getWebTheme,
} from '../lib/webThemes'

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
  setTheme: (id: string) => void
  setBackground: (bgId: string) => void
  setAccent: (hex: string | null) => void
  setFontColor: (hex: string | null) => void
}

const KEY = 'sg.webtheme.v1'

interface Persisted {
  themeId: string
  bgId: string
  accent: string | null
  fontColor: string | null
}

function load(): Persisted {
  const fallback: Persisted = {
    themeId: DEFAULT_WEB_THEME_ID,
    bgId: DEFAULT_WEB_BG_ID,
    accent: null,
    fontColor: null,
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

export const useWebTheme = create<WebThemeState>((set, get) => {
  const init = load()
  const persist = () => {
    const { themeId, bgId, accent, fontColor } = get()
    save({ themeId, bgId, accent, fontColor })
  }
  return {
    ...init,
    setTheme: (id) => {
      const theme = getWebTheme(id)
      // switching theme resets to that theme's first background; drop any
      // custom accent so the new theme's curated palette reads cleanly. The
      // font colour is kept — it's a readability preference, not a theme flavour.
      set({ themeId: theme.id, bgId: theme.backgrounds[0].id, accent: null })
      persist()
    },
    setBackground: (bgId) => {
      set({ bgId })
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
  }
})

/** Read the persisted theme synchronously (before React mounts) so the very
 *  first paint already has the right background — no default-then-swap flash. */
export function initialWebTheme(): Persisted {
  return load()
}
