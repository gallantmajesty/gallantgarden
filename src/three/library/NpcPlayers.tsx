import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Object3D } from 'three'
import { Html } from '@react-three/drei'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { PlayerNameTag } from '../../components/PlayerNameTag'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import type { Lod } from '../../avatar/AvatarAnimator'
import { seatAnchors, type Seat } from './furniture'
import { BANNERS } from '../../lib/banners'
import { characterById } from '../../avatar/characters'
import { useWorld } from '../../store/world'
import { useNpcProfile } from '../../store/npcProfile'
import { useSettings } from '../../store/settings'
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
const TAG_ON  = 18
const TAG_OFF = 22

// Distance LOD tiers (same as RemotePlayers, minus the impostor swap):
//   < LOD_FAR  → 'near'  full bone updates every frame + casts a shadow
//   < LOD_CULL → 'far'   update every 3rd frame, NO shadow
//   >= LOD_CULL → 'cull' no animation updates — body frozen, no shadow
// NPCs always render their full 3D rig at any distance (no sprite pop-in),
// just progressively cheaper as the player moves away.
const LOD_FAR  = 12
const LOD_CULL = 28

// How often the "present NPC" set is recomputed. NPCs are permanent now
// (NPC_ALWAYS_ONLINE), so this is only a cheap safety re-sync — nothing
// appears or disappears on its own anymore.
const REFRESH_MS = 30_000

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

function NpcAvatar({ npc, seat }: { npc: NpcProfile; seat: Seat }) {
  const group = useRef<Group>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const lodRef = useRef<Lod>('near')
  const shadowsOn = useRef(true)
  const showProfile = useNpcProfile((s) => s.show)
  const showNameTags = useSettings((s) => s.showNameTags)
  const distantTags = useSettings((s) => s.distantTags)

  const config: AvatarConfig = useMemo(() => {
    const ch = characterById(npc.characterId)
    return { ...ch.fallback, accessories: npc.accessories }
  }, [npc.characterId, npc.accessories])

  // Distance-gated tag hysteresis (only meaningful when distant tags are off).
  const [tagShown, setTagShown] = useState(showNameTags)
  const tagShownRef = useRef(showNameTags)
  const tagOnRef = useRef(true)

  useFrame(({ clock, camera }) => {
    const g = group.current
    if (!g) return
    g.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
    g.rotation.y = seat.yaw + Math.PI
    loco.current.seated = true
    loco.current.speed = 0
    g.scale.y = 1 + Math.sin(clock.elapsedTime * 0.8 + npc.totalXp) * 0.003

    const dist = camera.position.distanceTo(g.position)

    // ---- Distance LOD (no impostor swap — the rig always renders) ----
    const wantLod: Lod = dist < LOD_FAR ? 'near' : dist < LOD_CULL ? 'far' : 'cull'
    if (lodRef.current !== wantLod) lodRef.current = wantLod
    // Shadow LOD: only near bodies cast/receive shadows (the dominant
    // shadow-pass cost, same policy as RemotePlayers).
    const wantShadow = wantLod === 'near'
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
    })
  }, [npc, showProfile])

  return (
    <group ref={group}>
      <CharacterAvatar config={config} locomotion={loco} lod={lodRef} />
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

  if (seats.length === 0) return null

  return (
    <>
      {online.map((npc) => {
        const seat = assignments.get(npc.idx)
        if (!seat) return null
        return <NpcAvatar key={npc.id} npc={npc} seat={seat} />
      })}
    </>
  )
}
