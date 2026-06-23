// IdleLife.js — micro-animations that make the companion feel ALIVE without
// touching the skeleton: blinking and occasional eye-darts ("looking around").
//
// It owns ONLY the eyes slot's transform (blink = scaleY, dart = translateX),
// which the bone animator never writes, so the two never collide. The eyes
// slot's transform-origin is set to the eye line (rig SLOT_ORIGIN) so a blink
// closes on the eyes, not the neck.

function rand(min, max) {
  return min + Math.random() * (max - min)
}

export class IdleLife {
  /** @param {import('../core/AvatarModel.js').AvatarModel} model */
  constructor(model) {
    this.eyes = model.slot('eyes')
    this.enabled = true

    this._blinkIn = rand(1.5, 4) // seconds until next blink
    this._blinkT = -1 // -1 = not blinking, else elapsed
    this._blinkDur = 0.14

    this._dartIn = rand(2.5, 6)
    this._dartX = 0
    this._dartTarget = 0
    this._dartHold = 0
  }

  setEnabled(on) {
    this.enabled = on
    if (!on && this.eyes) this.eyes.style.transform = ''
  }

  update(dt) {
    if (!this.enabled || !this.eyes) return

    // --- blink ---
    let sy = 1
    if (this._blinkT >= 0) {
      this._blinkT += dt
      const p = this._blinkT / this._blinkDur
      if (p >= 1) {
        this._blinkT = -1
        this._blinkIn = rand(1.8, 5.5)
        // occasional quick double-blink
        if (Math.random() < 0.18) this._blinkIn = 0.18
      } else {
        // close (0->.5) then open (.5->1)
        sy = p < 0.5 ? 1 - (p / 0.5) * 0.94 : 0.06 + ((p - 0.5) / 0.5) * 0.94
      }
    } else {
      this._blinkIn -= dt
      if (this._blinkIn <= 0) this._blinkT = 0
    }

    // --- eye dart (look around) ---
    this._dartIn -= dt
    if (this._dartIn <= 0 && this._dartHold <= 0) {
      const r = Math.random()
      this._dartTarget = r < 0.4 ? -4 : r < 0.8 ? 4 : 0
      this._dartHold = rand(0.5, 1.1)
      this._dartIn = rand(3, 8)
    }
    if (this._dartHold > 0) {
      this._dartHold -= dt
      if (this._dartHold <= 0) this._dartTarget = 0
    }
    // ease toward target
    this._dartX += (this._dartTarget - this._dartX) * Math.min(1, dt * 10)

    this.eyes.style.transform = `translateX(${this._dartX.toFixed(2)}px) scaleY(${sy.toFixed(3)})`
  }
}
