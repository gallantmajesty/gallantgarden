import type { MusicPreset } from './types'

// The eight Library Realm focus presets, in the order they appear in the
// playlist selector. v1 ships three that actually play:
//   • Brown Noise   — synthesized (no asset)
//   • Deep Focus    — synthesized (low-passed brown noise + faint pad)
//   • Rain Ambience — reuses the existing /audio/rain.mp3
// The other five are declared here for the full menu but marked `available:false`
// (rendered greyed with a "soon" badge) until their audio is provided. When that
// happens, swap their `source` from `{ kind: 'soon' }` to a `loop`/`tracks` spec
// and flip `available` to true — nothing else needs to change.
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
    id: 'forest',
    name: 'Forest Ambience',
    subtitle: 'Birds & rustling leaves',
    glyph: '🌲',
    tint: ['#2f4a2f', '#5a7a4a'],
    source: { kind: 'soon' },
    available: false,
  },
  {
    id: 'night-library',
    name: 'Night Library',
    subtitle: 'Hushed late-night hall',
    glyph: '🌙',
    tint: ['#2a2540', '#4a4368'],
    source: { kind: 'soon' },
    available: false,
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
