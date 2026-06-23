// tint.js — grayscale-mask tinting + procedural shape rendering.
//
// THE TINT TECHNIQUE (grayscale art -> any palette colour, shading preserved):
//   container  : background-color = tint  +  CSS mask = the art's alpha
//                  -> a crisp silhouette flooded with the chosen colour
//   inner <img>: the grayscale art, filter:grayscale(1), mix-blend-mode:multiply
//                  -> multiplies shading over the colour (white=full, black=dark)
// Result = colour x shading, clipped to the silhouette. One grayscale PNG ->
// every swatch, no per-colour assets.
//
// Until real PNGs exist, items render as `kind:'shape'` (a tinted rounded box),
// so the whole avatar works with zero image assets. Swap a layer to
// `kind:'image'` + `src` to use authored art with NO other code changes.
//
// GRACEFUL UPGRADE: an `image` layer may carry a `fallback` shape spec. If the
// PNG is missing/404s, we render the fallback shape instead — so the catalog can
// reference grayscale art that doesn't exist yet and the avatar still looks
// complete. The moment the PNG is dropped in, it renders automatically.

import { hexOf } from '../data/palettes.js'

/** Apply px-or-string box metrics shared by every layer kind. */
function place(el, s) {
  el.style.position = 'absolute'
  el.style.left = `${s.left}px`
  el.style.top = `${s.top}px`
  el.style.width = `${s.w}px`
  el.style.height = `${s.h}px`
  if (s.radius != null) {
    el.style.borderRadius = typeof s.radius === 'number' ? `${s.radius}px` : s.radius
  }
}

/** Build one sub-shape element for the given resolved hex tint. */
function createShape(s, hex) {
  if (s.kind === 'image') {
    // Grayscale-mask tint (see header).
    const wrap = document.createElement('div')
    wrap.className = 'av-layer av-layer--image'
    place(wrap, s)
    wrap.style.backgroundColor = hex
    const mask = `url("${s.src}") center / contain no-repeat`
    wrap.style.webkitMaskImage = `url("${s.src}")`
    wrap.style.maskImage = `url("${s.src}")`
    wrap.style.webkitMask = mask
    wrap.style.mask = mask
    const img = document.createElement('img')
    img.src = s.src
    img.alt = ''
    img.draggable = false
    img.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;' +
      'filter:grayscale(1);mix-blend-mode:multiply;pointer-events:none;'
    // If the PNG isn't there yet, drop back to the procedural shape.
    img.onerror = () => {
      const fb = s.fallback ? buildLayer(s.fallback, hex) : createShape({ ...s, kind: 'shape' }, hex)
      wrap.replaceWith(fb)
    }
    wrap.appendChild(img)
    return wrap
  }

  if (s.kind === 'flat') {
    // Full-colour art, no tint (decals, printed logos, eyes with whites, etc.).
    const img = document.createElement('img')
    img.src = s.src
    img.alt = ''
    img.draggable = false
    img.className = 'av-layer av-layer--flat'
    place(img, s)
    img.style.objectFit = 'contain'
    img.style.pointerEvents = 'none'
    return img
  }

  // Default: procedural shape — a tinted rounded box (no assets needed).
  // Priority: raw `fill` hex (eye whites, shine) > fixed swatch `color` > slot tint.
  const div = document.createElement('div')
  div.className = 'av-layer av-layer--shape'
  place(div, s)
  div.style.backgroundColor = s.fill || (s.color ? hexOf(s.color) : hex)
  if (s.border) div.style.border = s.border // thin frames (glasses, etc.)
  if (s.flat) div.style.boxShadow = 'none' // opt out of the baked AO shading
  return div
}

/**
 * Build a cosmetic/base layer into a DocumentFragment.
 * @param {Array|Object} art   One shape or an array of sub-shapes.
 * @param {string} hex         Resolved tint colour for this layer.
 * @returns {DocumentFragment}
 */
export function buildLayer(art, hex) {
  const shapes = Array.isArray(art) ? art : [art]
  const frag = document.createDocumentFragment()
  for (const s of shapes) frag.appendChild(createShape(s, hex))
  return frag
}

/** Recolour an already-built shape element in place (used for live skin tint). */
export function setShapeColor(el, hex) {
  if (el && el.classList.contains('av-layer--shape')) el.style.backgroundColor = hex
}
