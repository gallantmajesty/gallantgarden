const { chromium } = require('@playwright/test')

const PORT = process.env.PORT || '5173'
const GUEST_ID = 'pw-seat-freeze-10'
const ROOM = process.env.ROOM || 'forest-hall'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', (err) => console.log('PAGEERROR:', (err.stack || err.message).split('\n').slice(0, 5).join(' | ')))
  page.on('console', (msg) => {
    const t = msg.text()
    if (!t.includes('Failed to load resource')) console.log(`[${msg.type()}]`, t.slice(0, 220))
  })

  await page.addInitScript((gid, room) => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('sf.guest', JSON.stringify({ id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }))
    localStorage.setItem(`sf.guest.profile.v1.${gid}`, JSON.stringify({ playerId: 123456789, displayName: 'Test', displayNameChanges: 0, data: { completed: true }, onboarded: true, avatarUrl: null, pub: { displayName: 'Test' }, xp: 0, premiumXp: 0, rankXp: 0 }))
    sessionStorage.setItem('sf.realm.active.v1', JSON.stringify({ kind: 'global', name: 'Forest Hall', roomId: room, world: 'library' }))
  }, GUEST_ID, ROOM)

  await page.goto(`http://localhost:${PORT}/lobby/explore`, { waitUntil: 'domcontentloaded', timeout: 60000 })

  for (let i = 1; i <= 12; i++) {
    await page.waitForTimeout(3000)
    const state = await page.evaluate(() => ({
      url: location.href,
      rootLen: (document.getElementById('root')?.innerHTML || '').length,
      body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 130),
      crash: !!document.getElementById('crash-error'),
      picker: !!document.querySelector('.sso-seat'),
      app: !!document.querySelector('.explore-root'),
      loader: !!document.querySelector('.room-loader'),
      canvas: document.querySelectorAll('canvas').length,
      diag: (() => { const el = document.querySelector('.dev-chip, [title*="sf dev"]'); return el ? el.textContent : '' })(),
    }))
    console.log(`t+${i * 3}s`, JSON.stringify({ ...state, diag: state.diag.replace(/\s+/g, ' ').slice(0, 90) }))
  }
  await browser.close()
}
main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
