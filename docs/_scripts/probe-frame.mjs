import { chromium } from 'playwright'

const zoom = process.argv[2] || '1.5'
const camY = process.argv[3] || '0.85'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 576, height: 1024 }, deviceScaleFactor: 1 })
const url = `http://localhost:5201/__shot?char=mia&view=front&bg=warm&look=char&zoom=${zoom}&camY=${camY}`
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForSelector('#shot-ready', { timeout: 30000 })
await page.waitForTimeout(9000)
await page.screenshot({ path: `C:/Users/taksh/studyforest/docs/.freebuff/probe-${zoom}-${camY}.png` })

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
  // Character silhouette per column: |pixel - corner bg| across multiple columns
  const cols = [0.1, 0.3, 0.5, 0.7, 0.9]
  const report = {}
  for (const c of cols) {
    let top = null
    let bottom = null
    for (let y = 0.01; y <= 0.99; y += 0.003) {
      const [cr, cg, cb] = at(c * out.width, y * out.height)
      const [mr, mg, mb] = at(c * out.width * 0.01 + 2, y * out.height)
      if (Math.abs(cr - mr) + Math.abs(cg - mg) + Math.abs(cb - mb) > 60) {
        if (top === null) top = y
        bottom = y
      }
    }
    report[`col${Math.round(c * 100)}`] = top === null ? null : `${Math.round(top * 100)}-${Math.round(bottom * 100)}`
  }
  // Center column alpha profile (is it transparent at bottom?)
  let alphaBottom = null
  for (let y = 0.98; y >= 0.02; y -= 0.002) {
    const a = at(0.5 * out.width, y * out.height)[3]
    if (a > 20) { alphaBottom = Math.round(y * 100); break }
  }
  return { cols: report, alphaBottomPct: alphaBottom }
})
console.log(`zoom=${zoom} camY=${camY}`, JSON.stringify(r))
await browser.close()
