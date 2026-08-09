const { chromium } = require('@playwright/test')

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(12000)
  await page.screenshot({ path: 'hero-shot.png' })
  // also a mid-scroll shot to see the library hall clearly
  await page.waitForTimeout(4000)
  await page.screenshot({ path: 'hero-shot2.png' })
  console.log('screenshots saved')
  await browser.close()
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
