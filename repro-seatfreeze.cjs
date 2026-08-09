const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-seat-freeze-3'

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

  // wait for the seat picker to appear
  await page.waitForSelector('.sso-seat', { timeout: 30000 })
  const dots = await page.locator('.sso-seat').count()
  const occupied = await page.locator('.sso-seat.occupied').count()
  const enabled = await page.locator('.sso-seat:not([disabled])').count()
  console.log(`dots=${dots} occupied=${occupied} enabled=${enabled}`)

  // click the first enabled dot
  const firstDot = page.locator('.sso-seat:not([disabled])').first()
  await firstDot.click()
  await page.waitForTimeout(1000)
  const selected = await page.locator('.sso-seat.selected').count()
  const joinBtn = await page.locator('.sso-btn-primary', { hasText: 'Join Study Session' }).count()
  console.log(`after-click: selected=${selected} joinBtn=${joinBtn}`)

  if (joinBtn) {
    await page.locator('.sso-btn-primary', { hasText: 'Join Study Session' }).click()
    for (let i = 1; i <= 8; i++) {
      await page.waitForTimeout(3000)
      const stage = await page.locator('.sso-root').count()
      const loader = await page.locator('.room-loader').count()
      const canvas = await page.locator('canvas').count()
      const chip = await page.locator('body').innerText().then((t) => t.match(/stage=\S+/)?.[0] || '?')
      console.log(`t+${i * 3}s stageChip=${chip} overlay=${stage} loader=${loader} canvas=${canvas}`)
    }
  }

  console.log('=== ERRORS ===')
  for (const e of errors.slice(0, 10)) console.log((e || '').slice(0, 1500) + '\n')
  if (!errors.length) console.log('NO ERRORS')
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
