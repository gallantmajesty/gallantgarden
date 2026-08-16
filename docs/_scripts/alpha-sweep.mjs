import { chromium } from 'playwright'

// Probe the RAW WebGL canvas alpha to find the character's true bounding box.
// Background is transparent on the canvas (bg=warm uses DOM gradient), so
// alpha > threshold == character pixels only.
const combos = [
  { zoom: 1.5, camY: 0.85 },
  { zoom: 1.8, camY: 0.9 },
  { zoom: 2.0, camY: 0.95 },
  { zoom: 2.2, camY: 1.0 },
  { zoom: 2.5, camY: 1.05 },
  { zoom: 2.8, camY: 1.1 },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 576, height: 1024 }, deviceScaleFactor: 1 })

for (const c of combos) {
  const url = `http://localhost:5201/__shot?char=mia&view=front&bg=warm&look=char&zoom=${c.zoom}&camY=${c.camY}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('#shot-ready', { timeout: 30000 })
  // Wait for paint: some opaque pixels must exist in the lower-middle region.
  await page.waitForFunction(() => {
    const cv = document.querySelector('canvas')
    if (!cv) return false
    try {
      const t = document.createElement('canvas')
      t.width = 24
      t.height = 48
      const ctx = t.getContext('2d')
      ctx.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 24, 48)
      const d = ctx.getImageData(0, 0, 24, 48).data
      let count = 0
      for (let i = 3; i < d.length; i += 4) if (d[i] > 40) count++
      return count > 200
    } catch { return false }
  }, { timeout: 90000 }).catch(() => console.log('paint never full'))
  await page.waitForTimeout(1500)
  const r = await page.evaluate(() => {
    const cv = document.querySelector('canvas')
    const t = document.createElement('canvas')
    t.width = cv.width
    t.height = cv.height
    const ctx = t.getContext('2d')
    ctx.drawImage(cv, 0, 0)
    const d = ctx.getImageData(0, 0, t.width, t.height).data
    let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1, px = 0
    for (let y = 0; y < t.height; y++) {
      for (let x = 0; x < t.width; x++) {
        const a = d[(y * t.width + x) * 4 + 3]
        if (a > 40) {
          px++
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    const w = t.width, h = t.height
    return {
      px,
      topPct: minY === Infinity ? null : Math.round((minY / h) * 100),
      bottomPct: maxY === -1 ? null : Math.round((maxY / h) * 100),
      leftPct: minX === Infinity ? null : Math.round((minX / w) * 100),
      rightPct: maxX === -1 ? null : Math.round((maxX / w) * 100),
    }
  })
  console.log(`zoom=${c.zoom} camY=${c.camY} -> px=${r.px} top=${r.topPct}% bottom=${r.bottomPct}% left=${r.leftPct}% right=${r.rightPct}%`)
}
await browser.close()
