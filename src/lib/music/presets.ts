import type { MusicPreset } from './types'

// The Library Realm focus presets, in the order they appear in the playlist
// selector. The playable ones use either synthesized noise (no asset) or a real
// looping audio file from /public/audio — including the rain recordings you saved
// (rain.mp3, rain-interior.mp3, rain-exterior.mp3, rain-rumble.mp3) plus birds
// and music-ambient. The remaining three are placeholder "soon" tiles until their
// licensed tracks are added.
//
// Artwork needs NO image files: each tile is a coffee/gold CSS gradient (`tint`)
// with the `glyph` on top.

export const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: 'lofi',
    name: 'Lofi Focus',
    subtitle: 'Mellow beats to study to',
    glyph: '🎧',
    tint: ['#7a4a26', '#a9703f'],
    source: { kind: 'soon' },
    available: false,
  },
  {
    id: 'piano',
    name: 'Piano Study',
    subtitle: 'Soft solo piano',
    glyph: '🎹',
    tint: ['#5c3518', '#8a5a32'],
    source: { kind: 'soon' },
    available: false,
  },
  {
    id: 'classical',
    name: 'Classical Concentration',
    subtitle: 'Calm strings & quartets',
    glyph: '🎻',
    tint: ['#6b4423', '#b07d45'],
    source: { kind: 'soon' },
    available: false,
  },
  {
    id: 'brown',
    name: 'Brown Noise',
    subtitle: 'Steady, warm static',
    glyph: '🟤',
    tint: ['#4a2f18', '#7a4a26'],
    source: { kind: 'noise', variant: 'brown' },
    available: true,
  },
  {
    id: 'rain',
    name: 'Rain Ambience',
    subtitle: 'Gentle rainfall',
    glyph: '🌧️',
    tint: ['#3f4a52', '#6b7a82'],
    source: { kind: 'loop', url: '/audio/rain.mp3' },
    available: true,
  },
  {
    id: 'rain-interior',
    name: 'Rain · Interior',
    subtitle: 'Rain against the windows',
    glyph: '🪟',
    tint: ['#36474f', '#5f7682'],
    source: { kind: 'loop', url: '/audio/rain-interior.mp3' },
    available: true,
  },
  {
    id: 'rain-exterior',
    name: 'Rain · Exterior',
    subtitle: 'Storm over the realm',
    glyph: '🌧️',
    tint: ['#2f3b47', '#50697a'],
    source: { kind: 'loop', url: '/audio/rain-exterior.mp3' },
    available: true,
  },
  {
    id: 'rain-thunder',
    name: 'Rain & Thunder',
    subtitle: 'Distant rolling thunder',
    glyph: '⛈️',
    tint: ['#2b333d', '#4a5a68'],
    source: { kind: 'loop', url: '/audio/rain-rumble.mp3' },
    available: true,
  },
  {
    id: 'forest',
    name: 'Forest & Birds',
    subtitle: 'Birds & rustling leaves',
    glyph: '🌲',
    tint: ['#2f4a2f', '#5a7a4a'],
    source: { kind: 'loop', url: '/audio/birds.mp3' },
    available: true,
  },
  {
    id: 'night-library',
    name: 'Night Library',
    subtitle: 'Hushed late-night hall',
    glyph: '🌙',
    tint: ['#2a2540', '#4a4368'],
    source: { kind: 'loop', url: '/audio/music-ambient.mp3' },
    available: true,
  },
  {
    id: 'deep',
    name: 'Deep Focus',
    subtitle: 'Low, enveloping hum',
    glyph: '🧠',
    tint: ['#3a2a17', '#6b4a2a'],
    source: { kind: 'noise', variant: 'deep' },
    available: true,
  },
]

export function getPreset(id: string | null | undefined): MusicPreset | undefined {
  return MUSIC_PRESETS.find((p) => p.id === id)
}

/** The default selection — first preset that can actually play today. */
export function firstAvailablePreset(): MusicPreset {
  return MUSIC_PRESETS.find((p) => p.available) ?? MUSIC_PRESETS[0]
}

/** Step to the next/previous AVAILABLE preset (wraps). Used by the ◀ ▶ controls.
 *  Returns the current id unchanged if fewer than one option is playable. */
export function adjacentAvailable(currentId: string | null, dir: 1 | -1): string {
  const playable = MUSIC_PRESETS.filter((p) => p.available)
  if (playable.length === 0) return currentId ?? ''
  const idx = playable.findIndex((p) => p.id === currentId)
  // If current isn't a playable preset, start from the first.
  const base = idx === -1 ? 0 : idx
  const nextIdx = (base + dir + playable.length) % playable.length
  return playable[nextIdx].id
}
