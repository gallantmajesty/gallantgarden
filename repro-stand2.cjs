const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-seat-freeze-8'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', (err) => console.log('PAGEERROR:', (err.stack || err.message).split('\n').slice(0, 4).join(' | ')))
  page.on('console', (msg) => {
    const t = msg.text()
    if (!t.includes('Failed to load resource')) console.log(`[${msg.type()}]`, t.slice(0, 200))
  })
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) console.log('NAVIGATED ->', f.url())
  })
  page.on('dialog', (d) => { console.log('DIALOG:', d.type(), d.message().slice(0, 200)); d.dismiss().catch(() => {}) })

  await page.addInitScript((gid) => {
    localStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(`sf.guest.profile.v1.${gid}`, JSON.stringify({ playerId: 123456789, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }))
  }, GUEST_ID)

  await page.goto(`http://localhost:${PORT}/lobby/explore?world=library`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.sso-seat:not([disabled])', { timeout: 30000 })
  await page.locator('.sso-seat:not([disabled])').first().click()
  await page.waitForTimeout(400)
  await page.locator('.sso-btn-primary', { hasText: 'Join Study Session' }).click()
  console.log('-> clicked Join')
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000)
    const loader = await page.locator('.room-loader').count().catch(() => -1)
    if (loader === 0) break
  }
  console.log('-> seated')

  const stand = page.locator('.desk-footer-btn', { hasText: 'Stand up' }).or(page.locator('.desk-mini-stand'))
  console.log('-> clicking Stand up...')
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Stand up' || b.getAttribute('title') === 'Stand up')
    if (btns[0]) { btns[0].click(); return 'clicked ' + btns[0].className }
    return 'NOT FOUND'
  })
  await page.waitForTimeout(3000)
  const url = page.url()
  const chip = await page.evaluate(() => {
    const el = document.querySelector('.dev-chip, [title*="sf dev"]')
    return el ? el.textContent : 'no-chip'
  }).catch(() => 'ERR')
  const overlay = await page.locator('.sso-root').count().catch(() => -1)
  const crash = await page.locator('#crash-error').count().catch(() => -1)
  console.log(`after stand: url=${url} chip="${(chip || '').replace(/\s+/g, ' ').slice(0, 80)}" overlay=${overlay} crashOverlay=${crash}`)
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
