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
  neckR: 0.082,
  headR: 0.242,
  shoulderW: 0.275, // narrower than the old 0.32 (arms tuck nearer the body)
  hipW: 0.12,
  upperArm: 0.26,
  lowerArm: 0.21,
  upperLeg: 0.3,
  lowerLeg: 0.3,
  shoulderR: 0.078, // slimmer arms (was 0.097 — the old shoulder ball was huge)
  elbowR: 0.07,
  wristR: 0.062,
  thighR: 0.105, // slimmer legs (was 0.13 — read as thunder thighs)
  kneeR: 0.092,
  ankleR: 0.078,
  chestW: 0.185,
  waistW: 0.158,
  hipBoneW: 0.168, // trimmer seat (was 0.195) — male is a V-taper, narrow hips
  torsoD: 0.16,
  bust: 0,
  handLen: 0.125,
  footLen: 0.235,
}

// Female silhouette is tuned to read CLEARLY apart from male at a glance, not just
// numerically: noticeably narrower shoulders + chest, a deep waist pinch, and a
// wider pelvis than the chest give a soft hourglass; limbs/head/feet are daintier.
// Clearance invariants still hold: shoulderW (0.272) > chestW + shoulderR (0.250),
// and hipW (0.15) < shoulderW. Absolute height stays ≈ male (legs unchanged) so
// camera framing is untouched.
const FEMALE: Proportions = {
  hipsY: 0.68,
  spineLen: 0.175,
  chestLen: 0.22,
  neckLen: 0.052,
  neckR: 0.066,
  headR: 0.232,
  shoulderW: 0.242, // distinctly narrower than male's 0.275
  hipW: 0.132, // hip sockets sit wider apart than male's 0.12
  upperArm: 0.25,
  lowerArm: 0.2,
  upperLeg: 0.3,
  lowerLeg: 0.3,
  shoulderR: 0.066,
  elbowR: 0.058,
  wristR: 0.052,
  thighR: 0.098, // slim legs
  kneeR: 0.085,
  ankleR: 0.07,
  chestW: 0.155, // slim chest
  waistW: 0.125, // deep waist pinch (vs male 0.158) — the defining cinch
  hipBoneW: 0.2, // pelvis wider than the chest → hourglass, but not an oversized seat
  torsoD: 0.142,
  bust: 0.06,
  handLen: 0.105,
  footLen: 0.2,
}

export function proportionsFor(bodyType: BodyType): Proportions {
  return bodyType === 'female' ? FEMALE : MALE
}

/** Uniform scale that maps a config height (cm) onto the rig built at HEIGHT_REF. */
export function heightScale(heightCm: number): number {
  return heightCm / HEIGHT_REF
}
