import { useRef, useState } from 'react'
import { joystick } from '../../three/library/input'
import { useSettings } from '../../store/settings'
import { useWorld } from '../../store/world'
import { useIsMobileOrTablet } from '../../hooks/useDevice'
import './TouchControls.css'

/* Shared, reusable on-screen touch controls for the 3D worlds.
 *
 * Movement writes to the SAME shared `joystick` object the in-canvas controllers
 * already read each frame (see src/three/library/input.ts), AND dispatches
 * synthetic WASD key events so controllers that read keyboard state (e.g. the
 * TrainX booking-center free-roam) are driven identically. Both paths are
 * additive: on a real desktop/keyboard session these components are never
 * mounted, so nothing about the desktop experience changes.
 *
 * The action buttons (camera presets, cinematic, look-peek, sit/stand) reuse the
 * app's existing synthetic-keyboard convention (Explore.tsx dispatches the very
 * same `KeyboardEvent`s), so the existing key handlers light up untouched. */

const KEY_MAP: Record<string, string> = { KeyW: 'w', KeyS: 's', KeyA: 'a', KeyD: 'd' }

function dispatchKey(type: 'keydown' | 'keyup', key: string, code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }))
}

export interface TouchControlsProps {
  /** Show the movement joystick (writes `joystick` + synthetic WASD). */
  movement?: boolean
  /** Show the 1st/3rd-person camera toggle. */
  cameraToggle?: boolean
  /** Show the Cinematic Tour (key 5) button. */
  cinematic?: boolean
  /** Show a Sit / Stand (key E) button. */
  sit?: boolean
  /** Show a Jump button (sets `joystick.jump`). */
  jump?: boolean
  /** Extra class on the root layer. */
  className?: string
}

export function TouchControls({
  movement = true,
  cameraToggle = true,
  cinematic = true,
  sit = false,
  jump = false,
  className = '',
}: TouchControlsProps) {
  // Never render on desktop — this overlay is purely a touch replacement for
  // keyboard/mouse, so the desktop experience is completely untouched.
  const isMobile = useIsMobileOrTablet()
  if (!isMobile) return null
  return (
    <div className={`tc-layer ${className}`} aria-hidden={false}>
      {movement && <Joystick />}
      <div className="tc-actions">
        {cameraToggle && <CameraToggleBtn />}
        {cinematic && <CineBtn />}
        {sit && <SitBtn />}
        {jump && <JumpBtn />}
      </div>
    </div>
  )
}

function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const RADIUS = 48
  const pressed = useRef<Set<string>>(new Set())
  const active = useRef(false)

  function setKeysForVector(x: number, y: number) {
    const want = new Set<string>()
    if (y < -0.35) want.add('KeyW')
    if (y > 0.35) want.add('KeyS')
    if (x < -0.35) want.add('KeyA')
    if (x > 0.35) want.add('KeyD')
    // press newly-wanted keys
    for (const code of want) {
      if (!pressed.current.has(code)) {
        pressed.current.add(code)
        dispatchKey('keydown', KEY_MAP[code], code)
      }
    }
    // release keys no longer wanted
    for (const code of [...pressed.current]) {
      if (!want.has(code)) {
        pressed.current.delete(code)
        dispatchKey('keyup', KEY_MAP[code], code)
      }
    }
  }

  function releaseAll() {
    for (const code of [...pressed.current]) {
      pressed.current.delete(code)
      dispatchKey('keyup', KEY_MAP[code], code)
    }
  }

  function update(e: React.PointerEvent) {
    const base = baseRef.current
    if (!base) return
    const r = base.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    const nx = dx / RADIUS
    const ny = dy / RADIUS
    joystick.x = nx
    joystick.y = -ny
    setKeysForVector(nx, ny)
  }

  function reset() {
    setKnob({ x: 0, y: 0 })
    joystick.x = 0
    joystick.y = 0
    releaseAll()
    active.current = false
  }

  return (
    <div
      ref={baseRef}
      className="tc-joy"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        active.current = true
        update(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e)
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div className="tc-joy-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}

function CameraToggleBtn() {
  const mode = useSettings((s) => s.cameraMode)
  const set = useSettings((s) => s.set)
  return (
    <button
      type="button"
      className={`tc-btn ${mode === 'first' ? 'on' : ''}`}
      title={mode === 'first' ? 'First-person' : 'Third-person'}
      onClick={() => set('cameraMode', mode === 'first' ? 'third' : 'first')}
    >
      {mode === 'first' ? '1st' : '3rd'}
    </button>
  )
}

function CineBtn() {
  const cinematicOn = useWorld((s) => s.cinematic)
  return (
    <button
      type="button"
      className={`tc-btn tc-cine ${cinematicOn ? 'on' : ''}`}
      title="Cinematic Tour"
      onClick={() => dispatchKey('keydown', '5', '5')}
    >
      ★
    </button>
  )
}

function SitBtn() {
  const seat = useWorld((s) => s.seat)
  return (
    <button
      type="button"
      className="tc-btn"
      title={seat != null ? 'Stand up' : 'Sit'}
      onClick={() => dispatchKey('keydown', 'e', 'KeyE')}
    >
      {seat != null ? 'Stand' : 'Sit'}
    </button>
  )
}

function JumpBtn() {
  return (
    <button
      type="button"
      className="tc-btn tc-jump"
      title="Jump"
      onPointerDown={() => (joystick.jump = true)}
      onPointerUp={() => (joystick.jump = false)}
      onPointerCancel={() => (joystick.jump = false)}
    >
      Jump
    </button>
  )
}
