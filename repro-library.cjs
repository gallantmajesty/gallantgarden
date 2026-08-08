const { chromium } = require('@playwright/test')

const GUEST_ID = 'pw-guest-3'

const CONFIGS = [
  { name: 'A-ultra', settings: { ultra: true, quality: 'high', postProcessing: 'high' }, avatar: null },
  { name: 'B-robot-acc', settings: { ultra: false }, avatar: { characterId: 'robot', accessories: ['hourglass', 'laptop', 'phone', 'trading_laptop', 'piano'] } },
  { name: 'C-elephant-acc', settings: { ultra: false }, avatar: { characterId: 'elephant', accessories: ['book', 'mug', 'desk_lamp', 'plant', 'hourglass'] } },
  { name: 'D-night-off', settings: { ultra: true, nightMode: false, weather: 'clear' }, avatar: null },
  { name: 'E-high-preset', settings: { quality: 'high', ultra: true, nightMode: true, resolutionScale: 1, viewDistance: 1, textureQuality: 'high', shadowQuality: 'high', lodBias: 1 }, avatar: null },
]

async function run(browser, cfg) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + (err.stack || err.message)))
  page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push('CONSOLE: ' + msg.text()) })

  await page.addInitScript(({ gid, settings, avatar }) => {
    localStorage.clear()
    const guest = { id: gid, email: 'guest@local', isGuest: true, profile: { name: 'Test' } }
    localStorage.setItem('sf.guest', JSON.stringify(guest))
    localStorage.setItem(
      `sf.guest.profile.v1.${gid}`,
      JSON.stringify({
        playerId: 123456789,
        displayName: 'Test',
        displayNameChanges: 0,
        data: { completed: true },
        onboarded: true,
        avatarUrl: null,
        pub: { displayName: 'Test' },
        xp: 0,
        premiumXp: 0,
        rankXp: 0,
      }),
    )
    localStorage.setItem('sg.settings.v2', JSON.stringify(settings))
    if (avatar) localStorage.setItem('sf.avatar.v2', JSON.stringify(avatar))
  }, { gid: GUEST_ID, settings: cfg.settings, avatar: cfg.avatar })

  await page.goto('http://localhost:5173/lobby/explore?world=library', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(18000)
  const dot = await page.locator('#r3f-dot').count()
  const boundary = await page.locator('.error-boundary').count()
  const bodyText = await page.locator('body').innerText().catch(() => '')
  const crash = errors.filter((e) => e.includes('MeshStandardMaterial') || e.includes('TypeError'))
  console.log(`--- ${cfg.name}: r3f-dot=${dot} boundary=${boundary} | meshCrashes=${crash.length}`)
  if (crash.length) {
    console.log(crash[0].slice(0, 1500))
    await page.screenshot({ path: `repro-${cfg.name}.png` })
  }
  await page.close()
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  })
  for (const cfg of CONFIGS) {
    try { await run(browser, cfg) } catch (e) { console.log(`${cfg.name} FAILED:`, e.message) }
  }
  await browser.close()
}

main().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1) })
