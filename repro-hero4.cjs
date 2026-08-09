const { chromium } = require('@playwright/test')

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + (err.stack || err.message).split('\n')[0]))
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource') && !msg.text().includes('stop-') && !msg.text().includes('stroke-')) errors.push('CONSOLE: ' + msg.text().slice(0, 140)) })

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(12000)
  const info = await page.evaluate(() => ({
    hero3d: !!document.querySelector('.fl-hero-3d'),
    castle: !!document.querySelector('.fl-castle'),
    fog: !!document.querySelector('.fl-world-fog'),
    branches: document.querySelectorAll('.fl-fg-branch').length,
    canvases: [...document.querySelectorAll('.fl-hero-3d canvas')].map((c) => c.width + 'x' + c.height),
    headline: document.querySelector('.fl-hero__headline')?.textContent || '',
    bg: getComputedStyle(document.querySelector('.fl-hero-3d canvas') || document.body).background || '',
  }))
  console.log('HERO STATE:', JSON.stringify(info))
  console.log('=== ERRORS ===')
  for (const e of errors.slice(0, 6)) console.log(e)
  if (!errors.length) console.log('NO ERRORS')
  await browser.close()
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
