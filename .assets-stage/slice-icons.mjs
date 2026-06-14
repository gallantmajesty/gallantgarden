// Slice the Focus Lily icon sheet into individual transparent PNGs.
// Source: a 1536x1024 watercolour sheet, 5 columns x 3 rows of labelled icons
// (plus a logo lockup at the bottom). We crop each icon's art (excluding its
// text label), key the cream paper background out to transparent, autocrop the
// transparent margin, then fit into a clean 256x256 square.
import { Jimp } from 'jimp'

const SRC = 'C:/Users/taksh/Downloads/ChatGPT Image Jun 13, 2026, 11_29_21 PM.png'
const OUT = 'C:/Users/taksh/studyforest/public/icons'

// icon-art geometry measured against the 1536x1024 sheet. Column centres, and
// per-row vertical bands chosen to contain ONLY the icon art — the text label
// under each icon falls below ROW_TOP+ROW_H, so it is excluded by construction.
const COLS = [216, 508, 800, 1080, 1372]
// labels measured at source y ~250 / ~540 / ~795 — bands end above each.
const ROW_TOP = [45, 315, 598]
const ROW_H = [198, 212, 188]
const TILE_W = 280

const NAMES = [
  ['tasks', 'notes', 'analytics', 'focus-timer', 'calendar'],
  ['achievements', 'streaks', 'goals', 'habits', 'study-rooms'],
  ['realm', 'friends', 'messages', 'profile', 'settings'],
]

// Treat pixels close to the paper background colour as transparent. We sample the
// top-left corner of each tile as the local paper colour (lighting varies a bit
// across the sheet) and remove anything within `tol` of it.
function keyOutBackground(img, tol = 26) {
  const { data, width, height } = img.bitmap
  const idx = (x, y) => (y * width + x) * 4
  // sample a few corner pixels for a robust paper colour
  const samples = [idx(2, 2), idx(width - 3, 2), idx(2, height - 3), idx(width - 3, height - 3)]
  let br = 0, bg = 0, bb = 0
  for (const s of samples) { br += data[s]; bg += data[s + 1]; bb += data[s + 2] }
  br /= samples.length; bg /= samples.length; bb /= samples.length
  for (let p = 0; p < data.length; p += 4) {
    const dr = data[p] - br, dg = data[p + 1] - bg, db = data[p + 2] - bb
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    if (dist < tol) {
      data[p + 3] = 0 // fully transparent
    } else if (dist < tol * 2) {
      // soft feather at the edge so watercolour fringes don't get a hard halo
      data[p + 3] = Math.round(((dist - tol) / tol) * 255)
    }
  }
}

// The tile can contain [neighbour label][gap][ART][gap][own label]. Segment the
// rows into content bands separated by transparent gaps and keep only the band
// with the most ink (the icon art) — both the art's own text label and any
// label bleeding in from the row above are thin, low-density bands and get
// dropped. Robust to small centring errors.
function extractArtBand(img, { gap = 18, minContent = 5 } = {}) {
  const { data, width, height } = img.bitmap
  const rowContent = new Array(height).fill(0)
  for (let y = 0; y < height; y++) {
    let n = 0
    for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 24) n++
    rowContent[y] = n
  }
  const bands = []
  let start = -1
  let emptyRun = 0
  for (let y = 0; y <= height; y++) {
    const has = y < height && rowContent[y] >= minContent
    if (has) {
      if (start < 0) start = y
      emptyRun = 0
    } else if (start >= 0) {
      emptyRun++
      if (emptyRun >= gap || y === height) {
        bands.push({ top: start, bottom: y - emptyRun })
        start = -1
        emptyRun = 0
      }
    }
  }
  if (bands.length === 0) return img
  let best = bands[0]
  let bestInk = 0
  for (const b of bands) {
    let ink = 0
    for (let y = b.top; y <= b.bottom; y++) ink += rowContent[y]
    if (ink > bestInk) { bestInk = ink; best = b }
  }
  return img.crop({ x: 0, y: best.top, w: width, h: Math.max(1, best.bottom - best.top + 1) })
}

// autocrop to the non-transparent bounding box (with a small padding)
function trimTransparent(img, pad = 8) {
  const { data, width, height } = img.bitmap
  let minX = width, minY = height, maxX = 0, maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return img
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad)
  return img.crop({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 })
}

// centre the trimmed art on a transparent square canvas of `size`
async function squarePad(img, size = 256) {
  const w = img.bitmap.width, h = img.bitmap.height
  const scale = Math.min(size / w, size / h) * 0.92
  img.resize({ w: Math.round(w * scale), h: Math.round(h * scale) })
  const canvas = new Jimp({ width: size, height: size, color: 0x00000000 })
  canvas.composite(img, Math.round((size - img.bitmap.width) / 2), Math.round((size - img.bitmap.height) / 2))
  return canvas
}

const sheet = await Jimp.read(SRC)
let count = 0
for (let r = 0; r < ROW_TOP.length; r++) {
  for (let c = 0; c < COLS.length; c++) {
    const name = NAMES[r][c]
    const cx = COLS[c]
    const tile = sheet.clone().crop({
      x: Math.max(0, cx - TILE_W / 2),
      y: ROW_TOP[r],
      w: TILE_W,
      h: ROW_H[r],
    })
    keyOutBackground(tile)
    extractArtBand(tile)
    trimTransparent(tile)
    const out = await squarePad(tile, 256)
    await out.write(`${OUT}/${name}.png`)
    count++
  }
}
// the lotus + "FOCUS LILY" wordmark lockup at the foot of the sheet
{
  const logo = sheet.clone().crop({ x: 545, y: 850, w: 446, h: 168 })
  keyOutBackground(logo)
  trimTransparent(logo, 10)
  const w = logo.bitmap.width, h = logo.bitmap.height
  const size = 512
  const scale = Math.min(size / w, (size / 2) / h) * 0.98
  logo.resize({ w: Math.round(w * scale), h: Math.round(h * scale) })
  await logo.write(`${OUT}/focus-lily-logo.png`)
  // just the lotus mark (upper portion of the lockup)
  const lotus = sheet.clone().crop({ x: 660, y: 850, w: 216, h: 96 })
  keyOutBackground(lotus)
  trimTransparent(lotus, 8)
  await (await squarePad(lotus, 256)).write(`${OUT}/lotus.png`)
}
console.log('wrote', count, 'icons + logo to', OUT)
