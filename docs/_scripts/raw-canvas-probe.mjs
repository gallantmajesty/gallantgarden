import { chromium } from 'playwright'

const URL = 'http://localhost:5201/__shot?char=mia&view=front&bg=warm&look=char'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1152, height: 2048 }, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForSelector('#shot-ready', { timeout: 30000 })
await page.waitForTimeout(9000)

const r = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const out = document.createElement('canvas')
  out.width = c.width
  out.height = c.height
  const ctx = out.getContext('2d')
  ctx.drawImage(c, 0, 0)
  const d = ctx.getImageData(0, 0, out.width, out.height).data
  const at = (x, y) => {
    const i = (y * out.width + x) * 4
    return [d[i], d[i + 1], d[i + 2], d[i + 3]]
  }
  return {
    size: [c.width, c.height],
    tl: at(5, 5),
    tr: at(out.width - 6, 5),
    bl: at(5, out.height - 6),
    br: at(out.width - 6, out.height - 6),
    center: at(Math.floor(out.width / 2), Math.floor(out.height * 0.6)),
  }
})
console.log(JSON.stringify(r))
await browser.close()
