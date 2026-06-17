// Slice the Focus Lily rank-badge sheet into individual transparent PNGs.
// Source: a 1536x1024 sheet, 5 columns x 2 rows of circular badges, each with a
// text label beneath. We crop each badge's art (excluding its label), key the
// near-white paper background out to transparent, autocrop the margin, and fit
// into a clean 256x256 square — matching how slice-icons.mjs produces the rest
// of the icon set.
import { Jimp } from 'jimp'

const SRC = 'C:/Users/taksh/Downloads/ChatGPT Image Jun 16, 2026, 11_42_44 PM.png'
const OUT = 'C:/Users/taksh/studyforest/public/icons/ranks'

// badge-art geometry measured from the 1536x1024 sheet by ink-profile analysis.
// COL gives each badge's exact horizontal span [x0,x1]; the circular badge is as
// tall as it is wide, so we crop a square of that width starting at ROW_TOP —
// this lands above the text label, excluding it by construction.
const COL = [[40, 277], [332, 572], [621, 857], [899, 1135], [1184, 1424]]
const ROW_TOP = [160, 543]

const NAMES = [
  ['brown-leaf', 'yellow-leaf', 'green-leaf', 'bronze-leaf', 'silver-leaf'],
  ['golden-leaf', 'red-flower', 'fire-flower', 'platinum-bunch', 'forest-guardian'],
]

// The sheet background is near-white. Sample tile corners for the local paper
// colour and remove anything within `tol`, with a soft feather at the edge.
function keyOutBackground(img, tol = 38) {
  const { data, width, height } = img.bitmap
  const idx = (x, y) => (y * width + x) * 4
  const samples = [idx(2, 2), idx(width - 3, 2), idx(2, height - 3), idx(width - 3, height - 3)]
  let br = 0, bg = 0, bb = 0
  for (const s of samples) { br += data[s]; bg += data[s + 1]; bb += data[s + 2] }
  br /= samples.length; bg /= samples.length; bb /= samples.length
  for (let p = 0; p < data.length; p += 4) {
    const dr = data[p] - br, dg = data[p + 1] - bg, db = data[p + 2] - bb
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    if (dist < tol) {
      data[p + 3] = 0
    } else if (dist < tol * 1.6) {
      data[p + 3] = Math.round(((dist - tol) / (tol * 0.6)) * 255)
    }
  }
}

// Keep only the densest content band (the badge), dropping the thin text label.
function extractArtBand(img, { gap = 22, minContent = 6 } = {}) {
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

function trimTransparent(img, pad = 6) {
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

async function squarePad(img, size = 256) {
  const w = img.bitmap.width, h = img.bitmap.height
  const scale = Math.min(size / w, size / h) * 0.96
  img.resize({ w: Math.round(w * scale), h: Math.round(h * scale) })
  const canvas = new Jimp({ width: size, height: size, color: 0x00000000 })
  canvas.composite(img, Math.round((size - img.bitmap.width) / 2), Math.round((size - img.bitmap.height) / 2))
  return canvas
}

const sheet = await Jimp.read(SRC)
let count = 0
for (let r = 0; r < ROW_TOP.length; r++) {
  for (let c = 0; c < COL.length; c++) {
    const name = NAMES[r][c]
    const [x0, x1] = COL[c]
    const w = x1 - x0
    const tile = sheet.clone().crop({
      x: x0,
      y: ROW_TOP[r],
      w,
      h: w, // square: the circular badge is as tall as it is wide; label sits below
    })
    keyOutBackground(tile)
    trimTransparent(tile)
    const out = await squarePad(tile, 256)
    await out.write(`${OUT}/${name}.png`)
    count++
  }
}
console.log('wrote', count, 'rank badges to', OUT)
