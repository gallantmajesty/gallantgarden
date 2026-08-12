// Max the ghost — the single FocusLily mascot (basic-emotions set).
//
// These 4 PNGs live in  C:\Users\taksh\Downloads\mascot basic emotions
// and must be copied into  /public/  (keep the exact filenames below).
// The "_clean" suffix means they already have transparent backgrounds.

export const MASCOT_NAME = 'Max'

export type GhostMood = 'happy' | 'sad' | 'angry' | 'bored'

export const GHOST_MASCOT: Record<GhostMood, string> = {
  happy: '/ref_happy_no_stars.png',
  sad: '/sad_ghost_clean.png',
  angry: '/angry_ghost_clean.png',
  bored: '/bored_ghost_clean.png',
}
