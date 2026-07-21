// Translate a NoteStyle into concrete CSS. Shared by the live <NoteNode> and the
// PNG exporter so an exported board looks exactly like the editor.

import type { CSSProperties } from 'react'
import type { NoteMedia, NotePattern, NoteStyle, Shape } from './types'

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

/** Generate a CSS backgroundImage for interior note patterns. */
export function notePatternTexture(pattern: NotePattern, tint: string): string | undefined {
  switch (pattern) {
    case 'dots':
      return `radial-gradient(circle, ${tint} 2px, transparent 2px)`
    case 'lines':
      return `repeating-linear-gradient(0deg, transparent, transparent 16px, ${tint} 17px)`
    case 'grid':
      return `linear-gradient(${tint} 1.5px, transparent 1.5px), linear-gradient(90deg, ${tint} 1.5px, transparent 1.5px)`
    case 'diagonal':
      return `repeating-linear-gradient(45deg, transparent, transparent 10px, ${tint} 11px)`
    case 'crosshatch':
      return `repeating-linear-gradient(45deg, transparent, transparent 10px, ${tint} 11px), repeating-linear-gradient(-45deg, transparent, transparent 10px, ${tint} 11px)`
    case 'zigzag':
      return `linear-gradient(135deg, ${tint} 25%, transparent 25%) -10px 0, linear-gradient(225deg, ${tint} 25%, transparent 25%) -10px 0, linear-gradient(315deg, ${tint} 25%, transparent 25%), linear-gradient(45deg, ${tint} 25%, transparent 25%)`
    default:
      return undefined
  }
}

/** Returns the CSS background-size needed for zigzag (other patterns tile at 100%). */
export function notePatternSize(pattern: NotePattern): string | undefined {
  if (pattern === 'zigzag') return '20px 20px'
  if (pattern === 'dots') return '18px 18px'
  if (pattern === 'grid') return '24px 24px'
  return undefined
}

/**
 * Full surface style for a note. `forExport` swaps backdrop-blur effects (which
 * can't rasterise) for an opaque approximation.
 */
export function noteSurfaceStyle(style: NoteStyle, opts?: { forExport?: boolean }): CSSProperties {
  const shadow = style.shadow > 0 ? `0 ${2 + style.shadow * 6}px ${4 + style.shadow * 12}px rgba(0,0,0,${0.04 + style.shadow * 0.08})` : 'none'
  const hasPaper = style.bgKind === 'paper'
  const hasPattern = style.pattern && style.pattern !== 'none'

  const base: CSSProperties = {
    border: `${style.borderWidth}px solid ${style.borderColor}`,
    borderRadius: shapeRadius(style),
    clipPath: shapeClip(style.shape),
    boxShadow: shadow,
    opacity: style.opacity,
    color: style.textColor,
    fontFamily: style.font,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    textAlign: style.align,
    lineHeight: style.lineHeight,
    textDecoration: style.underline ? 'underline' : 'none',
  }

  const textColor = style.textColor || '#000000'
  const patternColor = textColor.length === 7
    ? `${textColor}22`
    : `rgba(0,0,0,0.15)`
  const patternImage = hasPattern ? notePatternTexture(style.pattern, patternColor) : undefined
  const patternSz = hasPattern ? notePatternSize(style.pattern) : undefined

  if (hasPaper) {
    base.backgroundColor = style.bgColor
    base.backgroundImage = patternImage
      ? `${PAPER_TEXTURE}, ${patternImage}`
      : PAPER_TEXTURE
    if (patternSz) base.backgroundSize = patternSz
    base.backgroundRepeat = 'repeat'
  } else if (hasPattern) {
    base.backgroundColor = noteBackground(style)
    base.backgroundImage = patternImage
    if (patternSz) base.backgroundSize = patternSz
    base.backgroundRepeat = 'repeat'
  } else {
    base.background = noteBackground(style)
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
