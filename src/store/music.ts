import { create } from 'zustand'
import { getMusic } from '../lib/music/engine'
import {
  searchLiveTracks,
  defaultLiveTracks,
  trackToPreset,
  type LiveTrack,
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

export type RepeatMode = 'off' | 'all' | 'one'

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
  shuffle: boolean
  repeat: RepeatMode

  // Scoping — the library music player only works inside the library. When the
  // user leaves the library the player pauses and remembers (`pausedForScope`);
  // returning to the library restores playback. Outside the library nothing
  // resumes, even on a gesture.
  scopeInside: boolean
  pausedForScope: boolean

  // Actions
  search: (q: string) => void
  playTrack: (t: LiveTrack) => void
  toggle: () => void
  /** Enter/leave the library — pauses on the way out, restores on the way back. */
  setLibraryScope: (inside: boolean) => void
  next: () => void
  prev: () => void
  seekTo: (seconds: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
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
  shuffle: boolean
  repeat: RepeatMode
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
    shuffle: false,
    repeat: 'off',
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
    // Radio stations were removed — drop any stale persisted radio entries so
    // the player doesn't restore a dead SomaFM stream as "now playing".
    const isPlayable = (t: LiveTrack | null | undefined): t is LiveTrack =>
      !!t && typeof t.url === 'string' && t.kind !== 'radio'
    const current = isPlayable(p.current) ? p.current : null
    const queue = Array.isArray(p.queue) ? p.queue.filter(isPlayable) : []
    const repeat: RepeatMode = p.repeat === 'one' || p.repeat === 'all' ? p.repeat : 'off'
    return {
      volume: typeof p.volume === 'number' ? Math.max(0, Math.min(1, p.volume)) : fallback.volume,
      // If the saved "now playing" was a radio station (now removed), don't
      // resume a phantom playback state either.
      playing: !!p.playing && !!current,
      expanded: !!p.expanded,
      pos,
      current,
      queue,
      qIndex: Number.isFinite(p.qIndex) ? Math.max(0, p.qIndex) : 0,
      shuffle: !!p.shuffle,
      repeat,
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
    const { volume, playing, expanded, pos, current, queue, qIndex, shuffle, repeat } = get()
    save({ volume, playing, expanded, pos, current, queue, qIndex, shuffle, repeat })
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
    scopeInside: false,
    pausedForScope: false,
    query: '',
    results: defaultLiveTracks(),
    browsing: false,
    volume: init.volume,
    expanded: init.expanded,
    pos: init.pos,
    shuffle: init.shuffle,
    repeat: init.repeat,

    search: async (q) => {
      const query = q.trim()
      set({ query: q, browsing: true })
      const tracks = await searchLiveTracks(query, 0)
      if (get().query !== q) return // stale response
      set({ results: tracks, browsing: false })
    },

    setLibraryScope: (inside) => {
      const s = get()
      if (inside === s.scopeInside) return
      if (inside) {
        // Returning to the library — restore playback if we paused on the way out.
        if (s.pausedForScope && s.current) {
          const eng = getMusic()
          eng.load(trackToPreset(s.current))
          eng.play()
          set({ scopeInside: true, playing: true, pausedForScope: false })
          persist()
        } else {
          set({ scopeInside: true })
        }
      } else {
        // Leaving the library — the player must not keep playing outside it.
        const wasPlaying = s.playing
        getMusic().pause()
        set({ scopeInside: false, playing: false, pausedForScope: wasPlaying })
        persist()
      }
    },

    playTrack: (t) => {
      if (!get().scopeInside) return // music is library-only
      const { queue } = get()
      const nextQueue = queue.filter((x) => x.id !== t.id)
      nextQueue.push(t)
      set({ queue: nextQueue })
      playIndex(nextQueue.length - 1)
    },

    toggle: () => {
      if (!get().scopeInside) return // music is library-only
      const eng = getMusic()
      if (get().playing) {
        eng.pause()
        set({ playing: false })
      } else {
        const cur = get().current
        if (!cur) {
          // Nothing chosen yet — start the first curated track.
          const first = defaultLiveTracks().find((t) => t.id === 'fb-lofi') ?? defaultLiveTracks()[0]
          get().playTrack(first)
          return
        }
        eng.load(trackToPreset(cur))
        eng.play()
        set({ playing: true })
      }
      persist()
    },

    next: () => {
      const { queue, qIndex, repeat, shuffle } = get()
      if (queue.length === 0) {
        const first = defaultLiveTracks().find((t) => t.id === 'fb-lofi') ?? defaultLiveTracks()[0]
        get().playTrack(first)
        return
      }
      // Repeat-one: replay the same track from the top.
      if (repeat === 'one') {
        getMusic().seek(0)
        playIndex(qIndex)
        return
      }
      // Shuffle: jump to a random different queue position.
      if (shuffle && queue.length > 1) {
        let i = Math.floor(Math.random() * queue.length)
        if (i === qIndex) i = (i + 1) % queue.length
        playIndex(i)
        return
      }
      // Repeat-off at the end of the queue: stop instead of wrapping.
      if (repeat === 'off' && qIndex >= queue.length - 1) {
        getMusic().pause()
        set({ playing: false })
        persist()
        return
      }
      playIndex(qIndex + 1)
    },

    prev: () => {
      const { queue, qIndex } = get()
      if (queue.length === 0) return
      playIndex(qIndex - 1)
    },

    seekTo: (seconds) => {
      if (!get().current) return
      getMusic().seek(seconds)
    },

    toggleShuffle: () => {
      set({ shuffle: !get().shuffle })
      persist()
    },

    cycleRepeat: () => {
      const nextMode: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }
      set({ repeat: nextMode[get().repeat] })
      persist()
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
      const { playing, current, scopeInside } = get()
      if (!playing || !current || !scopeInside) return
      const eng = getMusic()
      eng.load(trackToPreset(current))
      eng.play()
    },
  }
})
