import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Euler, type Object3D, type Bone } from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { BASE_BODY } from './baseBody'
import { AvatarRig, type AvatarRigHandle } from './AvatarRig'
import { AvatarAnimator, type Lod } from './AvatarAnimator'
import { airPose, gaitAmount, gaitBounce, idlePose, landPose, locomotionPose, type Locomotion } from './animation'
import type { AvatarConfig } from './config'

const AVATAR_DIR = '/models/avatars'

interface CharacterAvatarProps {
  config: AvatarConfig
  locomotion?: React.RefObject<Locomotion>
  lod?: React.RefObject<Lod>
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Map Mixamo bone names to procedural animation names. */
const MIXAMO_TO_PROCEDURAL: Record<string, string> = {
  'mixamorig:Hips': 'hips',
  'mixamorig:Spine': 'spine',
  'mixamorig:Spine1': 'spine',
  'mixamorig:Spine2': 'chest',
  'mixamorig:Neck': 'neck',
  'mixamorig:Head': 'head',
  // LeftArm = upper arm (bicep), NOT LeftShoulder (scapula)
  'mixamorig:LeftArm': 'armUpperL',
  'mixamorig:LeftForeArm': 'armLowerL',
  'mixamorig:RightArm': 'armUpperR',
  'mixamorig:RightForeArm': 'armLowerR',
  // LeftLeg = thigh, LeftLeg.001 = shin (Blender auto-renamed duplicates)
  'mixamorig:LeftLeg': 'legUpperL',
  'mixamorig:LeftLeg.001': 'legLowerL',
  'mixamorig:LeftFoot': 'footL',
  'mixamorig:RightLeg': 'legUpperR',
  'mixamorig:RightLeg.001': 'legLowerR',
  'mixamorig:RightFoot': 'footR',
}

type BoneName = 'root' | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'armUpperL' | 'armLowerL' | 'armUpperR' | 'armLowerR'
  | 'legUpperL' | 'legLowerL' | 'footL' | 'legUpperR' | 'legLowerR' | 'footR'

export function CharacterAvatar({ config, locomotion, lod }: CharacterAvatarProps) {
  const fallbackRig = useRef<AvatarRigHandle>(null)
  const nearLod = useRef<Lod>('near')
  const resolvedLod = lod ?? nearLod

  const fallback = (
    <group scale={BASE_BODY.scale} position={[0, BASE_BODY.yOffset, 0]}>
      <AvatarRig ref={fallbackRig} config={config} />
      {locomotion && <AvatarAnimator rig={fallbackRig} locomotion={locomotion} lod={resolvedLod} />}
    </group>
  )

  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLBCharacter locomotion={locomotion} lod={resolvedLod} />
      </Suspense>
    </ModelBoundary>
  )
}

function GLBCharacter({ locomotion, lod }: { locomotion?: React.RefObject<Locomotion>; lod: React.RefObject<Lod> }) {
  const { scene } = useGLTF(`${AVATAR_DIR}/base.glb`)

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

  const groundY = useMemo(() => {
    cloned.updateMatrixWorld(true)
    const box = new Box3().setFromObject(cloned)
    return Number.isFinite(box.min.y) ? -box.min.y : 0
  }, [cloned])

  const boneMap = useMemo(() => {
    const map: Partial<Record<BoneName, Bone>> = {}
    cloned.traverse((o: Object3D) => {
      // @ts-expect-error three bone check
      if (o.isBone) {
        const procName = MIXAMO_TO_PROCEDURAL[o.name]
        if (procName && !map[procName as BoneName]) {
          map[procName as BoneName] = o as Bone
        }
      }
    })
    return map
  }, [cloned])

  const clock = useRef(0)
  const gaitPhase = useRef(0)
  const land = useRef(0)
  const wasGrounded = useRef(true)
  const curEuler = useMemo(() => {
    const e: Record<string, Euler> = {}
    for (const k of Object.keys(boneMap)) e[k] = new Euler()
    return e
  }, [boneMap])

  useFrame((_, dtRaw) => {
    if (!locomotion) return
    const currentLod = lod.current
    if (currentLod === 'cull') return

    const dt = Math.min(dtRaw, 0.05)
    const loco = locomotion.current

    if (!wasGrounded.current && loco.grounded) land.current = 1
    wasGrounded.current = loco.grounded
    land.current = Math.max(0, land.current - dt * 4)

    const g = gaitAmount(loco.speed)
    gaitPhase.current += dt * (4 + g * 3.5) * Math.min(1, g)
    const phase = gaitPhase.current
    clock.current += dt
    const t = clock.current

    let pose: Record<string, { x?: number; y?: number; z?: number }>
    if (!loco.grounded) pose = airPose(loco.vy)
    else if (land.current > 0.02) pose = landPose(land.current)
    else if (g > 0.06) pose = locomotionPose(phase, Math.max(1, g))
    else pose = idlePose(t)

    const k = 1 - Math.pow(0.0001, dt * (g > 0.06 || !loco.grounded ? 1.6 : 1))
    for (const [name, bone] of Object.entries(boneMap)) {
      if (!bone) continue
      const target = pose[name]
      const cur = curEuler[name]
      if (!cur || !target) continue

      cur.x += ((target.x ?? 0) - cur.x) * k
      cur.y += ((target.y ?? 0) - cur.y) * k
      cur.z += ((target.z ?? 0) - cur.z) * k

      bone.rotation.set(cur.x, cur.y, cur.z)
    }

    const root = boneMap.hips
    if (root?.parent) {
      root.parent.position.y = g > 0.06 && loco.grounded
        ? Math.abs(Math.sin(phase)) * gaitBounce(Math.max(1, g))
        : 0
    }
  })

  return (
    <primitive
      object={cloned}
      scale={BASE_BODY.scale}
      position={[0, BASE_BODY.yOffset + groundY * BASE_BODY.scale, 0]}
    />
  )
}
