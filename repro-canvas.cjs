const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-seat-freeze-12'
const ROOM = process.env.ROOM || 'forest-hall'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
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

  // Sample every 3s: count canvases and identify them + measure main-thread churn
  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(3000)
    const info = await page.evaluate(() => {
      const canvases = [...document.querySelectorAll('canvas')].map((c) => {
        const p = c.closest('[class]')
        return (c.width + 'x' + c.height + ' class=' + (p ? p.className.toString().slice(0, 40) : 'none'))
      })
      const intervals = performance.getEntriesByType('longtask').length
      return { canvases, longtasks: intervals, html: document.querySelectorAll('*').length }
    }).catch(() => ({ canvases: ['ERR'] }))
    console.log(`t+${i * 3}s`, JSON.stringify(info))
  }
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
