const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-seat-freeze-2'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + (err.stack || err.message)))
  page.on('console', (msg) => errors.push(`[${msg.type()}] ` + msg.text().slice(0, 300)))

  await page.addInitScript((gid) => {
    localStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(`sf.guest.profile.v1.${gid}`, JSON.stringify({ playerId: 123456789, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }))
  }, GUEST_ID)

  await page.goto(`http://localhost:${PORT}/lobby/explore?world=library`, { waitUntil: 'domcontentloaded', timeout: 60000 })

  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(3000)
    const url = page.url()
    const html = (await page.locator('#root').innerHTML().catch(() => '')).length
    const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120)
    const app = await page.locator('.explore-root').count()
    const load = await page.locator('.room-loader').count()
    const lob = await page.locator('.lobby-root').count()
    const auth = await page.locator('.auth-root, form').count()
    console.log(`t+${i * 3}s url=${url} rootHtml=${html} app=${app} loader=${load} lobby=${lob} auth=${auth} body="${text}"`)
  }
  await page.screenshot({ path: 'repro-page.png' })
  console.log('=== ERRORS (last 15) ===')
  for (const e of errors.slice(-15)) console.log((e || '').slice(0, 1200) + '\n')
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
