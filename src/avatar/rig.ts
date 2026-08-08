// Pure rig description: the bone hierarchy, rest-pose offsets, and proportions.
// Chibi proportions: big head, short limbs, round body — the Harry Potter
// magical game aesthetic, not a realistic mannequin.

import { type BodyType } from './config'

export type BoneName =
  | 'root'
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'armUpperL'
  | 'armLowerL'
  | 'armUpperR'
  | 'armLowerR'
  | 'legUpperL'
  | 'legLowerL'
  | 'footL'
  | 'legUpperR'
  | 'legLowerR'
  | 'footR'

/**
 * Chibi proportions: ~3.5 heads tall, oversized head, short stubby limbs,
 * round torso. Everything reads as soft and huggable, not robotic.
 */
export interface Proportions {
  hipsY: number
  spineLen: number
  chestLen: number
  neckLen: number
  neckR: number
  headR: number
  shoulderW: number
  hipW: number
  upperArm: number
  lowerArm: number
  upperLeg: number
  lowerLeg: number
  shoulderR: number
  elbowR: number
  wristR: number
  thighR: number
  kneeR: number
  ankleR: number
  chestW: number
  waistW: number
  hipBoneW: number
  torsoD: number
  bust: number
  handLen: number
  footLen: number
}

// Chibi male: big round head, compact body, muscular defined limbs.
const MALE: Proportions = {
  hipsY: 0.62,
  spineLen: 0.12,
  chestLen: 0.18,
  neckLen: 0.04,
  neckR: 0.058,
  headR: 0.165,
  shoulderW: 0.175,
  hipW: 0.085,
  upperArm: 0.17,
  lowerArm: 0.15,
  upperLeg: 0.24,
  lowerLeg: 0.22,
  shoulderR: 0.055,
  elbowR: 0.04,
  wristR: 0.032,
  thighR: 0.068,
  kneeR: 0.048,
  ankleR: 0.038,
  chestW: 0.14,
  waistW: 0.115,
  hipBoneW: 0.12,
  torsoD: 0.1,
  bust: 0,
  handLen: 0.1,
  footLen: 0.18,
}

// Female shares the SAME skeleton (bone hierarchy) and SAME overall height as
// the male (James) — hipsY, limb lengths and head size are identical — but has a
// clearly feminine silhouette: narrower shoulders, wider hips, a bust, and
// slimmer limbs/hands/feet. Gender reads from body shape AND hair/clothing.
const FEMALE: Proportions = {
  ...MALE,
  shoulderW: 0.14,
  hipW: 0.105,
  shoulderR: 0.044,
  elbowR: 0.034,
  wristR: 0.028,
  thighR: 0.06,
  kneeR: 0.044,
  ankleR: 0.034,
  chestW: 0.12,
  waistW: 0.095,
  hipBoneW: 0.135,
  torsoD: 0.092,
  bust: 0.045,
  handLen: 0.085,
  neckR: 0.05,
  footLen: 0.16,
}

export function proportionsFor(bodyType: BodyType): Proportions {
  return bodyType === 'female' ? FEMALE : MALE
}

/**
 * Per-character body silhouettes. Every character now gets its OWN body shape
 * (widths, head size, limb thickness) instead of sharing the plain male/female
 * base — so Dino reads chunky, Robot broad-shouldered, Alien lanky, etc.
 *
 * Only WIDTHS are overridden: hipsY, spineLen, chestLen, neckLen and limb
 * LENGTHS stay on the gender base so every character grounds at the same
 * height and all existing animations/poses keep working unchanged.
 */
const CHARACTER_PROPORTIONS: Record<string, Partial<Proportions>> = {
  // ── starters — keep the classic looks (reference) ──
  james: {},
  claire: {},

  // mia — slim athletic scholar
  mia: { shoulderW: 0.145, hipW: 0.1, chestW: 0.125, waistW: 0.09, hipBoneW: 0.13, torsoD: 0.09, thighR: 0.058, kneeR: 0.042 },

  // ruslan — dainty fair scholar with a small neat head
  ruslan: { headR: 0.11, neckR: 0.048, shoulderW: 0.138, hipW: 0.1, chestW: 0.118, waistW: 0.092, hipBoneW: 0.13, torsoD: 0.088, thighR: 0.056, footLen: 0.15 },

  // dino — chunky green mascot: big head, barrel chest, thick limbs
  dino: { headR: 0.19, shoulderW: 0.19, hipW: 0.095, chestW: 0.155, waistW: 0.13, hipBoneW: 0.14, torsoD: 0.115, shoulderR: 0.06, thighR: 0.075, kneeR: 0.052, ankleR: 0.042, handLen: 0.11, footLen: 0.2 },

  // rabbit — soft plump toy: big head, rounded hips, pudgy legs
  rabbit: { headR: 0.18, shoulderW: 0.15, hipW: 0.115, chestW: 0.13, waistW: 0.105, hipBoneW: 0.15, torsoD: 0.1, shoulderR: 0.05, thighR: 0.066, kneeR: 0.048, ankleR: 0.036, handLen: 0.09, footLen: 0.17 },

  // robot — broad shoulders, narrow waist, compact head, mechanical limbs
  robot: { headR: 0.15, shoulderW: 0.195, hipW: 0.08, chestW: 0.155, waistW: 0.105, hipBoneW: 0.11, torsoD: 0.105, shoulderR: 0.06, thighR: 0.06, kneeR: 0.045, ankleR: 0.034, wristR: 0.03, handLen: 0.1, footLen: 0.19 },

  // alien — lanky: big head, narrow shoulders, slim wiry limbs
  alien: { headR: 0.18, shoulderW: 0.16, hipW: 0.075, chestW: 0.13, waistW: 0.1, hipBoneW: 0.1, torsoD: 0.09, shoulderR: 0.048, elbowR: 0.036, wristR: 0.028, thighR: 0.058, kneeR: 0.042, ankleR: 0.032, handLen: 0.11, footLen: 0.16 },

  // pig — roundest of all: biggest head, widest waist/hips, stubby fat limbs
  pig: { headR: 0.19, shoulderW: 0.185, hipW: 0.11, chestW: 0.16, waistW: 0.145, hipBoneW: 0.155, torsoD: 0.125, shoulderR: 0.062, thighR: 0.078, kneeR: 0.055, ankleR: 0.044, handLen: 0.09, footLen: 0.19 },

  // angel — graceful slim figure, smaller head, delicate limbs
  angel: { headR: 0.155, shoulderW: 0.135, hipW: 0.1, chestW: 0.115, waistW: 0.088, hipBoneW: 0.125, torsoD: 0.088, shoulderR: 0.04, elbowR: 0.032, wristR: 0.026, thighR: 0.055, kneeR: 0.04, ankleR: 0.031, handLen: 0.09, footLen: 0.15, bust: 0.05 },

  // sunflower — plump happy bloom: round torso, wide hips, thick stems
  sunflower: { headR: 0.17, shoulderW: 0.15, hipW: 0.115, chestW: 0.135, waistW: 0.11, hipBoneW: 0.15, torsoD: 0.11, shoulderR: 0.05, thighR: 0.068, kneeR: 0.048, ankleR: 0.036, handLen: 0.09, footLen: 0.17, bust: 0.04 },

  // elephant — heaviest build: huge head, barrel torso, thick columns
  elephant: { headR: 0.19, shoulderW: 0.19, hipW: 0.1, chestW: 0.16, waistW: 0.135, hipBoneW: 0.15, torsoD: 0.12, shoulderR: 0.065, thighR: 0.07, kneeR: 0.052, ankleR: 0.044, handLen: 0.1, footLen: 0.2 },

  // monkey — lean and agile: narrow hips, slim limbs, long hands
  monkey: { headR: 0.17, shoulderW: 0.15, hipW: 0.07, chestW: 0.125, waistW: 0.095, hipBoneW: 0.1, torsoD: 0.088, shoulderR: 0.048, thighR: 0.055, kneeR: 0.04, ankleR: 0.03, handLen: 0.12, footLen: 0.15 },

  // panda — plump chibi: biggest rounded hips, wide waist, big head
  panda: { headR: 0.19, shoulderW: 0.18, hipW: 0.115, chestW: 0.155, waistW: 0.135, hipBoneW: 0.16, torsoD: 0.115, shoulderR: 0.06, thighR: 0.07, kneeR: 0.05, ankleR: 0.04, handLen: 0.09, footLen: 0.18 },

  // grim — slender ominous reaper: narrow build, thin limbs
  grim: { headR: 0.17, shoulderW: 0.165, hipW: 0.078, chestW: 0.13, waistW: 0.1, hipBoneW: 0.105, torsoD: 0.09, shoulderR: 0.05, thighR: 0.06, kneeR: 0.043, ankleR: 0.033, handLen: 0.095, footLen: 0.16 },

  // hacker — lean street tech: slim, slightly hunched gear feel
  hacker: { headR: 0.17, shoulderW: 0.16, hipW: 0.078, chestW: 0.13, waistW: 0.098, hipBoneW: 0.105, torsoD: 0.09, thighR: 0.058, kneeR: 0.042, ankleR: 0.032, handLen: 0.1, footLen: 0.16 },

  // ── phase-2 commons — small but real silhouette differences ──
  // ojas — stocky warm build
  ojas: { shoulderW: 0.185, hipW: 0.09, chestW: 0.15, waistW: 0.125, hipBoneW: 0.13, torsoD: 0.105, thighR: 0.072, kneeR: 0.05 },
  // priya — curvy feminine build
  priya: { shoulderW: 0.145, hipW: 0.115, chestW: 0.13, waistW: 0.1, hipBoneW: 0.14, torsoD: 0.098, thighR: 0.064, kneeR: 0.046 },
  // zara — athletic, straight shoulders
  zara: { shoulderW: 0.15, hipW: 0.1, chestW: 0.125, waistW: 0.09, hipBoneW: 0.13, torsoD: 0.09, thighR: 0.058, kneeR: 0.042 },
  // owen — lean and lanky
  owen: { shoulderW: 0.16, hipW: 0.078, chestW: 0.13, waistW: 0.1, hipBoneW: 0.105, torsoD: 0.088, thighR: 0.06, kneeR: 0.043, handLen: 0.105, footLen: 0.17 },
  // taro — slim neat build
  taro: { shoulderW: 0.16, hipW: 0.08, chestW: 0.128, waistW: 0.098, hipBoneW: 0.11, torsoD: 0.09, thighR: 0.058, kneeR: 0.042 },
}

// ════════════════════════════════════════════════════════════════════════════
//  RULE — every character has its OWN body.
//  Characters are NEVER interconnected: each id must define its own torso
//  silhouette below (a per-height multiplier over the ring widths built from
//  CHARACTER_PROPORTIONS). Two characters never share a loft profile, so
//  editing one character's shape can never change another character's body.
//  The shape multiplies the 8 torso rings in order:
//    [0] hip-bottom  [1] hip  [2] waist  [3] chest-low
//    [4] chest       [5] bust/upper-chest  [6] shoulder  [7] neck
//  Missing ids fall back to JAMES_CLASSIC (the reference silhouette).
// ════════════════════════════════════════════════════════════════════════════
const JAMES_CLASSIC = [1, 1, 1, 1, 1, 1, 1, 1] as const

const CHARACTER_TORSO: Record<string, readonly number[]> = {
  // james — the classic male reference silhouette
  james: JAMES_CLASSIC,

  // claire (Lily) — soft pear: wider hips, tucked waist
  claire: [1.1, 1.08, 0.92, 0.9, 0.95, 1.0, 0.98, 1.0],

  // mia — athletic scholar: strong chest/shoulders, firmer waist
  mia: [1.0, 0.98, 0.95, 1.02, 1.08, 1.12, 1.08, 0.98],

  // ruslan — dainty snow scholar: petite all over
  ruslan: [0.95, 0.95, 0.9, 0.92, 0.95, 0.98, 0.92, 0.95],

  // dino — barrel-chested mascot
  dino: [1.0, 1.02, 1.06, 1.1, 1.12, 1.1, 1.05, 1.0],

  // rabbit — round plush toy
  rabbit: [1.08, 1.08, 1.05, 1.06, 1.1, 1.12, 1.05, 1.0],

  // robot — inverted triangle: narrow hips, broad chest
  robot: [0.9, 0.92, 1.0, 1.06, 1.1, 1.12, 1.08, 1.0],

  // alien — lanky wire frame
  alien: [0.9, 0.9, 0.9, 0.92, 0.95, 0.98, 0.95, 1.0],

  // pig — roundest barrel of them all
  pig: [1.1, 1.12, 1.12, 1.15, 1.18, 1.15, 1.08, 1.0],

  // angel — slim graceful column
  angel: [0.95, 0.96, 0.9, 0.95, 1.0, 1.02, 0.95, 0.95],

  // sunflower — bell bloom: wide base, full chest
  sunflower: [1.05, 1.06, 1.02, 1.05, 1.1, 1.1, 1.05, 1.0],

  // elephant — heavy barrel (base rings)
  elephant: [1.0, 1.02, 1.05, 1.1, 1.12, 1.1, 1.05, 1.0],

  // monkey — slim agile trunk
  monkey: [0.9, 0.92, 0.92, 0.95, 0.98, 1.0, 0.95, 0.98],

  // panda — chubby rounded loaf
  panda: [1.06, 1.06, 1.04, 1.05, 1.08, 1.1, 1.04, 1.0],

  // grim — narrow reaper taper
  grim: [0.92, 0.94, 0.95, 0.98, 1.02, 1.04, 1.02, 1.0],

  // hacker — lean tech frame
  hacker: [0.95, 0.96, 0.95, 1.0, 1.04, 1.06, 1.02, 0.98],

  // ── phase-2 commons — one unique silhouette each ──
  // ojas — stocky: wide bottom, deep chest
  ojas: [1.08, 1.06, 1.06, 1.08, 1.1, 1.1, 1.06, 1.0],
  // priya — curvy: pronounced hips, pinched waist
  priya: [1.12, 1.1, 0.94, 0.95, 1.0, 1.05, 1.0, 0.98],
  // zara — straight athletic: shoulders match hips
  zara: [1.0, 1.0, 0.95, 1.02, 1.06, 1.1, 1.05, 1.0],
  // owen — lanky bean pole
  owen: [0.92, 0.94, 0.94, 0.98, 1.0, 1.02, 1.0, 0.98],
  // taro — slim neat: narrow waist, tidy chest
  taro: [0.94, 0.96, 0.95, 0.98, 1.0, 1.02, 1.0, 1.0],
}

/** The 8-ring torso loft multipliers for a character. Never shared between
 *  characters — unknown ids get the classic James silhouette. */
export function torsoShapeFor(characterId: string | undefined): readonly number[] {
  return characterId ? (CHARACTER_TORSO[characterId] ?? JAMES_CLASSIC) : JAMES_CLASSIC
}

/**
 * Proportions for a specific character: the gender base (so heights and bone
 * lengths stay identical) plus that character's own silhouette overrides.
 * Unknown ids fall back to the plain gender base.
 */
export function proportionsForCharacter(characterId: string | undefined, bodyType: BodyType): Proportions {
  const base = proportionsFor(bodyType)
  const over = characterId ? CHARACTER_PROPORTIONS[characterId] : undefined
  return over ? { ...base, ...over } : base
}

/** Realistic (near-human) proportions for the Ruslana character: a small head
 *  (~6 heads tall instead of the chibi ~3.5) on the feminine skeleton. Limb and
 *  torso lengths stay close to FEMALE so the model still grounds correctly. */
export const REALISTIC: Proportions = {
  ...FEMALE,
  headR: 0.095,
}

/** Uniform scale — fixed at 1.0 so all avatars are the same height. */
export function heightScale(_heightCm: number): number {
  return 1.12
}
