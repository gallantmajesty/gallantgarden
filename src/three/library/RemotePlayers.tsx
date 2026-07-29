import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, type Object3D, Vector3 } from 'three'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import type { Lod } from '../../avatar/AvatarAnimator'
import { getTarget, useRealmNet } from '../../multiplayer/net'
import { PlayerNameTag3D } from './PlayerNameTag3D'
import { PlayerTimerBar } from './PlayerTimerBar'

// Every OTHER player in the realm, rendered from the live roster. The set of
// avatars only changes on join/leave (cheap React work); each avatar then drives
// its own per-frame motion imperatively — interpolating toward the latest network
// snapshot — so 40–50 bodies move smoothly without re-rendering React each frame.
//
// LOD TIERS (avatar cost is the #1 FPS bottleneck with many players):
//   < LOD_FAR  → 'near'  full bone updates every frame + casts a shadow
//   < LOD_CULL → 'far'   update every 3rd frame, NO shadow (AvatarAnimator stride)
//   >= LOD_CULL → 'cull'  no animation updates — body frozen in last pose, no shadow
//
// VISIBILITY CAP: beyond MAX_VISIBLE bodies, only the nearest MAX_VISIBLE are
// rendered at all — the rest are hidden (group.visible=false) so they cost
// nothing in the colour OR shadow pass. The nearest set is recomputed on a slow
// throttle (RANK_INTERVAL) to keep React churn negligible in a busy room.
// These thresholds are conservative; the animator already handles the math.

const LOD_FAR  = 12   // metres — full detail inside this radius
const LOD_CULL = 28   // metres — cull animation beyond this radius

const MAX_VISIBLE   = 10   // render only the nearest N avatars
const RANK_INTERVAL = 0.4  // seconds between nearest-set recomputes

const _camPos  = new Vector3()
const _avatarPos = new Vector3()

/** True when both sets hold exactly the same ids. */
function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}

export function RemotePlayers() {
  const roster = useRealmNet((s) => s.roster)
  const camera = useThree((s) => s.camera)
  // The ids currently allowed to render (nearest MAX_VISIBLE). Updated by the
  // throttled ranker below; mounting/unmounting still follows join/leave only.
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(Object.keys(roster)))
  const visibleRef = useRef(visibleIds)
  const acc = useRef(0)

  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < RANK_INTERVAL) return
    acc.current = 0

    const ids = Object.keys(useRealmNet.getState().roster)

    // Cheap path: everyone fits under the cap — show all (only re-set on change).
    if (ids.length <= MAX_VISIBLE) {
      if (!sameSet(new Set(ids), visibleRef.current)) {
        const next = new Set(ids)
        visibleRef.current = next
        setVisibleIds(next)
      }
      return
    }

    // Rank roster by squared camera distance and keep the nearest MAX_VISIBLE.
    _camPos.copy(camera.position)
    const ranked = ids
      .map((id) => {
        const t = getTarget(id)
        const d = t ? _camPos.distanceToSquared(_avatarPos.set(t.x, t.y, t.z)) : Infinity
        return [id, d] as const
      })
      .sort((a, b) => a[1] - b[1])
      .slice(0, MAX_VISIBLE)
      .map(([id]) => id)

    const next = new Set(ranked)
    if (!sameSet(next, visibleRef.current)) {
      visibleRef.current = next
      setVisibleIds(next)
    }
  })

  return (
    <>
      {Object.values(roster).map((p) => (
        <RemotePlayerAvatar key={p.id} id={p.id} p={p} config={p.avatar} visible={visibleIds.has(p.id)} />
      ))}
    </>
  )
}

// How fast the rendered transform chases the latest snapshot. ~12/sec is a good
// balance: it absorbs the gaps between 10Hz updates into smooth motion without
// feeling laggy. Higher = snappier but jerkier; lower = floatier.
const CHASE = 12

function RemotePlayerAvatar({ id, p, config, visible }: { id: string; p: { id: string; name: string; country: string | null; rank: string; avatar: AvatarConfig }; config: AvatarConfig; visible: boolean }) {
  const group   = useRef<Group>(null)
  const camera  = useThree((s) => s.camera)
  // Locomotion fed to the shared avatar animator (same type the local player
  // uses) so remote bodies idle / walk / run / sit in sync with their motion.
  const loco    = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  // The smoothed render transform; null until the first snapshot arrives.
  const render  = useRef<{ x: number; y: number; z: number; yaw: number } | null>(null)
  // Current LOD tier — updated per-frame from camera distance.
  const lodRef  = useRef<Lod>('near')
  // Last shadow state pushed onto the body, so we only traverse on a change.
  const shadowsOn = useRef<boolean | null>(null)
  // Name tag visibility (hidden during the shared cinematic tour) — toggled via
  // state so the <Html> overlay mounts/unmounts instead of just hiding.
  const [tagShown, setTagShown] = useState(true)
  const tagShownRef = useRef(true)

  useFrame((_, dtRaw) => {
    const g = group.current
    if (!g) return

    // Hidden by the visibility cap: drop out of every pass and skip all work.
    if (!visible) {
      if (g.visible) g.visible = false
      lodRef.current = 'cull'
      return
    }
    if (!g.visible) g.visible = true

    const t = getTarget(id)
    if (!t) return

    // Name tag follows the same cinematic-hide rule: show unless this player is
    // on the tour (in which case everyone else sees their broadcast feed, not body).
    const wantTag = !t.cinematic
    if (wantTag !== tagShownRef.current) {
      tagShownRef.current = wantTag
      setTagShown(wantTag)
    }


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

    // ---- Shadow LOD ---------------------------------------------------------
    // Only 'near' bodies cast/receive shadows — skinned/multi-mesh avatars are
    // the dominant shadow-pass cost. Toggle the whole body in one traversal,
    // and only when the desired state actually flips.
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
      {tagShown && (
        <PlayerNameTag3D name={p.name} rank={p.rank} country={p.country} headY={2.55} banner={p.banner} logo={p.logo} />
      )}
      {tagShown && (
        <PlayerTimerBar playerId={id} headY={2.9} />
      )}
    </group>
  )
}
