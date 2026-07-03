import { useRef } from 'react'
import { BASE_BODY } from './baseBody'
import { AvatarRig, type AvatarRigHandle } from './AvatarRig'
import { AvatarAnimator, type Lod, type PreviewState } from './AvatarAnimator'
import { type Locomotion } from './animation'
import { type AvatarConfig } from './config'

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

  return (
    <group scale={BASE_BODY.scale} position={[0, BASE_BODY.yOffset, 0]}>
      <AvatarRig ref={primaryRig} config={config} />
      {locomotion && <AvatarAnimator rig={primaryRig} locomotion={locomotion} lod={resolvedLod} preview={preview} />}
    </group>
  )
}
