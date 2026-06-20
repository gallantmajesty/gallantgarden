import { create } from 'zustand'
import { patchProfileSettings } from '../lib/profileStore'

export type Quality = 'low' | 'medium' | 'high'
export type CameraMode = 'first' | 'third' | 'front'
export type Weather = 'clear' | 'light-rain' | 'heavy-rain' | 'fog'
export type Theme = 'light' | 'dark'
export type ThemePreset = 'forest' | 'dusk' | 'sakura' | 'ocean'

/** Theme presets shift the app's accent hue. Applied as CSS custom properties on
 *  <html> by applyVisualSettings(), so they cascade across the whole UI. */
export interface ThemePresetDef {
  id: ThemePreset
  label: string
  accent: string
  accentDark: string
}
export const THEME_PRESETS: ThemePresetDef[] = [
  { id: 'forest', label: 'Forest', accent: '#ffce54', accentDark: '#e6a817' },
  { id: 'dusk', label: 'Dusk', accent: '#b98cff', accentDark: '#7a52d6' },
  { id: 'sakura', label: 'Sakura', accent: '#ff9ec4', accentDark: '#e0699b' },
  { id: 'ocean', label: 'Ocean', accent: '#5ec6e6', accentDark: '#2a90b8' },
]

export const MIN_BRIGHTNESS = 0.6
export const MAX_BRIGHTNESS = 1.4

/** Per-quality feature flags read by the scene to scale work to the device.
 *  Tuned for smooth FPS: lower DPR, smaller shadow maps, fewer particles and a
 *  hard cap on real point-lights (the single biggest WebGL cost). Lanterns &
 *  sconces glow via emissive + bloom instead of each being a real light.
 *
 *  PERFORMANCE PASS (FPS-first): real-time lights and per-mesh ornament are the
 *  two dominant costs on an integrated laptop GPU, so below `high` we shed both —
 *  fewer point-lights, and ornamental sub-meshes (pillar rings, window tracery,
 *  chandelier bulbs, distant peaks/clouds) drop out. `high` keeps full fidelity.
 *  DPR is also auto-scaled at runtime by the PerformanceMonitor in LibraryScene,
 *  so these dpr values are the *ceiling*, not a fixed cost. */
export interface QualityPreset {
  shadows: boolean
  shadowMap: number // directional shadow map resolution (0 = off)
  bloom: boolean
  dust: number // floating-mote particle count (0 = off)
  particles: boolean
  rainScale: number
  rainDrops: number // rain drops per side
  forest: number // exterior pine count
  lampLights: number // how many desk lamps cast a real point-light
  grandLights: number // how many of the 4 grand lanterns cast a real light
  treeLight: boolean // the Knowledge Tree's warm point-light
  mountains: number // distant peak count
  clouds: number // drifting cloud count
  pillarDetail: boolean // carved rings/astragals on the pillars
  windowDetail: boolean // molded arches, keystone & oculus on each window bay
  dpr: number // device-pixel-ratio ceiling
}

export const QUALITY_PRESET: Record<Quality, QualityPreset> = {
  low:    { shadows: false, shadowMap: 0,    bloom: false, dust: 0,  particles: false, rainScale: 0.3, rainDrops: 50,  forest: 35,  lampLights: 0, grandLights: 0, treeLight: false, mountains: 18, clouds: 4, pillarDetail: false, windowDetail: false, dpr: 1.0 },
  medium: { shadows: true,  shadowMap: 1024, bloom: true,  dust: 16, particles: true,  rainScale: 0.6, rainDrops: 90,  forest: 80,  lampLights: 0, grandLights: 0, treeLight: true,  mountains: 26, clouds: 6, pillarDetail: false, windowDetail: false, dpr: 1.25 },
  high:   { shadows: true,  shadowMap: 2048, bloom: true,  dust: 60, particles: true,  rainScale: 1,   rainDrops: 200, forest: 200, lampLights: 4, grandLights: 4, treeLight: true,  mountains: 40, clouds: 9, pillarDetail: true,  windowDetail: true,  dpr: 2.0 },
}

export interface PomodoroSettings {
  study: number // minutes
  break: number
  longBreak: number
  autoStart: boolean
  sound: boolean
  showTimer: boolean
}

// Focus sessions can run long — some students study in 6–8h blocks. Recommended
// presets stay quick to pick, but Custom lets the duration go all the way up to
// MAX_FOCUS_MIN so the timer never forces an artificially short session.
export const FOCUS_PRESETS = [25, 45, 60, 90, 120, 180] as const
export const MAX_FOCUS_MIN = 480 // 8 hours
export const MIN_FOCUS_MIN = 5

interface SettingsState {
  // visual
  theme: Theme
  brightness: number // MIN_BRIGHTNESS .. MAX_BRIGHTNESS multiplier
  themePreset: ThemePreset
  // graphics / performance
  quality: Quality
  cinematic: boolean // bloom + fog (can disable for perf)
  fps: boolean
  animations: boolean // master switch for non-essential UI animation
  reduceMotion: boolean // accessibility: minimise motion app-wide
  // camera
  cameraMode: CameraMode
  sensitivity: number // 0.2 .. 2
  invertY: boolean
  // audio (0..1)
  master: number
  ambientVol: number
  rainVol: number
  ambientOn: boolean
  rainOn: boolean
  // weather / time
  weather: Weather
  weatherAuto: boolean
  timeSpeed: number // full-cycle multiplier
  timePaused: boolean
  // pomodoro
  pomo: PomodoroSettings

  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  setPomo: (patch: Partial<PomodoroSettings>) => void
  // cloud sync (per-user)
  hydrateFromCloud: (appSettings: unknown) => void
  bindCloud: (userId: string) => void
  unbindCloud: () => void
}

const KEY = 'sg.settings.v2'

/** Keys that are persisted (everything except the action functions). */
type SettingsData = Omit<
  SettingsState,
  'set' | 'setPomo' | 'hydrateFromCloud' | 'bindCloud' | 'unbindCloud'
>

function dataOf(s: SettingsState): SettingsData {
  const {
    set: _set,
    setPomo: _setPomo,
    hydrateFromCloud: _h,
    bindCloud: _b,
    unbindCloud: _u,
    ...data
  } = s
  void _set
  void _setPomo
  void _h
  void _b
  void _u
  return data
}

// ---- per-user cloud sync state (module-scoped; one active user at a time) ----
let cloudUserId: string | null = null
let cloudTimer: ReturnType<typeof setTimeout> | null = null

function scheduleCloudPush(data: SettingsData) {
  if (!cloudUserId) return // not signed in / not bound yet — local only
  if (cloudTimer) clearTimeout(cloudTimer)
  cloudTimer = setTimeout(() => {
    const uid = cloudUserId
    cloudTimer = null
    if (uid) void patchProfileSettings(uid, { app: data })
  }, 800) // debounce: settings sliders fire rapidly
}

function load(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Partial<SettingsState>) : {}
  } catch {
    return {}
  }
}

const DEFAULTS: SettingsData = {
  theme: 'light',
  brightness: 1,
  themePreset: 'forest',
  quality: 'medium', // smooth by default (bloom + shadows on); High is opt-in
  cinematic: true,
  fps: false,
  animations: true,
  reduceMotion: false,
  cameraMode: 'third', // see your chosen character by default (Roblox-style)
  sensitivity: 1,
  invertY: false,
  master: 0.8,
  ambientVol: 0.6,
  rainVol: 0.7,
  ambientOn: false,
  rainOn: true,
  weather: 'light-rain',
  weatherAuto: true,
  timeSpeed: 1,
  timePaused: false,
  pomo: { study: 25, break: 5, longBreak: 15, autoStart: false, sound: true, showTimer: true },
}

export const useSettings = create<SettingsState>((set, get) => {
  const saved = load()
  /** Write to localStorage (instant, per-device) and schedule a debounced cloud
   *  push (per-user, cross-device). localStorage stays the source of truth for
   *  fast startup; the cloud copy keeps settings in sync across devices. */
  const persist = () => {
    const data = dataOf(get())
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* storage full / blocked — ignore */
    }
    scheduleCloudPush(data)
  }

  return {
    ...DEFAULTS,
    ...saved,
    pomo: { ...DEFAULTS.pomo, ...(saved.pomo ?? {}) },

    set: (key, value) => {
      set({ [key]: value } as Pick<SettingsState, typeof key>)
      persist()
    },
    setPomo: (patch) => {
      set((s) => ({ pomo: { ...s.pomo, ...patch } }))
      persist()
    },

    // Merge a user's saved cloud settings into the store. Called during app init
    // BEFORE bindCloud(), so it writes localStorage but does not echo back to the
    // cloud. Unknown keys are ignored; pomo is merged onto defaults.
    hydrateFromCloud: (appSettings) => {
      if (!appSettings || typeof appSettings !== 'object') return
      const incoming = appSettings as Partial<SettingsData>
      set((s) => ({
        ...incoming,
        pomo: { ...DEFAULTS.pomo, ...s.pomo, ...(incoming.pomo ?? {}) },
      }))
      try {
        localStorage.setItem(KEY, JSON.stringify(dataOf(get())))
      } catch {
        /* ignore */
      }
    },

    bindCloud: (userId) => {
      cloudUserId = userId
    },
    unbindCloud: () => {
      cloudUserId = null
      if (cloudTimer) {
        clearTimeout(cloudTimer)
        cloudTimer = null
      }
    },
  }
})

/** Apply the visual/motion settings to <html> as data attributes + CSS vars so
 *  the whole app (and the document background) reacts. Pure DOM, no React. */
export function applyVisualSettings(
  s: Pick<SettingsState, 'theme' | 'brightness' | 'themePreset' | 'reduceMotion' | 'animations'>,
): void {
  const el = document.documentElement
  el.dataset.theme = s.theme
  el.dataset.preset = s.themePreset
  el.dataset.reduceMotion = String(s.reduceMotion)
  el.dataset.animations = s.animations ? 'on' : 'off'
  el.style.setProperty('--app-brightness', String(s.brightness))
  el.style.colorScheme = s.theme
  const preset = THEME_PRESETS.find((p) => p.id === s.themePreset)
  if (preset) {
    el.style.setProperty('--accent', preset.accent)
    el.style.setProperty('--accent-dark', preset.accentDark)
  }
}

/** A plain, persistable snapshot of the current settings (no action functions).
 *  Used by the init system to seed a new user's cloud profile. */
export function snapshotSettings(): SettingsData {
  return dataOf(useSettings.getState())
}
