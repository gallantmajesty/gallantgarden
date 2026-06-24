import { useEffect } from 'react'
import type { CalcKeypad } from './useKeypad'

// Wire physical-keyboard input to a keypad calculator. Attached only while the
// calculator window is focused/active so it never competes with the library's
// movement keys (WASD) or other shortcuts. Digits, operators, parentheses,
// Enter (=), Backspace and Escape (clear) all work.

export function useKeyboardInput(k: CalcKeypad, active: boolean) {
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      // Ignore when the user is typing in some other input/textarea.
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        // …unless it's our own calc display capture field (data-calc-key).
        if (!el.hasAttribute('data-calc-key')) return
      }

      const key = e.key
      if (/^[0-9]$/.test(key)) { k.press(key); e.preventDefault(); return }
      if (key === '.') { k.press('.'); e.preventDefault(); return }
      if (key === '+' || key === '-' || key === '*' || key === '/' || key === '%' || key === '^') {
        k.press(key); e.preventDefault(); return
      }
      if (key === '(' || key === ')') { k.press(key); e.preventDefault(); return }
      if (key === 'Enter' || key === '=') { k.equals(); e.preventDefault(); return }
      if (key === 'Backspace') { k.backspace(); e.preventDefault(); return }
      if (key === 'Escape') { k.clear(); e.preventDefault(); return }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [k, active])
}
