const { chromium } = require('@playwright/test')

const GUEST_ID = 'pw-guest-5'

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + (err.stack || err.message)))
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push('CONSOLE: ' + msg.text())
  })

  await page.addInitScript((gid) => {
    localStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(`sf.guest.profile.v1.${gid}`, JSON.stringify({ playerId: 123456789, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }))
  }, GUEST_ID)

  await page.goto('http://localhost:5173/lobby/explore?world=library', { waitUntil: 'domcontentloaded', timeout: 90000 })
  for (let i = 1; i <= 8; i++) {
    await page.waitForTimeout(8000)
    const dot = await page.locator('#r3f-dot').count()
    const canvas = await page.locator('canvas').count()
    const txt = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 100)
    console.log(`t+${i * 8}s dot=${dot} canvas=${canvas} body="${txt}"`)
  }
  console.log('=== ERRORS ===')
  for (const e of errors.slice(0, 5)) console.log((e || '').slice(0, 2500) + '\n')
  if (!errors.length) console.log('NO ERRORS')
  await browser.close()
}
main().catch((e) => { console.error('FAILED', e); process.exit(1) })
