// Particles.js — lightweight, CSS-driven ambient particles. We create a fixed
// pool of elements with randomized animation params and let the GPU loop them
// (no per-frame JS), so the room stays alive cheaply even on mobile.

function rnd(min, max) {
  return min + Math.random() * (max - min)
}

/**
 * Fill a layer with drifting petals (cherry-blossom feel).
 * @param {HTMLElement} layer
 * @param {{count?:number, color?:string}} [opts]
 */
export function fillPetals(layer, opts = {}) {
  const count = opts.count ?? 14
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div')
    p.className = 'petal'
    const size = rnd(7, 14)
    p.style.left = `${rnd(0, 100)}%`
    p.style.width = `${size}px`
    p.style.height = `${size * 0.8}px`
    if (opts.color) p.style.background = opts.color
    p.style.animationDuration = `${rnd(7, 14)}s, ${rnd(2.5, 4.5)}s`
    p.style.animationDelay = `${rnd(-12, 0)}s, ${rnd(-4, 0)}s`
    p.style.opacity = String(rnd(0.5, 0.95))
    layer.appendChild(p)
  }
}

/**
 * Soft floating dust motes / fireflies — slow vertical bob, gentle twinkle.
 * @param {HTMLElement} layer
 */
export function fillMotes(layer, count = 10) {
  for (let i = 0; i < count; i++) {
    const m = document.createElement('div')
    m.className = 'mote'
    m.style.left = `${rnd(0, 100)}%`
    m.style.top = `${rnd(10, 90)}%`
    const s = rnd(2, 5)
    m.style.width = `${s}px`
    m.style.height = `${s}px`
    m.style.animationDuration = `${rnd(4, 9)}s, ${rnd(2, 4)}s`
    m.style.animationDelay = `${rnd(-9, 0)}s, ${rnd(-4, 0)}s`
    layer.appendChild(m)
  }
}

/**
 * Twinkling sparkles inside a small box (used for glowing cosmetics).
 * @param {HTMLElement} layer
 */
export function fillSparkles(layer, count = 9) {
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div')
    s.className = 'spark'
    s.style.left = `${rnd(0, 100)}%`
    s.style.top = `${rnd(0, 100)}%`
    const sz = rnd(3, 7)
    s.style.width = `${sz}px`
    s.style.height = `${sz}px`
    s.style.animationDuration = `${rnd(1.4, 3)}s`
    s.style.animationDelay = `${rnd(-3, 0)}s`
    layer.appendChild(s)
  }
}

/**
 * One-shot celebration burst of confetti from a point. Auto-cleans up.
 * @param {HTMLElement} layer
 */
export function confettiBurst(layer, count = 22) {
  const colors = ['#f49ac1', '#f7c948', '#8a6df0', '#5ec6c0', '#ff8a8a', '#a0e072']
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div')
    c.className = 'confetti'
    c.style.left = '50%'
    c.style.top = '46%'
    c.style.background = colors[i % colors.length]
    const ang = rnd(0, Math.PI * 2)
    const dist = rnd(60, 170)
    c.style.setProperty('--dx', `${Math.cos(ang) * dist}px`)
    c.style.setProperty('--dy', `${Math.sin(ang) * dist - rnd(20, 80)}px`)
    c.style.setProperty('--rot', `${rnd(-360, 360)}deg`)
    c.style.animationDelay = `${rnd(0, 0.12)}s`
    layer.appendChild(c)
    // remove after the animation (1.2s + delay buffer)
    setTimeout(() => c.remove(), 1500)
  }
}
