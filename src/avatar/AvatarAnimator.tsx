import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { AvatarRigHandle } from './AvatarRig'
import {
  airPose,
  celebratePose,
  gaitAmount,
  gaitBounce,
  happyPose,
  idlePose,
  landPose,
  locomotionPose,
  sitPose,
  deskSitPose,
  wavePose,
  type Locomotion,
  type Pose,
} from './animation'
import type { BoneName } from './rig'

// Creator-only override so the Preview Animations / emote bar can force a state.
export type PreviewState =
  | 'auto'
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'wave'
  | 'happy'
  | 'celebrate'
  | 'sit'

/** Distance LOD tiers. `near` = full fidelity; `far` = cheap; `cull` = frozen. */
export type Lod = 'near' | 'far' | 'cull'

export interface AnimatorProps {
  /** ref to the rig whose bones we drive */
  rig: React.RefObject<AvatarRigHandle | null>
  /** live locomotion source, read every frame (no React re-render). For the
   *  local player this is written by PlayerController; for the creator it's a
   *  small fixed object the preview controls mutate. */
  locomotion: React.RefObject<Locomotion>
  /** creator preview override */
  preview?: PreviewState
  /** distance LOD. Either a fixed value (creator preview / shot harness, always
   *  'near') or a mutable ref that RemotePlayers rewrites every frame as the
   *  camera distance changes — read live each frame so the tier updates without
   *  any React re-render. Defaults to 'near'. */
  lod?: Lod | React.RefObject<Lod>
}

const BONE_NAMES: BoneName[] = [
  'root', 'hips', 'spine', 'chest', 'neck', 'head',
  'armUpperL', 'armLowerL', 'armUpperR', 'armLowerR',
  'legUpperL', 'legLowerL', 'footL', 'legUpperR', 'legLowerR', 'footR',
]

// rest pose euler per bone (mutated in place to avoid allocations)
type Vec3 = { x: number; y: number; z: number }
function zero(): Vec3 { return { x: 0, y: 0, z: 0 } }

/**
 * The single animation driver. Reused verbatim for the local player, the creator
 * preview, and (future) remote avatars — only the `locomotion`/`preview`/`lod`
 * inputs differ.
 *
 * Each frame it:
 *  1. picks/blends a target Pose from locomotion (idle <-> walk/run, jump/land),
 *  2. critically-damped eases every bone toward its target (no abrupt switches),
 *  3. runs blink + the gait bob,
 *  4. honours the LOD tier (far avatars skip blink/idle micro-motion and only
 *     update every Nth frame; culled avatars don't animate at all).
 */
export function AvatarAnimator({ rig, locomotion, preview = 'auto', lod = 'near' }: AnimatorProps) {
  const clock = useRef(0)
  const gaitPhase = useRef(0)
  const blink = useRef({ next: 1.5, t: 0, closing: 0 })
  const land = useRef(0) // landing squash amount, decays to 0
  const wasGrounded = useRef(true)
  const frame = useRef(0)
  // smoothed current eulers we ease toward targets
  const cur = useRef<Record<string, Vec3>>(Object.fromEntries(BONE_NAMES.map((n) => [n, zero()])))
  const target = useRef<Record<string, Vec3>>(Object.fromEntries(BONE_NAMES.map((n) => [n, zero()])))

  // reset transient state if the preview state changes
  useEffect(() => {
    clock.current = 0
  }, [preview])

  useFrame((_, dtRaw) => {
    const handle = rig.current
    if (!handle) return
    // Resolve the LOD tier — a plain value (creator/shot) or the live ref
    // RemotePlayers updates each frame (remote avatars).
    const lodVal: Lod = typeof lod === 'string' ? lod : (lod?.current ?? 'near')
    if (lodVal === 'cull') return

    const dt = Math.min(dtRaw, 0.05)
    // Far avatars update at a reduced rate (every 3rd frame) to save CPU.
    frame.current++
    const stride = lodVal === 'far' ? 3 : 1
    if (frame.current % stride !== 0) return
    const fdt = dt * stride // compensate clock so motion speed is unchanged

    clock.current += fdt
    const t = clock.current

    const loco = locomotion.current
    // landing detection: airborne -> grounded triggers a squash impulse
    if (!wasGrounded.current && loco.grounded) land.current = 1
    wasGrounded.current = loco.grounded
    land.current = Math.max(0, land.current - fdt * 4)

    // advance gait phase by distance travelled so cadence tracks speed
    const g = gaitAmount(loco.speed)
    // stride frequency: ~2 steps/sec at walk scaling up with gait
    gaitPhase.current += fdt * (4 + g * 3.5) * Math.min(1, g)
    const phase = gaitPhase.current

    // ---- choose the target pose ----
    let pose: Pose
    const allowIdleMicro = lodVal === 'near'
    if (preview === 'walk') pose = locomotionPose(phase, 1)
    else if (preview === 'run') pose = locomotionPose(phase, 1.8)
    else if (preview === 'wave') pose = wavePose(t)
    else if (preview === 'happy') pose = happyPose(t)
    else if (preview === 'celebrate') pose = celebratePose(t)
    else if (preview === 'sit') pose = sitPose(t)
    else if (preview === 'jump') pose = airPose(Math.sin(t * 2) * 3)
    else if (preview === 'idle') pose = allowIdleMicro ? idlePose(t) : {}
    else if (loco.seated) pose = deskSitPose(t) // auto, seated in-world — hands forward on the desk
    else if (!loco.grounded) pose = airPose(loco.vy) // auto, airborne
    else if (land.current > 0.02) pose = landPose(land.current)
    else if (g > 0.06) pose = locomotionPose(phase, Math.max(1, g)) // walking/running
    else pose = allowIdleMicro ? idlePose(t) : {} // standing

    // body-led turn lean (auto mode only)
    const turnLean = preview === 'auto' ? clampSym(loco.turnRate * 0.06, 0.18) : 0

    // ---- write targets (default each bone to rest, then apply pose) ----
    for (const name of BONE_NAMES) {
      const tg = target.current[name]
      tg.x = 0; tg.y = 0; tg.z = 0
    }
    for (const name in pose) {
      const e = pose[name as BoneName]
      const tg = target.current[name]
      if (e && tg) {
        if (e.x !== undefined) tg.x = e.x
        if (e.y !== undefined) tg.y = e.y
        if (e.z !== undefined) tg.z = e.z
      }
    }
    // add turn lean onto spine/hips
    target.current.hips.z += turnLean
    target.current.spine.z += turnLean * 0.6

    // ---- ease current -> target and apply to bones ----
    // critically-damped-ish blend; faster while moving for crisp foot-plants
    const k = 1 - Math.pow(0.0001, fdt * (g > 0.06 || !loco.grounded ? 1.6 : 1))
    for (const name of BONE_NAMES) {
      const c = cur.current[name]
      const tg = target.current[name]
      c.x += (tg.x - c.x) * k
      c.y += (tg.y - c.y) * k
      c.z += (tg.z - c.z) * k
      const bone = handle.bones[name as BoneName]
      if (bone) bone.rotation.set(c.x, c.y, c.z)
    }

    // ---- vertical offset on the root ----
    const root = handle.root
    if (root) {
      // Sit lowers the whole body so the seated pose reads as "on a chair" rather
      // than floating; otherwise it's the gait bob (walk/run) and zero at rest.
      let rootY: number
      if (preview === 'sit') rootY = -0.26 // editor emote: no chair, drop so it reads as seated
      else if (preview === 'auto' && loco.seated) rootY = -0.10 // in-world: rest the hips on the chair seat (~0.52, hip joint ~0.62)
      else rootY = g > 0.06 && loco.grounded ? Math.abs(Math.sin(phase)) * gaitBounce(Math.max(1, g)) : 0
      // root.position.y is the avatar's own offset; keep x/z as-is
      root.position.y = rootY
    }

    // ---- skirt follows the forward thighs while seated (otherwise a long
    //      skirt stays vertical while the legs swing forward and the legs poke
    //      through the front of the skirt). Eased so it doesn't snap. ----
    const skirt = handle.skirt
    if (skirt) {
      const targetSkirt = loco.seated ? -1.0 : 0
      skirt.rotation.x += (targetSkirt - skirt.rotation.x) * k
    }

    // ---- blink (skip when far/culled) ----
    const lids = handle.lids
    if (lids && allowIdleMicro) {
      const b = blink.current
      b.t += fdt
      if (b.closing > 0) {
        b.closing -= fdt
        // quick close then open: scale 0 (open) -> 1 (closed)
        const closed = Math.sin((1 - Math.max(0, b.closing) / 0.14) * Math.PI)
        lids.scale.setScalar(Math.max(0, Math.min(1, closed)))
        if (b.closing <= 0) lids.scale.setScalar(0)
      } else {
        lids.scale.setScalar(0)
        if (b.t >= b.next) {
          b.t = 0
          b.closing = 0.14
          b.next = 2.5 + Math.random() * 3.5
        }
      }
    } else if (lids) {
      lids.scale.setScalar(0)
    }
  })

  return null
}

function clampSym(v: number, lim: number): number {
  return v > lim ? lim : v < -lim ? -lim : v
}
