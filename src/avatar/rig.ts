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

// Chibi female: same big head, narrower shoulders, wider hips,
// pronounced waist pinch, subtle bust, longer legs.
const FEMALE: Proportions = {
  hipsY: 0.62,
  spineLen: 0.11,
  chestLen: 0.17,
  neckLen: 0.045,
  neckR: 0.046,
  headR: 0.16,
  shoulderW: 0.14,
  hipW: 0.10,
  upperArm: 0.15,
  lowerArm: 0.13,
  upperLeg: 0.25,
  lowerLeg: 0.23,
  shoulderR: 0.038,
  elbowR: 0.030,
  wristR: 0.025,
  thighR: 0.058,
  kneeR: 0.042,
  ankleR: 0.033,
  chestW: 0.118,
  waistW: 0.09,
  hipBoneW: 0.14,
  torsoD: 0.092,
  bust: 0.04,
  handLen: 0.08,
  footLen: 0.15,
}

export function proportionsFor(bodyType: BodyType): Proportions {
  return bodyType === 'female' ? FEMALE : MALE
}

/** Uniform scale — fixed at 1.0 so all avatars are the same height. */
export function heightScale(_heightCm: number): number {
  return 1.0
}
