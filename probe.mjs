import { chromium } from 'playwright'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()) })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
const id = 'guest_probe_2_' + Date.now()
await page.addInitScript((gid) => {
  localStorage.setItem('sf.guest', JSON.stringify({ id: gid, isGuest: true }))
  localStorage.setItem('sf.guest.profile.v1.' + gid, JSON.stringify({ data: { completed: true } }))
}, id)
await page.goto('http://localhost:5173/magnet', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.getByRole('button', { name: 'Tasks', exact: true }).first().click()
await page.waitForTimeout(800)

const quick = page.locator('.mg-quickcapture input')
for (let i = 1; i <= 16; i++) {
  await quick.fill(`Probe task number ${i} — a reasonably long title to fill the page`)
  await quick.press('Enter')
  await page.waitForTimeout(120)
}
await page.waitForTimeout(800)

const m1 = await page.evaluate(() => {
  const q = (s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), scrollH: el.scrollHeight, clientH: el.clientHeight, overflowY: cs.overflowY, pos: cs.position }
  }
  const cards = [...document.querySelectorAll('.mg-taskcard')]
  const last = cards.at(-1)
  const lr = last ? last.getBoundingClientRect() : null
  return {
    content: q('.mg-content'), view: q('.mg-view'),
    cardCount: cards.length,
    lastCard: lr ? { top: Math.round(lr.top), bottom: Math.round(lr.bottom) } : null,
    bodyScrollH: document.body.scrollHeight,
  }
})
console.log('M1', JSON.stringify(m1))
await page.screenshot({ path: 'probe_tasks_full.png' })

const r = await page.evaluate(async () => {
  const c = document.querySelector('.mg-content')
  c.scrollTo({ top: 999999, behavior: 'instant' })
  await new Promise((res) => setTimeout(res, 500))
  const cards = [...document.querySelectorAll('.mg-taskcard')]
  const last = cards.at(-1)
  const lr = last.getBoundingClientRect()
  const out = {
    scrollTop: Math.round(c.scrollTop), scrollH: c.scrollHeight, clientH: c.clientHeight,
    delta: c.scrollHeight - c.clientHeight,
    lastCardNow: { top: Math.round(lr.top), bottom: Math.round(lr.bottom) },
  }
  return out
})
console.log('SCROLLED', JSON.stringify(r))
await page.screenshot({ path: 'probe_tasks_bottom.png' })

// --- Modal scroll test ---
// Click "New task" button to open the modal
const newTaskBtn = page.locator('button, [role="button"]').filter({ hasText: /new task/i }).first()
if (await newTaskBtn.isVisible()) {
  await newTaskBtn.click()
  await page.waitForTimeout(500)
} else {
  // Try the floating add button
  const addBtn = page.locator('.mg-fab, .mg-add-btn, [class*="add"]').first()
  if (await addBtn.isVisible()) {
    await addBtn.click()
    await page.waitForTimeout(500)
  }
}

const modalInfo = await page.evaluate(() => {
  const q = (s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
      scrollH: el.scrollHeight, clientH: el.clientHeight,
      overflowY: cs.overflowY, pos: cs.position,
    }
  }
  const overlay = q('.mg-modal-overlay')
  const modal = q('.mg-modal')
  const head = q('.mg-modal-head')
  const body = q('.mg-modal-body')
  // Check all form fields are present
  const fields = [...document.querySelectorAll('.mg-modal-body .mg-field, .mg-modal-body label, .mg-modal-body input, .mg-modal-body select, .mg-modal-body textarea')]
  const lastField = fields.length ? fields.at(-1).getBoundingClientRect() : null
  return {
    overlay, modal, head, body,
    fieldCount: fields.length,
    lastField: lastField ? { top: Math.round(lastField.top), bottom: Math.round(lastField.bottom) } : null,
    modalOverflow: modal ? modal.bottom <= window.innerHeight : null,
  }
})
console.log('MODAL', JSON.stringify(modalInfo))
await page.screenshot({ path: 'probe_modal_top.png' })

// Scroll inside the modal to reach bottom fields
if (modalInfo && modalInfo.modal && modalInfo.modal.scrollH > modalInfo.modal.clientH) {
  await page.evaluate(() => {
    const m = document.querySelector('.mg-modal')
    if (m) m.scrollTo({ top: 999999, behavior: 'instant' })
  })
  await page.waitForTimeout(400)
  const modalBottom = await page.evaluate(() => {
    const m = document.querySelector('.mg-modal')
    if (!m) return null
    const r = m.getBoundingClientRect()
    const cs = getComputedStyle(m)
    return {
      scrollTop: Math.round(m.scrollTop), scrollH: m.scrollHeight, clientH: m.clientHeight,
      delta: m.scrollHeight - m.clientHeight,
      bottom: Math.round(r.bottom),
    }
  })
  console.log('MODAL_SCROLLED', JSON.stringify(modalBottom))
  await page.screenshot({ path: 'probe_modal_bottom.png' })
} else {
  console.log('MODAL_FITS', 'Modal content fits without scroll')
  await page.screenshot({ path: 'probe_modal_fits.png' })
}

await browser.close()