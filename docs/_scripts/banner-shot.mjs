// Screenshots the Focuslily banners at exact sizes (fonts loaded).
// Usage: node _scripts/banner-shot.mjs
import { chromium } from 'playwright'
import path from 'node:path'

const browser = await chromium.launch()
const cwd = process.cwd().replace(/\\/g, '/')

const jobs = [
  { html: '_scripts/banner.html', out: 'docs/ad-shots/focuslily-banner.png', w: 1920, h: 1080 },
  { html: '_scripts/banner-social.html', out: 'docs/ad-shots/focuslily-social.png', w: 1080, h: 1350 },
]

for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 })
  await page.goto('file:///' + cwd + '/' + j.html, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')).fontFamily.includes('Baloo')).catch(() => {})
  await page.screenshot({ path: j.out })
  console.log('OK', j.out)
  await page.close()
}

await browser.close()
