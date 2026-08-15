import { chromium } from 'playwright'

const combos = [
  { zoom: 1.8, camY: 0.95 },
  { zoom: 2.0, camY: 1.0 },
  { zoom: 2.2, camY: 1.05 },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1152, height: 2048 }, deviceScaleFactor: 1 })

for (const c of combos) {
  const url = `http://localhost:5201/__shot?char=mia&view=front&bg=warm&look=char&zoom=${c.zoom}&camY=${c.camY}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('#shot-ready', { timeout: 30000 })
  // Wait until the bottom third of the canvas is painted (character legs visible).
  await page.waitForFunction(() => {
    const c2 = document.querySelector('canvas')
    if (!c2) return false
    const t = document.createElement('canvas')
    t.width = 12
    t.height = 12
    const ctx = t.getContext('2d')
    ctx.drawImage(c2, 0, 0, c2.width, c2.height, 0, 0, 12, 12)
    const d = ctx.getImageData(3, 9, 1, 1).data // ~75% down
    return d[3] > 10
  }, { timeout: 60000 }).catch(() => console.log('paint wait failed'))
  await page.waitForTimeout(2500)
  const r = await page.evaluate(() => {
    const cv = document.querySelector('canvas')
    const out = document.createElement('canvas')
    out.width = cv.width
    out.height = cv.height
    const ctx = out.getContext('2d')
    ctx.drawImage(cv, 0, 0)
    const d = ctx.getImageData(0, 0, out.width, out.height).data
    const at = (x, y) => {
      const i = (Math.floor(y) * out.width + Math.floor(x)) * 4
      return [d[i], d[i + 1], d[i + 2], d[i + 3]]
    }
    let top = null
    let bottom = null
    for (let y = 0.02; y <= 0.98; y += 0.004) {
      const [cr, cg, cb] = at(out.width * 0.5, y * out.height)
      const [mr, mg, mb] = at(out.width * 0.06, y * out.height)
      if (Math.abs(cr - mr) + Math.abs(cg - mg) + Math.abs(cb - mb) > 70) {
        if (top === null) top = y
        bottom = y
      }
    }
    return { top: top === null ? null : Math.round(top * 100), bottom: bottom === null ? null : Math.round(bottom * 100) }
  })
  console.log(`zoom=${c.zoom} camY=${c.camY} -> top ${r.top}% bottom ${r.bottom}%`)
}

await browser.close()
