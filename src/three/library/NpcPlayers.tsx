import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Object3D, Vector3 } from 'three'
import { Html } from '@react-three/drei'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { PlayerNameTag } from '../../components/PlayerNameTag'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import type { Lod } from '../../avatar/AvatarAnimator'
import { seatAnchors, type Seat } from './furniture'
import { activityOfAccessories } from '../../avatar/animation'
import { BANNERS } from '../../lib/banners'
import { characterById } from '../../avatar/characters'
import { useWorld } from '../../store/world'
import { useNpcProfile } from '../../store/npcProfile'
import { useSettings } from '../../store/settings'
import { ImpostorBakeStage, ImpostorSprite, useImpostorTexture } from './ImpostorSprites'
import {
  npcOnlineInRoom,
  assignNpcSeats,
  libraryRoomIndex,
  npcSession,
  NPC_ALWAYS_ONLINE,
  type NpcProfile,
} from '../../lib/npcSystem'

// ─────────────────────────────────────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Name-tag distance gate (metres, hysteresis) — see RemotePlayers for rationale.
const TAG_ON  = 13
const TAG_OFF = 16

// Distance LOD tiers (same as RemotePlayers):
//   < LOD_FAR  → 'near'  full bone updates every frame
//   < LOD_CULL → 'far'   update every 3rd frame
//   >= LOD_CULL → 'cull' no animation updates — body frozen
// NOTE: no material opacity fade here. Avatar materials are SHARED process-wide
// (sharedMaterial in avatar/config.ts), so mutating opacity on one NPC's meshes
// silently turns every other avatar using that material transparent — including
// the player's own body. NPCs stay fully opaque at all distances.
const LOD_FAR  = 10
const LOD_CULL = 18

// Impostor sprite swap thresholds (metres, hysteresis) — same as RemotePlayers.
// Past SWAP_OUT the full ~110-mesh rig is replaced by a single baked billboard
// (1 draw call); the rig only returns once the NPC re-enters SWAP_IN. NPCs are
// static at their desks, so this is the #1 FPS win in a crowded room: with 30
// NPCs it cuts ~3,300 draws to a few hundred.
const SWAP_OUT = 13
const SWAP_IN  = 9

// Visibility cap: only the nearest MAX_VISIBLE NPCs render their rig at all;
// everyone else renders as a sprite (1 draw call) or nothing past the cull
// distance. Re-ranked every RANK_INTERVAL seconds.
const MAX_VISIBLE   = 8
const SHADOW_LIMIT  = 2   // only the nearest N NPCs cast/receive shadows
const RANK_INTERVAL = 0.5

// How often the "present NPC" set is recomputed. NPCs are permanent now
// (NPC_ALWAYS_ONLINE), so this is only a cheap safety re-sync — nothing
// appears or disappears on its own anymore.
const REFRESH_MS = 30_000

const _camPos = new Vector3()
const _seatPos = new Vector3()

/** True when both sets hold exactly the same ids. */
function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
//  Components — NO Html fullscreen, profile card is rendered OUTSIDE Canvas
// ─────────────────────────────────────────────────────────────────────────────

function NpcTag({ npc, onInfoClick }: { npc: NpcProfile; onInfoClick: () => void }) {
  const banner = BANNERS.find((b) => b.id === npc.banner)
  const [peek, setPeek] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!peek) return
    const iv = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(iv)
  }, [peek])
  const sess = npcSession(npc.idx, now)
  const remainMin = Math.max(0, Math.round((sess.end - now) / 60_000))
  const hRemain = Math.floor(remainMin / 60)
  const mRemain = remainMin % 60
  return (
    <Html position={[0, 2.55, 0]} center distanceFactor={10} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div
        className="npc-tag-wrap"
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
      >
        <PlayerNameTag
          name={npc.name}
          rank={npc.rank}
          country={npc.country}
          banner={npc.banner}
          logo={npc.logo}
          textDark={banner?.textDark}
          onInfoClick={onInfoClick}
        />
        {peek && (
          <div className="npc-peek">
            <div className="npc-peek-head">
              <strong>{npc.name}</strong>
              <span className="npc-peek-emoji">📖</span>
            </div>
            <p className="npc-peek-topic">{npc.studyTopic}</p>
            <p className="npc-peek-time">
              {NPC_ALWAYS_ONLINE
                ? 'Studying — always in the library'
                : `${hRemain > 0 ? `${hRemain}h ${mRemain}m` : `${mRemain}m`} left in this study session`}
            </p>
            <button className="npc-peek-btn" onClick={onInfoClick}>Full profile</button>
          </div>
        )}
      </div>
    </Html>
  )
}

function NpcAvatar({ npc, seat, visible, castShadow }: { npc: NpcProfile; seat: Seat; visible: boolean; castShadow: boolean }) {
  const group = useRef<Group>(null)
  const bodyGroup = useRef<Group>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const lodRef = useRef<Lod>('near')
  const shadowsOn = useRef(true)
  const showProfile = useNpcProfile((s) => s.show)
  const showNameTags = useSettings((s) => s.showNameTags)
  const distantTags = useSettings((s) => s.distantTags)
  const impostorSprites = useSettings((s) => s.impostorSprites)

  const config: AvatarConfig = useMemo(() => configFor(npc), [npc])
  // Baked billboard of this NPC's exact look in the SITTING pose (shared across
  // NPCs with the same appearance). Null until the offscreen bake completes —
  // until then the 3D body simply stays, so nothing ever pops.
  const impostor = useImpostorTexture(config, 'sit')
  // Impostor mode with hysteresis — enter past SWAP_OUT (or outside the
  // visibility cap), leave only once the NPC re-enters SWAP_IN.
  const spriteOn = useRef(false)
  // The rig stays mounted only while it should render; once swapped to a sprite
  // it is unmounted (after the fade) so far NPCs cost one quad, not ~110 meshes.
  const [bodyMounted, setBodyMounted] = useState(true)
  const unmountTimer = useRef<number | null>(null)

  // Distance-gated tag hysteresis (only meaningful when distant tags are off).
  const [tagShown, setTagShown] = useState(showNameTags)
  const tagShownRef = useRef(showNameTags)
  const tagOnRef = useRef(true)

  useFrame(({ clock, camera }) => {
    const g = group.current
    if (!g) return
    g.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
    // Face the desk, with a slow personal sway (deterministic per NPC) so the
    // hall never reads as frozen statues staring at the player.
    g.rotation.y = seat.yaw + Math.PI + Math.sin(clock.elapsedTime * 0.22 + npc.idx) * 0.05
    loco.current.seated = true
    loco.current.speed = 0
    // Per-scholar seated activity from their accessory: laptop → typing hands
    // on the machine, phone → bent over it, book → held up, book stack / none
    // → sitting idly. Same pose language as real players.
    loco.current.activity = activityOfAccessories(npc.accessories)
    g.scale.y = 1 + Math.sin(clock.elapsedTime * 0.8 + npc.totalXp) * 0.003

    const dist = camera.position.distanceTo(g.position)

    // ---- Impostor swap (hysteresis) --------------------------------------
    // If sprites are disabled the body must always render, so force the swap
    // off. NPCs outside the visibility cap become sprites too (a billboard
    // costs ~1 draw call, so there is no reason to fully hide them).
    if (!impostorSprites) spriteOn.current = false
    if (spriteOn.current) {
      if (dist < SWAP_IN) spriteOn.current = false
    } else if (impostorSprites && impostor && (dist > SWAP_OUT || !visible)) {
      spriteOn.current = true
    }

    const bodyOn = visible && !spriteOn.current
    const body = bodyGroup.current
    if (body && body.visible !== bodyOn) body.visible = bodyOn

    // Cross-fade-friendly body unmount: mount the instant it should show (it
    // appears under the still-fading sprite, no pop), unmount only after the
    // sprite has finished fading in.
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

    // ---- Distance LOD (body rig only) -------------------------------------
    lodRef.current = bodyOn ? (dist < LOD_FAR ? 'near' : dist < LOD_CULL ? 'far' : 'cull') : 'cull'

    // ---- Shadow LOD ---------------------------------------------------------
    // Shadows are the dominant shadow-pass cost, so only the nearest
    // SHADOW_LIMIT NPCs (AND near bodies) cast/receive. Toggle the whole body
    // in one traversal, only when the desired state actually flips.
    const wantShadow = bodyOn && castShadow && lodRef.current === 'near'
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

    // Name-tag distance gate (hysteresis), matching RemotePlayers.
    let wantTag = showNameTags
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
  })

  const handleInfoClick = useCallback(() => {
    showProfile({
      name: npc.name,
      rank: npc.rank,
      country: npc.country,
      characterId: npc.characterId,
      studyTopic: npc.studyTopic,
      totalXp: npc.totalXp,
      sessionsCompleted: npc.sessionsCompleted,
      streak: npc.streak,
      bio: npc.bio,
      joinDate: npc.joinDate,
      status: npc.status,
      banner: npc.banner,
      logo: npc.logo,
    })
  }, [npc, showProfile])

  return (
    <group ref={group}>
      <group ref={bodyGroup}>
        {bodyMounted && <CharacterAvatar config={config} locomotion={loco} lod={lodRef} />}
      </group>
      {impostorSprites && <ImpostorSprite entry={impostor} onRef={spriteOn} />}
      {tagShown && <NpcTag npc={npc} onInfoClick={handleInfoClick} />}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export — permanent room occupancy from npcSystem
//
//  NPCs are completely independent and permanent: every scholar is present in
//  the room around the clock, seated at their own fixed desk. NPCs NEVER move,
//  walk, sit or stand — they are static fixtures of the hall (no sit/stand
//  animation, nothing to animate). The ONLY user input is the local player's
//  seat, used as a last-resort avoidance so an NPC never spawns on top of the
//  player — no NPC ever moves because of a player.
// ─────────────────────────────────────────────────────────────────────────────

export function NpcPlayers({ roomId }: { roomId?: string }) {
  const userSeat = useWorld((s) => s.seat)
  const seats = useMemo(() => seatAnchors(), [])
  const camera = useThree((s) => s.camera)

  // Recompute the present set on a slow tick (kept as a safety re-sync; the
  // set is static now that NPCs are permanent, so this is effectively a no-op).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), REFRESH_MS)
    return () => window.clearInterval(iv)
  }, [])

  const online = useMemo(() => {
    const roomIdx = libraryRoomIndex(roomId)
    return roomIdx < 0 ? [] : npcOnlineInRoom(roomIdx, now)
  }, [roomId, now])

  const assignments = useMemo(() => {
    const userTaken = userSeat != null ? new Set([userSeat]) : new Set<number>()
    return assignNpcSeats(
      online.map((n) => n.idx),
      seats,
      userTaken,
    )
  }, [online, seats, userSeat])

  // Throttled ranking: NPCs are static, so their distance rank only changes
  // when the CAMERA moves. Every RANK_INTERVAL we keep the nearest MAX_VISIBLE
  // NPCs in full rig (everyone else is a 1-draw billboard) and mark only the
  // nearest SHADOW_LIMIT as shadow casters — a 30-NPC room drops from ~3,300
  // rig draws + a full shadow pass to a few hundred draws and 2 shadow rigs.
  const [ranked, setRanked] = useState(() => {
    const ids = online.map((n) => n.id)
    return { visible: new Set(ids), shadow: new Set(ids.slice(0, SHADOW_LIMIT)) }
  })
  const rankedRef = useRef(ranked)
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < RANK_INTERVAL) return
    acc.current = 0

    const ids = online.map((n) => n.id)
    if (ids.length <= MAX_VISIBLE) {
      const next = { visible: new Set(ids), shadow: new Set(ids.slice(0, SHADOW_LIMIT)) }
      if (!sameSet(next.visible, rankedRef.current.visible) || !sameSet(next.shadow, rankedRef.current.shadow)) {
        rankedRef.current = next
        setRanked(next)
      }
      return
    }

    _camPos.copy(camera.position)
    const scored = ids.map((id) => {
      const seat = assignments.get(online.find((n) => n.id === id)!.idx)
      const d = seat ? _camPos.distanceToSquared(_seatPos.set(seat.pos[0], seat.pos[1], seat.pos[2])) : Infinity
      return [id, d] as const
    })
    scored.sort((a, b) => a[1] - b[1])
    const visibleIds = scored.slice(0, MAX_VISIBLE).map(([id]) => id)
    const next = { visible: new Set(visibleIds), shadow: new Set(visibleIds.slice(0, SHADOW_LIMIT)) }
    if (!sameSet(next.visible, rankedRef.current.visible) || !sameSet(next.shadow, rankedRef.current.shadow)) {
      rankedRef.current = next
      setRanked(next)
    }
  })

  if (seats.length === 0) return null

  return (
    <>
      {/* NPC bakes must exist even in an empty multiplayer room — this stage
          renders whatever looks are queued (shared module-level queue with the
          remote players' stage, so nothing bakes twice). */}
      <ImpostorBakeStage />
      {online.map((npc) => {
        const seat = assignments.get(npc.idx)
        if (!seat) return null
        return (
          <NpcAvatar
            key={npc.id}
            npc={npc}
            seat={seat}
            visible={ranked.visible.has(npc.id)}
            castShadow={ranked.shadow.has(npc.id)}
          />
        )
      })}
    </>
  )
}

/** Build the exact AvatarConfig an NPC renders with (look + accessories). */
function configFor(npc: NpcProfile): AvatarConfig {
  const ch = characterById(npc.characterId)
  return { ...ch.fallback, ...npc.look, accessories: npc.accessories }
}
