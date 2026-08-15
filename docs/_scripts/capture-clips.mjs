// capture-clips.mjs — records REAL FocusLily app footage as 1080p video clips,
// driven through the actual UI with a natural (non-robotic) cursor overlay.
//
// Usage:
//   node _scripts/capture-clips.mjs <clipA,clipB,...|all>   (from docs/)
//   HEADED=1 ...   run a visible browser (GPU-accelerated WebGL)
//   BASE_URL=...   override the app URL (default http://localhost:5173)
//
// Each clip is recorded as WebM (docs/clips/raw/) and converted to H.264 MP4
// in docs/clips/. `all` runs every clip.

import { chromium } from 'playwright'
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'clips')
const RAW = path.join(OUT, 'raw')
const FFMPEG = process.env.FF || 'C:/Users/taksh/studyforest-dl/ffmpeg-9.0-essentials_build/bin/ffmpeg.exe'
const VIEW = { width: 1920, height: 1080 }
const FPS = 30

mkdirSync(RAW, { recursive: true })
mkdirSync(OUT, { recursive: true })

const seed = JSON.parse(readFileSync(path.join(__dirname, 'capture-seed.json'), 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// Cursor overlay — injected into every page BEFORE the app boots. A real-arrow
// cursor div follows the mouse exactly; clicks add a press-scale + ripple ring.
// ---------------------------------------------------------------------------
const CURSOR_OVERLAY = () => {
  const boot = () => {
    const host = document.head || document.documentElement
    if (!host || !document.body) { setTimeout(boot, 10); return }

    const style = document.createElement('style')
    style.textContent = `
      * { cursor: none !important; }
      .fl-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; }
      .fl-cursor svg { display: block; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5)); transition: transform 60ms ease-out; }
      .fl-cursor.down svg { transform: scale(0.84) translate(1px, 1px); }
      .fl-ripple { position: fixed; width: 28px; height: 28px; border-radius: 50%;
        border: 2.5px solid rgba(255,255,255,0.95); box-shadow: 0 0 14px rgba(255,255,255,0.55);
        z-index: 2147483646; pointer-events: none; opacity: 0; }
      .fl-ripple.go { animation: flrip 0.5s ease-out forwards; }
      @keyframes flrip { 0% { opacity: 0.95; transform: translate(-50%,-50%) scale(0.22); }
                         100% { opacity: 0; transform: translate(-50%,-50%) scale(2.3); } }
    `
    host.appendChild(style)

    const c = document.createElement('div')
    c.className = 'fl-cursor'
    c.innerHTML = `<svg width="30" height="30" viewBox="0 0 32 32">
      <path d="M5 3 L5 27 L11.5 20.5 L16 27 L19.5 24.5 L15 18 L22 18 Z"
            fill="#141419" stroke="#ffffff" stroke-width="1.9" stroke-linejoin="round"/></svg>`
    document.body.appendChild(c)
    const r = document.createElement('div')
    r.className = 'fl-ripple'
    document.body.appendChild(r)

    window.addEventListener('mousemove', (e) => {
      c.style.transform = `translate(${e.clientX - 2}px, ${e.clientY - 2}px)`
    }, true)
    window.addEventListener('mousedown', (e) => {
      c.classList.add('down')
      r.style.left = e.clientX + 'px'
      r.style.top = e.clientY + 'px'
      r.classList.remove('go')
      void r.offsetWidth
      r.classList.add('go')
    }, true)
    window.addEventListener('mouseup', () => c.classList.remove('down'), true)
  }
  setTimeout(boot, 0)
}

let browser = null
let ctx = null
let page = null

// driver-side cursor position
let cur = { x: VIEW.width / 2, y: VIEW.height / 2 }

async function launch() {
  browser = await chromium.launch({
    headless: !process.env.HEADED,
    args: ['--use-angle=default', '--disable-background-timer-throttling'],
  })
  ctx = await browser.newContext({
    viewport: VIEW,
    recordVideo: { dir: RAW, size: VIEW, fps: FPS },
  })
  await ctx.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) {
      try { localStorage.setItem(k, v) } catch { /* ignore */ }
    }
  }, seed)
  await ctx.addInitScript(CURSOR_OVERLAY)
  page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 140)))
}

// ---------------------------------------------------------------------------
// Human mouse helpers
// ---------------------------------------------------------------------------
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Eased, slightly-arc'd mouse move in small steps — the anti-robotic motion. */
async function moveMouse(x, y, opts = {}) {
  const { dur = 640, arc = 16 } = opts
  const sx = cur.x
  const sy = cur.y
  const dx = x - sx
  const dy = y - sy
  const dist = Math.hypot(dx, dy)
  if (dist < 2) { cur.x = x; cur.y = y; return }
  const steps = Math.max(12, Math.min(52, Math.round(dist / 3)))
  const ux = -dy / dist
  const uy = dx / dist
  const baseWait = dur / steps
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const e = easeInOutCubic(t)
    const wob = Math.sin(Math.PI * t) * arc * (0.5 + Math.random())
    const px = sx + dx * e + ux * wob
    const py = sy + dy * e + uy * wob
    await page.mouse.move(Math.round(px), Math.round(py))
    cur.x = px
    cur.y = py
    await sleep(baseWait * (0.55 + Math.random() * 0.9))
  }
}

async function hoverAt(x, y, opts) {
  await moveMouse(x, y, { dur: 520, arc: 10, ...opts })
  await sleep(300 + Math.random() * 250)
}

async function clickAt(x, y, opts) {
  await hoverAt(x, y, opts)
  await sleep(180 + Math.random() * 160)
  await page.mouse.down()
  await sleep(85 + Math.random() * 45)
  await page.mouse.up()
  await sleep(420)
}

/** Find an element's centre then click it with the human cursor. */
async function clickSel(selector, { idx = 0, waitMs = 8000 } = {}) {
  const el = await page.waitForSelector(selector, { timeout: waitMs }).catch(() => null)
  if (!el) throw new Error(`clickSel: no element for "${selector}"`)
  const box = await el.boundingBox()
  if (!box) throw new Error(`clickSel: no box for "${selector}"`)
  await clickAt(box.x + box.width / 2, box.y + box.height / 2)
}

/** Click by visible text inside a given container selector. */
async function clickText(text, container = 'body', opts = {}) {
  const sel = `${container} >> text="${text}"`
  const el = await page.waitForSelector(sel, { timeout: 10000 }).catch(() => null)
  if (!el) throw new Error(`clickText: no element for text "${text}"`)
  const box = await el.boundingBox()
  if (!box) throw new Error(`clickText: no box for "${text}"`)
  await clickAt(box.x + box.width / 2, box.y + box.height / 2, opts)
}

async function typeText(text) {
  await page.keyboard.type(text, { delay: 45 + Math.random() * 70 })
}

async function press(key, holdMs = 0) {
  await page.keyboard.press(key)
  if (holdMs) await sleep(holdMs)
}

// ---------------------------------------------------------------------------
// App-flow building blocks
// ---------------------------------------------------------------------------
async function goto(url, waitFor = null, waitMs = 9000) {
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (waitFor) {
    await page.waitForSelector(waitFor, { timeout: waitMs }).catch(() => {
      console.log('  [warn] waitFor missing:', waitFor, '→', page.url())
    })
  }
  await sleep(2500)
}

async function injectHide(selectors) {
  await page.evaluate((sels) => {
    const st = document.createElement('style')
    st.textContent = sels.map((s) => `${s} { display: none !important; }`).join('\n')
    document.head.appendChild(st)
  }, selectors)
}

async function newClip(name) {
  if (page) {
    try { await page.close() } catch { /* ignore */ }
  }
  page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 140)))
  cur = { x: VIEW.width / 2, y: VIEW.height / 2 }
  console.log(`\n=== clip: ${name} ===`)
}

/** Close the clip's page and convert its WebM to MP4. */
async function finishClip(name, { speed = 1, dropAudio = false } = {}) {
  let webm = null
  try {
    webm = page.video() ? await page.video().path() : null
  } catch { /* video may already be gone */ }
  try { await page.close() } catch { /* ignore */ }
  if (!webm || !existsSync(webm)) {
    console.log(`  !! ${name}: no video captured`)
    return null
  }
  const mp4 = path.join(OUT, `${name}.mp4`)
  const vf = speed !== 1 ? [`setpts=PTS/${speed}`] : []
  const args = ['-y', '-i', webm]
  if (vf.length) args.push('-vf', vf.join(','))
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p')
  if (dropAudio) args.push('-an')
  else args.push('-c:a', 'aac', '-b:a', '192k')
  args.push('-movflags', '+faststart', mp4)
  execFileSync(FFMPEG, args, { stdio: 'pipe' })
  const sizeMB = (existsSync(mp4) ? statSync(mp4).size : 0) / 1e6
  console.log(`  ✓ ${name}.mp4  ${sizeMB.toFixed(1)}MB`)
  return mp4
}

// ---------------------------------------------------------------------------
// THE CLIPS
// ---------------------------------------------------------------------------

/** 1 — Task Magnet: create tasks, tick them, open Analytics. */
async function clipTaskMagnet() {
  await newClip('clip-1-task-magnet')
  await goto('/magnet', '.mg-nav', 12000)

  // Wander across the dashboard first so the view feels alive.
  const dashCards = await page.$$('.mg-nav, .mg-hero, .mg-panel')
  for (let i = 0; i < 5; i++) {
    const els = await page.$$('.mg-panel, .mg-card, .mg-hero')
    if (!els.length) break
    const el = els[Math.floor(Math.random() * els.length)]
    const b = await el.boundingBox().catch(() => null)
    if (b) await hoverAt(b.x + b.width / 2, b.y + b.height / 2, { dur: 500 })
    await sleep(450)
  }

  // Tasks view
  await clickText('Tasks', '.mg-nav')
  await sleep(1200)

  // Add three tasks
  const titles = ['Finish physics notes', 'History essay outline', 'Read chapter four']
  for (const title of titles) {
    await clickSel('.mg-view-actions .mg-btn.primary')
    await sleep(1100)
    const titleInput = await page.$('.mg-form input[autofocus], .mg-form input[placeholder]')
    if (titleInput) {
      const b = await titleInput.boundingBox()
      if (b) { await clickAt(b.x + b.width / 2, b.y + b.height / 2); await typeText(title) }
    }
    await sleep(400)
    await clickSel('.mg-form button[type="submit"], .mg-form .mg-btn.primary')
    await sleep(1400)
  }

  // Tick the tasks — tick, tick, tick.
  const checks = await page.$$('.mg-check')
  const toTick = Math.min(2, checks.length)
  for (let i = 0; i < toTick; i++) {
    const b = await checks[i].boundingBox().catch(() => null)
    if (b) await clickAt(b.x + b.width / 2, b.y + b.height / 2)
    await sleep(1600)
  }

  // Analytics
  await clickText('Analytics', '.mg-nav')
  await sleep(2500)
  const chartEls = await page.$$('.mg-chart, .mg-spark, .mg-bar-col, .mg-panel')
  for (const el of chartEls.slice(0, 6)) {
    const b = await el.boundingBox().catch(() => null)
    if (b) await hoverAt(b.x + b.width / 2, b.y + b.height / 2, { dur: 420 })
    await sleep(350)
  }
  await sleep(2200)
}

/** 2 — Lobby: hover the world cards so the viewer sees the navigation. */
async function clipLobby() {
  await newClip('clip-2-lobby')
  await goto('/lobby', '.lobby, main, [class*="lobby"]', 10000)
  await sleep(2500)
  const targets = ['Realm', 'Task Magnet', 'Blueprints', 'Shop', 'Settings', 'Avatar']
  for (const t of targets) {
    const el = await page.$(`text="${t}"`)
    if (!el) continue
    const b = await el.boundingBox().catch(() => null)
    if (b) await hoverAt(b.x + b.width / 2, b.y + b.height / 2, { dur: 460 })
    await sleep(600)
  }
  // settle on the Realm card
  const realm = await page.$('text="Realm"')
  const b = realm ? await realm.boundingBox().catch(() => null) : null
  if (b) await hoverAt(b.x + b.width / 2, b.y + b.height / 2, { dur: 500 })
  await sleep(1800)
}

/** 3 — Realm journey: Lobby → Public Realm → Library → Scholar Grove → seat → sit. */
async function clipRealmJourney() {
  await newClip('clip-3-realm-journey')
  await goto('/lobby', 'main, [class*="lobby"], body', 10000)
  await sleep(2000)

  await clickText('Realm', 'body')
  await sleep(1800)
  await clickText('Public Realm', 'body')
  await sleep(1800)
  await clickText('Library', 'body')
  await sleep(1800)

  // Pick Scholar Grove from the room list.
  await clickText('Scholar Grove', 'body')
  // The join navigates into the library → seat selection overlay.
  await page.waitForSelector('.sso-seat', { timeout: 25000 }).catch(() => {
    console.log('  [warn] no .sso-seat found; url =', page.url())
  })
  await sleep(4000)

  // Choose a random AVAILABLE seat on the map with the cursor.
  const seats = await page.$$('.sso-seat:not(.occupied)')
  if (seats.length) {
    const seat = seats[Math.floor(Math.random() * seats.length)]
    const b = await seat.boundingBox().catch(() => null)
    if (b) await clickAt(b.x + b.width / 2, b.y + b.height / 2)
    await sleep(1200)
  }
  // Sit down
  const join = await page.$('.sso-btn-primary')
  const jb = join ? await join.boundingBox().catch(() => null) : null
  if (jb) await clickAt(jb.x + jb.width / 2, jb.y + jb.height / 2)
  // Wait for the seat overlay to clear (we're now seated).
  await page.waitForFunction(() => !document.querySelector('.sso-root'), { timeout: 25000 }).catch(() => {})
  await sleep(6000)
}

/** 4 — Seated camera presets 1→4 (the "incredibly good camera positions"). */
async function clipSeatedPresets() {
  await newClip('clip-4-seated-presets')
  // Enter straight into a seated session (seat 5) so we don't repeat the journey.
  await goto('/lobby/explore?world=library', '.sso-seat', 30000)
  await sleep(2500)
  const seat = await page.$('.sso-seat:not(.occupied)')
  const b = seat ? await seat.boundingBox().catch(() => null) : null
  if (b) await clickAt(b.x + b.width / 2, b.y + b.height / 2)
  await sleep(900)
  const join = await page.$('.sso-btn-primary')
  const jb = join ? await join.boundingBox().catch(() => null) : null
  if (jb) await clickAt(jb.x + jb.width / 2, jb.y + jb.height / 2)
  await page.waitForFunction(() => !document.querySelector('.sso-root'), { timeout: 25000 }).catch(() => {})
  await sleep(6000)

  // Cycle the seated camera presets, letting each hold.
  for (const key of ['1', '2', '3', '4', '1', '2']) {
    await press(key)
    await sleep(7000)
  }
}

/** 5 — Cinematic tour (~1 minute) — key 9. Hide interactive HUD chrome. */
async function clipCinematicTour() {
  await newClip('clip-5-cinematic-tour')
  await goto('/lobby/explore?world=library', '.sso-seat', 30000)
  await sleep(2500)
  const seat = await page.$('.sso-seat:not(.occupied)')
  const b = seat ? await seat.boundingBox().catch(() => null) : null
  if (b) await clickAt(b.x + b.width / 2, b.y + b.height / 2)
  await sleep(900)
  const join = await page.$('.sso-btn-primary')
  const jb = join ? await join.boundingBox().catch(() => null) : null
  if (jb) await clickAt(jb.x + jb.width / 2, jb.y + jb.height / 2)
  await page.waitForFunction(() => !document.querySelector('.sso-root'), { timeout: 25000 }).catch(() => {})
  await sleep(5000)

  // Hide interactive chrome so the tour is pure cinematic footage.
  await injectHide(['.explore-pomo-wrap', '.mp', '.desk-footer', '.desk-mini', '.explore-mini'])
  await press('9')
  await sleep(65000) // ~62s of the tour — cuts between the hand-crafted shots
}

/** 6 — Calculator at the desk. */
async function clipCalculator() {
  await newClip('clip-6-calculator')
  await goto('/lobby/explore?world=library', '.sso-seat', 30000)
  await sleep(2500)
  const seat = await page.$('.sso-seat:not(.occupied)')
  const b = seat ? await seat.boundingBox().catch(() => null) : null
  if (b) await clickAt(b.x + b.width / 2, b.y + b.height / 2)
  await sleep(900)
  const join = await page.$('.sso-btn-primary')
  const jb = join ? await join.boundingBox().catch(() => null) : null
  if (jb) await clickAt(jb.x + jb.width / 2, jb.y + jb.height / 2)
  await page.waitForFunction(() => !document.querySelector('.sso-root'), { timeout: 25000 }).catch(() => {})
  await sleep(5000)

  // Open the calculator from the desk footer.
  const calc = await page.$('.desk-footer-btn[title*="alculator"], .desk-footer-btn')
  const cb = calc ? await calc.boundingBox().catch(() => null) : null
  if (cb) await clickAt(cb.x + cb.width / 2, cb.y + cb.height / 2)
  await sleep(2500)

  // Type a little calculation on the keypad.
  const keys = ['9', '6', 'x', '8', '=', '+', '1', '2', '=']
  for (const k of keys) {
    const key = await page.$(`.calc-key[data-k="${k}"], .calc-btn:has-text("${k}")`).catch(() => null)
    if (key) {
      const kb = await key.boundingBox().catch(() => null)
      if (kb) { await clickAt(kb.x + kb.width / 2, kb.y + kb.height / 2); await sleep(550) }
    } else {
      console.log('  [warn] calc key not found:', k)
    }
  }
  await sleep(2500)
}

/** 7 — Music on → timer → Easy 60 min → start → fullscreen focus (time-lapse). */
async function clipMusicTimer() {
  await newClip('clip-7-music-timer')
  await goto('/lobby/explore?world=library', '.sso-seat', 30000)
  await sleep(2500)
  const seat = await page.$('.sso-seat:not(.occupied)')
  const b = seat ? await seat.boundingBox().catch(() => null) : null
  if (b) await clickAt(b.x + b.width / 2, b.y + b.height / 2)
  await sleep(900)
  const join = await page.$('.sso-btn-primary')
  const jb = join ? await join.boundingBox().catch(() => null) : null
  if (jb) await clickAt(jb.x + jb.width / 2, jb.y + jb.height / 2)
  await page.waitForFunction(() => !document.querySelector('.sso-root'), { timeout: 25000 }).catch(() => {})
  await sleep(5000)

  // 1) Music: press play.
  const play = await page.$('.mp-play')
  const pb = play ? await play.boundingBox().catch(() => null) : null
  if (pb) await clickAt(pb.x + pb.width / 2, pb.y + pb.height / 2)
  await sleep(5000)

  // 2) Open the timer config (top-center chip).
  const chip = await page.$('.pomo-timer-pill')
  const chipB = chip ? await chip.boundingBox().catch(() => null) : null
  if (chipB) await clickAt(chipB.x + chipB.width / 2, chipB.y + chipB.height / 2)
  await sleep(1600)

  // Easy mode.
  const easy = await page.$('.pomo-config-btn:has-text("Easy")')
  const eb = easy ? await easy.boundingBox().catch(() => null) : null
  if (eb) await clickAt(eb.x + eb.width / 2, eb.y + eb.height / 2)
  await sleep(900)

  // 60 minutes (closest to the requested 59).
  const dur = await page.$('.pomo-config-btn:has-text("60")')
  const db = dur ? await dur.boundingBox().catch(() => null) : null
  if (db) await clickAt(db.x + db.width / 2, db.y + db.height / 2)
  await sleep(900)

  // Start the session.
  const start = await page.$('.pomo-config-start:not(.pomo-config-connect)')
  const sb = start ? await start.boundingBox().catch(() => null) : null
  if (sb) await clickAt(sb.x + sb.width / 2, sb.y + sb.height / 2)
  await sleep(4000)

  // 3) Fullscreen focus mode.
  const fsBtn = await page.$('.pomo-fullscreen')
  const fb = fsBtn ? await fsBtn.boundingBox().catch(() => null) : null
  if (fb) await clickAt(fb.x + fb.width / 2, fb.y + fb.height / 2)
  await sleep(3500)

  // Let the timer visibly run — this raw stretch gets sped up 4x in the encode
  // so the countdown ring/leaves read as a working time-lapse.
  await sleep(90000)
}

/** 8 — Shop: characters, then accessories, individual previews. */
async function clipShop() {
  await newClip('clip-8-shop')
  await goto('/shop', 'main, [class*="shop"], body', 12000)
  await sleep(3000)

  // Characters tab: hover + open a couple of character previews.
  await clickText('Characters', 'body').catch(() => console.log('  [warn] no Characters tab'))
  await sleep(2000)
  const charCards = await page.$$('[class*="char"][class*="card"], [class*="shop"] [class*="item"]')
  for (const el of charCards.slice(0, 5)) {
    const b = await el.boundingBox().catch(() => null)
    if (b) await hoverAt(b.x + b.width / 2, b.y + b.height / 2, { dur: 420 })
    await sleep(450)
  }
  await sleep(1500)

  // Accessories tab — show the individual accessory views.
  await clickText('Accessories', 'body').catch(() => console.log('  [warn] no Accessories tab'))
  await sleep(2500)
  const accItems = await page.$$('[class*="acc"], [class*="item"]')
  for (const el of accItems.slice(0, 4)) {
    const b = await el.boundingBox().catch(() => null)
    if (b) await hoverAt(b.x + b.width / 2, b.y + b.height / 2, { dur: 400 })
    await sleep(600)
  }
  await sleep(2500)
}

// ---------------------------------------------------------------------------
const CLIPS = {
  'task-magnet': clipTaskMagnet,
  lobby: clipLobby,
  'realm-journey': clipRealmJourney,
  'seated-presets': clipSeatedPresets,
  'cinematic-tour': clipCinematicTour,
  calculator: clipCalculator,
  'music-timer': clipMusicTimer,
  shop: clipShop,
}

const opts = {
  'cinematic-tour': { speed: 1 },
  'music-timer': { speed: 4, dropAudio: true },
}

async function main() {
  const requested = process.argv.slice(2).join(',')
  const want = requested && requested !== 'all' ? requested.split(',').map((s) => s.trim()).filter(Boolean) : Object.keys(CLIPS)
  await launch()
  for (const name of want) {
    const fn = CLIPS[name]
    if (!fn) { console.log('skip unknown:', name); continue }
    const t0 = Date.now()
    try {
      await fn()
      await finishClip(name, opts[name] || {})
    } catch (e) {
      console.log(`  !! ${name} FAILED:`, String(e).slice(0, 200))
      try { await finishClip(name, opts[name] || {}) } catch { /* keep going */ }
    }
    console.log(`  (${name} took ${Math.round((Date.now() - t0) / 1000)}s)`)
  }
  await browser.close()
  console.log('\nDone. Clips in docs/clips/')
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
