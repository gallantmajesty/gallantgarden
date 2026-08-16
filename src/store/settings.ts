import { create } from 'zustand'
import { patchProfileSettings } from '../lib/profileStore'

export type Quality = 'low' | 'medium' | 'high' | 'custom'
/** The three named presets that can seed all the granular axes at once. */
export type QualityPresetName = 'low' | 'medium' | 'high'
export type ShadowQuality = 'off' | 'low' | 'high'
export type PostQuality = 'off' | 'low' | 'high'
export type TextureQuality = 'low' | 'medium' | 'high'
export type CameraMode = 'first' | 'third'
export type Weather = 'clear' | 'light-rain' | 'heavy-rain' | 'fog'
export type Theme = 'light' | 'dark'
export type ThemePreset = 'forest' | 'dusk' | 'ocean'

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

export const QUALITY_PRESET: Record<QualityPresetName, QualityPreset> = {
  low:    { shadows: false, shadowMap: 0,    bloom: false, dust: 0,  particles: false, rainScale: 0.3, rainDrops: 50,  forest: 35,  lampLights: 0, grandLights: 0, treeLight: false, mountains: 18, clouds: 4, pillarDetail: false, windowDetail: false, dpr: 1.0 },
  medium: { shadows: true,  shadowMap: 1024, bloom: true,  dust: 12, particles: true,  rainScale: 0.6, rainDrops: 90,  forest: 80,  lampLights: 0, grandLights: 0, treeLight: true,  mountains: 26, clouds: 6, pillarDetail: false, windowDetail: false, dpr: 1.25 },
  // PERF: grand lanterns & desk lamps no longer cast real point-lights at any tier
  // (they read identically via emissive + bloom). Only 3 hero lights remain in the
  // hall — the centre lantern, the fireplace and the knowledge tree — so the
  // forward renderer evaluates ~5 lights/fragment instead of ~13. dpr ceiling 1.5.
  high:   { shadows: true,  shadowMap: 2048, bloom: true,  dust: 24, particles: true,  rainScale: 1,   rainDrops: 200, forest: 200, lampLights: 0, grandLights: 0, treeLight: true,  mountains: 40, clouds: 9, pillarDetail: true,  windowDetail: true,  dpr: 1.5 },
}

/* -------------------------------------------------------------------------- */
/* Granular quality axes                                                       */
/* -------------------------------------------------------------------------- */
//
// The scene used to read a single named preset (Quality = low/medium/high). The
// settings menu now exposes six independent axes (resolution, view distance,
// shadows, post-processing, textures, mesh LOD) so the user can fine-tune the
// FPS/looks trade-off. The named presets still exist — picking one seeds all six
// axes at once (QUALITY_AXES); changing any single axis flips Quality to
// 'custom'. `scenePreset()` collapses the six axes back into the concrete
// QualityPreset-style object the 3D components consume, so nothing downstream had
// to learn about the axes individually.

/** The six tunable axes. Held flat on the settings state and persisted. */
export interface QualityAxes {
  resolutionScale: number // 0.5 .. 1   — device-pixel-ratio multiplier
  viewDistance: number // 0.6 .. 1   — far plane + exterior detail + fog reach
  shadowQuality: ShadowQuality
  postProcessing: PostQuality
  textureQuality: TextureQuality
  lodBias: number // 0 .. 1.5   — higher sheds ornament/particles sooner
  /** 0 .. 1.5 — higher swaps distant players/NPCs to the cheap 2D billboard
   *  sooner (stronger sprite LOD). 0 = swap at the default distance. */
  impostorLod: number
  /** When ON (default) the realm opens at Low quality for a fast settle, then
   *  auto-detects the device and steps up to a fitting tier. Optional on preset
   *  bundles (only DEFAULT_AXES carries it — the user toggle lives on SettingsState). */
  autoQuality?: boolean
}

/** Named presets, expressed as axis bundles. Reproduces the old low/medium/high
 *  look (see scenePreset reproduction below). */
export const QUALITY_AXES: Record<QualityPresetName, QualityAxes> = {
  // Low keeps the scene's look intact (fog + mood preserved): the savings come
  // from resolution, shadows off and low textures — NOT from culling the
  // signature Knowledge Tree or blurring nearby players into billboards.
  // (postProcessing was 'off' when the UI still offered an Off row; that option
  // is gone, so the preset seeds the lowest selectable tier instead.)
  low:    { resolutionScale: 0.7,  viewDistance: 0.6, shadowQuality: 'off',  postProcessing: 'low',  textureQuality: 'low',    lodBias: 1.0,   impostorLod: 0.75 },
  medium: { resolutionScale: 0.85, viewDistance: 0.8, shadowQuality: 'low',  postProcessing: 'low',  textureQuality: 'medium', lodBias: 0.75,  impostorLod: 0.75 },
  high:   { resolutionScale: 1,    viewDistance: 1,   shadowQuality: 'high', postProcessing: 'high', textureQuality: 'high',   lodBias: 0,     impostorLod: 0 },
}

/** Applied on top of the user's axes while the transient Performance Mode
 *  (Ctrl+F) is active — never persisted, instantly reverted on release. */
export const PERF_OVERRIDE: QualityAxes = {
  resolutionScale: 0.7,
  viewDistance: 0.6,
  shadowQuality: 'low',
  postProcessing: 'low',
  textureQuality: 'medium',
  lodBias: 1.5,
  impostorLod: 1.5,
}

const SHADOW_MAP: Record<ShadowQuality, number> = { off: 0, low: 1024, high: 2048 }
const ANISO_LEVEL: Record<TextureQuality, number> = { low: 1, medium: 4, high: 16 }
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** The concrete per-frame budget the scene reads. Superset of QualityPreset with
 *  the extra runtime axes (far plane, texture anisotropy, raw LOD bias). */
export interface ScenePreset extends QualityPreset {
  fog: boolean // distance fog (folded out of the old `cinematic` flag)
  far: number // camera far plane
  anisotropy: number // texture anisotropic-filtering level
  lodBias: number
  /** Sprite-swap distance multiplier for far players/NPCs: 1 at impostorLod 0,
   *  ~0.14 at impostorLod 1.5 — stronger swaps bodies to the 2D billboard sooner. */
  impostorSwap: number
  /** Opt-in heavy post-FX (SSAO + DoF + god rays). Off by default; for strong
   *  GPUs that accept lower FPS. Forced off while Performance Mode is active. */
  ultra: boolean
}

/** Collapse the six axes (optionally with the Performance-Mode override) into the
 *  object the 3D components consume. Pure — safe to call in render/useMemo.
 *  `ultra` enables the opt-in heavy post-FX tier (ignored under Performance Mode). */
export function scenePreset(axes: QualityAxes, perfMode: boolean, ultra = false): ScenePreset {
  const a = perfMode ? PERF_OVERRIDE : axes
  const vd = clamp01((a.viewDistance - 0.6) / 0.4) // 0 at 0.6 … 1 at 1.0
  const lod = a.lodBias
  const post = a.postProcessing
  const detail = Math.max(0, 1 - lod / 1.5) // 1 at lod0 … 0 at lod1.5
  return {
    shadows: a.shadowQuality !== 'off',
    shadowMap: SHADOW_MAP[a.shadowQuality],
    bloom: post !== 'off',
    fog: post !== 'off',
    // PERF: dust motes are large blended (transparent) sprites spanning the whole
    // hall volume — pure overdraw. Capped low (16 at full detail) so they read as
    // atmosphere without dominating fill-rate.
    dust: Math.round(16 * detail),
    particles: post !== 'off' && detail > 0,
    // PERF (exterior-only, interior look identical): rain, pines, peaks and
    // clouds are all BEHIND the glazing — visible only through the windows — so
    // their counts are trimmed without touching anything inside the hall.
    rainScale: 0.3 + 0.7 * vd,
    rainDrops: Math.round(40 + 110 * vd),
    forest: Math.round(35 + 120 * vd),
    mountains: Math.round(18 + 16 * vd),
    clouds: Math.round(4 + 4 * vd),
    // PERF: real point-lights are the dominant forward-render cost. The grand
    // lanterns and desk lamps glow via emissive + bloom and read identically, so
    // none of them cast a real light — only the 3 hero lights remain.
    lampLights: 0,
    grandLights: 0,
    treeLight: a.shadowQuality !== 'off' || post !== 'off',
    pillarDetail: lod < 0.5,
    windowDetail: lod < 0.75,
    // dpr maps resolutionScale (0.5–1.0) to a real canvas DPR. Below 1.0 the
    // scene renders fewer pixels → faster frame rate on weak GPUs. Above 1.0 is
    // clamped to avoid frame-buffer blowout on high-DPR screens.
    dpr: Math.min(1.5, Math.max(0.5, Math.round(a.resolutionScale * 100) / 100)),
    far: Math.round(700 + 700 * vd),
    anisotropy: ANISO_LEVEL[a.textureQuality],
    lodBias: lod,
    // impostorLod 0 → 1.0 (default swap distance); 1.5 → 0.14 (bodies become
    // billboards within ~2 m — max FPS at the cost of up-close sprite blur).
    impostorSwap: 1 / (1 + 4 * a.impostorLod),
    ultra: ultra && !perfMode,
  }
}

export interface PomodoroSettings {
  study: number // minutes
  break: number
  longBreak: number
  autoStart: boolean
  sound: boolean
  chimeVolume: number // 0..1
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
  // graphics / performance — `quality` is the named preset selector ('custom'
  // once any individual axis is hand-tuned); the six axes below are the truth.
  quality: Quality
  resolutionScale: number
  viewDistance: number
  shadowQuality: ShadowQuality
  postProcessing: PostQuality
  textureQuality: TextureQuality
  lodBias: number
  /** Stronger sprite LOD: higher swaps distant players/NPCs to 2D billboards
   *  sooner (see QualityAxes.impostorLod — mirrored flat for the settings UI). */
  impostorLod: number
  /** When ON (default) the realm opens at Low quality for a fast settle, then
   *  auto-detects the device and steps up to a fitting tier. Turn OFF to take
   *  full manual control of the six quality axes. */
  autoQuality?: boolean
  /** Opt-in heavy post-FX (SSAO + DoF + god rays). Default off; separate from the
   *  six axes so toggling it never reshuffles the named-preset selector. */
  ultra: boolean
  fps: boolean
  animations: boolean // master switch for non-essential UI animation
  reduceMotion: boolean // accessibility: minimise motion app-wide
  highContrast: boolean // accessibility: high contrast mode
  // camera
  cameraMode: CameraMode
  sensitivity: number // 0.2 .. 2
  invertY: boolean
  hideAvatarWhenMovingCamera: boolean
  // cinematic tour (key 5)
  cinematicTour: boolean // master switch for the Cinematic Tour (key 5)
  cinematicZoom: boolean // let the cinematic camera dolly-zoom between waypoints
  bloom: boolean // bloom effect (only ever shows during the cinematic tour)
  nightMode: boolean // instant day/night mood switch for the library realm
  /** When ON, player name tags always show full info (name + rank).
   *  When OFF (default), only the country flag is shown; tap to expand. */
  showAllUserInfo: boolean
  // ── 100-player / self-serve performance toggles ────────────────────────────
  /** Master on/off for player name tags + timer bars in the 3D realm. */
  showNameTags: boolean
  /** When OFF (default), name tags + timer bars are hidden for distant players
   *  (they've swapped to 2D sprites) and only shown for the nearest players —
   *  a big CPU/DOM saving at 100 players. Turn ON to keep every tag visible. */
  distantTags: boolean
  /** Swap distant players to a baked 2D billboard and unmount their full 3D body
   *  (1 draw call vs ~110 meshes). ON by default. Turn OFF to always render full
   *  3D avatars (heavier, but maximal fidelity at every distance). */
  impostorSprites: boolean
  /** Pause the render loop entirely while the browser tab is hidden, then resume
   *  instantly on focus — saves GPU/battery. ON by default. */
  pauseWhenHidden: boolean
  // lobby
  waitForLobbyReady: boolean // keep intro veil until lobby icons are loaded
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
  // keep awake
  keepAwake: boolean

  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  setPomo: (patch: Partial<PomodoroSettings>) => void
  /** Seed all six quality axes from a named preset (and set quality to it). */
  applyQualityPreset: (preset: QualityPresetName) => void
  /** Set one quality axis and flip `quality` to 'custom'. */
  setQualityAxis: <K extends keyof QualityAxes>(key: K, value: QualityAxes[K]) => void
  /** Set all six quality axes at once (used to restore a manual choice) and flip
   *  `quality` to 'custom'. */
  setQualityAxes: (axes: QualityAxes) => void
  // cloud sync (per-user)
  hydrateFromCloud: (appSettings: unknown) => void
  bindCloud: (userId: string) => void
  unbindCloud: () => void
}

const KEY = 'sg.settings.v2'

/** Keys that are persisted (everything except the action functions). */
type SettingsData = Omit<
  SettingsState,
  | 'set'
  | 'setPomo'
  | 'applyQualityPreset'
  | 'setQualityAxis'
  | 'setQualityAxes'
  | 'hydrateFromCloud'
  | 'bindCloud'
  | 'unbindCloud'
>

function dataOf(s: SettingsState): SettingsData {
  const {
    set: _set,
    setPomo: _setPomo,
    applyQualityPreset: _aqp,
    setQualityAxis: _sqa,
    hydrateFromCloud: _h,
    bindCloud: _b,
    unbindCloud: _u,
    ...data
  } = s
  void _set
  void _setPomo
  void _aqp
  void _sqa
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

/** The starting graphics axes for every user (High preset — tuned for a good
 *  looks/FPS balance out of the box; fully editable in Settings afterwards).
 *  Overall quality reads 'High' and ultra effects are ON by default; the user
 *  can lower everything themselves later. */
export const DEFAULT_AXES: QualityAxes = {
  resolutionScale: 1,
  viewDistance: 1,
  shadowQuality: 'high',
  postProcessing: 'high', // bloom + fog on, full strength
  // 'high' = anisotropy 16. Aniso has a one-time cost only; 'low' (aniso 1) was the
  // chief cause of the "blurry textures" report on the procedural floor/walls/glass.
  textureQuality: 'high',
  lodBias: 0,
  impostorLod: 0, // default swap distance — distant players keep full 3D bodies longer
  autoQuality: true, // realms open Low then auto-step up by default
}

/** Apply the default axes to any settings saved before the axes existed (named
 *  `quality` but no axis fields). Gives every existing user the new baseline
 *  exactly once; no-op once the axes are present (the user has since tuned them).
 *  Also flips `quality` to 'custom' so the label matches the axes. */
function migrateQualityAxes(data: Partial<SettingsData>): Partial<SettingsData> {
  if (data.resolutionScale !== undefined) return {} // already on the new format
  return { ...DEFAULT_AXES, quality: 'custom' }
}

const DEFAULTS: SettingsData = {
  theme: 'light',
  brightness: 1,
  themePreset: 'forest',
  quality: 'high', // High preset — DEFAULT_AXES below matches it
  ...DEFAULT_AXES, // resolutionScale / viewDistance / shadow / post / texture / lodBias
  ultra: true, // heavy post-FX tier — ON by default
  fps: false,
  animations: true,
  reduceMotion: false,
  highContrast: false,
  cameraMode: 'third', // see your chosen character by default (Roblox-style)
  sensitivity: 1,
  invertY: false,
  hideAvatarWhenMovingCamera: false,
  cinematicTour: true,
  cinematicZoom: true,
bloom: true,
   nightMode: true, // default ON = Harry-Potter night mood; user can toggle in Settings
   waitForLobbyReady: true,
  master: 0.8,
  ambientVol: 0.6,
  rainVol: 0.7,
  ambientOn: false,
  rainOn: true,
  weather: 'light-rain',
  weatherAuto: true,
  timeSpeed: 1,
  timePaused: false,
  pomo: { study: 25, break: 5, longBreak: 15, autoStart: false, sound: true, chimeVolume: 0.5, showTimer: true },
  showAllUserInfo: false,
  showNameTags: true,
  distantTags: false,
  impostorSprites: true,
  pauseWhenHidden: true,
  keepAwake: true,
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
    ...migrateQualityAxes(saved),
    pomo: { ...DEFAULTS.pomo, ...(saved.pomo ?? {}) },

    set: (key, value) => {
      set({ [key]: value } as Pick<SettingsState, typeof key>)
      persist()
    },
    setPomo: (patch) => {
      set((s) => ({ pomo: { ...s.pomo, ...patch } }))
      persist()
    },

    applyQualityPreset: (preset) => {
      set({ quality: preset, ...QUALITY_AXES[preset] })
      persist()
    },
    setQualityAxis: (key, value) => {
      set({ [key]: value, quality: 'custom' } as Pick<SettingsState, typeof key | 'quality'>)
      persist()
    },

    setQualityAxes: (axes) => {
      set({ ...axes, quality: 'custom' })
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
        ...migrateQualityAxes(incoming),
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
  s: Pick<SettingsState, 'theme' | 'brightness' | 'themePreset' | 'reduceMotion' | 'animations' | 'highContrast'>,
): void {
  const el = document.documentElement
  el.dataset.theme = s.theme
  el.dataset.preset = s.themePreset
  el.dataset.reduceMotion = String(s.reduceMotion)
  el.dataset.animations = s.animations ? 'on' : 'off'
  el.dataset.highContrast = String(s.highContrast)
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
