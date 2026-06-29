// Pure rig description: the bone hierarchy, rest-pose offsets, and proportions.
// No three.js objects here — just data + math so the same spec drives the creator
// preview and the in-world avatar, and so the animation layer can reason about
// bones by name without touching the scene graph.

import { type BodyType } from './config'

// Bone names the animator addresses. Kept small and flat-ish for cheap lookups.
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
 * Per-body-type proportions (in world units at HEIGHT_REF, scale applied later).
 * Limb fields carry a radius at each end so segments taper anatomically
 * (thigh→knee, shoulder→elbow→wrist) instead of reading as uniform capsules.
 */
export interface Proportions {
  hipsY: number // hip pivot height off the ground (feet at y=0)
  spineLen: number
  chestLen: number
  neckLen: number
  neckR: number
  headR: number // overall head scale reference
  shoulderW: number // half-distance between shoulders
  hipW: number // half-distance between hip sockets
  upperArm: number
  lowerArm: number
  upperLeg: number
  lowerLeg: number
  // tapered limb radii
  shoulderR: number // upper-arm radius at the shoulder
  elbowR: number // arm radius at the elbow
  wristR: number
  thighR: number // leg radius at the hip
  kneeR: number
  ankleR: number
  // torso silhouette
  chestW: number // half-width across the chest
  waistW: number // half-width at the waist (narrowing reads as a figure)
  hipBoneW: number // half-width across the pelvis
  torsoD: number // torso depth (front-back)
  bust: number // forward bust projection (0 for male)
  handLen: number
  footLen: number
}

// Realistic human proportions (~7.5 heads tall): a proportional adult human
// with natural body ratios. Korean/Japanese aesthetic: balanced, slim build
// with natural limb lengths and realistic facial proportions.
const MALE: Proportions = {
  hipsY: 0.88,
  spineLen: 0.2,
  chestLen: 0.26,
  neckLen: 0.07,
  neckR: 0.062,
  headR: 0.12,
  shoulderW: 0.19,
  hipW: 0.095,
  upperArm: 0.28,
  lowerArm: 0.25,
  upperLeg: 0.4,
  lowerLeg: 0.4,
  shoulderR: 0.052,
  elbowR: 0.042,
  wristR: 0.036,
  thighR: 0.078,
  kneeR: 0.058,
  ankleR: 0.046,
  chestW: 0.15,
  waistW: 0.125,
  hipBoneW: 0.13,
  torsoD: 0.115,
  bust: 0,
  handLen: 0.14,
  footLen: 0.24,
}

// Female silhouette: narrower shoulders than male, deeper waist pinch for
// hourglass figure, wider pelvis. Daintier limbs and smaller head.
const FEMALE: Proportions = {
  hipsY: 0.88,
  spineLen: 0.19,
  chestLen: 0.24,
  neckLen: 0.075,
  neckR: 0.052,
  headR: 0.115,
  shoulderW: 0.165,
  hipW: 0.105,
  upperArm: 0.26,
  lowerArm: 0.23,
  upperLeg: 0.4,
  lowerLeg: 0.4,
  shoulderR: 0.045,
  elbowR: 0.038,
  wristR: 0.032,
  thighR: 0.072,
  kneeR: 0.052,
  ankleR: 0.042,
  chestW: 0.13,
  waistW: 0.1,
  hipBoneW: 0.15,
  torsoD: 0.105,
  bust: 0.055,
  handLen: 0.12,
  footLen: 0.22,
}

export function proportionsFor(bodyType: BodyType): Proportions {
  return bodyType === 'female' ? FEMALE : MALE
}

/** Uniform scale that maps a config height (cm) onto the rig built at HEIGHT_REF.
 *  Fixed at 1.0 so all avatars are the same height. */
export function heightScale(_heightCm: number): number {
  return 1.0
}
