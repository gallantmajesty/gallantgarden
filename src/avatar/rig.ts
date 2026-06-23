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

// Chibi proportions (~3.4 heads tall): a big head over a compact torso and short,
// stubby limbs — the Focus Lily art direction, not a realistic 6-head adult.
// Two clearance rules keep poses clean: shoulderW > chestW + shoulderR so arms
// hang clear of the torso (no intersection), and hipW < shoulderW so straight
// arms fall outside the hips. Feet still land at ~y=0 so editor/world framing is
// unchanged. Bone names/hierarchy are identical, so the animator is untouched.
// Chibi proportions (~3.4 heads tall): a big head over a compact torso and short,
// stubby limbs — the Focus Lily art direction, not a realistic 6-head adult.
// Absolute height is kept ≈ the old rig (~1.65 units at scale 1.0) so all the
// in-world camera framing, the editor camera and the realm orb stay valid — only
// the proportion RATIOS changed. Two clearance rules keep poses clean:
//   shoulderW > chestW + shoulderR  → arms hang clear of the torso (no clipping)
//   hipW < shoulderW                → straight arms fall outside the hips
// Bone names/hierarchy are identical, so the animator is untouched.
const MALE: Proportions = {
  hipsY: 0.68,
  spineLen: 0.165,
  chestLen: 0.235,
  neckLen: 0.05,
  neckR: 0.085,
  headR: 0.242,
  shoulderW: 0.32,
  hipW: 0.135,
  upperArm: 0.26,
  lowerArm: 0.21,
  upperLeg: 0.3,
  lowerLeg: 0.3,
  shoulderR: 0.097,
  elbowR: 0.082,
  wristR: 0.073,
  thighR: 0.13,
  kneeR: 0.108,
  ankleR: 0.085,
  chestW: 0.218,
  waistW: 0.188,
  hipBoneW: 0.195,
  torsoD: 0.183,
  bust: 0,
  handLen: 0.13,
  footLen: 0.235,
}

const FEMALE: Proportions = {
  hipsY: 0.68,
  spineLen: 0.17,
  chestLen: 0.225,
  neckLen: 0.05,
  neckR: 0.075,
  headR: 0.236,
  shoulderW: 0.29,
  hipW: 0.14,
  upperArm: 0.25,
  lowerArm: 0.2,
  upperLeg: 0.3,
  lowerLeg: 0.3,
  shoulderR: 0.085,
  elbowR: 0.072,
  wristR: 0.064,
  thighR: 0.122,
  kneeR: 0.1,
  ankleR: 0.078,
  chestW: 0.182,
  waistW: 0.158,
  hipBoneW: 0.205,
  torsoD: 0.165,
  bust: 0.05,
  handLen: 0.118,
  footLen: 0.218,
}

export function proportionsFor(bodyType: BodyType): Proportions {
  return bodyType === 'female' ? FEMALE : MALE
}

/** Uniform scale that maps a config height (cm) onto the rig built at HEIGHT_REF. */
export function heightScale(heightCm: number): number {
  return heightCm / HEIGHT_REF
}
