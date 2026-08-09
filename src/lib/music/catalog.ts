// Live music catalog for the Library Realm player.
//
// The player no longer ships a fixed "curated" playlist. Instead it searches a
// LIVE catalog — thousands of CC-licensed tracks from the Jamendo API (free,
// ad-free, no account) plus always-on internet radio stations. Everything is
// streamed from the web in real time; nothing is bundled with the app.
//
//   * Radio   — public Icecast streams (SomaFM), no key required. Always live.
//   * Tracks  — Jamendo search when `VITE_JAMENDO_CLIENT_ID` is set (get a free
//               client id at developer.jamendo.com). Without a key the player
//               falls back to a small built-in stream set so it still works.
//
// The Jamendo key is optional; without it the app simply shows fewer results.

import type { MusicPreset } from './types'
import { MUSIC_PRESETS } from './presets'

export interface LiveTrack {
  id: string
  title: string
  artist: string
  album?: string
  /** seconds, when known (tracks only) */
  duration?: number
  /** artwork URL when available */
  image?: string
  /** stream / download URL */
  url: string
  kind: 'track' | 'radio'
}

export type MusicGenre =
  | 'lofi'
  | 'focus'
  | 'piano'
  | 'ambient'
  | 'jazz'
  | 'classical'
  | 'chill'
  | 'rain'

export const GENRES: { id: MusicGenre; label: string }[] = [
  { id: 'lofi', label: 'Lofi' },
  { id: 'focus', label: 'Focus' },
  { id: 'piano', label: 'Piano' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'classical', label: 'Classical' },
  { id: 'chill', label: 'Chill' },
  { id: 'rain', label: 'Rain' },
]

// ---- Internet radio (always available, no key) ------------------------------

const RADIO: Array<[string, string, string]> = [
  ['Lofi Study Beats', 'Groove Salad · SomaFM', 'https://ice1.somafm.com/groovesalad-256-mp3'],
  ['Chillout Lounge', 'Lush · SomaFM', 'https://ice1.somafm.com/lush-256-mp3'],
  ['Deep Focus Drone', 'Drone Zone · SomaFM', 'https://ice1.somafm.com/dronezone-256-mp3'],
  ['Downtempo', 'Beat Blender · SomaFM', 'https://ice1.somafm.com/beatblender-256-mp3'],
  ['Electronic Space', 'Space Station · SomaFM', 'https://ice1.somafm.com/spacestation-256-mp3'],
  ['Ambient Fluid', 'Fluid · SomaFM', 'https://ice1.somafm.com/fluid-256-mp3'],
]

export const RADIO_STATIONS: LiveTrack[] = RADIO.map(([title, artist, url], i) => ({
  id: `radio-${i}`,
  title,
  artist,
  url,
  kind: 'radio',
}))

// ---- Built-in fallback streams (used only when no Jamendo key is set) -------

function fallbackTracks(): LiveTrack[] {
  const out: LiveTrack[] = []
  for (const p of MUSIC_PRESETS) {
    if (p.source.kind === 'jamendo' && p.source.url) {
      out.push({
        id: `fb-${p.id}`,
        title: p.name,
        artist: p.subtitle,
        url: p.source.url,
        kind: 'track',
      })
    }
  }
  // Local recordings (rain / birds / ambience) are also playable streams.
  for (const p of MUSIC_PRESETS) {
    if (p.source.kind === 'loop' && p.source.url) {
      out.push({
        id: `fb-${p.id}`,
        title: p.name,
        artist: p.subtitle,
        url: p.source.url,
        kind: 'track',
      })
    }
  }
  return out
}

// ---- Jamendo API ------------------------------------------------------------

export function jamendoConfigured(): boolean {
  const key = import.meta.env.VITE_JAMENDO_CLIENT_ID as string | undefined
  return typeof key === 'string' && key.length > 0
}

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0/tracks'

async function fetchJamendo(
  params: Record<string, string>,
): Promise<LiveTrack[]> {
  const key = import.meta.env.VITE_JAMENDO_CLIENT_ID as string
  const qs = new URLSearchParams({
    client_id: key,
    format: 'json',
    limit: '50',
    audioformat: 'mp32',
    include: 'musicinfo',
    ...params,
  })
  const res = await fetch(`${JAMENDO_BASE}?${qs.toString()}`)
  if (!res.ok) throw new Error(`jamendo ${res.status}`)
  const json = await res.json()
  const rows = (json?.results ?? []) as Array<Record<string, unknown>>
  return rows
    .filter((r) => typeof r.audio === 'string')
    .map((r, i) => ({
      id: String(r.id ?? `jam-${i}`),
      title: String(r.name ?? 'Untitled'),
      artist: String(r.artist_name ?? 'Unknown artist'),
      album: String(r.album_name ?? ''),
      duration: typeof r.duration === 'number' ? Math.round(r.duration) : undefined,
      image: typeof r.image === 'string' && r.image ? r.image : undefined,
      url: r.audio as string,
      kind: 'track' as const,
    }))
}

/** Search the live catalog by query (Jamendo when configured, else fallback). */
export async function searchLiveTracks(
  query: string,
  offset = 0,
): Promise<LiveTrack[]> {
  const q = query.trim()
  if (jamendoConfigured() && q) {
    try {
      return await fetchJamendo({ search: q, offset: String(offset), order: 'popularity_total' })
    } catch {
      /* fall through to the built-in set */
    }
  }
  const kw = q.toLowerCase()
  return fallbackTracks().filter((t) => {
    if (!kw) return true
    return t.title.toLowerCase().includes(kw) || t.artist.toLowerCase().includes(kw)
  })
}

/** Browse a genre of live tracks. */
export async function genreLiveTracks(
  genre: MusicGenre,
  offset = 0,
): Promise<LiveTrack[]> {
  if (jamendoConfigured()) {
    try {
      return await fetchJamendo({ tags: genre, offset: String(offset), order: 'popularity_week' })
    } catch {
      /* fall through to the built-in set */
    }
  }
  const kw = genre === 'rain' ? /rain|storm/i : new RegExp(genre, 'i')
  return fallbackTracks().filter((t) => kw.test(t.title) || kw.test(t.artist))
}

// ---- Conversion helpers -----------------------------------------------------

const TINTS = [
  ['#7a4a26', '#a9703f'],
  ['#35455a', '#5a7285'],
  ['#2f4a3a', '#4f7a5f'],
  ['#3a3327', '#6b5a3f'],
  ['#4a3a55', '#7a5a8a'],
  ['#33283f', '#5a4a6b'],
  ['#2a2540', '#4a4368'],
  ['#5a3a1f', '#8a6b3f'],
  ['#26303a', '#43556a'],
  ['#3f3328', '#6b5a4a'],
] as const

function hashHue(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

export function tintFor(track: LiveTrack): [string, string] {
  const h = hashHue(track.title + track.artist)
  return [
    `hsl(${h}, 42%, 24%)`,
    `hsl(${(h + 32) % 360}, 46%, 38%)`,
  ]
}

export function imageFor(track: LiveTrack): string | null {
  return track.image || null
}

/** Adapt a live track to the engine's preset shape (kind 'jamendo' = stream
 *  end-to-end and auto-advance). */
export function trackToPreset(track: LiveTrack): MusicPreset {
  const [a, b] = tintFor(track)
  return {
    id: track.id,
    name: track.title,
    subtitle: track.artist,
    glyph: '',
    tint: [a, b],
    source: { kind: 'jamendo', url: track.url },
    available: true,
  }
}

export { TINTS }
