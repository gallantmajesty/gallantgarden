// Shared movement input written by the on-screen touch controls (DOM elements in
// Explore.tsx) and read by the in-canvas PlayerController each frame.
// x = strafe (-1 left … 1 right), y = forward (-1 back … 1 forward), jump = held.
export const joystick = { x: 0, y: 0, jump: false }

/**
 * True when the user is currently typing into a text field, textarea, select,
 * contenteditable region, or any element that has opted out of world hotkeys via
 * `data-no-hotkeys`. While this is true the world interaction/movement hotkeys
 * (E to sit/stand, WASD, Space, F1/F2, …) must be ignored so the keystroke
 * reaches the input instead — the experience is a productivity app first, a game
 * second. Pointer drag-to-look is unaffected.
 */
export function isTypingFocused(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    // a disabled / readonly / button-type input still shouldn't capture typing,
    // but those are rare here — treat any focused input as "typing".
    return true
  }
  if (el.isContentEditable) return true
  if (el.closest('[data-no-hotkeys]')) return true
  return false
}
