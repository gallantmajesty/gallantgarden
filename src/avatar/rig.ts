// Pure rig description: the bone hierarchy, rest-pose offsets, and proportions.
// No three.js objects here — just data + math so the same spec drives the creator
// preview and the in-world avatar, and so the animation layer can reason about
// bones by name without touching the scene graph.

import { HEIGHT_REF, type BodyType } from './config'

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

const MALE: Proportions = {
  hipsY: 0.92,
  spineLen: 0.2,
  chestLen: 0.28,
  neckLen: 0.07,
  neckR: 0.058,
  headR: 0.135,
  shoulderW: 0.22,
  hipW: 0.105,
  upperArm: 0.3,
  lowerArm: 0.27,
  upperLeg: 0.44,
  lowerLeg: 0.43,
  shoulderR: 0.062,
  elbowR: 0.05,
  wristR: 0.04,
  thighR: 0.092,
  kneeR: 0.068,
  ankleR: 0.05,
  chestW: 0.205,
  waistW: 0.155,
  hipBoneW: 0.165,
  torsoD: 0.16,
  bust: 0,
  handLen: 0.1,
  footLen: 0.26,
}

const FEMALE: Proportions = {
  hipsY: 0.9,
  spineLen: 0.21,
  chestLen: 0.25,
  neckLen: 0.075,
  neckR: 0.046,
  headR: 0.128,
  shoulderW: 0.172,
  hipW: 0.115,
  upperArm: 0.28,
  lowerArm: 0.255,
  upperLeg: 0.44,
  lowerLeg: 0.44,
  shoulderR: 0.05,
  elbowR: 0.04,
  wristR: 0.032,
  thighR: 0.086,
  kneeR: 0.058,
  ankleR: 0.04,
  chestW: 0.16,
  waistW: 0.118,
  hipBoneW: 0.175,
  torsoD: 0.135,
  bust: 0.05,
  handLen: 0.088,
  footLen: 0.225,
}

export function proportionsFor(bodyType: BodyType): Proportions {
  return bodyType === 'female' ? FEMALE : MALE
}

/** Uniform scale that maps a config height (cm) onto the rig built at HEIGHT_REF. */
export function heightScale(heightCm: number): number {
  return heightCm / HEIGHT_REF
}
