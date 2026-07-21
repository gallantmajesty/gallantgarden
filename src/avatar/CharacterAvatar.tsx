import { useRef } from 'react'
import { BASE_BODY } from './baseBody'
import { AvatarRig, type AvatarRigHandle } from './AvatarRig'
import { AvatarAnimator, type Lod, type PreviewState } from './AvatarAnimator'
import { SamuraiAvatar } from './SamuraiCharacter'
import { type Locomotion } from './animation'
import { type AvatarConfig } from './config'
import { characterById } from './characters'

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

  const character = characterById(config.characterId || 'james')

  return (
    <group scale={BASE_BODY.scale} position={[0, BASE_BODY.yOffset, 0]}>
      {character.id === 'samurai' ? (
        <SamuraiAvatar
          config={config}
          locomotion={resolvedLoco}
          lod={resolvedLod}
          preview={preview}
        />
      ) : (
        <>
          <AvatarRig ref={primaryRig} config={config} hideAccessories={hideAccessories} />
          <AvatarAnimator rig={primaryRig} locomotion={resolvedLoco} lod={resolvedLod} preview={preview} static={isStatic} />
        </>
      )}
    </group>
  )
}
