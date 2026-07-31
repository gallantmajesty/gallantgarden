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
export type StickerPos = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type NotePattern = 'none' | 'dots' | 'lines' | 'grid' | 'diagonal' | 'crosshatch' | 'zigzag'

/** Everything that controls how a single note *looks*. */
export interface NoteStyle {
  shape: Shape
  bgKind: BgKind
  bgColor: string // solid fill / paper tint
  gradient: string // full CSS gradient (used when bgKind === 'gradient')
  pattern?: NotePattern // interior texture overlay (defaults to 'none')
  borderColor: string
  borderWidth: number // px
  radius: number // px (ignored by circle/hexagon)
  shadow: number // 0..1 drop-shadow intensity
  opacity: number // 0..1
  // sticker
  stickerUrl: string // image URL (empty = no sticker)
  stickerPos: StickerPos
  stickerSize: number // px
  stickerRotation: number // degrees
  stickerText: string // caption overlay (max 15 words)
  stickerX: number // % horizontal position within note (0-100)
  stickerY: number // % vertical position within note (0-100)
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
  kind: 'note' | 'sticker'
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
  // free pin points (world space). When present they override the port anchors,
  // so a thread can be pinned to any spot on the two notes — crime-board style.
  fromPt?: Pt | null
  toPt?: Pt | null
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

/** New boards start with a single neutral "red yarn" link as a baseline so the
 *  canvas can draw immediately; every other thread is created by the user. */
export const BUILTIN_CONNECTION_TYPES: ConnectionType[] = []

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
    shape: 'rounded',
    bgKind: 'solid',
    bgColor: '#FEF3C7',
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))',
    pattern: 'none',
    stickerUrl: '',
    stickerPos: 'top-right',
    stickerSize: 56,
    stickerRotation: 0,
    stickerText: '',
    stickerX: 70,
    stickerY: 10,
    borderColor: 'rgba(0,0,0,0.08)',
    borderWidth: 1,
    radius: 16,
    shadow: 0.3,
    opacity: 1,
    font: FONT_OPTIONS[0].value,
    fontSize: 16,
    fontWeight: 400,
    textColor: '#2B2B2B',
    align: 'left',
    lineHeight: 1.6,
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
  { id: 'idea', name: 'Idea', swatch: '#F5D76E', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#FFF8E1', borderColor: '#F0E0A0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#5A4A10' } },
  { id: 'question', name: 'Question', swatch: '#C8A2FF', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#F3E8FF', borderColor: '#D8C0F0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#4A2A72' } },
  { id: 'important', name: 'Important', swatch: '#FF8A7A', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#FFE8E0', borderColor: '#F0C0B0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#7A3222' } },
  { id: 'api', name: 'API', swatch: '#6EDCD5', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#E0F5F0', borderColor: '#B0E0D0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#1E5A4A' } },
  { id: 'backend', name: 'Backend', swatch: '#A88FD4', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#E8E0F5', borderColor: '#C8B8E0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#3A2A5A' } },
  { id: 'frontend', name: 'Frontend', swatch: '#7AA8F0', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#E0ECFF', borderColor: '#B0C8F0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#1E3A6A' } },
  { id: 'database', name: 'Database', swatch: '#C4A87A', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#F0E8D8', borderColor: '#D8C8B0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#5A3A22' } },
  { id: 'success', name: 'Success', swatch: '#5CD68A', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#E0F8E8', borderColor: '#A8E0B8', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#1A5A2A' } },
  { id: 'architecture', name: 'Architecture', swatch: '#B88FD4', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#F0E0F8', borderColor: '#D8B8E8', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#4A2A6A' } },
]

/** Cute / Korean-aegyo gradient looks — clean pastel washes, no patterns. */
export const NOTE_CUTE_PRESETS: NotePreset[] = [
  { id: 'matcha', name: 'Matcha', swatch: '#A8D99C', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#D8F0D0', pattern: 'lines', borderColor: '#C4DEB8', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#2E5A2C' } },
  { id: 'lavender', name: 'Lavender', swatch: '#CDB4FF', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#E8E0FF', pattern: 'grid', borderColor: '#D4C4F0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#4A2A72' } },
  { id: 'peach', name: 'Peach', swatch: '#FFB88C', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#FFE0CC', pattern: 'diagonal', borderColor: '#F0D0B8', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#7A3A22' } },
  { id: 'blueberry', name: 'Blueberry', swatch: '#93A8FF', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#D0D8FF', pattern: 'crosshatch', borderColor: '#C0C8F0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#2E3A72' } },
  { id: 'bubblegum', name: 'Bubblegum', swatch: '#FF9EE0', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#FFD8F5', pattern: 'zigzag', borderColor: '#E8C8F0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#5E2A66' } },
  { id: 'mint', name: 'Mint', swatch: '#7EECD3', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#D0F5EC', pattern: 'dots', borderColor: '#B8E0D4', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#1E5A4A' } },
  { id: 'lemon', name: 'Lemon', swatch: '#FFE566', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#FFF5C0', pattern: 'lines', borderColor: '#F0E8A8', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#6A541A' } },
  { id: 'milktea', name: 'Milk Tea', swatch: '#D4B896', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#EDE0D0', pattern: 'grid', borderColor: '#D8C8B0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#5A3A22' } },
  { id: 'coral', name: 'Coral', swatch: '#FF9A8B', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#FFE0D8', pattern: 'diagonal', borderColor: '#F0C0B0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#7A3222' } },
  { id: 'sky', name: 'Sky', swatch: '#82C8FF', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#D0E8FF', pattern: 'crosshatch', borderColor: '#B8D8F0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#1E4A66' } },
  { id: 'cotton', name: 'Cotton', swatch: '#C8BFFF', patch: { shape: 'rounded', bgKind: 'solid', bgColor: '#E8E4FF', pattern: 'dots', borderColor: '#D8D0F0', borderWidth: 1, radius: 16, shadow: 0.3, textColor: '#3A3466' } },
]

/** Predefined sticky note templates with rich HTML content.
 *  Each template includes a name, style, default size, and editable HTML body. */
export interface NoteTemplate {
  id: string
  name: string
  icon: string
  style: Partial<NoteStyle>
  w: number
  h: number
  html: string
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'todo',
    name: 'To-Do List',
    icon: '✅',
    style: { bgKind: 'solid', bgColor: '#FFFEF5', borderColor: '#F0E8A0', textColor: '#4A4A1A' },
    w: 240,
    h: 280,
    html: `<h3 style="margin:0 0 8px;font-size:15px;">To-Do ✅</h3>
<ul style="margin:0;padding-left:18px;">
  <li>Library return Bronte 📚</li>
  <li>Tea time @ 4 earl grey + milk</li>
  <li>Mushroom walk in woods 🍄</li>
  <li>Water plants 🌿</li>
</ul>
<p style="margin:10px 0 0;font-size:12px;opacity:0.6;">UK cottage • slow morning</p>`,
  },
  {
    id: 'study-log',
    name: 'Study Log',
    icon: '📖',
    style: { bgKind: 'solid', bgColor: '#F5FAF0', borderColor: '#C0DEB0', textColor: '#2A4A20' },
    w: 260,
    h: 240,
    html: `<h3 style="margin:0 0 4px;font-size:15px;">📖 Study Log <span style="font-weight:400;font-size:12px;opacity:0.6;">— chapter notes</span></h3>
<p style="margin:0 0 8px;font-size:13px;"><b>Jane Eyre pg 42-89</b> — minor notes 🌿</p>
<ul style="margin:0;padding-left:18px;font-size:13px;">
  <li>Folklore herbs: mugwort for dreams</li>
  <li>Vocals: wisteria, perfume</li>
</ul>
<p style="margin:10px 0 0;font-size:12px;opacity:0.5;">tea stain here ☕</p>`,
  },
  {
    id: 'memory',
    name: 'Memory Note',
    icon: '💭',
    style: { bgKind: 'solid', bgColor: '#FFF5F8', borderColor: '#F0C0D0', textColor: '#6A2040' },
    w: 240,
    h: 200,
    html: `<h3 style="margin:0 0 8px;font-size:15px;">💭 Memory</h3>
<p style="margin:0;font-size:14px;line-height:1.6;">
  오늘도 화이팅 — you got this! 🌸
</p>
<p style="margin:8px 0 0;font-size:12px;opacity:0.5;">hey cat, you can do it! 🐱</p>`,
  },
  {
    id: 'blank',
    name: 'Blank Note',
    icon: '📝',
    style: { bgKind: 'solid', bgColor: '#FEF3C7', borderColor: 'rgba(0,0,0,0.08)', textColor: '#4A3A10' },
    w: 220,
    h: 180,
    html: `<p style="margin:0;font-size:14px;">Start writing...</p>`,
  },
  {
    id: 'journal',
    name: 'Journal Entry',
    icon: 'Journal',
    style: { bgKind: 'solid', bgColor: '#FBF8F2', borderColor: '#E0D4C0', textColor: '#3A3020' },
    w: 280,
    h: 300,
    html: `<h3 style="margin:0 0 8px;font-size:15px;">Journal 📔</h3>
<p style="margin:0 0 6px;font-size:12px;opacity:0.5;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
<p style="margin:0;font-size:14px;line-height:1.7;">
  Dear diary,<br><br>
  Today was a good day. I spent the morning at the library reading Jane Eyre...
</p>`,
  },
  {
    id: 'korean-study',
    name: 'Korean Study',
    icon: '🇰🇷',
    style: { bgKind: 'solid', bgColor: '#F0F5FF', borderColor: '#B0C8F0', textColor: '#1A3060' },
    w: 240,
    h: 220,
    html: `<h3 style="margin:0 0 8px;font-size:15px;">🇰🇷 Korean Study</h3>
<p style="margin:0 0 4px;font-size:13px;"><b>오늘의 단어</b></p>
<ul style="margin:0;padding-left:18px;font-size:13px;">
  <li>사랑 (sarang) — love</li>
  <li>행복 (haengbok) — happiness</li>
  <li>꿈 (kkum) — dream</li>
</ul>
<p style="margin:10px 0 0;font-size:12px;opacity:0.5;">화이팅! 💪</p>`,
  },
]

// ── Yarn palette ──────────────────────────────────────────────────────────────
// Colours styled after real investigation-board string.
export const YARN_COLORS: { name: string; hex: string }[] = [
  { name: 'Espresso', hex: '#281C12' },
  { name: 'Lavender', hex: '#C9B6FF' },
  { name: 'Sky',     hex: '#A8E7FF' },
  { name: 'Mint',    hex: '#B8F4D7' },
  { name: 'Peach',   hex: '#FFD3C8' },
  { name: 'Butter',  hex: '#FFF1A8' },
  { name: 'Rose',    hex: '#FFB4C8' },
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
    kind: 'note',
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
  const fallback: ConnectionType = { id: 'fallback', name: 'Link', color: '#281C12', thickness: 2.5, lineStyle: 'solid', curve: 'curved', glow: 0.3, builtin: false }
  const t = type ?? fallback
  return {
    color: edge.yarnColor ?? type?.yarnColor ?? edge.color ?? t.color,
    thickness: edge.thickness ?? t.thickness,
    lineStyle: edge.yarnStyle ?? type?.yarnStyle ?? edge.lineStyle ?? t.lineStyle,
    curve: edge.curve ?? t.curve,
    glow: edge.glow ?? t.glow,
  }
}
