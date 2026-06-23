// Animator.js — samples clips and writes ONE `transform` per animated bone.
// It only ever touches bone transforms (never structure, never cosmetics), so
// the model stays pristine. Supports crossfading between clips and one-shot
// clips (jump/emotes) via an onEnd callback the state machine listens to.

import { CLIPS } from './clips.js'

// Identity defaults for absent channels.
const ID = { rot: 0, tx: 0, ty: 0, sx: 1, sy: 1 }

// Every bone any clip animates — iterated each frame so a bone a previous clip
// moved is reset to identity when the new clip doesn't mention it.
const ANIM_BONES = (() => {
  const set = new Set()
  for (const clip of Object.values(CLIPS)) for (const b of Object.keys(clip.tracks)) set.add(b)
  return [...set]
})()

/** Interpolate one channel of a track at phase p (linear). */
function sampleChannel(keys, p, ch) {
  let prev = null
  for (const k of keys) {
    if (k[ch] == null) continue
    if (k.t >= p) {
      if (!prev) return k[ch]
      const span = k.t - prev.t || 1
      const f = (p - prev.t) / span
      return prev[ch] + (k[ch] - prev[ch]) * f
    }
    prev = k
  }
  return prev ? prev[ch] : ID[ch]
}

/** Full pose of a clip at phase p: bone -> {rot,tx,ty,sx,sy}. */
function poseAt(clip, p) {
  const pose = {}
  for (const bone of ANIM_BONES) {
    const keys = clip.tracks[bone]
    pose[bone] = keys
      ? {
          rot: sampleChannel(keys, p, 'rot'),
          tx: sampleChannel(keys, p, 'tx'),
          ty: sampleChannel(keys, p, 'ty'),
          sx: sampleChannel(keys, p, 'sx'),
          sy: sampleChannel(keys, p, 'sy'),
        }
      : { ...ID }
  }
  return pose
}

function lerp(a, b, w) {
  return a + (b - a) * w
}

export class Animator {
  /** @param {import('../core/AvatarModel.js').AvatarModel} model */
  constructor(model) {
    this.model = model
    this._cur = null // { name, clip, time }
    this._prev = null // { name, clip, time }
    this._blend = 1 // weight of _cur during a crossfade (1 = done)
    this._fade = 0.15
    this._onEnd = null
    this._ended = false
  }

  get current() {
    return this._cur?.name || null
  }

  /**
   * Play a clip, crossfading from the current one.
   * @param {string} name
   * @param {{fade?:number, onEnd?:()=>void, restart?:boolean}} [opts]
   */
  play(name, opts = {}) {
    const clip = CLIPS[name]
    if (!clip) return
    if (this._cur && this._cur.name === name && !opts.restart) {
      this._onEnd = opts.onEnd || this._onEnd
      return
    }
    if (this._cur) {
      this._prev = this._cur
      this._blend = 0
      this._fade = opts.fade ?? 0.15
    }
    this._cur = { name, clip, time: 0 }
    this._onEnd = opts.onEnd || null
    this._ended = false
  }

  /** Advance time and paint. dt in seconds. */
  update(dt) {
    if (!this._cur) return
    const cur = this._cur
    cur.time += dt

    // One-shot completion (jump / emotes).
    if (!cur.clip.loop && !this._ended && cur.time >= cur.clip.duration) {
      cur.time = cur.clip.duration
      this._ended = true
      const cb = this._onEnd
      this._onEnd = null
      if (cb) cb()
    }

    const curPose = poseAt(cur.clip, this._phase(cur))

    let pose = curPose
    if (this._prev) {
      this._prev.time += dt
      this._blend = Math.min(1, this._blend + dt / this._fade)
      const prevPose = poseAt(this._prev.clip, this._phase(this._prev))
      pose = {}
      for (const bone of ANIM_BONES) {
        const a = prevPose[bone]
        const b = curPose[bone]
        const w = this._blend
        pose[bone] = {
          rot: lerp(a.rot, b.rot, w), tx: lerp(a.tx, b.tx, w), ty: lerp(a.ty, b.ty, w),
          sx: lerp(a.sx, b.sx, w), sy: lerp(a.sy, b.sy, w),
        }
      }
      if (this._blend >= 1) this._prev = null
    }

    this._write(pose)
  }

  _phase(state) {
    const d = state.clip.duration
    return state.clip.loop ? (state.time % d) / d : Math.min(1, state.time / d)
  }

  _write(pose) {
    for (const bone of ANIM_BONES) {
      const el = this.model.bone(bone)
      if (!el) continue
      const p = pose[bone]
      el.style.transform =
        `translate(${p.tx}px, ${p.ty}px) rotate(${p.rot}deg) scale(${p.sx}, ${p.sy})`
    }
  }
}
