// Lightweight word filter. Harmful words are replaced with **** at RENDER time
// (the raw text is stored as-is, so the filter is reversible and can be tuned
// without a migration). Keep the list short and obvious; this is a calm study
// space, not a moderation engine — block/report cover the rest.
//
// Matching is case-insensitive, whole-word-ish, and tolerant of simple letter
// repetition (e.g. "shiiit"). It deliberately does NOT do aggressive leet
// substitution to avoid the "Scunthorpe problem" (flagging innocent words).

const BANNED = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'cunt', 'slut',
  'whore', 'faggot', 'nigger', 'retard', 'rape',
]

// Build one regex: optional repeated final consonant, word-boundary-guarded.
// Each entry becomes e.g. f+u+c+k+ wrapped in boundaries.
const PATTERN = new RegExp(
  '\\b(' +
    BANNED.map((w) => w.split('').map((c) => `${escapeRe(c)}+`).join('')).join('|') +
    ')\\b',
  'gi',
)

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Replace any banned word with a run of asterisks of the same length. */
export function filterProfanity(text: string): string {
  if (!text) return text
  return text.replace(PATTERN, (m) => '*'.repeat(Math.min(m.length, 8)))
}

/** True if the text contains a banned word (e.g. to nudge before sending). */
export function hasProfanity(text: string): boolean {
  PATTERN.lastIndex = 0
  return PATTERN.test(text)
}
