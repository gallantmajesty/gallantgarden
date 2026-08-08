import { create } from 'zustand'
import { MusicEngine } from './musicEngine'

// Global, persisted-across-screens music state. The actual audio decoding lives
// in MusicEngine (one <audio> element); this store is the single source of truth
// the lobby + library widgets read and command.
//
// 100% free streaming — every track is Jamendo CC music mirrored on archive.org
// (stable, direct MP3 URLs — no API key, no account, no ads). Tracks auto-
// advance on end ("flows"). YouTube is gone for good.

export type MusicMood = 'lofi' | 'ambient' | 'piano' | 'nature' | 'jazz'

export interface MusicTrack {
  id: string
  title: string
  artist: string
  /** relaxing mood tag, used for the icon */
  mood: MusicMood
  /** direct MP3 stream (Jamendo CC mirror on archive.org) */
  url: string
}

// Jamendo albums mirrored on archive.org (collection "jamendo-albums",
// license: cc_standard — free, ad-free, no account). Verified 200 at build time.
const JA = (item: string, file: string) =>
  `https://archive.org/download/${item}/${encodeURIComponent(file)}`

export const MUSIC_TRACKS: MusicTrack[] = [
  // ── Lofi ────────────────────────────────────────────────────────────────
  { id: 'emil-lofi', title: 'Lofi hip hop study', artist: 'Emil', mood: 'lofi', url: JA('jamendo-476651', '01-1931249-Emil-Lofi hip hop study.mp3') },
  { id: 'slxt-shuttle', title: 'Shuttle', artist: 'Slxt Sync', mood: 'lofi', url: JA('jamendo-612992', '01-2274653-Slxt Sync-Shuttle.mp3') },
  { id: 'slxt-green', title: 'green background', artist: 'Slxt Sync', mood: 'lofi', url: JA('jamendo-612992', '02-2274654-Slxt Sync-green background.mp3') },
  { id: 'slxt-moon', title: 'full moon', artist: 'Slxt Sync', mood: 'lofi', url: JA('jamendo-612992', '03-2274652-Slxt Sync-full moon.mp3') },
  { id: 'slxt-elevation', title: 'elevation', artist: 'Slxt Sync', mood: 'lofi', url: JA('jamendo-612992', '04-2274651-Slxt Sync-elevation.mp3') },
  { id: 'slxt-carpet', title: 'chill carpet', artist: 'Slxt Sync', mood: 'lofi', url: JA('jamendo-612992', '05-2274650-Slxt Sync-chill carpet.mp3') },
  // ── Piano ───────────────────────────────────────────────────────────────
  { id: 'costlow-meant', title: 'Meant to Be', artist: 'Rob Costlow', mood: 'piano', url: JA('jamendo-000888', '01.mp3') },
  { id: 'costlow-reflections', title: 'Reflections', artist: 'Rob Costlow', mood: 'piano', url: JA('jamendo-000888', '02.mp3') },
  { id: 'costlow-semester', title: 'Semester Days', artist: 'Rob Costlow', mood: 'piano', url: JA('jamendo-000888', '03.mp3') },
  { id: 'costlow-tulip', title: 'Tulip Trees', artist: 'Rob Costlow', mood: 'piano', url: JA('jamendo-000888', '07.mp3') },
  { id: 'costlow-twilight', title: 'Twilight', artist: 'Rob Costlow', mood: 'piano', url: JA('jamendo-000888', '10.mp3') },
  // ── Ambient ─────────────────────────────────────────────────────────────
  { id: 'zproj-intro', title: 'Intro', artist: 'zero-project', mood: 'ambient', url: JA('jamendo-055681', '01.mp3') },
  { id: 'zproj-high-hopes', title: 'High hopes', artist: 'zero-project', mood: 'ambient', url: JA('jamendo-055681', '02.mp3') },
  { id: 'zproj-twilight', title: 'Twilight poem', artist: 'zero-project', mood: 'ambient', url: JA('jamendo-055681', '03.mp3') },
  { id: 'zproj-breath', title: 'Breath of freedom', artist: 'zero-project', mood: 'ambient', url: JA('jamendo-055681', '04.mp3') },
  { id: 'zproj-force', title: 'The silent force', artist: 'zero-project', mood: 'ambient', url: JA('jamendo-055681', '05.mp3') },
  { id: 'zproj-dawn', title: 'Dawn of a new era', artist: 'zero-project', mood: 'ambient', url: JA('jamendo-055681', '07.mp3') },
  { id: 'zproj-loneliness', title: 'Path of loneliness', artist: 'zero-project', mood: 'ambient', url: JA('jamendo-055681', '08.mp3') },
  { id: 'zproj-dream', title: 'Neverending dream', artist: 'zero-project', mood: 'ambient', url: JA('jamendo-055681', '09.mp3') },
  { id: 'plastic3-dreaming', title: 'Dreaming Ambient', artist: 'Plastic3', mood: 'ambient', url: JA('jamendo-103271', '01.mp3') },
  { id: 'plastic3-piano', title: 'Chill Relax Piano', artist: 'Plastic3', mood: 'piano', url: JA('jamendo-103271', '04.mp3') },
  { id: 'plastic3-soft', title: 'Soft Calm Chillout', artist: 'Plastic3', mood: 'ambient', url: JA('jamendo-103271', '06.mp3') },
  { id: 'plastic3-bg', title: 'Ambient Chill Soft', artist: 'Plastic3', mood: 'ambient', url: JA('jamendo-103271', '10.mp3') },
  // ── Jazz ────────────────────────────────────────────────────────────────
  { id: 'jumbo-chameleon', title: 'Chameleon', artist: 'Jumbo Jazz', mood: 'jazz', url: JA('jamendo-068493', '01.mp3') },
  { id: 'jumbo-train', title: "Take The 'A' Train", artist: 'Jumbo Jazz', mood: 'jazz', url: JA('jamendo-068493', '02.mp3') },
  { id: 'jumbo-billie', title: "Billie's Bounce", artist: 'Jumbo Jazz', mood: 'jazz', url: JA('jamendo-068493', '04.mp3') },
  { id: 'jumbo-butterfly', title: 'Butterfly', artist: 'Jumbo Jazz', mood: 'jazz', url: JA('jamendo-068493', '07.mp3') },
  { id: 'jumbo-cantaloupe', title: 'Cantaloupe Island', artist: 'Jumbo Jazz', mood: 'jazz', url: JA('jamendo-068493', '10.mp3') },
]

interface MusicState {
  ready: boolean
  playing: boolean
  currentId: string | null
  volume: number
  muted: boolean
  open: boolean

  setReady: (v: boolean) => void
  playTrack: (id: string) => void
  toggle: () => void
  next: () => void
  prev: () => void
  setVolume: (v: number) => void
  setMuted: (v: boolean) => void
  setOpen: (v: boolean) => void
}

export const useMusic = create<MusicState>((set, get) => ({
  ready: false,
  playing: false,
  currentId: MUSIC_TRACKS[0].id,
  volume: 0.5,
  muted: false,
  open: false,

  setReady: (v) => set({ ready: v }),
  playTrack: (id) => {
    const engine = getMusicEngine()
    engine.play(id)
  },
  toggle: () => {
    const engine = getMusicEngine()
    if (get().playing) engine.pause()
    else engine.resume()
  },
  next: () => {
    const idx = MUSIC_TRACKS.findIndex((t) => t.id === get().currentId)
    const nextTrack = MUSIC_TRACKS[(idx + 1) % MUSIC_TRACKS.length]
    get().playTrack(nextTrack.id)
  },
  prev: () => {
    const idx = MUSIC_TRACKS.findIndex((t) => t.id === get().currentId)
    const prevTrack = MUSIC_TRACKS[(idx - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length]
    get().playTrack(prevTrack.id)
  },
  setVolume: (v) => {
    set({ volume: v })
    getMusicEngine().setVolume(v)
  },
  setMuted: (v) => {
    set({ muted: v })
    getMusicEngine().setMuted(v)
  },
  setOpen: (v) => set({ open: v }),
}))

// Single engine instance for the whole app (one <audio> element).
let _engine: MusicEngine | null = null
function getMusicEngine(): MusicEngine {
  if (!_engine) _engine = new MusicEngine()
  return _engine
}

// Construct eagerly so `ready` is true and the widget is visible immediately —
// there is no async setup anymore (the old YouTube gate hid the player forever).
void getMusicEngine()
