const { chromium } = require('@playwright/test')

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + (err.stack || err.message).split('\n')[0]))
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push('CONSOLE: ' + msg.text().slice(0, 160)) })

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  for (let i = 1; i <= 8; i++) {
    await page.waitForTimeout(3000)
    const info = await page.evaluate(() => {
      const canvases = [...document.querySelectorAll('canvas')].map((c) => c.width + 'x' + c.height)
      const hero3d = !!document.querySelector('.fl-hero-3d')
      const headline = document.querySelector('.fl-hero__headline')?.textContent || ''
      return { canvases, hero3d, headline: headline.replace(/\s+/g, ' ').slice(0, 60) }
    }).catch(() => ({}))
    console.log(`t+${i * 3}s`, JSON.stringify(info))
  }
  console.log('=== ERRORS ===')
  for (const e of errors.slice(0, 8)) console.log(e)
  if (!errors.length) console.log('NO ERRORS')
  await browser.close()
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
