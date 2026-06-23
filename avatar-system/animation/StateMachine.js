// StateMachine.js — locomotion brain. Maps high-level intent (moving / running
// / jump / emote) to clip playback on the Animator. Event-driven: ground state
// changes only when intent changes; one-shots (jump, emotes) take over and hand
// control back via the Animator's onEnd callback.
//
// Extending later: add EMOTES = {wave, sit, sleep, read, dance} as clips and
// call playEmote('wave'); sit/sleep can be looping holds (loop:true) ended by a
// release() call. No model or animator changes required.

export class LocomotionStateMachine {
  /** @param {import('./Animator.js').Animator} animator */
  constructor(animator) {
    this.animator = animator
    this._moving = false
    this._running = false
    this._busy = false // a one-shot (jump/emote) owns the body right now
    animator.play('idle')
  }

  /** Resolve the ground clip from current movement intent. */
  _ground() {
    if (this._moving) return this._running ? 'run' : 'walk'
    return 'idle'
  }

  _toGround(fade = 0.16) {
    this.animator.play(this._ground(), { fade })
  }

  /** Update movement intent (from the controller each frame; cheap no-op if same). */
  setLocomotion({ moving, running }) {
    const changed = moving !== this._moving || running !== this._running
    this._moving = !!moving
    this._running = !!running
    if (changed && !this._busy) this._toGround()
  }

  /** Trigger a jump (ignored while another one-shot is playing). */
  jump() {
    if (this._busy) return
    this._busy = true
    this.animator.play('jump', {
      fade: 0.08,
      restart: true,
      onEnd: () => {
        this._busy = false
        this._toGround(0.12)
      },
    })
  }

  /** Play a one-shot emote, then return to locomotion (future emote system). */
  playEmote(name) {
    if (this._busy) return
    this._busy = true
    this.animator.play(name, {
      fade: 0.12,
      restart: true,
      onEnd: () => {
        this._busy = false
        this._toGround(0.12)
      },
    })
  }
}
