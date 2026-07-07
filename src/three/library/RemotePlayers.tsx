import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, type Object3D, Vector3 } from 'three'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import type { Lod } from '../../avatar/AvatarAnimator'
import { getTarget, useRealmNet } from '../../multiplayer/net'

// Every OTHER player in the realm, rendered from the live roster.
// Simplified: no visibility cap or LOD distance culling — all remote players
// are rendered at full detail. The animator already handles performance.

const CHASE = 12

function RemotePlayerAvatar({ id, config }: { id: string; config: AvatarConfig }) {
  const group   = useRef<Group>(null)
  const camera  = useThree((s) => s.camera)
  const loco    = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  const render  = useRef<{ x: number; y: number; z: number; yaw: number } | null>(null)
  const lodRef  = useRef<Lod>('near')
  const shadowsOn = useRef<boolean | null>(null)

  const _camPos = useRef(new Vector3())
  const _avatarPos = useRef(new Vector3())

  useFrame((_, dtRaw) => {
    const g = group.current
    if (!g) return

    const t = getTarget(id)
    if (!t) {
      if (g.visible) g.visible = false
      return
    }
    if (!g.visible) g.visible = true

    if (!render.current) {
      render.current = { x: t.x, y: t.y, z: t.z, yaw: t.yaw }
    }
    const r = render.current
    const dt = Math.min(dtRaw, 0.05)
    const k  = 1 - Math.exp(-dt * CHASE)
    r.x   = MathUtils.lerp(r.x,   t.x, k)
    r.y   = MathUtils.lerp(r.y,   t.y, k)
    r.z   = MathUtils.lerp(r.z,   t.z, k)
    const dYaw = Math.atan2(Math.sin(t.yaw - r.yaw), Math.cos(t.yaw - r.yaw))
    r.yaw += dYaw * k

    g.position.set(r.x, r.y, r.z)
    g.rotation.y = r.yaw

    const l = loco.current
    l.speed    = t.speed
    l.grounded = t.grounded
    l.seated   = t.seated

    // Shadow LOD: only 'near' bodies cast/receive shadows
    _camPos.current.copy(camera.position)
    _avatarPos.current.set(r.x, r.y, r.z)
    const dist = _camPos.current.distanceTo(_avatarPos.current)
    lodRef.current = dist < 12 ? 'near' : dist < 28 ? 'far' : 'cull'

    const wantShadow = lodRef.current === 'near'
    if (wantShadow !== shadowsOn.current) {
      shadowsOn.current = wantShadow
      g.traverse((o: Object3D) => {
        const m = o as Object3D & { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean }
        if (m.isMesh) {
          m.castShadow = wantShadow
          m.receiveShadow = wantShadow
        }
      })
    }
  })

  return (
    <group ref={group}>
      <CharacterAvatar config={config} locomotion={loco} lod={lodRef} />
    </group>
  )
}

export function RemotePlayers() {
  const roster = useRealmNet((s) => s.roster)

  return (
    <>
      {Object.values(roster).map((p) => (
        <RemotePlayerAvatar key={p.id} id={p.id} config={p.avatar} />
      ))}
    </>
  )
}
