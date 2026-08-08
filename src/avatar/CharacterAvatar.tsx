import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { BASE_BODY } from './baseBody'
import { AvatarRig, type AvatarRigHandle } from './AvatarRig'
import { AvatarAnimator, type Lod, type PreviewState } from './AvatarAnimator'
import { type Locomotion } from './animation'
import { type AvatarConfig } from './config'
import { characterById } from './characters'

/**
 * Live registry of every mounted CharacterAvatar root group. The library's
 * frustum-culling pass iterates THIS instead of walking the whole scene graph,
 * so static geometry keeps its culling while every skinned avatar (local,
 * remote, NPC) is guaranteed unculled — skinned bodies have a bind-pose bounding
 * sphere pinned at the origin, so culling makes them vanish at seated presets.
 */
export const avatarRoots = new Set<Group>()

interface CharacterAvatarProps {
  config: AvatarConfig
  locomotion?: React.RefObject<Locomotion>
  lod?: React.RefObject<Lod>
  preview?: PreviewState
  /** Hide accessories (desk/items) — useful for portrait views */
  hideAccessories?: boolean
  /** Freeze in a static idle pose (no breathing/movement) — for customization previews */
  static?: boolean
}

export function CharacterAvatar({ config, locomotion, lod, preview, hideAccessories, static: isStatic = false }: CharacterAvatarProps) {
  const primaryRig = useRef<AvatarRigHandle>(null)
  const nearLod = useRef<Lod>('near')
  const resolvedLod = lod ?? nearLod

  // When no locomotion is supplied (editor preview, realm orb, profile portrait,
  // shot harness idle) the avatar still needs a live animator so it idles with
  // breathing / weight-shift / blink instead of freezing in its rest pose.
  const idleLoco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  const resolvedLoco = locomotion ?? idleLoco

  const rootRef = useRef<Group>(null)

  // Self-register for the library's culling pass; covers GLTF rigs too since the
  // registry is re-scanned on an interval (late-loaded SkinnedMeshes appear after
  // this effect runs). No scene-wide traversal needed.
  useEffect(() => {
    const root = rootRef.current
    if (root) avatarRoots.add(root)
    return () => {
      if (root) avatarRoots.delete(root)
    }
  }, [])

  const character = characterById(config.characterId || 'james')

  return (
    <group ref={rootRef} name="avatar-root" scale={BASE_BODY.scale} position={[0, BASE_BODY.yOffset, 0]}>
      <AvatarRig ref={primaryRig} config={config} hideAccessories={hideAccessories} />
      <AvatarAnimator rig={primaryRig} locomotion={resolvedLoco} lod={resolvedLod} preview={preview} static={isStatic} />
    </group>
  )
}
