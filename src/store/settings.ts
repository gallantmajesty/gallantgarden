import { create } from 'zustand'

export type Quality = 'low' | 'medium' | 'high'
export type CameraMode = 'first' | 'third' | 'front'
export type Weather = 'clear' | 'light-rain' | 'heavy-rain' | 'fog'

/** Per-quality feature flags read by the scene to scale work to the device.
 *  Tuned for smooth FPS: lower DPR, smaller shadow maps, fewer particles and a
 *  hard cap on real point-lights (the single biggest WebGL cost). Lanterns &
 *  sconces glow via emissive + bloom instead of each being a real light. */
export const QUALITY_PRESET: Record<
  Quality,
  {
    shadows: boolean
    shadowMap: number // directional shadow map resolution
    bloom: boolean
    godRays: boolean
    dust: number
    particles: boolean
    rainScale: number
    rainDrops: number // drops per side
    forest: number
    lampLights: number // how many desk lamps cast a real point-light
    dpr: number
    viewDistance: number
  }
> = {
  low: { shadows: false, shadowMap: 0, bloom: false, godRays: false, dust: 0, particles: false, rainScale: 0.35, rainDrops: 90, forest: 50, lampLights: 0, dpr: 1, viewDistance: 150 },
  medium: { shadows: true, shadowMap: 1024, bloom: true, godRays: false, dust: 40, particles: true, rainScale: 0.7, rainDrops: 160, forest: 120, lampLights: 3, dpr: 1.2, viewDistance: 400 },
  high: { shadows: true, shadowMap: 1536, bloom: true, godRays: false, dust: 80, particles: true, rainScale: 1, rainDrops: 240, forest: 220, lampLights: 6, dpr: 1.5, viewDistance: 1400 },
}

export interface PomodoroSettings {
  study: number // minutes
  break: number
  longBreak: number
  autoStart: boolean
  sound: boolean
  showTimer: boolean
}

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
