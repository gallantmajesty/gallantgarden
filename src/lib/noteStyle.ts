import type { StickyNote } from './types'

// A few preset "design" backgrounds the user can pick (no image needed).
export const DESIGN_PRESETS: Record<string, string> = {
  sunbeam: 'linear-gradient(135deg, #fff1a8 0%, #ffd34e 100%)',
  mint: 'linear-gradient(135deg, #d6ffe9 0%, #a8e6cf 100%)',
  blush: 'linear-gradient(135deg, #ffd9d4 0%, #ffaaa5 100%)',
  sky: 'linear-gradient(135deg, #d4f1ff 0%, #a5d8ff 100%)',
  lavender: 'linear-gradient(135deg, #ece4ff 0%, #c3b1ff 100%)',
  dotted: 'radial-gradient(#00000018 1.4px, #fffdf6 1.5px) 0 0 / 12px 12px',
  lined:
    'repeating-linear-gradient(#fffdf6, #fffdf6 22px, #00000014 23px, #fffdf6 24px)',
}

/** Resolve the CSS `background` value for a note from its style fields. */
export function noteBackground(note: Pick<StickyNote, 'color' | 'bg_style' | 'bg_value'>): string {
  if (note.bg_style === 'gradient' && note.bg_value) return note.bg_value
  if (note.bg_style === 'design' && note.bg_value) {
    return DESIGN_PRESETS[note.bg_value] ?? note.color
  }
  return note.color
}

/** Strip HTML to plain text for search + previews (browser only). */
export function htmlToText(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim()
}
