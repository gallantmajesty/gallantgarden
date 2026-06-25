// Music widget — backend-agnostic types.
//
// The Library Realm mini-player talks ONLY to the `MusicSource` interface, never
// to a concrete engine. v1 ships a local synth/file engine (`LocalMusicEngine`);
// a real Spotify backend (login + personal playlists) can implement the same
// interface later and be dropped in without touching the widget UI or the store.

/** A single playable track. Used by the future `tracks`/`spotify` source kinds;
 *  the v1 synth/loop presets describe themselves directly via {@link MusicPreset}. */
export interface Track {
  id: string
  title: string
  artist: string
}

/** Where a preset's sound comes from.
 *  - `noise` — synthesized in-browser (no asset): brown noise / deep-focus pad.
 *  - `loop`  — a single looping audio file or stream (e.g. /audio/rain.mp3).
 *  - `soon`  — declared in the UI but not yet playable (greyed "soon" badge).
 *  Reserved for later: `{ kind: 'tracks' }` / `{ kind: 'spotify' }`. */
export type SourceSpec =
  | { kind: 'noise'; variant: 'brown' | 'deep' }
  | { kind: 'loop'; url: string }
  | { kind: 'soon' }

/** A selectable focus-music option shown in the playlist selector. Artwork is a
 *  CSS gradient tile (the `tint` pair) + the `glyph`, so no image files ship. */
export interface MusicPreset {
  id: string
  name: string
  /** Short flavour line shown under the title in expanded mode. */
  subtitle: string
  /** Emoji / short glyph rendered on the artwork tile and compact chip. */
  glyph: string
  /** `[from, to]` colours for the artwork tile's diagonal gradient. */
  tint: [string, string]
  source: SourceSpec
  /** False = rendered but not selectable (waiting on audio). */
  available: boolean
}

/** Snapshot the widget reads to render play/pause + the active preset. */
export interface MusicState {
  presetId: string | null
  playing: boolean
}

/** The contract the widget + store drive. Prev/next are deliberately NOT here —
 *  "go to the adjacent available preset" is store logic, so the source stays a
 *  pure play/pause/load/volume sink that any backend can satisfy. */
export interface MusicSource {
  /** Load (and prepare) a preset. Does not start playback on its own. */
  load(preset: MusicPreset): void
  play(): void
  pause(): void
  /** @param v 0..1 */
  setVolume(v: number): void
  getState(): MusicState
  /** Subscribe to state changes; returns an unsubscribe fn. */
  subscribe(cb: (s: MusicState) => void): () => void
}
