// rig.js — the SKELETON (data only). Slightly-CHIBI proportions: a big head,
// soft rounded limbs, a friendly game-like silhouette — a study companion, not
// a realistic human. Built once into an immutable DOM bone-tree; never mutated.
//
// COORDINATE MODEL — "joint anchors". Each bone is a ZERO-SIZE point at its
// JOINT, positioned relative to its PARENT joint, so transform-origin IS the
// joint and rotate() pivots correctly with no math. Visible art is offset from
// the joint. Bones nest in the real DOM, so transforms COMPOSE down the tree
// (rotate the torso -> head + arms follow). Units are "stage pixels" at scale 1.
//
// Vertical reference (UP from the ground): hip 78 · shoulder 132 · neck 140 ·
// head-centre ~186. The head is intentionally huge (≈100px) for the chibi look.

/** Logical stage the rig is authored in. */
export const STAGE = { w: 220, h: 300 }

/** @typedef {{part?:string,w:number,h:number,left:number,top:number,radius?:number|string,color?:string,fill?:string,kind?:string,src?:string}} Shape */
/** @typedef {{id:string,parent:string|null,left:number,top:number,z:number,base?:Shape[],mounts?:string[]}} Bone */

/** @type {Bone[]} */
export const BONES = [
  // Ground point. The controller/studio moves & flips this via a wrapper node.
  { id: 'root', parent: null, left: 0, top: 0, z: 0 },

  // Torso: pivots at the hips. (Declared before its children — builder is
  // parents-first.) Soft, slightly tapered body.
  {
    id: 'torso', parent: 'root', left: 0, top: -78, z: 20,
    base: [{ part: 'skin', w: 56, h: 62, left: -28, top: -62, radius: '22px 22px 16px 16px' }],
    mounts: ['torso'],
  },

  // Back item (wings / cape / backpack) — behind the body, sways with torso.
  { id: 'backItem', parent: 'torso', left: 0, top: -34, z: -10, mounts: ['backItem'] },

  // Head: pivots at the neck. Hosts the whole face + hair + headwear. BIG.
  {
    id: 'head', parent: 'torso', left: 0, top: -62, z: 40,
    base: [
      // soft cheeks/jaw via a rounded square, plus tiny ears.
      { part: 'skin', w: 104, h: 98, left: -52, top: -94, radius: '46px 46px 40px 40px' },
      { part: 'skin', w: 14, h: 18, left: -54, top: -56, radius: 8 },
      { part: 'skin', w: 14, h: 18, left: 40, top: -56, radius: 8 },
    ],
    // Paint order handled by SLOT_Z: back-hair behind, then face, then front hair, headwear.
    mounts: ['hairBack', 'eyes', 'face', 'mouth', 'hairFront', 'accessories'],
  },

  // Arms: pivot at the shoulder; rest hanging DOWN (no T-pose).
  {
    id: 'leftArm', parent: 'torso', left: -29, top: -54, z: 15,
    base: [{ part: 'skin', w: 16, h: 48, left: -8, top: 0, radius: 8 }],
    mounts: ['leftArm'],
  },
  {
    id: 'rightArm', parent: 'torso', left: 29, top: -54, z: 15,
    base: [{ part: 'skin', w: 16, h: 48, left: -8, top: 0, radius: 8 }],
    mounts: ['rightArm'],
  },

  // Legs: children of ROOT so the walk/step cycle is independent of torso lean.
  {
    id: 'leftLeg', parent: 'root', left: -12, top: -78, z: 12,
    base: [{ part: 'skin', w: 18, h: 64, left: -9, top: 0, radius: 8 }],
    mounts: ['leftLeg', 'leftShoe'],
  },
  {
    id: 'rightLeg', parent: 'root', left: 12, top: -78, z: 12,
    base: [{ part: 'skin', w: 18, h: 64, left: -9, top: 0, radius: 8 }],
    mounts: ['rightLeg', 'rightShoe'],
  },
]

/** All cosmetic slot ids, in apply/list order. */
export const SLOTS = [
  'hairBack', 'hairFront', 'eyes', 'face', 'mouth',
  'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'leftShoe', 'rightShoe',
  'accessories', 'backItem',
]

/** Per-slot paint order within a bone (lower = further back). Base body = 2. */
export const SLOT_Z = {
  hairBack: 0, eyes: 5, face: 6, mouth: 5, hairFront: 7, accessories: 8,
  torso: 5, leftArm: 5, rightArm: 5, leftLeg: 5, rightLeg: 5,
  leftShoe: 6, rightShoe: 6, backItem: 5,
}

/** Per-slot transform-origin (head-local px), so blink/dart pivot on the eyes. */
export const SLOT_ORIGIN = {
  eyes: '0px -46px',
  face: '0px -46px',
}

/** slot id -> hosting bone id (derived from BONES.mounts). */
export const SLOT_BONE = (() => {
  const m = {}
  for (const b of BONES) for (const s of b.mounts || []) m[s] = b.id
  return m
})()

/**
 * Mirror-pair resolution: the right arm/leg/shoe reuse the LEFT slot's authoring,
 * so a cosmetic is authored once and mirrored to both sides. Pure data helper —
 * lives here (not in the catalog) so the catalog loader can stay free of cycles.
 */
export function basisSlot(slot) {
  return slot === 'rightArm' ? 'leftArm'
    : slot === 'rightLeg' ? 'leftLeg'
    : slot === 'rightShoe' ? 'leftShoe'
    : slot
}

/**
 * Default image-layer geometry per (basis) slot, in bone-local stage pixels.
 * A grayscale-PNG cosmetic only has to supply `src`; the loader fills width/
 * height/left/top from here (an entry may still override any field inline).
 * Numbers mirror the procedural art's footprints in the starter catalog so a
 * baked PNG drops into the same silhouette the shapes occupy today.
 */
export const SLOT_ART_BOX = {
  hairFront:   { w: 118, h: 64, left: -59, top: -104 },
  hairBack:    { w: 124, h: 150, left: -62, top: -96 },
  eyes:        { w: 64, h: 34, left: -33, top: -58 },
  face:        { w: 72, h: 40, left: -36, top: -58 },
  mouth:       { w: 24, h: 14, left: -12, top: -24 },
  torso:       { w: 66, h: 66, left: -33, top: -66 },
  leftArm:     { w: 20, h: 50, left: -10, top: -2 },
  leftLeg:     { w: 22, h: 58, left: -11, top: -2 },
  leftShoe:    { w: 24, h: 18, left: -12, top: 48 },
  accessories: { w: 116, h: 46, left: -58, top: -110 },
  backItem:    { w: 96, h: 100, left: -48, top: -78 },
}
