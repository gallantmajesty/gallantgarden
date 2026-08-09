import { create } from 'zustand'
import { getMusic } from '../lib/music/engine'
import {
  searchLiveTracks,
  genreLiveTracks,
  RADIO_STATIONS,
  trackToPreset,
  type LiveTrack,
  type MusicGenre,
} from '../lib/music/catalog'

// Live music store for the Library Realm widget. There is no fixed playlist —
// every track is streamed from the web (Jamendo catalog / internet radio) and
// the user picks whatever they want, in real time, from search results and
// genre browsing. Playback itself is owned by the engine (`getMusic()`), the
// store only drives it and remembers the user's choices.

export interface WidgetPos {
  x: number
  y: number
}

interface MusicStore {
  // Runtime
  current: LiveTrack | null
  queue: LiveTrack[]
  qIndex: number
  playing: boolean
  // Browse state
  query: string
  results: LiveTrack[]
  browsing: boolean
  // Widget state
  volume: number // 0..1
  expanded: boolean
  pos: WidgetPos | null // null = default bottom-right corner

  // Actions
  search: (q: string) => void
  browseGenre: (g: MusicGenre | null) => void
  playTrack: (t: LiveTrack) => void
  toggle: () => void
  next: () => void
  prev: () => void
  setVolume: (v: number) => void
  setExpanded: (v: boolean) => void
  setPos: (p: WidgetPos) => void
  /** Resume playback on first gesture if it was playing when last saved. */
  resumeFromGesture: () => void
}

const KEY = 'sg.music.v2'

interface Persisted {
  volume: number
  playing: boolean
  expanded: boolean
  pos: WidgetPos | null
  current: LiveTrack | null
  queue: LiveTrack[]
  qIndex: number
}

function load(): Persisted {
  const fallback: Persisted = {
    volume: 0.7,
    playing: false,
    expanded: false,
    pos: null,
    current: null,
    queue: [],
    qIndex: 0,
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw) as Partial<Persisted>
    let pos: WidgetPos | null = null
    if (p.pos && typeof p.pos.x === 'number' && typeof p.pos.y === 'number') {
      const w = 340, h = 480, m = 10
      const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1200) - w - m
      const maxY = (typeof window !== 'undefined' ? window.innerHeight : 800) - h - m
      pos = {
        x: Math.max(m, Math.min(p.pos.x, maxX)),
        y: Math.max(m, Math.min(p.pos.y, maxY)),
      }
    }
    return {
      volume: typeof p.volume === 'number' ? Math.max(0, Math.min(1, p.volume)) : fallback.volume,
      playing: !!p.playing,
      expanded: !!p.expanded,
      pos,
      current: p.current && typeof p.current.url === 'string' ? p.current : null,
      queue: Array.isArray(p.queue) ? p.queue.filter((t) => t && typeof t.url === 'string') : [],
      qIndex: Number.isFinite(p.qIndex) ? Math.max(0, p.qIndex) : 0,
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

  getMusic().setVolume(init.volume)
  if (init.current) getMusic().load(trackToPreset(init.current))

  // Streams play end-to-end and auto-advance ("flows").
  getMusic().onTrackEnd = () => get().next()

  const persist = () => {
    const { volume, playing, expanded, pos, current, queue, qIndex } = get()
    save({ volume, playing, expanded, pos, current, queue, qIndex })
  }

  const playIndex = (index: number) => {
    const { queue } = get()
    if (queue.length === 0) return
    const i = ((index % queue.length) + queue.length) % queue.length
    const track = queue[i]
    const eng = getMusic()
    eng.load(trackToPreset(track))
    eng.play()
    set({ current: track, qIndex: i, playing: true })
    persist()
  }

  return {
    current: init.current,
    queue: init.queue,
    qIndex: init.qIndex,
    playing: init.playing,
    query: '',
    results: [],
    browsing: false,
    volume: init.volume,
    expanded: init.expanded,
    pos: init.pos,

    search: async (q) => {
      const query = q.trim()
      set({ query: q, browsing: true })
      const tracks = await searchLiveTracks(query, 0)
      if (get().query !== q) return // stale response
      set({ results: tracks, browsing: false })
    },

    browseGenre: async (g) => {
      if (!g) {
        set({ query: '', results: [], browsing: false })
        return
      }
      set({ query: '', browsing: true })
      const tracks = await genreLiveTracks(g, 0)
      set({ results: tracks, browsing: false })
    },

    playTrack: (t) => {
      const { queue } = get()
      const nextQueue = queue.filter((x) => x.id !== t.id)
      nextQueue.push(t)
      set({ queue: nextQueue })
      playIndex(nextQueue.length - 1)
    },

    toggle: () => {
      const eng = getMusic()
      if (get().playing) {
        eng.pause()
        set({ playing: false })
      } else {
        const cur = get().current
        if (!cur) {
          // Nothing chosen yet — start the first radio station.
          const station = RADIO_STATIONS[0]
          get().playTrack(station)
          return
        }
        eng.load(trackToPreset(cur))
        eng.play()
        set({ playing: true })
      }
      persist()
    },

    next: () => {
      const { queue, qIndex } = get()
      if (queue.length === 0) {
        get().playTrack(RADIO_STATIONS[0])
        return
      }
      // A lone radio station that fails to stream would otherwise loop back onto
      // itself forever — rotate through the station list instead.
      if (queue.length === 1 && queue[0].kind === 'radio') {
        const idx = RADIO_STATIONS.findIndex((r) => r.id === queue[0].id)
        get().playTrack(RADIO_STATIONS[(idx + 1) % RADIO_STATIONS.length])
        return
      }
      playIndex(qIndex + 1)
    },

    prev: () => {
      const { queue, qIndex } = get()
      if (queue.length === 0) return
      playIndex(qIndex - 1)
    },

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
      const { playing, current } = get()
      if (!playing || !current) return
      const eng = getMusic()
      eng.load(trackToPreset(current))
      eng.play()
    },
  }
})

export { RADIO_STATIONS }
