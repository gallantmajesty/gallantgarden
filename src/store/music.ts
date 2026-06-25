import { create } from 'zustand'
import { getMusic } from '../lib/music/engine'
import {
  MUSIC_PRESETS,
  adjacentAvailable,
  firstAvailablePreset,
  getPreset,
} from '../lib/music/presets'

// Persistent state for the Library Realm music widget. Saves the user's choice
// and view state to localStorage (manual load/save, mirroring src/store/webTheme.ts)
// so the player comes back exactly as they left it. Actions drive the app-wide
// engine via getMusic(); the engine owns actual playback (see lib/music/engine.ts).
//
// "Playback state" is persisted as INTENT only — browsers block autoplay, so we
// never start sound on load. `resumeFromGesture()` restarts it on the first user
// interaction if they had it playing (same approach as src/audio/useAudio.ts).

export interface WidgetPos {
  x: number
  y: number
}

interface MusicStore {
  presetId: string
  volume: number // 0..1
  playing: boolean
  expanded: boolean
  pos: WidgetPos | null // null = default bottom-right corner
  /** Select a preset and start it (one-click play). No-op for "soon" presets. */
  select: (id: string) => void
  /** Play/pause the current preset. */
  toggle: () => void
  next: () => void
  prev: () => void
  setVolume: (v: number) => void
  setExpanded: (v: boolean) => void
  setPos: (p: WidgetPos) => void
  /** Resume playback on first gesture if it was playing when last saved. */
  resumeFromGesture: () => void
}

const KEY = 'sg.music.v1'

interface Persisted {
  presetId: string
  volume: number
  playing: boolean
  expanded: boolean
  pos: WidgetPos | null
}

function load(): Persisted {
  const fallback: Persisted = {
    presetId: firstAvailablePreset().id,
    volume: 0.7,
    playing: false,
    expanded: false,
    pos: null,
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw) as Partial<Persisted>
    const preset = getPreset(p.presetId)
    return {
      presetId: preset ? preset.id : fallback.presetId,
      volume: typeof p.volume === 'number' ? Math.max(0, Math.min(1, p.volume)) : fallback.volume,
      playing: !!p.playing,
      expanded: !!p.expanded,
      pos:
        p.pos && typeof p.pos.x === 'number' && typeof p.pos.y === 'number'
          ? { x: p.pos.x, y: p.pos.y }
          : null,
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

export const useMusic = create<MusicStore>((set, get) => {
  const init = load()

  // Prime the engine with the saved preset + volume (does NOT start sound).
  const initPreset = getPreset(init.presetId) ?? firstAvailablePreset()
  getMusic().load(initPreset)
  getMusic().setVolume(init.volume)

  const persist = () => {
    const { presetId, volume, playing, expanded, pos } = get()
    save({ presetId, volume, playing, expanded, pos })
  }

  return {
    presetId: init.presetId,
    volume: init.volume,
    playing: init.playing,
    expanded: init.expanded,
    pos: init.pos,

    select: (id) => {
      const preset = getPreset(id)
      if (!preset || !preset.available) return
      const eng = getMusic()
      eng.load(preset)
      eng.play()
      set({ presetId: id, playing: true })
      persist()
    },

    toggle: () => {
      const eng = getMusic()
      if (get().playing) {
        eng.pause()
        set({ playing: false })
      } else {
        // Make sure a playable preset is selected before starting.
        let id = get().presetId
        if (!getPreset(id)?.available) id = firstAvailablePreset().id
        const preset = getPreset(id)
        if (!preset?.available) return
        eng.load(preset)
        eng.play()
        set({ presetId: id, playing: true })
      }
      persist()
    },

    next: () => get().select(adjacentAvailable(get().presetId, 1)),
    prev: () => get().select(adjacentAvailable(get().presetId, -1)),

    setVolume: (v) => {
      const vol = Math.max(0, Math.min(1, v))
      getMusic().setVolume(vol)
      set({ volume: vol })
      persist()
    },

    setExpanded: (v) => {
      set({ expanded: v })
      persist()
    },

    setPos: (p) => {
      set({ pos: p })
      persist()
    },

    resumeFromGesture: () => {
      const { playing, presetId } = get()
      if (!playing) return
      const preset = getPreset(presetId)
      if (!preset?.available) return
      const eng = getMusic()
      eng.load(preset)
      eng.play()
    },
  }
})

export { MUSIC_PRESETS }
