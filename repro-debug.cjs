const { chromium } = require('@playwright/test')

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + (err.stack || err.message)))
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push('CONSOLE: ' + msg.text()) })

  await page.addInitScript(() => {
    const gid = 'pw-guest-3'
    localStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(`sf.guest.profile.v1.${gid}`, JSON.stringify({ playerId: 123456789, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }))
    localStorage.setItem('sg.settings.v2', JSON.stringify({ ultra: true }))
  })

  await page.goto('http://localhost:5173/lobby/explore?world=library', { waitUntil: 'domcontentloaded', timeout: 60000 })
  for (let i = 1; i <= 5; i++) {
    await page.waitForTimeout(6000)
    const url = page.url()
    const dot = await page.locator('#r3f-dot').count()
    const canvas = await page.locator('canvas').count()
    const txt = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120)
    console.log(`t+${i * 6}s url=${url} dot=${dot} canvas=${canvas} body="${txt}"`)
  }
  console.log('ERRORS:')
  for (const e of errors.slice(0, 5)) console.log((e || '').slice(0, 1200) + '\n')
  await browser.close()
}
main().catch((e) => { console.error('FAILED', e); process.exit(1) })
