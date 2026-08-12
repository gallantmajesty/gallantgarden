// Captures 9:16 (1080x1920) screenshots of key FocusLily screens for the ad.
// Usage: node _scripts/ad-capture.mjs
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:5201'
const OUT = 'docs/ad-shots'
import fs from 'node:fs'
fs.mkdirSync(OUT, { recursive: true })

// Seed the guest session so captures show the logged-in app, not the login page.
const seed = JSON.parse(fs.readFileSync('_scripts/ad-seed.json', 'utf8'))

const shots = [
  { name: 'lobby', url: '/lobby', wait: 9000 },
  { name: 'explore', url: '/explore', wait: 12000 },
  { name: 'magnet', url: '/magnet', wait: 9000 },
  { name: 'focus', url: '/focus', wait: 9000 },
  { name: 'music', url: '/lobby/realm/library', wait: 14000 },
]

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
})

// Apply seed on every document (before app JS reads localStorage) so the app
// boots straight into the logged-in guest session.
await page.addInitScript((seed) => {
  for (const [k, v] of Object.entries(seed)) {
    try { localStorage.setItem(k, v) } catch { /* ignore */ }
  }
}, seed)

for (const s of shots) {
  try {
    await page.goto(BASE + s.url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    // Boot may redirect to /lobby — wait for a stable, non-login screen.
    await page.waitForTimeout(4000)
    const url = page.url()
    if (!url.includes('login')) {
      await page.waitForTimeout(s.wait)
    } else {
      console.log('WARN', s.name, 'landed on login page, waiting longer')
      await page.waitForTimeout(6000)
    }
    const path = `${OUT}/${s.name}.png`
    await page.screenshot({ path, fullPage: false })
    console.log('OK', s.name, page.url(), '->', path)
  } catch (e) {
    console.log('FAIL', s.name, e.message.slice(0, 120))
  }
}

await browser.close()
