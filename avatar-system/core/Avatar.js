// Avatar.js — the public FACADE. Wires the four independent subsystems together
// and owns the frame clock. This is the only file most game code imports.
//
//   model       AvatarModel   — immutable skeleton + base body (never mutated)
//   cosmetics   Cosmetics     — additive layers mounted on bone slots
//   animator    Animator      — writes bone transforms from clips
//   sm          state machine — intent -> clip
//   controller  (optional)    — input -> movement + intent
//
// Each is replaceable in isolation; the facade just connects them.

import { AvatarModel } from './AvatarModel.js'
import { Cosmetics } from './Cosmetics.js'
import { Animator } from '../animation/Animator.js'
import { LocomotionStateMachine } from '../animation/StateMachine.js'
import { IdleLife } from '../animation/IdleLife.js'
import { AvatarController } from '../controller/AvatarController.js'
import { CosmeticEffects } from '../scene/effects.js'
import { migrateConfig, createDefaultConfig, cloneConfig } from './schema.js'
import { getItem } from '../data/catalog.js'

export class Avatar {
  /**
   * @param {{ parent?:HTMLElement, config?:object, scale?:number }} [opts]
   */
  constructor(opts = {}) {
    this.scale = opts.scale ?? 1
    this.config = migrateConfig(opts.config || createDefaultConfig())

    this.model = new AvatarModel()
    this.cosmetics = new Cosmetics(this.model)
    this.animator = new Animator(this.model)
    this.sm = new LocomotionStateMachine(this.animator)
    this.idleLife = new IdleLife(this.model)
    this.effects = new CosmeticEffects(this.model)
    this.controller = null

    this.el = this.model.stageEl
    this._raf = 0
    this._last = 0

    this.cosmetics.apply(this.config)
    this.effects.applyAll(this.config)
    this.model.setScale(this.scale * this.config.height)

    if (opts.parent) opts.parent.appendChild(this.el)
  }

  /* ----------------------------------------------------------- cosmetics */

  /** Replace the whole look (validates + migrates first). */
  setConfig(config) {
    this.config = migrateConfig(config)
    this.cosmetics.apply(this.config)
    this.effects.applyAll(this.config)
    this.model.setScale(this.scale * this.config.height)
    return this
  }

  /** Equip an item into a slot and re-render just that slot (+ its effects). */
  equip(slot, itemId) {
    this.config.equipped[slot] = itemId
    this.cosmetics.applySlot(slot, itemId, this.config.tints[slot])
    this.effects.apply(slot, getItem(itemId), this.config.tints[slot])
    return this
  }

  /** Set the tint swatch of a slot (re-renders that slot + its effects). */
  setTint(slot, swatchId) {
    this.config.tints[slot] = swatchId
    this.cosmetics.applySlot(slot, this.config.equipped[slot], swatchId)
    this.effects.apply(slot, getItem(this.config.equipped[slot]), swatchId)
    return this
  }

  /** Set skin colour (recolours every base body part). */
  setSkin(swatchId) {
    this.config.skin = swatchId
    this.model.setSkin(swatchId)
    return this
  }

  /** A clean JSON copy of the current config (for saving / networking). */
  serialize() {
    return cloneConfig(this.config)
  }

  /* ------------------------------------------------------------- control */

  /** Attach a keyboard/touch controller. Returns it (call .enable()). */
  attachController(opts) {
    this.controller = new AvatarController(this, opts)
    return this.controller
  }

  jump() { this.sm.jump(); return this }
  emote(name) { this.sm.playEmote(name); return this }
  setLocomotion(intent) { this.sm.setLocomotion(intent); return this }

  /* --------------------------------------------------------------- clock */

  /** Start the RAF loop driving animator + controller. */
  start() {
    if (this._raf) return this
    const tick = (now) => {
      const dt = this._last ? Math.min(0.05, (now - this._last) / 1000) : 0
      this._last = now
      this.controller?.update(dt)
      this.animator.update(dt)
      this.idleLife.update(dt)
      this._raf = requestAnimationFrame(tick)
    }
    this._raf = requestAnimationFrame(tick)
    return this
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf)
    this._raf = 0
    this._last = 0
    return this
  }

  /** Tear down listeners + RAF (DOM is removed by the caller). */
  destroy() {
    this.stop()
    this.controller?.disable()
  }
}
