const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-seat-freeze-11'
const ROOM = process.env.ROOM || 'forest-hall'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + (err.stack || err.message)))
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push('CONSOLE: ' + msg.text().slice(0, 250)) })

  await page.addInitScript((gid, room) => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(`sf.guest.profile.v1.${gid}`, JSON.stringify({ playerId: 123456789, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }))
    sessionStorage.setItem('sf.realm.active.v1', JSON.stringify({ kind: 'global', name: 'Forest Hall', roomId: room, world: 'library' }))
  }, GUEST_ID, ROOM)

  await page.goto(`http://localhost:${PORT}/lobby/explore`, { waitUntil: 'domcontentloaded', timeout: 60000 })

  // generous wait — picker takes ~24s in this flow
  await page.waitForSelector('.sso-seat:not([disabled])', { timeout: 45000 }).catch((e) => { console.log('WAIT FAILED:', e.message.split('\n')[0]) })

  const dots = await page.locator('.sso-seat').count().catch(() => -1)
  const occupied = await page.locator('.sso-seat.occupied').count().catch(() => -1)
  const enabled = await page.locator('.sso-seat:not([disabled])').count().catch(() => -1)
  console.log(`dots=${dots} occupied=${occupied} enabled=${enabled}`)

  if (enabled > 0) {
    await page.locator('.sso-seat:not([disabled])').first().click().catch((e) => errors.push('CLICK: ' + e.message.split('\n')[0]))
    await page.waitForTimeout(1200)
    const selected = await page.locator('.sso-seat.selected').count().catch(() => -1)
    const joinBtn = await page.locator('.sso-btn-primary', { hasText: 'Join Study Session' }).count().catch(() => -1)
    const cooldown = await page.locator('.sso-cooldown').count().catch(() => -1)
    console.log(`after-click: selected=${selected} joinBtn=${joinBtn} cooldown=${cooldown}`)
    if (joinBtn > 0) {
      await page.locator('.sso-btn-primary', { hasText: 'Join Study Session' }).click().catch((e) => errors.push('JOIN: ' + e.message.split('\n')[0]))
      for (let i = 1; i <= 10; i++) {
        await page.waitForTimeout(2000)
        const state = await page.evaluate(() => ({
          diag: (document.querySelector('.dev-chip, [title*="sf dev"]')?.textContent || 'no-chip').replace(/\s+/g, ' ').slice(0, 80),
          loader: !!document.querySelector('.room-loader'),
          canvas: document.querySelectorAll('canvas').length,
          picker: !!document.querySelector('.sso-root'),
        })).catch(() => ({ diag: 'ERR' }))
        console.log(`t+${i * 2}s`, JSON.stringify(state))
      }
    }
  } else {
    console.log('NO ENABLED SEATS')
  }

  console.log('=== ERRORS ===')
  for (const e of errors.slice(0, 8)) console.log((e || '').slice(0, 1500) + '\n')
  if (!errors.length) console.log('NO ERRORS')
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
