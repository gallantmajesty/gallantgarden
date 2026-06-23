// AvatarController.js — the LOGIC layer: turns input (keyboard / touch / code)
// into movement + state-machine intent. It owns only the POSITION node
// (horizontal move + facing flip); the animator owns the bones. Clean split, no
// shared transform.
//
// Mobile-first: keyboard is optional. Drive it from anything via setInput()
// (on-screen D-pad, joystick, AI) — the demo wires touch buttons to it.

const KEY_LEFT = new Set(['ArrowLeft', 'a', 'A'])
const KEY_RIGHT = new Set(['ArrowRight', 'd', 'D'])
const KEY_RUN = new Set(['Shift'])
const KEY_JUMP = new Set([' ', 'Spacebar', 'ArrowUp', 'w', 'W'])

/** Don't steal movement keys while the user is typing somewhere. */
function isTypingFocused() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

export class AvatarController {
  /**
   * @param {import('../core/Avatar.js').Avatar} avatar
   * @param {{ bounds?:{min:number,max:number}, walkSpeed?:number, runSpeed?:number }} [opts]
   */
  constructor(avatar, opts = {}) {
    this.avatar = avatar
    this.posEl = avatar.model.posEl
    this.sm = avatar.sm
    this.bounds = opts.bounds || { min: -120, max: 120 }
    this.walkSpeed = opts.walkSpeed ?? 70 // px / sec
    this.runSpeed = opts.runSpeed ?? 150
    this.x = 0
    this.facing = 1 // 1 = right, -1 = left
    this._input = { left: false, right: false, run: false }
    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
    this._render()
  }

  enable() {
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    return this
  }

  disable() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
  }

  /** Programmatic / touch input. Pass any subset; jump:true triggers a hop. */
  setInput(partial) {
    if (partial.jump) this.sm.jump()
    if ('left' in partial) this._input.left = !!partial.left
    if ('right' in partial) this._input.right = !!partial.right
    if ('run' in partial) this._input.run = !!partial.run
  }

  _onKeyDown(e) {
    if (isTypingFocused()) return
    if (KEY_JUMP.has(e.key)) { this.sm.jump(); e.preventDefault() }
    if (KEY_LEFT.has(e.key)) this._input.left = true
    if (KEY_RIGHT.has(e.key)) this._input.right = true
    if (KEY_RUN.has(e.key)) this._input.run = true
  }

  _onKeyUp(e) {
    if (KEY_LEFT.has(e.key)) this._input.left = false
    if (KEY_RIGHT.has(e.key)) this._input.right = false
    if (KEY_RUN.has(e.key)) this._input.run = false
  }

  /** Step movement + tell the state machine what we're doing. dt in seconds. */
  update(dt) {
    const dir = (this._input.right ? 1 : 0) - (this._input.left ? 1 : 0)
    const moving = dir !== 0
    const running = moving && this._input.run

    if (moving) {
      this.facing = dir
      const speed = running ? this.runSpeed : this.walkSpeed
      this.x = Math.max(this.bounds.min, Math.min(this.bounds.max, this.x + dir * speed * dt))
      this._render()
    }
    this.sm.setLocomotion({ moving, running })
  }

  _render() {
    // Facing flip via scaleX; position via translateX. This node is ours alone.
    this.posEl.style.transform = `translateX(${this.x}px) scaleX(${this.facing})`
  }
}
