import { useCallback, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, type Object3D, Vector3 } from 'three'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { useSettings } from '../../store/settings'
import { useScenePreset } from '../../store/quality'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import type { Lod } from '../../avatar/AvatarAnimator'
import { getTarget, useRealmNet } from '../../multiplayer/net'
import { PlayerNameTag3D } from './PlayerNameTag3D'
import { PlayerTimerBar } from './PlayerTimerBar'
import { ImpostorBakeStage, ImpostorSprite, useImpostorTextures } from './ImpostorSprites'
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

// Impostor sprite swap thresholds (metres). Past SWAP_OUT the body hides and a
// baked billboard takes over (1 draw call vs ~110); the body only comes back
// once the player re-enters SWAP_IN, so a player hovering on the boundary never
// flickers between the two.
const SWAP_OUT = 13
const SWAP_IN  = 9

// Name-tag / timer-bar distance gate (metres, hysteresis). Far players have
// swapped to tiny 2D sprites where a DOM tag is unreadable and pure CPU/DOM
// cost — beyond TAG_OFF the tag only un-mounts, and only re-mounts once the
// player re-enters TAG_ON, so a hovering player never flickers its tag.
const TAG_ON  = 13
const TAG_OFF = 16

const MAX_VISIBLE   = 8    // render only the nearest N avatars
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
      <ImpostorBakeStage />
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

function RemotePlayerAvatar({ id, p, config, visible }: { id: string; p: { id: string; name: string; country: string | null; rank: string; avatar: AvatarConfig; banner?: string; logo?: string }; config: AvatarConfig; visible: boolean }) {
  const group   = useRef<Group>(null)
  const bodyGroup = useRef<Group>(null)
  const camera  = useThree((s) => s.camera)
  // Self-serve performance toggles (see Settings → Players & Performance).
  const showNameTags   = useSettings((s) => s.showNameTags)
  const distantTags    = useSettings((s) => s.distantTags)
  const impostorSprites = useSettings((s) => s.impostorSprites)
  // Stronger sprite LOD (Settings → Graphics → Distant player LOD) scales the
  // swap distances down so far bodies become cheap billboards sooner.
  const impostorSwap = useScenePreset().impostorSwap
  const swapOut = SWAP_OUT * impostorSwap
  const swapIn  = SWAP_IN * impostorSwap
  // Baked billboards for this look (shared across every player with the same
  // appearance): left/center/right/back view variants so the sprite shows the
  // player turned toward whatever they face from any camera angle. Null until
  // the bake completes.
  const impostors = useImpostorTextures(config, 'idle')
  const impostor = impostors.center ?? impostors.left ?? impostors.right ?? impostors.back
  // Impostor mode, with hysteresis so a player on the boundary doesn't flicker.
  const spriteOn = useRef(false)
  // Live facing yaw for the sprite mirror (matches the body's rotation.y, which
  // is smoothed per frame below).
  const facingRef = useRef(0)
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
  // Body unmount: the full 3D rig stays mounted only while it should be visible;
  // once swapped to a sprite it is unmounted (after the sprite finishes fading in)
  // so far players cost one billboard quad, not ~110 React meshes.
  const [bodyMounted, setBodyMounted] = useState(true)
  const unmountTimer = useRef<number | null>(null)
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

    // ---- Impostor swap (hysteresis) ----------------------------------------
    // If sprites are disabled the body must always render, so force the swap off.
    if (!impostorSprites) spriteOn.current = false
    // Enter sprite mode past SWAP_OUT (or when outside the visibility cap — a
    // billboard costs ~1 draw call so there's no reason to hide far players
    // anymore). Only leave it once the player re-enters SWAP_IN. The swap only
    // happens once the bake is ready — until then the 3D body simply stays, so
    // nothing ever pops.
    if (spriteOn.current) {
      if (dist < swapIn) spriteOn.current = false
    } else if (impostorSprites && impostor && (dist > swapOut || !visible)) {
      spriteOn.current = true
    }

    const bodyOn = visible && !spriteOn.current
    const body = bodyGroup.current
    if (body && body.visible !== bodyOn) body.visible = bodyOn

    // Cross-fade-friendly body unmount: mount the body the instant it should
    // show (so it appears under the still-fading sprite, no pop), and only
    // unmount once it has been hidden for the sprite fade duration.
    if (bodyOn) {
      if (unmountTimer.current != null) {
        clearTimeout(unmountTimer.current)
        unmountTimer.current = null
      }
      if (!bodyMounted) setBodyMounted(true)
    } else if (bodyMounted && unmountTimer.current == null) {
      unmountTimer.current = window.setTimeout(() => {
        setBodyMounted(false)
        unmountTimer.current = null
      }, 250)
    }

    lodRef.current = bodyOn ? (dist < LOD_FAR ? 'near' : dist < LOD_CULL ? 'far' : 'cull') : 'cull'

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
      <group ref={bodyGroup}>
        {bodyMounted && <CharacterAvatar config={config} locomotion={loco} lod={lodRef} />}
      </group>
      {impostorSprites && <ImpostorSprite entries={impostors} onRef={spriteOn} facing={facingRef} />}
      {tagShown && (
        <PlayerNameTag3D name={p.name} rank={p.rank} country={p.country} headY={2.55} banner={p.banner} logo={p.logo} onInfoClick={handleInfoClick} />
      )}
      {tagShown && (
        <PlayerTimerBar playerId={id} headY={2.9} />
      )}
    </group>
  )
}
