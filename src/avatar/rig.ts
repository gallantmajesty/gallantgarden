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

// Chibi male: big round head, compact body, stubby but defined limbs.
const MALE: Proportions = {
  hipsY: 0.62,
  spineLen: 0.12,
  chestLen: 0.18,
  neckLen: 0.04,
  neckR: 0.055,
  headR: 0.165,
  shoulderW: 0.17,
  hipW: 0.085,
  upperArm: 0.17,
  lowerArm: 0.15,
  upperLeg: 0.24,
  lowerLeg: 0.22,
  shoulderR: 0.048,
  elbowR: 0.038,
  wristR: 0.032,
  thighR: 0.065,
  kneeR: 0.048,
  ankleR: 0.038,
  chestW: 0.135,
  waistW: 0.115,
  hipBoneW: 0.12,
  torsoD: 0.1,
  bust: 0,
  handLen: 0.1,
  footLen: 0.18,
}

// Chibi female: same big head, slightly narrower shoulders, wider hips,
// softer waist pinch, subtle bust.
const FEMALE: Proportions = {
  hipsY: 0.62,
  spineLen: 0.11,
  chestLen: 0.17,
  neckLen: 0.045,
  neckR: 0.048,
  headR: 0.16,
  shoulderW: 0.15,
  hipW: 0.095,
  upperArm: 0.16,
  lowerArm: 0.14,
  upperLeg: 0.24,
  lowerLeg: 0.22,
  shoulderR: 0.042,
  elbowR: 0.034,
  wristR: 0.028,
  thighR: 0.06,
  kneeR: 0.044,
  ankleR: 0.035,
  chestW: 0.12,
  waistW: 0.098,
  hipBoneW: 0.13,
  torsoD: 0.095,
  bust: 0.04,
  handLen: 0.085,
  footLen: 0.16,
}

export function proportionsFor(bodyType: BodyType): Proportions {
  return bodyType === 'female' ? FEMALE : MALE
}

/** Uniform scale — fixed at 1.0 so all avatars are the same height. */
export function heightScale(_heightCm: number): number {
  return 1.0
}
