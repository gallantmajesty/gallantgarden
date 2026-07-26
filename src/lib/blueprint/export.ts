// Export a board to a PNG with no external dependencies.
//
// We build one SVG of the whole board — edges as <path>, each note as a
// <foreignObject> holding its real HTML — then rasterise it by drawing the SVG
// (as a data-URL <image>) onto an offscreen <canvas> and reading toDataURL.
// (Cross-origin <img> media can taint the canvas; that's a documented limit.)

import type { BoardDoc } from './types'
import { resolveEdgeStyle } from './types'
import { edgePath, nodesBounds, portPoint } from './geom'
import { noteSurfaceStyle, PAPER_TEXTURE } from './style'
import { escapeHtml, sanitizeHtml } from '../sanitize'

function cssText(style: Record<string, unknown>): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${typeof v === 'number' && !UNITLESS.has(k) ? v + 'px' : v}`)
    .join(';')
}
const UNITLESS = new Set(['opacity', 'fontWeight', 'lineHeight', 'zIndex'])

export async function exportBoardPng(doc: BoardDoc, accentRgb = '138,108,255'): Promise<void> {
  if (doc.nodes.length === 0) return
  const b = nodesBounds(doc.nodes, 80)
  const scale = 2 // crisp export
  const W = Math.ceil(b.w)
  const H = Math.ceil(b.h)
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))

  // edges
  const edgeSvg = doc.edges
    .map((e) => {
      const a = byId.get(e.from)
      const c = byId.get(e.to)
      if (!a || !c) return ''
      const t = doc.connectionTypes.find((x) => x.id === e.typeId)
      const st = resolveEdgeStyle(e, t)
      const p1 = portPoint(a, e.fromPort)
      const p2 = portPoint(c, e.toPort)
      const d = edgePath({ x: p1.x - b.x, y: p1.y - b.y }, { x: p2.x - b.x, y: p2.y - b.y }, e.fromPort, e.toPort, st.curve)
      const dash = st.lineStyle === 'dashed' || st.lineStyle === 'animated' ? 'stroke-dasharray="8 7"' : ''
      return `<path d="${d}" stroke="${st.color}" stroke-width="${st.thickness}" fill="none" stroke-linecap="round" ${dash}/>`
    })
    .join('')

  // nodes (real HTML inside foreignObject)
  const nodeSvg = doc.nodes
    .map((n) => {
      const surface = noteSurfaceStyle(n.style, { forExport: true }) as Record<string, unknown>
      // foreignObject needs concrete sizing; fold layout into the surface css
      const surfaceCss = cssText({ ...surface, boxSizing: 'border-box', width: '100%', height: '100%', padding: 12, overflow: 'hidden', display: 'block' })
      const paper = n.style.bgKind === 'paper' ? `background-image:${PAPER_TEXTURE};` : ''
      let media = ''
      let bgMedia = ''
      if (n.media?.url) {
        const m = n.media
        const fit = m.fit ?? 'cover'
        const rot = m.rotate ? `transform:rotate(${m.rotate}deg);` : ''
        const op = `opacity:${m.opacity ?? 1};`
        if (m.place === 'background') {
          const size = fit === 'fill' ? '100% 100%' : fit
          bgMedia = `<div style="position:absolute;inset:0;background-image:url(${escapeHtml(m.url)});background-size:${size};background-position:center;background-repeat:no-repeat;${op}${rot}"></div>`
        } else {
          media = `<img src="${escapeHtml(m.url)}" style="width:100%;max-height:60%;object-fit:${fit};border-radius:${m.radius ?? 8}px;display:block;margin-bottom:6px;${op}${rot}position:relative"/>`
        }
      }
      const sticker = n.style.stickerUrl
        ? (() => {
            const sx = n.style.stickerX ?? 70
            const sy = n.style.stickerY ?? 10
            const sz = n.style.stickerSize ?? 56
            const rot = n.style.stickerRotation ?? 0
            const txt = n.style.stickerText
              ? `<span style="position:absolute;top:100%;left:50%;transform:translateX(-50%);font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,0.55);border-radius:6px;padding:2px 6px;max-width:120px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${escapeHtml(n.style.stickerText)}</span>`
              : ''
            return `<div style="position:absolute;left:${sx}%;top:${sy}%;transform:translate(-50%,-50%) rotate(${rot}deg);z-index:10;pointer-events:none;display:flex;flex-direction:column;align-items:center"><img src="${escapeHtml(n.style.stickerUrl)}" style="width:${sz}px;height:${sz}px;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.2));border-radius:8px" alt="" />${txt}</div>`
          })()
        : ''
      const icon = n.icon ? `<div style="position:absolute;top:6px;right:8px;font-size:18px;z-index:1">${escapeHtml(n.icon)}</div>` : ''
      return `<foreignObject x="${n.x - b.x}" y="${n.y - b.y}" width="${n.w}" height="${n.h}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="${surfaceCss}${paper};position:relative">
          ${bgMedia}${icon}${sticker}${media}
          <div style="position:relative;z-index:1">${sanitizeHtml(n.html)}</div>
        </div>
      </foreignObject>`
    })
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <style>:root{--mg-accent-rgb:${accentRgb};--mg-text:#1c2333;--mg-border:rgba(20,30,60,0.12);--mg-panel:#ffffff}p{margin:0 0 4px}h1,h2,h3{margin:0 0 4px}ul,ol{margin:0;padding-left:18px}</style>
    <rect width="${W}" height="${H}" fill="rgba(245,247,252,1)"/>
    ${edgeSvg}
    ${nodeSvg}
  </svg>`

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    const pngUrl = canvas.toDataURL('image/png')
    downloadDataUrl(pngUrl, `${sanitize(doc.title)}.png`)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function sanitize(s: string): string {
  return (s || 'blueprint').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
}
