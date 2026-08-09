const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-seat-freeze-9'
const ROOM = process.env.ROOM || 'forest-hall'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + (err.stack || err.message)))
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push('CONSOLE: ' + msg.text().slice(0, 300)) })

  await page.addInitScript((gid, room) => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(`sf.guest.profile.v1.${gid}`, JSON.stringify({ playerId: 123456789, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }))
    // mimic Realm.join: active realm persisted in sessionStorage
    sessionStorage.setItem('sf.realm.active.v1', JSON.stringify({ kind: 'global', name: 'Forest Hall', roomId: room, world: 'library' }))
  }, GUEST_ID, ROOM)

  await page.goto(`http://localhost:${PORT}/lobby/explore`, { waitUntil: 'domcontentloaded', timeout: 60000 })

  // Wait for seat picker
  try {
    await page.waitForSelector('.sso-seat', { timeout: 30000 })
  } catch (e) {
    const chip = await page.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => '')
    console.log('SEAT PICKER NEVER APPEARED. body:', JSON.stringify(chip.replace(/\s+/g, ' ').slice(0, 150)))
    await page.screenshot({ path: 'repro-room-nopicker.png' }).catch(() => {})
    console.log('ERRORS:', errors.slice(0, 5))
    await browser.close()
    return
  }

  const dots = await page.locator('.sso-seat').count()
  const occupied = await page.locator('.sso-seat.occupied').count()
  const enabled = await page.locator('.sso-seat:not([disabled])').count()
  const chip = await page.evaluate(() => {
    const el = document.querySelector('.dev-chip, [title*="sf dev"]')
    return el ? el.textContent : 'no-chip'
  }).catch(() => 'ERR')
  console.log(`dots=${dots} occupied=${occupied} enabled=${enabled} chip="${(chip || '').replace(/\s+/g, ' ').slice(0, 90)}"`)

  if (enabled > 0) {
    await page.locator('.sso-seat:not([disabled])').first().click()
    await page.waitForTimeout(800)
    const selected = await page.locator('.sso-seat.selected').count()
    const joinBtn = await page.locator('.sso-btn-primary', { hasText: 'Join Study Session' }).count()
    console.log(`after-click: selected=${selected} joinBtn=${joinBtn}`)
  } else {
    console.log('NO ENABLED SEATS — every dot is occupied/disabled')
  }
  await page.screenshot({ path: 'repro-room.png' }).catch(() => {})
  console.log('=== ERRORS ===')
  for (const e of errors.slice(0, 8)) console.log((e || '').slice(0, 1500) + '\n')
  if (!errors.length) console.log('NO ERRORS')
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
