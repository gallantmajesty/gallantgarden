import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const files = ['public/icons/characters/james.webp', 'public/icons/characters/mia.webp']
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent('<div></div>')

for (const f of files) {
  const b64 = readFileSync(f).toString('base64')
  const r = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/webp;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    const at = (x, y) => {
      const i = (Math.floor(y) * c.width + Math.floor(x)) * 4
      return [d[i], d[i + 1], d[i + 2], d[i + 3]]
    }
    // Vertical scan at x=0.5: find rows that are "character-ish" (differ from bg)
    const bgTL = at(8, 8)
    const isChar = (y) => {
      const [r, g, b] = at(c.width * 0.5, y)
      const dist = Math.abs(r - bgTL[0]) + Math.abs(g - bgTL[1]) + Math.abs(b - bgTL[2])
      return dist > 60
    }
    const rows = []
    for (let y = 0.04; y <= 0.98; y += 0.02) rows.push(y)
    const charRows = rows.filter((y) => isChar(c.height * y))
    // Also sample a horizontal spread at the widest (chest) region
    const samples = []
    for (let y = 0.1; y <= 0.95; y += 0.05) samples.push({ y: +(y * 100).toFixed(0), px: at(c.width * 0.5, c.height * y) })
    return {
      topPct: charRows.length ? Math.round(charRows[0] * 100) : null,
      bottomPct: charRows.length ? Math.round(charRows[charRows.length - 1] * 100) : null,
      samples,
    }
  }, b64)
  console.log(f, JSON.stringify(r))
}
await browser.close()
