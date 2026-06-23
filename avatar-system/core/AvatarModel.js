// AvatarModel.js — builds the IMMUTABLE bone-tree once, from the rig data.
//
// This is "the model file", except there is no file to mutate: the skeleton is
// constructed in the DOM a single time and then left alone forever. Animation
// only writes `transform` to bone elements; cosmetics only add/remove children
// inside per-slot containers. The bone graph, base body layers, joints and
// paint order are never restructured at runtime — the stability guarantee.

import { BONES, STAGE, SLOT_Z, SLOT_ORIGIN } from '../data/rig.js'
import { hexOf } from '../data/palettes.js'
import { buildLayer, setShapeColor } from './tint.js'

// Base body sits at z 2 so back-hair (0) tucks behind the head while
// clothing/features (5+) sit in front. Slot order lives in the rig (SLOT_Z).
const BASE_Z = 2

/** Make a zero-size joint anchor; transform-origin 0 0 == the joint itself. */
function anchor(className) {
  const el = document.createElement('div')
  el.className = className
  el.style.position = 'absolute'
  el.style.left = '0'
  el.style.top = '0'
  el.style.width = '0'
  el.style.height = '0'
  el.style.transformOrigin = '0 0'
  return el
}

export class AvatarModel {
  constructor() {
    /** @type {Map<string,{el:HTMLElement, def:object}>} */
    this.bones = new Map()
    /** @type {Map<string,HTMLElement>} slot id -> cosmetic container */
    this.slots = new Map()
    /** Base body shapes that track the skin colour. */
    this._skinShapes = []
    this._build()
  }

  _build() {
    // Stage box (scales the whole avatar via one transform).
    const stage = document.createElement('div')
    stage.className = 'avatar'
    stage.style.position = 'relative'

    // Scale node: a point at the stage's bottom-centre (the avatar's ground
    // contact). Height changes only touch this node's scale.
    const scaleEl = anchor('av-scale')
    scaleEl.style.left = '50%'
    scaleEl.style.bottom = '0'
    scaleEl.style.top = 'auto'

    // Position node: owned by the controller (walk translate + facing flip),
    // kept separate so it never collides with the animator's bone transforms.
    const posEl = anchor('av-pos')

    scaleEl.appendChild(posEl)
    stage.appendChild(scaleEl)

    // Bones, parents-first (the rig lists them in dependency order).
    for (const def of BONES) {
      const bone = anchor('av-bone')
      bone.dataset.bone = def.id
      if (def.z != null) bone.style.zIndex = String(def.z)
      bone.style.left = `${def.left}px`
      bone.style.top = `${def.top}px`

      // Base body art (procedural shapes) — drawn behind cosmetics.
      if (def.base && def.base.length) {
        const base = anchor('av-base')
        base.style.zIndex = String(BASE_Z)
        for (const layer of def.base) {
          const hex = hexOf(this._skin || 'light')
          const frag = buildLayer(layer, hex)
          // Track shape elements that follow the skin colour.
          for (const child of frag.childNodes) {
            if ((layer.color || 'skin') === 'skin') this._skinShapes.push(child)
          }
          base.appendChild(frag)
        }
        bone.appendChild(base)
      }

      // Cosmetic mount slots (empty containers the attachment system fills).
      for (const slot of def.mounts || []) {
        const slotEl = anchor('av-slot')
        slotEl.dataset.slot = slot
        slotEl.style.zIndex = String(SLOT_Z[slot] ?? 5)
        // Per-slot pivot (e.g. eyes blink/dart around the eye line, not the neck).
        if (SLOT_ORIGIN[slot]) slotEl.style.transformOrigin = SLOT_ORIGIN[slot]
        bone.appendChild(slotEl)
        this.slots.set(slot, slotEl)
      }

      // Attach under parent bone (or the position node for the root).
      const parentEl = def.parent ? this.bones.get(def.parent).el : posEl
      parentEl.appendChild(bone)
      this.bones.set(def.id, { el: bone, def })
    }

    this.stageEl = stage
    this.scaleEl = scaleEl
    this.posEl = posEl
    this.setScale(1)
  }

  /** Bone element by id (for the animator). */
  bone(id) {
    return this.bones.get(id)?.el || null
  }

  /** Cosmetic slot container by id (for the attachment system). */
  slot(id) {
    return this.slots.get(id) || null
  }

  /** Live-recolour the base body. Allowed: it is config-driven tint, not a
   *  structural edit — the skeleton is unchanged. */
  setSkin(swatchId) {
    this._skin = swatchId
    const hex = hexOf(swatchId)
    for (const el of this._skinShapes) setShapeColor(el, hex)
  }

  /** Uniform scale (height * device scale). Anchored at the feet. */
  setScale(scale) {
    this.scaleEl.style.transform = `scale(${scale})`
    // Keep the stage box sized to the scaled rig so layout reserves space.
    this.stageEl.style.width = `${STAGE.w * scale}px`
    this.stageEl.style.height = `${STAGE.h * scale}px`
  }
}
