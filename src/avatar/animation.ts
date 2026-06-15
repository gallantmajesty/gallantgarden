// Pure procedural animation: functions that, given a clock + locomotion input,
// return target rotations per bone. No three.js, no state — the AvatarAnimator
// owns the clock and the easing toward these targets. Kept deliberately simple:
// believable gait first, perfect locomotion math is a non-goal (minor foot
// sliding is acceptable per the V1 brief).

import type { BoneName } from './rig'

export type Euler3 = { x?: number; y?: number; z?: number }
export type Pose = Partial<Record<BoneName, Euler3>>

/** What the world (or network) feeds the animator each frame. */
export interface Locomotion {
  /** horizontal speed in world units/sec */
  speed: number
  /** false while airborne */
  grounded: boolean
  /** vertical velocity (used to pick rise vs fall pose) */
  vy: number
  /** signed turn rate (rad/sec) for body-led turning lean */
  turnRate: number
}

// Reference walk speed matching PlayerController (WALK 4.6). gaitSpeed is a
// normalized 0..1..~1.8 measure used to blend idle->walk->run continuously.
const WALK_SPEED = 4.6

/** Map raw speed to a normalized gait amount (0 idle, 1 full walk, ~1.8 run). */
export function gaitAmount(speed: number): number {
  return speed / WALK_SPEED
}

/* ------------------------------------------------------------------- idle */

/** Subtle "always alive" pose. `t` is seconds. Breathing + weight shift.
 *  Arms hang close to the body with a soft natural elbow bend — no splay. */
export function idlePose(t: number): Pose {
  const breath = Math.sin(t * 1.4)
  const sway = Math.sin(t * 0.55)
  const headDrift = Math.sin(t * 0.4 + 1)
  return {
    chest: { x: 0.03 + breath * 0.015 },
    spine: { z: sway * 0.012 },
    hips: { x: 0, z: -sway * 0.018, y: sway * 0.018 },
    neck: { x: -0.02, y: headDrift * 0.05 },
    head: { y: headDrift * 0.045, x: breath * 0.01 },
    // arms rest near the sides (small z keeps them just clear of the hips),
    // forearm carries a gentle constant bend so it never reads as a stiff rod
    armUpperL: { x: 0.04 + breath * 0.012, z: 0.06 + sway * 0.012 },
    armUpperR: { x: 0.04 + breath * 0.012, z: -0.06 - sway * 0.012 },
    armLowerL: { x: 0.12, z: 0.05 },
    armLowerR: { x: 0.12, z: -0.05 },
    legUpperL: { x: 0 },
    legUpperR: { x: 0 },
  }
}

/* --------------------------------------------------------------- locomotion */

/**
 * Walk/run gait. `phase` is the stride phase in radians (advanced by the driver
 * from distance travelled so cadence tracks speed). `g` is gaitAmount: scales
 * stride length, arm swing and lean from walk (≈1) to run (≈1.8).
 */
export function locomotionPose(phase: number, g: number): Pose {
  const s = Math.sin(phase)
  const c = Math.cos(phase)
  // stride/swing amplitudes grow with gait (clamped so run isn't manic)
  const legSwing = Math.min(0.85, 0.48 * g)
  const kneeBend = Math.min(1.25, 0.7 * g)
  // arm swing stays modest so it reads as a relaxed pendulum, not a flap
  const armSwing = Math.min(0.6, 0.38 * g)
  const lean = Math.min(0.3, 0.11 * g) // forward torso lean, stronger at a run

  // knees bend most as the leg passes under the body (use |cos| gated to swing-up)
  const kneeL = Math.max(0, -c) * kneeBend
  const kneeR = Math.max(0, c) * kneeBend

  // forearms keep a roughly constant carry angle and bend a touch more on the
  // back-swing — natural follow-through, never the old wide "inflatable" flap
  const carry = 0.25 + 0.12 * g
  return {
    hips: { x: lean * 0.4, y: 0, z: 0 },
    spine: { x: lean * 0.5 },
    chest: { x: lean * 0.3, y: -s * 0.05 }, // slight counter-rotation
    neck: { x: -lean * 0.3 },
    head: { x: -lean * 0.2, y: s * 0.025 }, // head stabilizes against torso turn
    // legs: opposite phase
    legUpperL: { x: s * legSwing },
    legUpperR: { x: -s * legSwing },
    legLowerL: { x: kneeL },
    legLowerR: { x: kneeR },
    footL: { x: -s * legSwing * 0.4 },
    footR: { x: s * legSwing * 0.4 },
    // arms swing opposite to legs, tucked close (small z) with a steady elbow bend
    armUpperL: { x: -s * armSwing, z: 0.07 },
    armUpperR: { x: s * armSwing, z: -0.07 },
    armLowerL: { x: carry + Math.max(0, -s) * 0.18, z: 0.05 },
    armLowerR: { x: carry + Math.max(0, s) * 0.18, z: -0.05 },
  }
}

/** Vertical body bob amplitude for the current gait (driver applies it to root y). */
export function gaitBounce(g: number): number {
  return Math.min(0.06, 0.03 * g)
}

/* -------------------------------------------------------------------- air */

/** Jump rise / fall / land poses. `phase01` 0..1 within land recovery. */
export function airPose(vy: number): Pose {
  if (vy > 0.5) {
    // rising: arms lift for momentum (elbows bent, not straight), legs tuck
    return {
      hips: { x: -0.1 },
      spine: { x: -0.08 },
      chest: { x: -0.05 },
      armUpperL: { x: -1.1, z: 0.16 },
      armUpperR: { x: -1.1, z: -0.16 },
      armLowerL: { x: 0.7, z: 0.06 },
      armLowerR: { x: 0.7, z: -0.06 },
      legUpperL: { x: 0.5 },
      legUpperR: { x: 0.35 },
      legLowerL: { x: 0.7 },
      legLowerR: { x: 0.5 },
    }
  }
  // falling: arms ease down and out slightly, legs extend to absorb landing
  return {
    hips: { x: 0.05 },
    spine: { x: 0.06 },
    chest: { x: 0.04 },
    armUpperL: { x: -0.45, z: 0.28 },
    armUpperR: { x: -0.45, z: -0.28 },
    armLowerL: { x: 0.4, z: 0.06 },
    armLowerR: { x: 0.4, z: -0.06 },
    legUpperL: { x: 0.18 },
    legUpperR: { x: 0.14 },
    legLowerL: { x: 0.35 },
    legLowerR: { x: 0.35 },
  }
}

/** Landing squash, decaying over `k` (1 at impact -> 0 recovered). */
export function landPose(k: number): Pose {
  const squash = k
  return {
    hips: { x: 0.12 * squash },
    spine: { x: 0.14 * squash },
    chest: { x: 0.1 * squash },
    legUpperL: { x: 0.45 * squash },
    legUpperR: { x: 0.45 * squash },
    legLowerL: { x: 0.9 * squash },
    legLowerR: { x: 0.9 * squash },
    armUpperL: { x: -0.25 * squash, z: 0.18 },
    armUpperR: { x: -0.25 * squash, z: -0.18 },
  }
}

/** A simple friendly wave used by the creator preview only — raised right arm,
 *  hand rocking from the elbow while the left arm rests naturally. */
export function wavePose(t: number): Pose {
  const w = Math.sin(t * 5)
  return {
    armUpperR: { x: -2.5, z: -0.5 + w * 0.06 },
    armLowerR: { x: 0.5, z: -0.35 + w * 0.5 },
    armUpperL: { x: 0.04, z: -0.06 },
    armLowerL: { x: 0.14, z: -0.05 },
    head: { y: 0.1, z: 0.03 },
    chest: { y: -0.05 },
  }
}
