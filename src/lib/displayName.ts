import { isNameBlocked } from './badWords'

// Display-name validation — Instagram-style unique-ish names.
// A-Z, 0-9, underscore only. No spaces (use _ instead). Max 20 chars.
// Bad words and spam names are blocked.

export const DISPLAY_NAME_MIN = 2
export const DISPLAY_NAME_MAX = 20

export interface DisplayNameCheck {
  ok: boolean
  error?: string
}

/** Validate the shape + content of a display name. */
export function checkDisplayName(raw: string): DisplayNameCheck {
  const n = raw.trim()

  if (n.length < DISPLAY_NAME_MIN)
    return { ok: false, error: `At least ${DISPLAY_NAME_MIN} characters` }
  if (n.length > DISPLAY_NAME_MAX)
    return { ok: false, error: `Max ${DISPLAY_NAME_MAX} characters` }

  // Only A-Z, a-z, 0-9, and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(n))
    return { ok: false, error: 'Only letters, numbers and _ allowed' }

  // Cannot start or end with underscore
  if (n.startsWith('_') || n.endsWith('_'))
    return { ok: false, error: 'Cannot start or end with _' }

  // No consecutive underscores
  if (/__/.test(n))
    return { ok: false, error: 'No double underscores allowed' }

  // Bad words / spam check
  const blocked = isNameBlocked(n)
  if (!blocked.ok)
    return { ok: false, error: blocked.reason }

  return { ok: true }
}

/** Check if an existing name is still valid under the new rules. */
export function isNameValid(name: string): boolean {
  return checkDisplayName(name).ok
}
