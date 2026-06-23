// clips.js — animation DATA, fully separate from the model. A clip is per-bone
// tracks of keyframes over phase 0..1. Channels: rot(deg) tx,ty(px) sx,sy(scale);
// omitted channels default to identity. The animator samples & writes one
// transform per bone; DOM nesting makes torso motion carry head + arms.
//
// Arm convention (pivot at shoulder, arm hangs down): +rot swings a hand toward
// screen-LEFT, -rot toward screen-RIGHT. So left arm raises with +rot, right
// arm raises with -rot.
//
// The companion is meant to feel ALIVE while idle: gentle breathing + a slow
// weight shift. Emotes are one-shots that play once and hand back to idle.

/** @typedef {{t:number, rot?:number, tx?:number, ty?:number, sx?:number, sy?:number}} Key */
/** @typedef {{ duration:number, loop:boolean, tracks: Record<string, Key[]> }} Clip */

/** @type {Record<string, Clip>} */
export const CLIPS = {
  // Resting life: breathe, shift weight side to side, tiny head settle. Long &
  // slow so it reads as calm, not fidgety. (Blinking/eye-darts come from IdleLife.)
  idle: {
    duration: 4.4,
    loop: true,
    tracks: {
      root: [{ t: 0, tx: -2, ty: 0 }, { t: 0.5, tx: 2, ty: -1 }, { t: 1, tx: -2, ty: 0 }],
      torso: [{ t: 0, ty: 0, rot: -1.4 }, { t: 0.5, ty: -2.5, rot: 1.4 }, { t: 1, ty: 0, rot: -1.4 }],
      head: [{ t: 0, rot: 1.4 }, { t: 0.5, rot: -1.4 }, { t: 1, rot: 1.4 }],
      leftArm: [{ t: 0, rot: 3 }, { t: 0.5, rot: 6 }, { t: 1, rot: 3 }],
      rightArm: [{ t: 0, rot: -3 }, { t: 0.5, rot: -6 }, { t: 1, rot: -3 }],
      leftLeg: [{ t: 0, rot: 0 }, { t: 1, rot: 0 }],
      rightLeg: [{ t: 0, rot: 0 }, { t: 1, rot: 0 }],
    },
  },

  // ---- locomotion (kept for in-world walking; studio is idle-first) ------
  walk: {
    duration: 0.72, loop: true,
    tracks: {
      root: [{ t: 0, ty: 0 }, { t: 0.25, ty: -2.5 }, { t: 0.5, ty: 0 }, { t: 0.75, ty: -2.5 }, { t: 1, ty: 0 }],
      torso: [{ t: 0, rot: 0 }, { t: 0.5, rot: -2 }, { t: 1, rot: 0 }],
      leftLeg: [{ t: 0, rot: 24 }, { t: 0.5, rot: -24 }, { t: 1, rot: 24 }],
      rightLeg: [{ t: 0, rot: -24 }, { t: 0.5, rot: 24 }, { t: 1, rot: -24 }],
      leftArm: [{ t: 0, rot: -16 }, { t: 0.5, rot: 16 }, { t: 1, rot: -16 }],
      rightArm: [{ t: 0, rot: 16 }, { t: 0.5, rot: -16 }, { t: 1, rot: 16 }],
    },
  },
  run: {
    duration: 0.46, loop: true,
    tracks: {
      root: [{ t: 0, ty: 0 }, { t: 0.25, ty: -6 }, { t: 0.5, ty: 0 }, { t: 0.75, ty: -6 }, { t: 1, ty: 0 }],
      torso: [{ t: 0, rot: -7 }, { t: 0.5, rot: -9 }, { t: 1, rot: -7 }],
      leftLeg: [{ t: 0, rot: 42 }, { t: 0.5, rot: -38 }, { t: 1, rot: 42 }],
      rightLeg: [{ t: 0, rot: -38 }, { t: 0.5, rot: 42 }, { t: 1, rot: -38 }],
      leftArm: [{ t: 0, rot: -42 }, { t: 0.5, rot: 38 }, { t: 1, rot: -42 }],
      rightArm: [{ t: 0, rot: 42 }, { t: 0.5, rot: -38 }, { t: 1, rot: 42 }],
    },
  },
  jump: {
    duration: 0.62, loop: false,
    tracks: {
      root: [{ t: 0, ty: 0 }, { t: 0.18, ty: 6 }, { t: 0.45, ty: -48 }, { t: 0.72, ty: -40 }, { t: 1, ty: 0 }],
      torso: [{ t: 0, sy: 1 }, { t: 0.18, sy: 0.92 }, { t: 0.45, sy: 1.04 }, { t: 1, sy: 1 }],
      leftLeg: [{ t: 0, rot: 0 }, { t: 0.18, rot: 20 }, { t: 0.5, rot: 18 }, { t: 1, rot: 0 }],
      rightLeg: [{ t: 0, rot: 0 }, { t: 0.18, rot: -20 }, { t: 0.5, rot: -18 }, { t: 1, rot: 0 }],
      leftArm: [{ t: 0, rot: 0 }, { t: 0.45, rot: 48 }, { t: 1, rot: 0 }],
      rightArm: [{ t: 0, rot: 0 }, { t: 0.45, rot: -48 }, { t: 1, rot: 0 }],
    },
  },

  // ---- emotes (one-shot; return to idle) ---------------------------------

  // Wave: raise the right arm and wave the hand a few times. Friendly head tilt.
  wave: {
    duration: 1.8, loop: false,
    tracks: {
      torso: [{ t: 0, rot: 0 }, { t: 0.2, rot: 3 }, { t: 1, rot: 0 }],
      head: [{ t: 0, rot: 0 }, { t: 0.25, rot: -6 }, { t: 0.85, rot: -6 }, { t: 1, rot: 0 }],
      rightArm: [
        { t: 0, rot: -3 }, { t: 0.18, rot: -150 }, { t: 0.34, rot: -128 },
        { t: 0.5, rot: -150 }, { t: 0.66, rot: -128 }, { t: 0.82, rot: -150 }, { t: 1, rot: -3 },
      ],
      leftArm: [{ t: 0, rot: 3 }, { t: 0.3, rot: 8 }, { t: 1, rot: 3 }],
    },
  },

  // Celebrate: both arms shoot up with a happy hop and a squash-and-stretch.
  celebrate: {
    duration: 1.5, loop: false,
    tracks: {
      root: [{ t: 0, ty: 0 }, { t: 0.2, ty: 4 }, { t: 0.45, ty: -30 }, { t: 0.7, ty: -18 }, { t: 1, ty: 0 }],
      torso: [{ t: 0, sy: 1, rot: 0 }, { t: 0.2, sy: 0.9 }, { t: 0.45, sy: 1.06 }, { t: 1, sy: 1 }],
      head: [{ t: 0, rot: 0 }, { t: 0.45, rot: 0 }, { t: 1, rot: 0 }],
      leftArm: [{ t: 0, rot: 3 }, { t: 0.3, rot: 150 }, { t: 0.6, rot: 138 }, { t: 0.8, rot: 150 }, { t: 1, rot: 3 }],
      rightArm: [{ t: 0, rot: -3 }, { t: 0.3, rot: -150 }, { t: 0.6, rot: -138 }, { t: 0.8, rot: -150 }, { t: 1, rot: -3 }],
      leftLeg: [{ t: 0, rot: 0 }, { t: 0.45, rot: 8 }, { t: 1, rot: 0 }],
      rightLeg: [{ t: 0, rot: 0 }, { t: 0.45, rot: -8 }, { t: 1, rot: 0 }],
    },
  },

  // Happy: two cheerful little bounces, arms swinging, head bobbing.
  happy: {
    duration: 1.3, loop: false,
    tracks: {
      root: [{ t: 0, ty: 0 }, { t: 0.25, ty: -16 }, { t: 0.5, ty: 0 }, { t: 0.75, ty: -16 }, { t: 1, ty: 0 }],
      torso: [{ t: 0, sy: 1 }, { t: 0.12, sy: 0.94 }, { t: 0.25, sy: 1.03 }, { t: 0.5, sy: 1 }, { t: 0.62, sy: 0.94 }, { t: 0.75, sy: 1.03 }, { t: 1, sy: 1 }],
      head: [{ t: 0, rot: 0 }, { t: 0.25, rot: 5 }, { t: 0.5, rot: 0 }, { t: 0.75, rot: -5 }, { t: 1, rot: 0 }],
      leftArm: [{ t: 0, rot: 3 }, { t: 0.25, rot: 40 }, { t: 0.5, rot: 3 }, { t: 0.75, rot: 40 }, { t: 1, rot: 3 }],
      rightArm: [{ t: 0, rot: -3 }, { t: 0.25, rot: -40 }, { t: 0.5, rot: -3 }, { t: 0.75, rot: -40 }, { t: 1, rot: -3 }],
    },
  },

  // Sleepy: head tilts, body sags slowly, a soft settle — then perks back up.
  sleepy: {
    duration: 2.6, loop: false,
    tracks: {
      root: [{ t: 0, ty: 0 }, { t: 0.5, ty: 4 }, { t: 1, ty: 0 }],
      torso: [{ t: 0, rot: 0, ty: 0 }, { t: 0.4, rot: 6, ty: 3 }, { t: 0.75, rot: 6, ty: 3 }, { t: 1, rot: 0, ty: 0 }],
      head: [{ t: 0, rot: 0 }, { t: 0.35, rot: 18 }, { t: 0.75, rot: 20 }, { t: 1, rot: 0 }],
      leftArm: [{ t: 0, rot: 3 }, { t: 0.4, rot: 10 }, { t: 1, rot: 3 }],
      rightArm: [{ t: 0, rot: -3 }, { t: 0.4, rot: -10 }, { t: 1, rot: -3 }],
    },
  },

  // Read: brings both hands up in front (holding a book) and tips the head down
  // to read; holds, then lowers. Pairs with the desk/book in the room.
  read: {
    duration: 2.8, loop: false,
    tracks: {
      torso: [{ t: 0, rot: 0 }, { t: 0.3, rot: 2 }, { t: 1, rot: 0 }],
      head: [{ t: 0, rot: 0 }, { t: 0.3, rot: 10 }, { t: 0.8, rot: 11 }, { t: 1, rot: 0 }],
      leftArm: [{ t: 0, rot: 3 }, { t: 0.3, rot: 52 }, { t: 0.8, rot: 52 }, { t: 1, rot: 3 }],
      rightArm: [{ t: 0, rot: -3 }, { t: 0.3, rot: -52 }, { t: 0.8, rot: -52 }, { t: 1, rot: -3 }],
    },
  },
}

/** Emotes exposed in the studio's emote bar (label order matters). */
export const EMOTES = [
  { id: 'idle', name: 'Idle', icon: '🧍' },
  { id: 'wave', name: 'Wave', icon: '👋' },
  { id: 'celebrate', name: 'Celebrate', icon: '🎉' },
  { id: 'happy', name: 'Happy', icon: '😄' },
  { id: 'sleepy', name: 'Sleepy', icon: '😴' },
  { id: 'read', name: 'Read Book', icon: '📖' },
]
