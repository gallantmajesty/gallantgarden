import { create } from 'zustand'

export type Quality = 'low' | 'medium' | 'high'
export type CameraMode = 'first' | 'third' | 'front'
export type Weather = 'clear' | 'light-rain' | 'heavy-rain' | 'fog'

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
  // graphics
  quality: Quality
  cinematic: boolean // bloom + fog (can disable for perf)
  fps: boolean
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
}

const KEY = 'sg.settings.v2'

function load(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Partial<SettingsState>) : {}
  } catch {
    return {}
  }
}

const DEFAULTS: Omit<SettingsState, 'set' | 'setPomo'> = {
  quality: 'medium', // smooth by default (bloom + shadows on); High is opt-in
  cinematic: true,
  fps: false,
  cameraMode: 'first',
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
  const persist = () => {
    const s = get()
    const { set: _s, setPomo: _p, ...data } = s
    void _s
    void _p
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* storage full / blocked — ignore */
    }
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
  }
})
