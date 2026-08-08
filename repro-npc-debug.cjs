const { chromium } = require('@playwright/test')

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('console', (m) => { if (m.type() === 'error') console.log('[PAGE-ERR]', m.text().slice(0, 160)) })
  page.on('pageerror', (e) => console.log('[PAGEERR]', String(e).slice(0, 200)))

  await page.addInitScript(() => {
    const gid = 'pw-npc-guest'
    localStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(
      `sf.guest.profile.v1.${gid}`,
      JSON.stringify({ playerId: 987654321, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }),
    )
    localStorage.setItem('sg.settings.v2', JSON.stringify({ quality: 'high', dpr: 1, shadows: 'medium', postProcessing: 'medium', particles: true, nightMode: false, impostorSprites: true, showNameTags: true, distantTags: false, cameraMode: 'third' }))
    localStorage.setItem('sf.avatar.v2', JSON.stringify({ characterId: 'wizard', accessories: [], outfit: {} }))
  })

  await page.goto('http://localhost:5173/lobby/explore?world=library', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(30000)

  const state = await page.evaluate(() => ({
    url: location.href,
    canvases: document.querySelectorAll('canvas').length,
    dot: document.getElementById('r3f-dot')?.style.background || null,
    boundary: document.querySelectorAll('.error-boundary').length,
    impostor: window.__impostorDebug ? { cacheSize: window.__impostorDebug.cacheSize, queueSize: window.__impostorDebug.queueSize, busy: window.__impostorDebug.busy, list: window.__impostorDebug.list() } : 'NO DEBUG HOOK',
  }))
  console.log('STATE:', JSON.stringify(state, null, 1))
  await page.screenshot({ path: 'repro-npc.png' })
  await browser.close()
}

main().catch((e) => { console.error('FAIL', e && e.message); process.exit(1) })
