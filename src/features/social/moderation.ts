// Spam / profanity moderation — Roblox-style.
//
// Detected bad words are REPLACED with a hashtag token (`#word`) rather than
// rejected, so the message still sends but is "censored". The actual word list
// and any extra rules are provided later (owner) — this module is the single
// extension point. Fill `BAD_WORDS` (and optionally `RULES`) and the rest of the
// pipeline stays the same.

// TODO(owner): paste the security/spam word list here.
const BAD_WORDS: string[] = []

// Optional regex-based rules (e.g. phone numbers, links) → replaced by a tag.
// Each rule's `tag` is what the offending match becomes.
const RULES: { re: RegExp; tag: string }[] = [
  // Example (disabled): strip raw http(s) links
  // { re: /https?:\/\/\S+/gi, tag: '#link' },
]

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Transform outgoing chat text before it is persisted/broadcast.
 * Pure function — safe to call on every keystroke or on send.
 */
export function transformOutgoing(text: string): string {
  let out = text
  for (const w of BAD_WORDS) {
    if (!w) continue
    const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'gi')
    out = out.replace(re, `#${w}`)
  }
  for (const rule of RULES) {
    out = out.replace(rule.re, rule.tag)
  }
  return out
}

/** Whether a message would be altered by moderation (for live UI hints). */
export function wouldModerate(text: string): boolean {
  const t = transformOutgoing(text)
  return t !== text
}
