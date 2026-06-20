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
import { characterById, type Character } from './characters'
import { AvatarRig, type AvatarRigHandle } from './AvatarRig'
import { AvatarAnimator } from './AvatarAnimator'
import { gaitAmount, type Locomotion } from './animation'

// A pre-built character rendered from its baked .glb (mesh + locomotion clips).
// Two modes:
//   • animated (realm/world): a Locomotion ref drives clip selection + crossfade
//     every frame — idle ⇄ walk ⇄ run, jump while airborne.
//   • static (chooser/preview): no Locomotion → holds a single calm idle frame,
//     i.e. NO preview animation, per the brief.
//
// Until the character's .glb is dropped into /models/avatars, a ModelBoundary +
// Suspense fallback renders the deterministic procedural rig (config.ts) so the
// app is never broken — exactly the tree system's graceful-degrade contract.

const AVATAR_DIR = '/models/avatars'

interface CharacterAvatarProps {
  characterId: string
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

export function CharacterAvatar({ characterId, locomotion }: CharacterAvatarProps) {
  const character = characterById(characterId)

  // Fallback = the procedural rig in this character's signature look. When a
  // locomotion ref is present we also mount the procedural animator so the
  // fallback still walks in-world; static previews stay still.
  const fallbackRig = useRef<AvatarRigHandle>(null)
  const fallback = (
    <group scale={character.scale} position={[0, character.yOffset, 0]}>
      <AvatarRig ref={fallbackRig} config={character.fallback} />
      {locomotion && <AvatarAnimator rig={fallbackRig} locomotion={locomotion} lod="near" />}
    </group>
  )

  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLBCharacter character={character} locomotion={locomotion} />
      </Suspense>
    </ModelBoundary>
  )
}

/* ------------------------------------------------------------- glb character */

/** Resolve a baked clip by fuzzy name so the bake script's exact naming doesn't
 *  have to be perfect (e.g. "Walking", "mixamo.com|walk" both match 'walk'). */
function findAction(actions: Record<string, AnimationAction | null>, want: string): AnimationAction | null {
  const keys = Object.keys(actions)
  const hit = keys.find((k) => k.toLowerCase().includes(want))
  return hit ? actions[hit] ?? null : null
}

function GLBCharacter({
  character,
  locomotion,
}: {
  character: Character
  locomotion?: React.RefObject<Locomotion>
}) {
  const { scene, animations } = useGLTF(`${AVATAR_DIR}/${character.model}`)

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

  // Ground-align: shift so the model's feet sit at y=0 (Mixamo origins vary, and
  // the chooser/world both place the avatar with feet on the floor).
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

  // Start on idle. With a locomotion ref (in-world) idle plays and the frame
  // loop takes over. Without one (chooser preview) we freeze idle on a natural
  // mid-pose: a relaxed standing pose, never the splayed T-pose, and with no
  // motion — i.e. "no preview animation" but still lifelike.
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

  // Animated mode: pick a clip from locomotion every frame. Without a
  // locomotion ref we never touch the action again — it holds the idle pose.
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
      scale={character.scale}
      position={[0, character.yOffset + groundY * character.scale, 0]}
    />
  )
}
