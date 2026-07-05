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
}

export function CharacterAvatar({ config, locomotion, lod, preview }: CharacterAvatarProps) {
  const primaryRig = useRef<AvatarRigHandle>(null)
  const nearLod = useRef<Lod>('near')
  const resolvedLod = lod ?? nearLod

  // Determine which character to use
  const character = characterById(config.characterId || 'james')
  
  return (
    <group scale={BASE_BODY.scale} position={[0, BASE_BODY.yOffset, 0]}>
      {character.id === 'samurai' ? (
        // Use custom samurai avatar
        <SamuraiAvatar 
          config={config} 
          locomotion={locomotion}
          lod={resolvedLod}
          preview={preview}
        />
      ) : (
        // Use standard character rig
        <>
          <AvatarRig ref={primaryRig} config={config} />
          {locomotion && <AvatarAnimator rig={primaryRig} locomotion={locomotion} lod={resolvedLod} preview={preview} />}
        </>
      )}
    </group>
  )
}
