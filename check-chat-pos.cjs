const { chromium } = require('@playwright/test')

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  await page.addInitScript(() => {
    const gid = 'pw-chat-guest'
    localStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(
      `sf.guest.profile.v1.${gid}`,
      JSON.stringify({ playerId: 111222333, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 340, premiumXp: 12, rankXp: 340 }),
    )
    localStorage.setItem('sf.avatar.v2', JSON.stringify({ characterId: 'wizard', accessories: [], outfit: {} }))
  })

  await page.goto('http://localhost:5173/lobby', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(6000)

  const launcher = await page.evaluate(() => {
    const el = document.querySelector('.sh-launcher')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right), bottom: Math.round(r.bottom), w: r.width, pos: cs.position, rightCSS: cs.right, bottomCSS: cs.bottom, leftCSS: cs.left }
  })
  console.log('LOBBY launcher:', JSON.stringify(launcher))
  await page.screenshot({ path: 'lobby-chat-pos.png' })

  await page.goto('http://localhost:5173/lobby/explore?world=library', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(8000)
  const launcher2 = await page.evaluate(() => {
    const el = document.querySelector('.sh-launcher')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right), bottom: Math.round(r.bottom), w: r.width, pos: cs.position, rightCSS: cs.right, bottomCSS: cs.bottom, leftCSS: cs.left }
  })
  console.log('REALM launcher:', JSON.stringify(launcher2))
  await page.screenshot({ path: 'realm-chat-pos.png' })

  await browser.close()
}
main().catch((e) => { console.error('FAIL', e && e.message); process.exit(1) })