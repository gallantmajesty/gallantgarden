// Custom Blueprint — the data model for the infinite knowledge canvas.
//
// A board is one self-contained JSON document (`BoardDoc`): nodes (notes),
// edges (the strings between them), the connection-type palette, the saved
// viewport, and a small bounded list of version snapshots. The whole document
// is persisted as one blob — localStorage first, then mirrored to InsForge
// (see src/lib/blueprint/sync.ts). Keeping it as one doc makes undo/redo,
// templating, export and last-write-wins sync trivial.

// ---- ids + time (no Math.random / bare Date.now in shared modules: fine here,
// these run only client-side in the editor, never in a workflow script) -------
let _counter = 0
export function uid(prefix = 'n'): string {
  _counter += 1
  return `${prefix}_${Date.now().toString(36)}_${_counter.toString(36)}`
}
export function nowIso(): string {
  return new Date().toISOString()
}

// ---- note shape + background kinds ------------------------------------------
export type Shape =
  | 'rect'
  | 'rounded'
  | 'circle'
  | 'hexagon'
  | 'sticky'
  | 'folder'
  | 'card'
  | 'document'
  | 'polaroid'
  | 'bookmark'

export type BgKind = 'solid' | 'gradient' | 'glass' | 'paper' | 'theme'
export type TextAlign = 'left' | 'center' | 'right'

/** Everything that controls how a single note *looks*. */
export interface NoteStyle {
  shape: Shape
  bgKind: BgKind
  bgColor: string // solid fill / paper tint
  gradient: string // full CSS gradient (used when bgKind === 'gradient')
  borderColor: string
  borderWidth: number // px
  radius: number // px (ignored by circle/hexagon)
  shadow: number // 0..1 drop-shadow intensity
  glow: number // 0..1 accent glow intensity
  opacity: number // 0..1
  // text
  font: string // css font-family stack key
  fontSize: number // px
  fontWeight: number // 400..800
  textColor: string
  align: TextAlign
  lineHeight: number // unit-less multiplier
  underline: boolean // underline the whole note body
}

export type MediaFit = 'cover' | 'contain' | 'fill'
export type MediaPlace = 'top' | 'background'

export interface NoteMedia {
  kind: 'image' | 'gif'
  url: string
  /** how the image sits in its box (object-fit) — default 'cover' */
  fit?: MediaFit
  /** 'top' = banner above the text (default); 'background' = fills the whole card behind the text */
  place?: MediaPlace
  /** clockwise rotation in degrees (0 default) */
  rotate?: number
  /** 0..1 image opacity (1 default) — useful to dim a background image behind text */
  opacity?: number
  /** corner radius of the image in px (8 default) */
  radius?: number
}

/** One note on the board. Position/size are in world units. */
export interface BlueprintNode {
  id: string
  x: number
  y: number
  w: number
  h: number
  html: string // TipTap rich-text body
  style: NoteStyle
  media?: NoteMedia | null
  icon?: string | null // emoji / icon glyph shown as a badge
  sticker?: string | null // larger decorative emoji/sticker
  locked: boolean
  groupId?: string | null
  tags: string[]
  label?: string // short title shown in search / minimap
  createdAt: string
  updatedAt: string
}

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'animated'
export type Curve = 'curved' | 'straight'
export type Port = 'top' | 'right' | 'bottom' | 'left'

/** A string between two notes. Visual props fall back to its ConnectionType
 * when left null, so changing a type restyles every edge that uses it. */
export interface BlueprintEdge {
  id: string
  from: string // node id
  to: string // node id
  fromPort: Port
  toPort: Port
  typeId: string
  // per-edge overrides (null = inherit from the connection type)
  color?: string | null
  thickness?: number | null
  lineStyle?: LineStyle | null
  curve?: Curve | null
  glow?: number | null
  label?: string
  // yarn palette overrides (null = inherit from connection type's yarn settings, or fall back to above)
  yarnColor?: string | null
  yarnStyle?: YarnStyle | null
}

/** A reusable connection category (string colour, style, etc.). */
export interface ConnectionType {
  id: string
  name: string
  color: string
  thickness: number
  lineStyle: LineStyle
  curve: Curve
  glow: number // 0..1
  icon?: string // optional emoji/glyph shown on the chip + thread label
  hidden?: boolean // when true, threads of this type are hidden on the wall
  builtin: boolean
  yarnColor?: string // override colour used when this type is drawn (null = use color)
  yarnStyle?: YarnStyle // additional per-type string style override
}

/** A named bundle of connection types a user can apply in one click. The board
 *  starts nearly empty so students define their own relationships; packs are an
 *  optional jump-start tuned to a field of study. */
export interface ConnectionPack {
  id: string
  name: string
  blurb: string
  types: Omit<ConnectionType, 'id' | 'builtin'>[]
}

export const CONNECTION_PACKS: ConnectionPack[] = [
  {
    id: 'general',
    name: 'General study',
    blurb: 'Cause, evidence, contrast & examples — works for any subject.',
    types: [
      { name: 'Leads to', color: '#e0533d', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '➜' },
      { name: 'Supports', color: '#46c08a', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.25, icon: '✓' },
      { name: 'Contradicts', color: '#d64550', thickness: 2.5, lineStyle: 'dashed', curve: 'curved', glow: 0.35, icon: '✕' },
      { name: 'Example of', color: '#e0a93d', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.25, icon: '★' },
    ],
  },
  {
    id: 'it',
    name: 'IT / CS',
    blurb: 'Frontend, backend, API, database, auth, deployment.',
    types: [
      { name: 'Frontend', color: '#4fb0e0', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '🖥' },
      { name: 'Backend', color: '#9a6cff', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '⚙' },
      { name: 'API', color: '#46d6a0', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '🔌' },
      { name: 'Database', color: '#e0a93d', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '🗄' },
      { name: 'Auth', color: '#e0533d', thickness: 2.5, lineStyle: 'dashed', curve: 'curved', glow: 0.3, icon: '🔐' },
      { name: 'Deploy', color: '#8a93a6', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.25, icon: '🚀' },
    ],
  },
  {
    id: 'medicine',
    name: 'Medicine',
    blurb: 'Cause, symptom, diagnosis, treatment, complication.',
    types: [
      { name: 'Causes', color: '#e0533d', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.35, icon: '⚡' },
      { name: 'Symptom', color: '#e0a93d', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.25, icon: '🌡' },
      { name: 'Diagnosis', color: '#4fb0e0', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '🔬' },
      { name: 'Treatment', color: '#46c08a', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '💊' },
      { name: 'Complication', color: '#d64550', thickness: 2.5, lineStyle: 'dashed', curve: 'curved', glow: 0.35, icon: '⚠' },
    ],
  },
  {
    id: 'law',
    name: 'Law',
    blurb: 'Statute, precedent, applies-to, overrules, exception.',
    types: [
      { name: 'Statute', color: '#9a6cff', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '§' },
      { name: 'Precedent', color: '#4fb0e0', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '⚖' },
      { name: 'Applies to', color: '#46c08a', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.25, icon: '➜' },
      { name: 'Overrules', color: '#d64550', thickness: 2.5, lineStyle: 'dashed', curve: 'curved', glow: 0.35, icon: '✕' },
      { name: 'Exception', color: '#e0a93d', thickness: 2.5, lineStyle: 'dashed', curve: 'curved', glow: 0.3, icon: '⌇' },
    ],
  },
]

export interface Viewport {
  x: number
  y: number
  zoom: number
}

/** A point-in-time snapshot for version history. */
export interface BoardVersion {
  id: string
  label: string
  at: string
  nodes: BlueprintNode[]
  edges: BlueprintEdge[]
}

/** A complete board document — the unit of persistence + sync. */
export interface BoardDoc {
  id: string
  title: string
  viewport: Viewport
  nodes: BlueprintNode[]
  edges: BlueprintEdge[]
  connectionTypes: ConnectionType[]
  snap: boolean
  grid: number // grid size in world units
  versions: BoardVersion[]
  createdAt: string
  updatedAt: string
}

/** Lightweight metadata for the board switcher (kept in the local index). */
export interface BoardMeta {
  id: string
  title: string
  updatedAt: string
}

// ---- defaults ---------------------------------------------------------------

export const GRID = 24
export const MAX_VERSIONS = 30

/** New boards start with a single neutral "red yarn" link. Everything else is
 *  user-defined — students build their own relationship vocabulary, optionally
 *  jump-started from a CONNECTION_PACK. */
export const BUILTIN_CONNECTION_TYPES: ConnectionType[] = [
  { id: 'link', name: 'Link', color: '#c0392b', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, icon: '🧵', builtin: true },
]

export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Inter', value: "'Inter', system-ui, sans-serif" },
  { label: 'Baloo (Display)', value: "'Baloo 2', system-ui, sans-serif" },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Mono', value: "'SF Mono', ui-monospace, 'Cascadia Code', monospace" },
  { label: 'Rounded', value: "ui-rounded, 'Segoe UI', system-ui, sans-serif" },
]

/** The default look for a freshly-created note. Colours reference the live
 *  theme via CSS custom properties, so a new note adopts whatever Task Magnet
 *  world is active (Forest greens, Ocean blues, …) instead of a fixed palette. */
export function defaultNoteStyle(): NoteStyle {
  return {
    shape: 'sticky',
    bgKind: 'solid',
    bgColor: '#262019', // warm dark paper, light ink — reads clean on the wall
    gradient: 'linear-gradient(135deg, #2c261d, #1e1a14)',
    borderColor: 'rgba(255,245,225,0.14)',
    borderWidth: 1,
    radius: 6,
    shadow: 0.55,
    glow: 0,
    opacity: 1,
    font: FONT_OPTIONS[0].value,
    fontSize: 16,
    fontWeight: 500,
    textColor: '#f2ece0',
    align: 'left',
    lineHeight: 1.45,
    underline: false,
  }
}

/** One-click note looks. Each preset patches a subset of NoteStyle onto the
 *  current note, so a student can restyle a card instantly without fiddling
 *  every slider. Colours stay warm/evidence-board so they read on the wall. */
export interface NotePreset {
  id: string
  name: string
  swatch: string // background shown on the preset chip
  patch: Partial<NoteStyle>
}

export const NOTE_PRESETS: NotePreset[] = [
  {
    id: 'evidence',
    name: 'Evidence',
    swatch: '#262019',
    patch: { shape: 'sticky', bgKind: 'solid', bgColor: '#262019', borderColor: 'rgba(255,245,225,0.14)', borderWidth: 1, radius: 6, shadow: 0.55, glow: 0, textColor: '#f2ece0' },
  },
  {
    id: 'redthread',
    name: 'Suspect',
    swatch: 'linear-gradient(135deg,#fff1ef,#ffd9d2)',
    patch: { shape: 'sticky', bgKind: 'solid', bgColor: '#fff1ef', borderColor: '#c0392b', borderWidth: 2, radius: 6, shadow: 0.5, glow: 0.2, textColor: '#3a1714' },
  },
  {
    id: 'theme',
    name: 'Theme',
    swatch: 'rgba(var(--mg-accent-rgb,91,124,250),0.4)',
    patch: { shape: 'rounded', bgKind: 'theme', borderColor: 'var(--mg-border, rgba(20,30,60,0.14))', borderWidth: 1, radius: 14, shadow: 0.4, glow: 0.2, textColor: 'var(--mg-text, #1c2333)' },
  },
]

// ── Yarn palette ──────────────────────────────────────────────────────────────
// Colours styled after real investigation-board string.
export const YARN_COLORS: { name: string; hex: string }[] = [
  { name: 'Evidence Red', hex: '#B22222' },
  { name: 'Police Blue', hex: '#1F5AA6' },
  { name: 'Forest Green', hex: '#2E8B57' },
  { name: 'Amber',       hex: '#D4A017' },
  { name: 'Royal Purple',hex: '#6A3D9A' },
  { name: 'Ivory',       hex: '#F2F2F2' },
  { name: 'Charcoal',    hex: '#2B2B2B' },
]

// String visual styles you can apply per thread-type (and per-edge via EdgeInspector).
export type YarnStyle = 'solid' | 'dashed' | 'dotted' | 'thick' | 'arrow'

export const YARN_STYLE_META: { value: YarnStyle; label: string; dasharray?: string; arrow?: boolean }[] = [
  { value: 'solid',   label: '─── Normal' },
  { value: 'dashed',  label: '- - - Dashed', dasharray: '8 7' },
  { value: 'dotted',  label: '···· Dotted', dasharray: '2 6' },
  { value: 'thick',   label: '═══ Thick',   dasharray: undefined },
  { value: 'arrow',   label: '↝ Arrow',    arrow: true },
]

let _spawn = 0
/** Create a new node near a world point, lightly fanned so they don't stack. */
export function makeNode(x: number, y: number, partial?: Partial<BlueprintNode>): BlueprintNode {
  _spawn += 1
  const jx = ((_spawn * 29) % 60) - 30
  const jy = ((_spawn * 53) % 60) - 30
  return {
    id: uid('node'),
    x: Math.round(x + jx),
    y: Math.round(y + jy),
    w: 220,
    h: 130,
    html: '<p>New note</p>',
    style: defaultNoteStyle(),
    media: null,
    icon: null,
    sticker: null,
    locked: false,
    groupId: null,
    tags: [],
    label: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...partial,
  }
}

export function makeBoard(title = 'Untitled Board', partial?: Partial<BoardDoc>): BoardDoc {
  return {
    id: uid('board'),
    title,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
    edges: [],
    connectionTypes: BUILTIN_CONNECTION_TYPES.map((t) => ({ ...t })),
    snap: false,
    grid: GRID,
    versions: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...partial,
  }
}

/** Strip TipTap HTML to plain text for search / summaries / labels. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>(?=)/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// Internal resolved style; may include yarn-only values not in the base LineStyle union.
export interface ResolvedEdgeStyle {
  color: string
  thickness: number
  lineStyle: string
  curve: Curve
  glow: number
}

/** Resolve an edge's effective visual props (edge yarn overrides ?? type yarn ?? type base). */
export function resolveEdgeStyle(
  edge: BlueprintEdge,
  type: ConnectionType | undefined,
): ResolvedEdgeStyle {
  const t = type ?? BUILTIN_CONNECTION_TYPES[0]
  return {
    color: edge.yarnColor ?? type?.yarnColor ?? edge.color ?? t.color,
    thickness: edge.thickness ?? t.thickness,
    lineStyle: edge.yarnStyle ?? type?.yarnStyle ?? edge.lineStyle ?? t.lineStyle,
    curve: edge.curve ?? t.curve,
    glow: edge.glow ?? t.glow,
  }
}
