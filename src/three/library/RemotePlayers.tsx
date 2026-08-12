import { useCallback, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, type Object3D, Vector3 } from 'three'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { useSettings } from '../../store/settings'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import type { Lod } from '../../avatar/AvatarAnimator'
import { getTarget, useRealmNet } from '../../multiplayer/net'
import { PlayerNameTag3D } from './PlayerNameTag3D'
import { PlayerTimerBar } from './PlayerTimerBar'
import { activityOfAccessories } from '../../avatar/animation'
import { useNpcProfile } from '../../store/npcProfile'

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

const LOD_FAR  = 10   // metres — full detail inside this radius
const LOD_CULL = 18   // metres — cull animation beyond this radius

// Name-tag / timer-bar distance gate (metres, hysteresis). Far players have
// swapped to tiny 2D sprites where a DOM tag is unreadable and pure CPU/DOM
// cost — beyond TAG_OFF the tag only un-mounts, and only re-mounts once the
// player re-enters TAG_ON, so a hovering player never flickers its tag.
const TAG_ON  = 13
const TAG_OFF = 16

const _camPos  = new Vector3()
const _avatarPos = new Vector3()

export function RemotePlayers() {
  const roster = useRealmNet((s) => s.roster)
  return (
    <>
      {Object.values(roster).map((p) => (
        <RemotePlayerAvatar key={p.id} id={p.id} p={p} config={p.avatar} />
      ))}
    </>
  )
}

// How fast the rendered transform chases the latest snapshot. ~12/sec is a good
// balance: it absorbs the gaps between 10Hz updates into smooth motion without
// feeling laggy. Higher = snappier but jerkier; lower = floatier.
const CHASE = 12

function RemotePlayerAvatar({ id, p, config }: { id: string; p: { id: string; name: string; country: string | null; rank: string; avatar: AvatarConfig; banner?: string; logo?: string }; config: AvatarConfig }) {
  const group   = useRef<Group>(null)
  const camera  = useThree((s) => s.camera)
  // Self-serve performance toggles (see Settings → Players & Performance).
  const showNameTags   = useSettings((s) => s.showNameTags)
  const distantTags    = useSettings((s) => s.distantTags)
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
  // Distance-gated tag hysteresis (only meaningful when distant tags are off).
  const tagOnRef = useRef(true)
  const showProfile = useNpcProfile((s) => s.show)

  const handleInfoClick = useCallback(() => {
    showProfile({
      name: p.name,
      rank: p.rank,
      country: p.country,
      characterId: config.characterId,
      status: 'studying',
      isUser: true,
      banner: p.banner,
      logo: p.logo,
    })
  }, [p, config, showProfile])

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
    facingRef.current = r.yaw

    const l = loco.current
    l.speed    = t.speed
    l.grounded = t.grounded
    l.seated   = t.seated
    l.activity = t.seated ? activityOfAccessories(p.avatar.accessories) : undefined

    // ---- Distance-based LOD -------------------------------------------------
    _camPos.copy(camera.position)
    _avatarPos.set(r.x, r.y, r.z)
    const dist = _camPos.distanceTo(_avatarPos)

    // Name tag / timer bar gate. Hidden during the shared cinematic tour, and —
    // when distant tags are OFF — only mounted for the nearest players (hysteresis
    // so a hovering player never flickers its tag). Toggled via state so the <Html>
    // overlay mounts/unmounts instead of just hiding.
    let wantTag = showNameTags && !t.cinematic
    if (wantTag && !distantTags) {
      if (tagOnRef.current) {
        if (dist > TAG_OFF) tagOnRef.current = false
      } else if (dist < TAG_ON) {
        tagOnRef.current = true
      }
      wantTag = tagOnRef.current
    }
    if (wantTag !== tagShownRef.current) {
      tagShownRef.current = wantTag
      setTagShown(wantTag)
    }

    // ---- Distance LOD (body rig only) -------------------------------------
    // The body ALWAYS renders as its full 3D rig — characters are never swapped
    // to billboards or hidden, no matter the LOD setting. Distance only steps
    // the ANIMATION update rate and shadows; what you see is always the real body.
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
        <PlayerNameTag3D name={p.name} rank={p.rank} country={p.country} headY={2.55} banner={p.banner} logo={p.logo} onInfoClick={handleInfoClick} />
      )}
      {tagShown && (
        <PlayerTimerBar playerId={id} headY={2.9} />
      )}
    </group>
  )
}
