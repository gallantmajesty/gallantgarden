// The single customizable base body (Roblox-style): one chibi mesh that every
// player customizes via material/colour swaps + cosmetic attachments, instead of
// a fixed roster of pre-built characters. The baked glb (mesh + locomotion/emote
// clips) lives at `/models/avatars/base.glb`; until it is dropped in, the
// deterministic procedural rig (AvatarRig, driven by the live AvatarConfig)
// stands in — the same graceful-degrade contract the rest of the avatar uses.
//
// Authoring note: bake ONE humanoid skeleton with the bone names in rig.ts
// (hips/spine/chest/neck/head/armUpper·Lower L·R/legUpper·Lower L·R/foot L·R) so
// the procedural fallback, the animator, and future cosmetic attachments all
// address the same joints.

export interface BaseBody {
  /** baked glb filename under /models/avatars (mesh + animation clips) */
  model: string
  /** uniform scale + ground offset for the glb in-world */
  scale: number
  yOffset: number
}

export const BASE_BODY: BaseBody = {
  model: 'base.glb',
  scale: 1,
  yOffset: 0,
}
