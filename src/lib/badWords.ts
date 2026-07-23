// Bad-words / spam filter for display names. Maintained as a Set for O(1)
// lookups. Keep this list short and focused — false positives hurt more than
// false negatives. All comparisons are case-insensitive (lowercased input).

const BAD = new Set([
  // slurs / offensive
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'kike', 'spic',
  'chink', 'gook', 'wetback', 'towelhead', 'cracker', 'honky', 'coon',
  'tranny', 'dyke', 'fagot',
  // sexual / disturbing
  'penis', 'vagina', 'dick', 'cock', 'pussy', 'tits', 'boob', 'anus',
  'butthole', 'erection', 'orgasm', 'semen', 'porno', 'porn', 'sex',
  'slut', 'whore', 'hooker', 'masturbate', 'handjob', 'blowjob',
  'pedo', 'pedophile', 'rapist', 'rape',
  // threats / violence
  'kill', 'murder', 'suicide', 'bomb', 'terrorist', 'isis',
  // drugs
  'cocaine', 'heroin', 'meth', 'weed', 'drugs',
  // general bad
  'stfu', 'shutup', 'idiot', 'dumbass', 'dumb', 'bastard', 'bitch',
  'asshole', 'damn', 'hell', 'crap',
])

// Common spam patterns: repeated characters (e.g. "aaaa", "1111"), all-numbers,
// or very short gibberish.
const SPAM_PATTERNS = [
  /^(.)\1{3,}$/,                    // 4+ same characters: "aaaa", "1111"
  /^\d+$/,                          // pure numbers only
  /^[a-z]{1,2}$/i,                  // 1-2 letter names are too short to be meaningful
]

/** Check if a name looks like spam (repeated chars, all numbers, etc.) */
function isSpam(name: string): boolean {
  const lower = name.toLowerCase()
  for (const pat of SPAM_PATTERNS) {
    if (pat.test(lower)) return true
  }
  return false
}

/** Check if any substring of the name contains a bad word. */
function containsBadWord(name: string): boolean {
  const lower = name.toLowerCase()
  // Strip common separators to catch "f.a.g", "n i g", etc.
  const collapsed = lower.replace(/[^a-z0-9]/g, '')
  for (const word of BAD) {
    if (collapsed.includes(word)) return true
  }
  // Also check with separators intact for multi-word bad phrases
  for (const word of BAD) {
    if (lower.includes(word)) return true
  }
  return false
}

export function isNameBlocked(name: string): { ok: boolean; reason?: string } {
  const trimmed = name.trim()
  if (isSpam(trimmed)) return { ok: false, reason: 'Name looks like spam' }
  if (containsBadWord(trimmed)) return { ok: false, reason: 'That name is not allowed' }
  return { ok: true }
}
