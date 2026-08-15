import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent('<div></div>')
const r = await page.evaluate(() => {
  const out = document.createElement('canvas')
  out.width = 200
  out.height = 300
  const ctx = out.getContext('2d')
  const lg = ctx.createLinearGradient(0, out.height, out.width, 0)
  lg.addColorStop(0, '#c68f52')
  lg.addColorStop(0.55, '#d9a763')
  lg.addColorStop(1, '#e7cb90')
  ctx.fillStyle = lg
  ctx.fillRect(0, 0, out.width, out.height)
  const webp = out.toDataURL('image/webp', 0.92)
  const png = out.toDataURL('image/png')
  return { webpLen: webp.length, pngLen: png.length }
})
console.log(JSON.stringify(r))
await browser.close()
