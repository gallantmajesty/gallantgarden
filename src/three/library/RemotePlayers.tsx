import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, Vector3 } from 'three'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import type { Lod } from '../../avatar/AvatarAnimator'
import { getTarget, useRealmNet } from '../../multiplayer/net'

// Every OTHER player in the realm, rendered from the live roster. The set of
// avatars only changes on join/leave (cheap React work); each avatar then drives
// its own per-frame motion imperatively — interpolating toward the latest network
// snapshot — so 40–50 bodies move smoothly without re-rendering React each frame.
//
// LOD TIERS (avatar cost is the #1 FPS bottleneck with many players):
//   < LOD_FAR  → 'near'  full bone updates every frame
//   < LOD_CULL → 'far'   update every 3rd frame (AvatarAnimator stride logic)
//   >= LOD_CULL → 'cull'  no animation updates — body frozen in last pose
// These thresholds are conservative; the animator already handles the math.

const LOD_FAR  = 12   // metres — full detail inside this radius
const LOD_CULL = 28   // metres — cull animation beyond this radius

const _camPos  = new Vector3()
const _avatarPos = new Vector3()

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
  const group   = useRef<Group>(null)
  const camera  = useThree((s) => s.camera)
  // Locomotion fed to the shared avatar animator (same type the local player
  // uses) so remote bodies idle / walk / run / sit in sync with their motion.
  const loco    = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  // The smoothed render transform; null until the first snapshot arrives.
  const render  = useRef<{ x: number; y: number; z: number; yaw: number } | null>(null)
  // Current LOD tier — updated per-frame from camera distance.
  const lodRef  = useRef<Lod>('near')

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
    const k  = 1 - Math.exp(-dt * CHASE)
    r.x   = MathUtils.lerp(r.x,   t.x, k)
    r.y   = MathUtils.lerp(r.y,   t.y, k)
    r.z   = MathUtils.lerp(r.z,   t.z, k)
    // turn along the shortest arc so a spin doesn't unwind the long way
    const dYaw = Math.atan2(Math.sin(t.yaw - r.yaw), Math.cos(t.yaw - r.yaw))
    r.yaw += dYaw * k

    g.position.set(r.x, r.y, r.z)
    g.rotation.y = r.yaw

    const l = loco.current
    l.speed    = t.speed
    l.grounded = t.grounded
    l.seated   = t.seated

    // ---- Distance-based LOD -------------------------------------------------
    // Compute avatar→camera distance and map to a LOD tier. This runs cheaply
    // on the already-required useFrame and avoids allocations by reusing the
    // module-level Vector3 temporaries.
    _camPos.copy(camera.position)
    _avatarPos.set(r.x, r.y, r.z)
    const dist = _camPos.distanceTo(_avatarPos)
    lodRef.current = dist < LOD_FAR ? 'near' : dist < LOD_CULL ? 'far' : 'cull'
  })

  return (
    <group ref={group}>
      <CharacterAvatar config={config} locomotion={loco} lod={lodRef} />
    </group>
  )
}
