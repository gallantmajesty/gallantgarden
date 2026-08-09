const { chromium } = require('@playwright/test')

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', (err) => console.log('PAGEERROR:\n' + (err.stack || err.message).slice(0, 1200) + '\n---'))
  page.on('console', (msg) => {
    const t = msg.text()
    if (!t.includes('Failed to load resource') && msg.type() === 'error') console.log('[console.error]', t.slice(0, 400))
  })

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(10000)
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)).catch(() => '')
  console.log('BODY:', JSON.stringify(body))
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0)
  console.log('root html bytes:', rootHtml)
  await browser.close()
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
