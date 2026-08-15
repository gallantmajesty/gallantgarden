// Samples corner + center pixels of character thumbnails to learn their
// background so a new Mia render can match.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const files = [
  'public/icons/characters/james.webp',
  'public/icons/characters/lily.webp',
  'public/icons/characters/pig.webp',
  'public/icons/characters/alien.webp',
]

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent('<div id="out"></div>')

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
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    const at = (x, y) => {
      const i = (y * c.width + x) * 4
      return [data[i], data[i + 1], data[i + 2], data[i + 3]]
    }
    return {
      w: c.width, h: c.height,
      tl: at(4, 4), tr: at(c.width - 5, 4), bl: at(4, c.height - 5), br: at(c.width - 5, c.height - 5),
      center: at(Math.floor(c.width / 2), Math.floor(c.height / 2)),
    }
  }, b64)
  console.log(f, JSON.stringify(r))
}

await browser.close()
