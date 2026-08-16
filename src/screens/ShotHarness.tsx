// TEMPORARY screenshot harness — renders the avatar with a FIXED camera + pose so
// front/side/3-4/back/sit views can be captured deterministically (the editor's
// auto-rotate orbit can't be pinned). Delete this file and its /__shot route when
// the torso review is done.
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useSearchParams } from 'react-router-dom'
import { createNullSafeEvents } from '../three/safeEvents'
import { AvatarRig, type AvatarRigHandle } from '../avatar/AvatarRig'
import { AvatarAnimator, type PreviewState } from '../avatar/AvatarAnimator'
import { BASE_BODY } from '../avatar/baseBody'
import type { Locomotion } from '../avatar/animation'
import { DEFAULT_AVATAR, type AvatarConfig, type BodyType } from '../avatar/config'
import { CHARACTERS } from '../avatar/characters'

const STATIC_LOCO: Locomotion = { speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false }

type View = 'front' | 'side' | 'threequarter' | 'back'
const CAM: Record<View, [number, number, number]> = {
  front: [0, 1.0, 3.4],
  side: [3.4, 1.0, 0.01],
  threequarter: [2.5, 1.05, 2.5],
  back: [0, 1.0, -3.4],
}

function CameraRig({ view }: { view: View }) {
  const camera = useThree((s) => s.camera)
  const [params] = useSearchParams()
  const zoom = Math.max(0.4, Number(params.get('zoom') || '1'))
  const camY = Number(params.get('camY') || '1')
  useEffect(() => {
    const [x, , z] = CAM[view]
    camera.position.set(x, camY, z / zoom)
    camera.lookAt(0, 0.1, 0)
  }, [camera, view, zoom, camY])
  return null
}

function Avatar({ config, emote }: { config: AvatarConfig; emote: PreviewState }) {
  const rig = useRef<AvatarRigHandle>(null)
  const loco = useRef<Locomotion>(STATIC_LOCO)
  return (
    <group scale={BASE_BODY.scale} position={[0, BASE_BODY.yOffset, 0]}>
      <AvatarRig ref={rig} config={config} />
      <AvatarAnimator rig={rig} locomotion={loco} preview={emote} lod="near" />
    </group>
  )
}

export function ShotHarness() {
  const [params] = useSearchParams()
  const view = (params.get('view') as View) || 'front'
  const emote = (params.get('emote') as PreviewState) || 'idle'
  const bodyType = (params.get('body') as BodyType) || (params.get('char') === 'sunflower' ? 'female' : 'male')
  const charId = params.get('char') || undefined
  const character = charId ? CHARACTERS.find((c) => c.id === charId) : undefined

  // look=char renders the character's exact defined look (fallback config) —
  // used for character thumbnails. Otherwise a clean tee/pants silhouette with
  // optional per-field overrides.
  const config = useMemo<AvatarConfig>(
    () => {
      if (params.get('look') === 'char' && character?.fallback) {
        return { ...character.fallback, characterId: charId }
      }
      return {
        ...DEFAULT_AVATAR,
        characterId: charId,
        bodyType,
        top: params.get('top') || 'tee',
        bottom: params.get('bottom') || 'pants',
        shoes: params.get('shoes') || 'sneakers',
        hair: params.get('hair') || DEFAULT_AVATAR.hair,
      }
    },
    [bodyType, charId, character, params],
  )

  const warmBg =
    'radial-gradient(140% 120% at 85% -5%, rgba(15,8,2,0.9) 0%, rgba(15,8,2,0.35) 42%, rgba(15,8,2,0) 60%), linear-gradient(160deg, #e7cb90 0%, #d9a763 55%, #c68f52 100%)'

  return (
    <div style={{ position: 'fixed', inset: 0, background: params.get('bg') === 'warm' ? warmBg : '#1a1430' }}>
      <Canvas
        events={createNullSafeEvents}
        shadows={false}
        dpr={[1, 1.5]}
        camera={{ position: CAM[view], fov: 38, near: 0.1, far: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}
      >
        {params.get('bg') !== 'warm' && <color attach="background" args={['#1a1430']} />}
        <hemisphereLight args={['#cfe0ff', '#3a2f4a', 0.85]} />
        <directionalLight position={[3, 5, 2]} intensity={1.25} color="#fff3df" />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#9a8cff" />
        <directionalLight position={[0, 2.5, -4]} intensity={0.8} color="#7fa8ff" />
        <ambientLight intensity={0.28} />

        <group position={[0, -0.9, 0]}>
          <Suspense fallback={null}>
            <Avatar config={config} emote={emote} />
          </Suspense>
          {params.get('bg') !== 'warm' && (
            <ContactShadows position={[0, 0.002, 0]} opacity={0.4} scale={3} blur={2.4} far={2} resolution={256} color="#1a1430" />
          )}
        </group>

        <CameraRig view={view} />
      </Canvas>
      {/* a settle marker Playwright can poll before capturing */}
      <div id="shot-ready" data-view={view} data-emote={emote} data-body={bodyType} style={{ position: 'fixed', bottom: 4, left: 4, color: '#fff6', font: '11px monospace' }}>
        {bodyType} · {view} · {emote}
      </div>
    </div>
  )
}
