// Translate a NoteStyle into concrete CSS. Shared by the live <NoteNode> and the
// PNG exporter so an exported board looks exactly like the editor.

import type { CSSProperties } from 'react'
import type { NoteMedia, NoteStyle, Shape } from './types'

const HEXAGON = 'polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%)'
const BOOKMARK = 'polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%)'

export function shapeClip(shape: Shape): string | undefined {
  if (shape === 'hexagon') return HEXAGON
  if (shape === 'bookmark') return BOOKMARK
  return undefined
}

export function shapeRadius(style: NoteStyle): number | string {
  switch (style.shape) {
    case 'circle':
      return '50%'
    case 'rect':
    case 'hexagon':
    case 'bookmark':
      return 0
    case 'document':
      return 4
    case 'polaroid':
      return 3
    case 'sticky':
      return Math.min(style.radius, 10)
    default:
      return style.radius
  }
}

/** The fill (background) for a note, given the active theme accent + panel var. */
export function noteBackground(style: NoteStyle): string {
  switch (style.bgKind) {
    case 'gradient':
      return style.gradient
    case 'glass':
      return 'var(--glass-fill-strong)'
    case 'paper':
      return `${style.bgColor}`
    case 'theme':
      return 'var(--mg-panel, rgba(255,255,255,0.85))'
    case 'solid':
    default:
      return style.bgColor
  }
}

/** Layered paper texture (faint ruled lines) applied as an extra background. */
export const PAPER_TEXTURE =
  'repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(0,0,0,0.05) 23px), ' +
  'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5), transparent 60%)'

/**
 * Full surface style for a note. `forExport` swaps backdrop-blur effects (which
 * can't rasterise) for an opaque approximation.
 */
export function noteSurfaceStyle(style: NoteStyle, opts?: { forExport?: boolean }): CSSProperties {
  const glow = style.glow > 0 ? `0 0 ${8 + style.glow * 26}px rgba(var(--mg-accent-rgb,91,124,250), ${0.14 + style.glow * 0.4})` : ''
  const shadow = style.shadow > 0 ? `0 ${3 + style.shadow * 10}px ${8 + style.shadow * 24}px rgba(20,30,60,${0.08 + style.shadow * 0.22})` : ''
  const boxShadow = [glow, shadow].filter(Boolean).join(', ') || 'none'

  const base: CSSProperties = {
    background: noteBackground(style),
    border: `${style.borderWidth}px solid ${style.borderColor}`,
    borderRadius: shapeRadius(style),
    clipPath: shapeClip(style.shape),
    boxShadow,
    opacity: style.opacity,
    color: style.textColor,
    fontFamily: style.font,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    textAlign: style.align,
    lineHeight: style.lineHeight,
    textDecoration: style.underline ? 'underline' : 'none',
  }

  if (style.bgKind === 'paper') {
    base.backgroundImage = PAPER_TEXTURE
  }
  if (style.bgKind === 'glass' && !opts?.forExport) {
    base.backdropFilter = 'blur(8px) saturate(120%)'
    ;(base as Record<string, string>).WebkitBackdropFilter = 'blur(8px) saturate(120%)'
  }
  if (style.bgKind === 'glass' && opts?.forExport) {
    base.background = 'rgba(255,255,255,0.55)'
  }
  return base
}

/** CSS for the <img> inside a note, honouring fit / rotate / opacity / radius.
 *  Used for the "top banner" placement. */
export function mediaImageStyle(media: NoteMedia): CSSProperties {
  return {
    objectFit: media.fit ?? 'cover',
    opacity: media.opacity ?? 1,
    borderRadius: media.radius ?? 8,
    transform: media.rotate ? `rotate(${media.rotate}deg)` : undefined,
  }
}

/** CSS for a full-bleed background image layer behind the note's text. */
export function mediaBackgroundStyle(media: NoteMedia): CSSProperties {
  const fit = media.fit ?? 'cover'
  return {
    backgroundImage: `url(${media.url})`,
    backgroundSize: fit === 'fill' ? '100% 100%' : fit,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: media.opacity ?? 1,
    transform: media.rotate ? `rotate(${media.rotate}deg)` : undefined,
  }
}
