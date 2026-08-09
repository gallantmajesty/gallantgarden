const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-seat-freeze-7'

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
  await page.waitForTimeout(400)
  await page.locator('.sso-btn-primary', { hasText: 'Join Study Session' }).click()
  console.log('-> clicked Join')
  // poll until seated (loader gone)
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500)
    const loader = await page.locator('.room-loader').count().catch(() => -1)
    if (loader === 0) break
  }
  console.log('-> seated')

  // find stand up button
  const stand = page.locator('.desk-footer-btn', { hasText: 'Stand up' }).or(page.locator('.desk-mini-stand'))
  console.log(`stand count=${await stand.count()}`)
  await stand.first().click()
  console.log('-> clicked Stand up')

  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(1500)
    let chip = '?'
    try {
      chip = await page.evaluate(() => {
        const el = document.querySelector('.dev-chip, [title*="sf dev"]')
        return el ? el.textContent : 'no-chip'
      }, { timeout: 2500 })
    } catch { chip = 'BLOCKED' }
    const overlay = await page.locator('.sso-root').count().catch(() => -1)
    const dots = await page.locator('.sso-seat').count().catch(() => -1)
    const disabledDots = await page.locator('.sso-seat[disabled]').count().catch(() => -1)
    const cooldown = await page.locator('.sso-cooldown').count().catch(() => -1)
    const cooldownText = cooldown ? await page.locator('.sso-cooldown').innerText().catch(() => '') : ''
    console.log(`t+${i * 1.5}s chip="${(chip || '').replace(/\s+/g, ' ').slice(0, 70)}" overlay=${overlay} dots=${dots} disabled=${disabledDots} cooldown=${cooldown} ${cooldownText.replace(/\s+/g, ' ')}`)
    if (overlay > 0) break
  }

  // try re-clicking a seat
  const enabled = await page.locator('.sso-seat:not([disabled])').count().catch(() => 0)
  if (enabled > 0) {
    await page.locator('.sso-seat:not([disabled])').first().click()
    await page.waitForTimeout(800)
    const selected = await page.locator('.sso-seat.selected').count()
    const joinBtn = await page.locator('.sso-btn-primary', { hasText: 'Join Study Session' }).count()
    console.log(`RE-CLICK RESULT: enabled=${enabled} selected=${selected} joinBtn=${joinBtn}`)
  } else {
    console.log(`RE-CLICK RESULT: NO ENABLED SEATS (enabled=${enabled})`)
  }

  console.log('=== ERRORS ===')
  for (const e of errors.slice(0, 10)) console.log((e || '').slice(0, 1500) + '\n')
  if (!errors.length) console.log('NO ERRORS')
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
