// Renders Mia's exact defined look (transparent canvas), waits for the model to
// paint, then composites over a warm gradient matching the other character
// thumbnails → public/icons/characters/mia.webp (1152x2048).
// Requires the dev server on :5201.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const URL = "http://localhost:5201/__shot?char=mia&view=front&bg=warm&look=char&zoom=1.5&camY=0.85"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1152, height: 2048 }, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForSelector('#shot-ready', { timeout: 30000 })
// Fixed settle time — the proven-stable path (a tight paint-poll was flaky).
await page.waitForTimeout(12000)

const b64 = await page.evaluate(async () => {
  const c = document.querySelector('canvas')
  if (!c) throw new Error('no canvas')
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
  const rg = ctx.createRadialGradient(out.width * 0.85, -out.height * 0.05, 0, out.width * 0.85, -out.height * 0.05, out.width * 1.4)
  rg.addColorStop(0, 'rgba(15,8,2,0.9)')
  rg.addColorStop(0.45, 'rgba(15,8,2,0.3)')
  rg.addColorStop(1, 'rgba(15,8,2,0)')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, out.width, out.height)
  const img = new Image()
  img.src = c.toDataURL('image/png')
  await img.decode()
  ctx.drawImage(img, 0, 0)
  return out.toDataURL('image/webp', 0.92).split(',')[1]
})

const buf = Buffer.from(b64, 'base64')
writeFileSync('public/icons/characters/mia.webp', buf)
console.log('wrote mia.webp', buf.length, 'bytes')
await browser.close()
