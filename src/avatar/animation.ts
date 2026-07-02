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
  /** true while the player occupies a chair — drives the seated sit pose in-world
   *  (the editor preview uses the `preview === 'sit'` override instead) */
  seated: boolean
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
  const microShift = Math.sin(t * 0.23 + 0.7)
  return {
    chest: { x: 0.03 + breath * 0.015, z: microShift * 0.006 },
    spine: { z: sway * 0.012 },
    hips: { x: microShift * 0.01, z: -sway * 0.018, y: sway * 0.018 },
    neck: { x: -0.02, y: headDrift * 0.05, z: microShift * 0.01 },
    head: { y: headDrift * 0.045, x: breath * 0.01, z: microShift * 0.008 },
    // arms hang naturally at the sides with slight forward carry and gentle outward
    // splay — realistic human idle posture, not robotic or stiff
    armUpperL: { x: 0.08 + breath * 0.008, z: -0.06 + sway * 0.008 + microShift * 0.01 },
    armUpperR: { x: 0.08 + breath * 0.008, z: 0.06 - sway * 0.008 - microShift * 0.01 },
    armLowerL: { x: 0.15 + microShift * 0.02, z: -0.04 },
    armLowerR: { x: 0.15 - microShift * 0.02, z: 0.04 },
    legUpperL: { x: microShift * 0.015 },
    legUpperR: { x: -microShift * 0.015 },
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

  // natural arm carry angle + slight extra bend on back-swing (follow-through)
  const carry = 0.25 + 0.12 * g

  // secondary motion: subtle shoulder roll, torso counter-rotation, head stabilization
  const shoulderRoll = s * 0.08 * g
  const torsoTwist = -s * 0.06 * g
  const headStabilize = -s * 0.04 * g

  // forearm follows upper arm with slight lag (natural pendulum)
  const forearmLagL = Math.max(0, -s) * 0.15
  const forearmLagR = Math.max(0, s) * 0.15

  return {
    hips: { x: lean * 0.4, y: 0, z: torsoTwist * 0.5 },
    spine: { x: lean * 0.5, y: torsoTwist * 0.3 },
    chest: { x: lean * 0.3, y: -s * 0.05, z: shoulderRoll },
    neck: { x: -lean * 0.3, y: headStabilize * 0.5 },
    head: { x: -lean * 0.2, y: headStabilize },

    // legs: opposite phase with natural hip/knee/ankle chain
    legUpperL: { x: s * legSwing, z: Math.max(0, s) * 0.03 },
    legUpperR: { x: -s * legSwing, z: Math.max(0, -s) * 0.03 },
    legLowerL: { x: kneeL },
    legLowerR: { x: kneeR },
    footL: { x: -s * legSwing * 0.45 + Math.max(0, -s) * 0.15 },
    footR: { x: s * legSwing * 0.45 + Math.max(0, s) * 0.15 },

    // arms swing opposite to legs, forearm lags upper arm naturally
    armUpperL: { x: -s * armSwing, z: 0.07 + shoulderRoll },
    armUpperR: { x: s * armSwing, z: -0.07 - shoulderRoll },
    armLowerL: { x: carry + forearmLagL, z: 0.05 },
    armLowerR: { x: carry + forearmLagR, z: -0.05 },
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

/** A friendly wave: the right arm goes UP and OUT to the side (never across the
 *  face), the hand rocking from the elbow, while the left arm rests naturally.
 *  Face stays fully visible. */
export function wavePose(t: number): Pose {
  const w = Math.sin(t * 5)
  return {
    // up and out to the right (positive z = outward for the right arm)
    armUpperR: { x: -2.35, z: 0.34 },
    armLowerR: { x: 0.25, z: 0.22 + w * 0.45 },
    // left arm rests with the same gentle outward splay as idle
    armUpperL: { x: 0.03, z: -0.12 },
    armLowerL: { x: 0.16, z: -0.04 },
    head: { y: 0.08, x: -0.03 },
    chest: { y: -0.04 },
  }
}

/* ----------------------------------------------------------------- emotes */
// Creator emote-bar poses. Same critically-damped driver as everything else, so
// they read as looping idle-style emotes rather than authored clips. Used only by
// the editor preview today; the in-world emote wheel can reuse them later.
// Rule for every emote: never cross the arms through the torso, never cover the
// face. (Outward splay = negative z for the L arm, positive z for the R arm.)

/** Happy / cheer: both arms raised up-and-out in a little bounce. Face visible. */
export function happyPose(t: number): Pose {
  const b = Math.sin(t * 6)
  return {
    hips: { x: 0.01 },
    chest: { x: -0.04 + b * 0.03 },
    head: { x: -0.05, y: Math.sin(t * 3) * 0.06 },
    // up and out to the sides (a relaxed "V"), no crossing in front of the chest
    armUpperL: { x: -2.0 + b * 0.12, z: -0.4 },
    armUpperR: { x: -2.0 + b * 0.12, z: 0.4 },
    armLowerL: { x: 0.35, z: -0.1 },
    armLowerR: { x: 0.35, z: 0.1 },
  }
}

/** Celebrate: both arms thrown up high in a "yes!" with an alternating shake. */
export function celebratePose(t: number): Pose {
  const s = Math.sin(t * 7)
  return {
    hips: { x: -0.04 },
    spine: { x: -0.06 },
    chest: { x: -0.05, y: s * 0.05 },
    head: { x: -0.12 },
    // arms straight up; a small inward lean meets the hands ABOVE the head (clear
    // of the face), with a lively shake
    armUpperL: { x: -2.85, z: 0.22 + s * 0.08 },
    armUpperR: { x: -2.85, z: -0.22 - s * 0.08 },
    armLowerL: { x: 0.2, z: 0.12 },
    armLowerR: { x: 0.2, z: -0.12 },
  }
}

/** Sit: thighs forward, knees bent, torso upright, hands resting on the thighs.
 *  Pose only — the in-world chair anchoring / auto-stand is a separate system.
 *  The driver lowers the root when this pose is active so it reads as seated. */
export function sitPose(t: number): Pose {
  const breath = Math.sin(t * 1.2)
  return {
    // a relaxed seated posture: a touch of forward lean over the lap, torso upright
    hips: { x: 0.06 },
    spine: { x: 0.03 },
    chest: { x: 0.03 + breath * 0.015 },
    head: { x: -0.06, y: breath * 0.03 },
    // thighs swing forward to ~horizontal, shins drop to vertical, feet rest flat-ish
    legUpperL: { x: -1.48, z: 0.05 },
    legUpperR: { x: -1.48, z: -0.05 },
    legLowerL: { x: 1.55 },
    legLowerR: { x: 1.55 },
    footL: { x: 0.18 },
    footR: { x: 0.18 },
    // upper arms hang DOWN beside the torso (positive x = forward rotation) so elbows
    // sit at the sides, never behind the back. Forearms bend forward to rest on thighs.
    armUpperL: { x: 0.15, z: -0.08 },
    armUpperR: { x: 0.15, z: 0.08 },
    armLowerL: { x: 1.1, z: 0.1 },
    armLowerR: { x: 1.1, z: -0.1 },
  }
}

/** Seated AT A DESK (in-world). Like {@link sitPose} but the torso leans gently
 *  forward over the desk and the arms reach FORWARD so the hands rest on the
 *  desktop in front of the body (studying posture) rather than on the lap. Used by
 *  the animator when `loco.seated` is true; the editor "Sit" emote keeps the lap
 *  pose (no desk there). The driver applies the same root drop so it reads seated. */
export function deskSitPose(t: number): Pose {
  const breath = Math.sin(t * 1.2)
  return {
    // Torso stays upright with a slight forward lean for studying posture
    hips: { x: 0.02 },
    spine: { x: 0.01 },
    chest: { x: 0.02 + breath * 0.012 },
    head: { x: 0.02, y: breath * 0.025 },
    // thighs forward to ~horizontal, shins down, feet flat (same seating as sitPose)
    legUpperL: { x: -1.48, z: 0.05 },
    legUpperR: { x: -1.48, z: -0.05 },
    legLowerL: { x: 1.55 },
    legLowerR: { x: 1.55 },
    footL: { x: 0.18 },
    footR: { x: 0.18 },
    // upper arms hang down-and-forward (positive x), not behind the back. Forearms
    // reach forward to the desk with a natural bend.
    armUpperL: { x: 0.2, z: -0.05 },
    armUpperR: { x: 0.2, z: 0.05 },
    armLowerL: { x: 1.4, z: 0.08 },
    armLowerR: { x: 1.4, z: -0.08 },
  }
}
