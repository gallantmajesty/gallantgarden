import { chromium } from 'playwright'
import fs from 'node:fs'

const outDir = 'outputs/screenshots'
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const ctx = await browser.newContext({ viewport: { width: 640, height: 760 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

const shots = process.argv.slice(2)
const jobs = shots.length ? shots : [
  'monkey:front:2.6', 'monkey:threequarter:2.6', 'panda:front:2.6', 'elephant:front:2.6',
]

for (const job of jobs) {
  const [char, view, zoom] = job.split(':')
  const url = `http://localhost:5173/__shot?char=${char}&view=${view}&look=char&zoom=${zoom || 1}&camY=0.8`
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(4000)
  const file = `${outDir}/${char}-${view}.png`
  await page.screenshot({ path: file, timeout: 120000, animations: 'disabled' })
  console.log('shot', file)
}
await browser.close()
