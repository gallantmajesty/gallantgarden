const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-real-gpu'
const ROOM = process.env.ROOM || 'forest-hall'

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', (err) => console.log('PAGEERROR:', (err.stack || err.message).split('\n').slice(0, 3).join(' | ')))

  await page.addInitScript((gid, room) => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(`sf.guest.profile.v1.${gid}`, JSON.stringify({ playerId: 123456789, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }))
    sessionStorage.setItem('sf.realm.active.v1', JSON.stringify({ kind: 'global', name: 'Forest Hall', roomId: room, world: 'library' }))
  }, GUEST_ID, ROOM)

  await page.goto(`http://localhost:${PORT}/lobby/explore`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.sso-seat:not([disabled])', { timeout: 45000 }).catch(() => console.log('picker wait timeout'))
  console.log('picker shown, clicking Random Seat...')
  await page.locator('.sso-btn-secondary', { hasText: 'Random Seat' }).click()

  // sample chip + responsiveness every 2s
  for (let i = 1; i <= 15; i++) {
    await page.waitForTimeout(2000)
    let probe = 'TMO'
    try { await page.evaluate(() => Date.now(), { timeout: 3000 }); probe = 'OK' } catch { probe = 'BLOCKED' }
    let diag = '?'
    try {
      diag = await page.evaluate(() => {
        const el = document.querySelector('.dev-chip, [title*="sf dev"]')
        return el ? el.textContent : 'no-chip'
      }, { timeout: 3000 })
    } catch { diag = 'BLOCKED' }
    const state = await page.evaluate(() => ({
      loader: !!document.querySelector('.room-loader'),
      canvas: document.querySelectorAll('canvas').length,
      picker: !!document.querySelector('.sso-root'),
    })).catch(() => ({}))
    console.log(`t+${i * 2}s probe=${probe} diag="${(diag || '').replace(/\s+/g, ' ').slice(0, 100)}"`, JSON.stringify(state))
  }
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
