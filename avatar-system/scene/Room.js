// Room.js — the cozy study room the companion lives in. Pure DOM + CSS shapes
// (no images): wooden floor, circular rug, desk with a laptop study-timer, a
// lamp, bookshelf, plant, a blossom window, and a "Focus Lily" neon sign.
// Supports day/night and hosts the ambient particle layers. Built once; the
// avatar is layered in front of it by the studio.
//
// Styling lives in styles/studio.css (keyed off these class names); this file
// only builds the structure + a little procedural content (books, planks).

import { fillPetals, fillMotes } from './Particles.js'

function div(cls, parent) {
  const el = document.createElement('div')
  if (cls) el.className = cls
  if (parent) parent.appendChild(el)
  return el
}

const BOOK_COLORS = ['#b65a6e', '#34507a', '#3c6b46', '#c6892f', '#6e3050', '#5a3a8a', '#48505c']

export class Room {
  constructor() {
    const room = div('room')

    // Warm wall + ambient light wash.
    div('room-wall', room)
    div('room-light', room)

    // Window with a blossom sky, panes, and curtains.
    const win = div('room-window', room)
    const sky = div('win-sky', win)
    div('win-celestial', sky)            // sun (day) / moon (night)
    for (let i = 0; i < 7; i++) {
      const s = div('win-star', sky)
      s.style.left = `${12 + Math.random() * 76}%`
      s.style.top = `${8 + Math.random() * 55}%`
      s.style.animationDelay = `${(-Math.random() * 3).toFixed(2)}s`
    }
    for (let i = 0; i < 3; i++) {
      const c = div('win-cloud', sky)
      c.style.top = `${18 + i * 22}%`
      c.style.left = `${10 + Math.random() * 50}%`
      c.style.animationDelay = `${(-Math.random() * 20).toFixed(2)}s`
    }
    div('win-branch', win)               // cherry-blossom branch silhouette
    const pane = div('win-pane', win)
    div('win-bar-v', pane)
    div('win-bar-h', pane)
    div('curtain curtain-l', win)
    div('curtain curtain-r', win)

    // Neon "Focus Lily" sign.
    const neon = div('neon-sign', room)
    neon.textContent = 'Focus Lily'

    // Bookshelf with rows of colourful spines + a little star trinket.
    const shelf = div('shelf', room)
    for (let r = 0; r < 2; r++) {
      const row = div('shelf-row', shelf)
      const n = 7 + Math.floor(Math.random() * 3)
      for (let b = 0; b < n; b++) {
        const book = div('book', row)
        book.style.background = BOOK_COLORS[(r * 3 + b) % BOOK_COLORS.length]
        book.style.height = `${64 + Math.random() * 22}%`
        book.style.width = `${9 + Math.random() * 5}px`
      }
    }
    div('shelf-star', shelf)

    // Desk: lamp + laptop (study timer) + a book.
    const desk = div('desk', room)
    div('desk-top', desk)
    div('desk-leg desk-leg-l', desk)
    div('desk-leg desk-leg-r', desk)
    const lamp = div('lamp', desk)
    div('lamp-base', lamp)
    div('lamp-arm', lamp)
    const head = div('lamp-head', lamp)
    div('lamp-glow', head)
    const laptop = div('laptop', desk)
    const screen = div('laptop-screen', laptop)
    this._timer = div('laptop-timer', screen)
    this._timer.textContent = '25:00'
    div('laptop-base', laptop)
    div('desk-book', desk)

    // Potted plant.
    const plant = div('plant', room)
    div('pot', plant)
    const foliage = div('foliage', plant)
    for (let i = 0; i < 5; i++) {
      const leaf = div('leaf', foliage)
      leaf.style.transform = `rotate(${-60 + i * 30}deg)`
    }

    // Beanbag pouf.
    div('beanbag', room)

    // Floor + circular rug.
    div('room-floor', room)
    div('rug', room)
    div('rug rug-inner', room)

    // Ambient particles (behind the avatar): petals + dust motes.
    const petalLayer = div('petal-layer', room)
    fillPetals(petalLayer, { count: 16 })
    const moteLayer = div('mote-layer', room)
    fillMotes(moteLayer, 12)

    this.el = room
    this.fxLayer = div('room-fx', room) // celebration bursts, etc.
  }

  /** 'day' | 'night' — flips the room lighting. */
  setTimeOfDay(mode) {
    this.el.classList.toggle('is-night', mode === 'night')
    return this
  }

  /** Update the laptop study-timer readout (e.g. '24:59'). */
  setTimer(text) {
    this._timer.textContent = text
    return this
  }
}
