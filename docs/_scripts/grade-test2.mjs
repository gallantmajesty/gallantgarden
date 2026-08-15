import { chromium } from 'playwright'

const URL = 'http://localhost:5201/__shot?char=mia&view=front&bg=warm&look=char'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1152, height: 2048 }, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForSelector('#shot-ready', { timeout: 30000 })
await page.waitForTimeout(12000)

const r = await page.evaluate(async () => {
  const c = document.querySelector('canvas')
  const out = document.createElement('canvas')
  out.width = c.width
  out.height = c.height
  const ctx = out.getContext('2d')
  const lg = ctx.createLinearGradient(0, out.height, out.width, 0)
  lg.addColorStop(0, '#c68f52')
  lg.addColorStop(0.55, '#d9a763')
  lg.addColorStop(1, '#e7cb90')
  ctx.fillStyle = lg
  ctx.fillRect(0, 0, out.width, out.height)
  const readPx = (cv) => {
    const c2 = cv.getContext('2d')
    const d = c2.getImageData(5, 5, 1, 1).data
    const d2 = c2.getImageData(cv.width - 6, 5, 1, 1).data
    return { tl: [d[0], d[1], d[2], d[3]], tr: [d2[0], d2[1], d2[2], d2[3]] }
  }
  const before = readPx(out)
  const img = new Image()
  img.src = c.toDataURL('image/png')
  await img.decode()
  ctx.drawImage(img, 0, 0)
  const afterDraw = readPx(out)
  const webp = out.toDataURL('image/webp', 0.92)
  return { before, afterDraw, webpLen: webp.length }
})
console.log(JSON.stringify(r))
await browser.close()
