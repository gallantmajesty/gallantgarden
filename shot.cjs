// TEMP torso-review capture. Run: node shot.cjs   (delete with ShotHarness)
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'torso-shots')
fs.mkdirSync(OUT, { recursive: true })

const SHOTS = []
for (const body of ['male', 'female']) {
  for (const view of ['front', 'side', 'threequarter', 'back']) {
    SHOTS.push({ body, view, emote: 'idle' })
  }
  SHOTS.push({ body, view: 'front', emote: 'sit' })
  SHOTS.push({ body, view: 'threequarter', emote: 'sit' })
}

;(async () => {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1100 }, deviceScaleFactor: 1.5 })
  const page = await ctx.newPage()
  for (const s of SHOTS) {
    const url = `http://localhost:5173/__shot?view=${s.view}&emote=${s.emote}&body=${s.body}`
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForSelector('#shot-ready', { timeout: 15000 })
    await page.waitForTimeout(s.emote === 'sit' ? 2200 : 1600) // let the pose settle
    const file = path.join(OUT, `${s.body}-${s.emote}-${s.view}.png`)
    await page.screenshot({ path: file })
    console.log('saved', path.basename(file))
  }
  await browser.close()
  console.log('DONE')
})().catch((e) => {
  console.error('CAPTURE_ERROR', e)
  process.exit(1)
})
