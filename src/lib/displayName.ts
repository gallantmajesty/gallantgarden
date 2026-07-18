// Display-name validation. The display name is the user-facing name shown
// everywhere (realm tags, profiles, leaderboards). It is NOT unique and may be
// changed a limited number of times in a lifetime (see DISPLAY_NAME_CHANGES_MAX
// in lib/types). This replaces the old unique-text-username system.

export const DISPLAY_NAME_MIN = 2
export const DISPLAY_NAME_MAX = 40

export interface DisplayNameCheck {
  ok: boolean
  error?: string
}

/** Validate the SHAPE of a display name (length + characters). */
export function checkDisplayName(raw: string): DisplayNameCheck {
  const n = raw.trim()
  if (n.length < DISPLAY_NAME_MIN)
    return { ok: false, error: `At least ${DISPLAY_NAME_MIN} characters` }
  if (n.length > DISPLAY_NAME_MAX)
    return { ok: false, error: `At most ${DISPLAY_NAME_MAX} characters` }
  // Allow letters (incl. unicode), numbers, spaces, and a few punctuation marks.
  if (!/^[\p{L}\p{N} _.\-']+$/u.test(n))
    return { ok: false, error: 'Letters, numbers, spaces and . - \' _ only' }
  return { ok: true }
}
