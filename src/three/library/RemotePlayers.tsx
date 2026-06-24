import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils } from 'three'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import { getTarget, useRealmNet } from '../../multiplayer/net'

// Every OTHER player in the realm, rendered from the live roster. The set of
// avatars only changes on join/leave (cheap React work); each avatar then drives
// its own per-frame motion imperatively — interpolating toward the latest network
// snapshot — so 40–50 bodies move smoothly without re-rendering React each frame.

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

// How fast the rendered transform chases the latest snapshot. ~12/sec is a good
// balance: it absorbs the gaps between 10Hz updates into smooth motion without
// feeling laggy. Higher = snappier but jerkier; lower = floatier.
const CHASE = 12

function RemotePlayerAvatar({ id, config }: { id: string; config: AvatarConfig }) {
  const group = useRef<Group>(null)
  // Locomotion fed to the shared avatar animator (same type the local player
  // uses) so remote bodies idle / walk / run / sit in sync with their motion.
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  // The smoothed render transform; null until the first snapshot arrives.
  const render = useRef<{ x: number; y: number; z: number; yaw: number } | null>(null)

  useFrame((_, dtRaw) => {
    const g = group.current
    if (!g) return
    const t = getTarget(id)
    if (!t) return
    if (!render.current) {
      render.current = { x: t.x, y: t.y, z: t.z, yaw: t.yaw }
    }
    const r = render.current
    const dt = Math.min(dtRaw, 0.05)
    const k = 1 - Math.exp(-dt * CHASE)
    r.x = MathUtils.lerp(r.x, t.x, k)
    r.y = MathUtils.lerp(r.y, t.y, k)
    r.z = MathUtils.lerp(r.z, t.z, k)
    // turn along the shortest arc so a spin doesn't unwind the long way
    const dYaw = Math.atan2(Math.sin(t.yaw - r.yaw), Math.cos(t.yaw - r.yaw))
    r.yaw += dYaw * k

    g.position.set(r.x, r.y, r.z)
    g.rotation.y = r.yaw

    const l = loco.current
    l.speed = t.speed
    l.grounded = t.grounded
    l.seated = t.seated
  })

  return (
    <group ref={group}>
      <CharacterAvatar config={config} locomotion={loco} />
    </group>
  )
}
