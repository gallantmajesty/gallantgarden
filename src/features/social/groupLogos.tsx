import type { ReactElement } from 'react'

/* Group customization — a small catalog of study-themed logo glyphs and
 * avatar colors. No emojis: every logo is a clean inline SVG, drawn in the
 * same stroke style as the rest of the chat UI. */

export interface GroupLogo {
  id: string
  label: string
  node: ReactElement
}

const P = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function icon(children: ReactElement, extra?: ReactElement) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" {...P}>
      {children}
      {extra}
    </svg>
  )
}

const LEAF = icon(
  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />,
  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />,
)

const BOOK = icon(
  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />,
  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />,
)

const FLAME = icon(
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
)

const STAR = icon(<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />)

const BOLT = icon(<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />)

const ROCKET = icon(
  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />,
  <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />,
)

const TARGET = icon(
  <circle cx="12" cy="12" r="10" />,
  <path d="M12 6a6 6 0 0 1 6 6M12 10a2 2 0 0 1 2 2" />,
)

const CROWN = icon(
  <path d="M2 17h20" />,
  <path d="M4 17l-1-8 5.5 4L12 5l3.5 8L21 9l-1 8" />,
)

const PENCIL = icon(
  <path d="M12 20h9" />,
  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
)

const SHIELD = icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />)

const SPARK = icon(
  <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />,
  <path d="M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />,
)

const CHIP = icon(
  <rect x="5" y="5" width="14" height="14" rx="2" />,
  <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />,
)

const HEADPHONES = icon(
  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />,
  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />,
)

export const GROUP_LOGOS: GroupLogo[] = [
  { id: 'leaf', label: 'Leaf', node: LEAF },
  { id: 'book', label: 'Book', node: BOOK },
  { id: 'star', label: 'Star', node: STAR },
  { id: 'flame', label: 'Flame', node: FLAME },
  { id: 'bolt', label: 'Bolt', node: BOLT },
  { id: 'target', label: 'Target', node: TARGET },
  { id: 'crown', label: 'Crown', node: CROWN },
  { id: 'pencil', label: 'Pencil', node: PENCIL },
  { id: 'rocket', label: 'Rocket', node: ROCKET },
  { id: 'shield', label: 'Shield', node: SHIELD },
  { id: 'spark', label: 'Spark', node: SPARK },
  { id: 'headphones', label: 'Headphones', node: HEADPHONES },
  { id: 'chip', label: 'Chip', node: CHIP },
]

export function getGroupLogo(id: string | null | undefined): GroupLogo | null {
  if (!id) return null
  return GROUP_LOGOS.find((l) => l.id === id) ?? null
}

export interface GroupColor {
  id: string
  from: string
  to: string
  label: string
}

export const GROUP_COLORS: GroupColor[] = [
  { id: 'gold', from: '#caa84a', to: '#8a6b2f', label: 'Gold' },
  { id: 'forest', from: '#57a874', to: '#2f6b47', label: 'Forest' },
  { id: 'teal', from: '#3fb0c2', to: '#1f6f7f', label: 'Teal' },
  { id: 'ocean', from: '#5b88d8', to: '#2f5396', label: 'Ocean' },
  { id: 'violet', from: '#9373d6', to: '#5b4396', label: 'Violet' },
  { id: 'rose', from: '#dd7498', to: '#a23f63', label: 'Rose' },
  { id: 'ember', from: '#e8864a', to: '#a8501e', label: 'Ember' },
  { id: 'slate', from: '#7b8494', to: '#4a5160', label: 'Slate' },
]

export function getGroupColor(id: string | null | undefined): GroupColor {
  return GROUP_COLORS.find((c) => c.id === id) ?? GROUP_COLORS[0]
}
