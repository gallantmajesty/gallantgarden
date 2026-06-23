import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { Box3, type AnimationAction, type Object3D } from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { BASE_BODY } from './baseBody'
import { AvatarRig, type AvatarRigHandle } from './AvatarRig'
import { AvatarAnimator } from './AvatarAnimator'
import { gaitAmount, type Locomotion } from './animation'
import type { AvatarConfig } from './config'

// The ONE customizable base body, rendered from its baked .glb (mesh + clips) and
// customized via the live AvatarConfig. Two modes:
//   • animated (realm/world): a Locomotion ref drives clip selection + crossfade
//     every frame — idle ⇄ walk ⇄ run, jump while airborne.
//   • static (editor/preview): no Locomotion → holds a single calm idle frame.
//
// Until `/models/avatars/base.glb` is baked, a ModelBoundary + Suspense fallback
// renders the deterministic procedural rig (AvatarRig), driven by the SAME
// AvatarConfig — so customization is fully live with zero art, and the glb later
// drops in behind this boundary without touching callers.

const AVATAR_DIR = '/models/avatars'

interface CharacterAvatarProps {
  /** the live look to render (skin / hair / eyes / clothing styles + colours) */
  config: AvatarConfig
  /** live locomotion source; omit for a static (non-animated) display */
  locomotion?: React.RefObject<Locomotion>
}

/** Catches a failed GLB load (file not baked yet) and renders the fallback rig. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function CharacterAvatar({ config, locomotion }: CharacterAvatarProps) {
  // Fallback = the procedural rig in the player's live look. When a locomotion ref
  // is present we also mount the procedural animator so the fallback walks
  // in-world; static previews stay still.
  const fallbackRig = useRef<AvatarRigHandle>(null)
  const fallback = (
    <group scale={BASE_BODY.scale} position={[0, BASE_BODY.yOffset, 0]}>
      <AvatarRig ref={fallbackRig} config={config} />
      {locomotion && <AvatarAnimator rig={fallbackRig} locomotion={locomotion} lod="near" />}
    </group>
  )

  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLBCharacter locomotion={locomotion} />
      </Suspense>
    </ModelBoundary>
  )
}

/* ------------------------------------------------------------- glb base body */

/** Resolve a baked clip by fuzzy name so the bake script's exact naming doesn't
 *  have to be perfect (e.g. "Walking", "mixamo.com|walk" both match 'walk'). */
function findAction(actions: Record<string, AnimationAction | null>, want: string): AnimationAction | null {
  const keys = Object.keys(actions)
  const hit = keys.find((k) => k.toLowerCase().includes(want))
  return hit ? actions[hit] ?? null : null
}

function GLBCharacter({ locomotion }: { locomotion?: React.RefObject<Locomotion> }) {
  const { scene, animations } = useGLTF(`${AVATAR_DIR}/${BASE_BODY.model}`)

  // SkeletonUtils.clone (NOT Object3D.clone) so each instance gets its own
  // skeleton — plain clone leaves skinned meshes bound to the original bones,
  // which breaks animation and lets multiple avatars fight over one skeleton.
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene)
    c.traverse((o: Object3D) => {
      // @ts-expect-error three mesh typing
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return c
  }, [scene])

  // Ground-align: shift so the model's feet sit at y=0 (export origins vary, and
  // the editor/world both place the avatar with feet on the floor).
  const groundY = useMemo(() => {
    cloned.updateMatrixWorld(true)
    const box = new Box3().setFromObject(cloned)
    return Number.isFinite(box.min.y) ? -box.min.y : 0
  }, [cloned])

  const { actions } = useAnimations(animations, cloned)

  // Resolve the clips we drive between (any may be null if not baked in).
  const clips = useMemo(
    () => ({
      idle: findAction(actions, 'idle'),
      walk: findAction(actions, 'walk'),
      run: findAction(actions, 'run'),
      jump: findAction(actions, 'jump'),
    }),
    [actions],
  )

  const current = useRef<AnimationAction | null>(null)

  // Start on idle. With a locomotion ref (in-world) idle plays and the frame loop
  // takes over. Without one (editor preview) we freeze idle on a natural mid-pose.
  useEffect(() => {
    const start = clips.idle ?? clips.walk ?? Object.values(actions)[0] ?? null
    if (start) {
      start.reset().play()
      if (!locomotion) {
        start.time = start.getClip().duration * 0.5
        start.paused = true
      }
      current.current = start
    }
    return () => {
      Object.values(actions).forEach((a) => a?.stop())
    }
  }, [actions, clips, locomotion])

  // Crossfade helper: ease from the current action to `next` over 0.2s.
  const fadeTo = (next: AnimationAction | null) => {
    if (!next || next === current.current) return
    next.reset().play()
    if (current.current) current.current.crossFadeTo(next, 0.2, false)
    current.current = next
  }

  // Animated mode: pick a clip from locomotion every frame. Without a locomotion
  // ref we never touch the action again — it holds the idle pose.
  useFrame(() => {
    if (!locomotion) return
    const loco = locomotion.current
    let want: AnimationAction | null
    if (!loco.grounded) want = clips.jump ?? clips.run ?? clips.walk ?? clips.idle
    else {
      const g = gaitAmount(loco.speed)
      if (g > 1.25) want = clips.run ?? clips.walk ?? clips.idle
      else if (g > 0.08) want = clips.walk ?? clips.run ?? clips.idle
      else want = clips.idle
    }
    fadeTo(want)
  })

  return (
    <primitive
      object={cloned}
      scale={BASE_BODY.scale}
      position={[0, BASE_BODY.yOffset + groundY * BASE_BODY.scale, 0]}
    />
  )
}
