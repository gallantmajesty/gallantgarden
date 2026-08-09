const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-seat-freeze-6'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + (err.stack || err.message)))
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push('CONSOLE: ' + msg.text().slice(0, 300)) })

  await page.addInitScript((gid) => {
    localStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(`sf.guest.profile.v1.${gid}`, JSON.stringify({ playerId: 123456789, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }))
  }, GUEST_ID)

  await page.goto(`http://localhost:${PORT}/lobby/explore?world=library`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.sso-seat:not([disabled])', { timeout: 30000 })
  await page.locator('.sso-seat:not([disabled])').first().click()
  await page.waitForTimeout(500)
  await page.locator('.sso-btn-primary', { hasText: 'Join Study Session' }).click()
  console.log('-> clicked Join')

  for (let i = 1; i <= 15; i++) {
    await page.waitForTimeout(2000)
    // responsiveness probe: evaluate a tiny expression with a hard timeout
    let probe = 'TMO'
    try {
      const r = await page.evaluate(() => Date.now(), { timeout: 3000 })
      probe = String(r)
    } catch { probe = 'BLOCKED' }
    let chip = '?'
    try {
      chip = await page.evaluate(() => {
        const el = document.querySelector('.dev-chip, [title*="sf dev"]')
        return el ? el.textContent : 'no-chip'
      }, { timeout: 3000 })
    } catch { chip = 'BLOCKED' }
    const overlay = await page.locator('.sso-root').count().catch(() => -1)
    const loader = await page.locator('.room-loader').count().catch(() => -1)
    const canvas = await page.locator('canvas').count().catch(() => -1)
    console.log(`t+${i * 2}s probe=${probe} chip="${(chip || '').replace(/\s+/g, ' ').slice(0, 90)}" overlay=${overlay} loader=${loader} canvas=${canvas}`)
  }
  console.log('=== ERRORS ===')
  for (const e of errors.slice(0, 10)) console.log((e || '').slice(0, 1500) + '\n')
  if (!errors.length) console.log('NO ERRORS')
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
