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
import { getRemoteOccupied } from '../../multiplayer/net'
import { useNpcProfile } from '../../store/npcProfile'
import { useSettings } from '../../store/settings'
import { useScenePreset } from '../../store/quality'
import { CelebrateBurst } from './CelebrateBurst'
import { useImpostorTextures, ImpostorSprite } from './ImpostorSprites'
import {
  npcOnlineInRoom,
  assignNpcSeats,
  libraryRoomIndex,
  npcSession,
  npcSwapWindow,
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
// the player's own body. NPCs stay fully opaque at all distances. Billboarding
// hides the RIG (per-instance visibility) and cross-fades the baked sprite via
// its own sprite material, which is NOT shared.
const LOD_FAR  = 10
const LOD_CULL = 18

// Sprite-swap hysteresis (mirrors RemotePlayers): swap on past the impostor
// distance, swap back inside 0.75×, so a camera hovering the boundary doesn't
// make an NPC flicker between full rig and sprite.
const SWAP_BACK = 0.75

const SHADOW_LIMIT  = 2   // only the nearest N NPCs cast/receive shadows
// With up to 30 scholars, only the nearest MAX_VISIBLE are rendered at all —
// the rest hide (group.visible=false) so a packed hall costs ~10 full rigs
// plus the impostor swap for the distant survivors instead of 30. The camera
// at a desk realistically sees 4-6 scholars; the rest are behind shelves or
// beyond the far LOD anyway.
const MAX_VISIBLE   = 10
const RANK_INTERVAL = 0.5
const REFRESH_MS    = 2000 // seat-assignment refresh (swap windows are 12 min)

// How long a completed-session burst stays visible above an NPC (players use
// 4 s; scholars get a longer window so you actually notice it in a big hall).
const NPC_CELEBRATE_MS = 15_000

// NPCs are permanent, so their presence set is seeded at module load — purely
// deterministic flavor that never changes at runtime.
const MOUNT_NOW = Date.now()

/** Live seat assignments + the swap window they were computed for. Children
 *  read these refs every frame — zero React churn while the hall roams. */
interface AssignRefs {
  assign: { current: Map<number, Seat | undefined> }
  win: { current: number }
}

const _camPos = new Vector3()
const _pos = new Vector3()
const _dir = new Vector3()

// ─────────────────────────────────────────────────────────────────────────────
//  Components — NO Html fullscreen, profile card is rendered OUTSIDE Canvas
// ─────────────────────────────────────────────────────────────────────────────

function NpcTag({ npc, onInfoClick }: { npc: NpcProfile; onInfoClick: () => void }) {
  const banner = BANNERS.find((b) => b.id === npc.banner)
  const [peek, setPeek] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(iv)
  }, [])

  const sess = npcSession(npc.idx, now)
  const studying = now < sess.end
  // Live study timer: how much of the current focus session is left.
  const remainMs = Math.max(0, sess.end - now)
  const totalMs = Math.max(0, sess.end - sess.start)
  const pct = totalMs > 0 ? Math.min(1, Math.max(0, (now - sess.start) / totalMs)) : 0
  const totalSec = Math.round(remainMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const remainTxt = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`

  // Break countdown: how long until the NEXT focus session starts.
  const gapRemainMs = Math.max(0, sess.next - now)
  const gapTotalMs = Math.max(0, sess.next - sess.end)
  const gapPct = gapTotalMs > 0 ? Math.min(1, Math.max(0, gapRemainMs / gapTotalMs)) : 0
  const gapSec = Math.round(gapRemainMs / 1000)
  const gh = Math.floor(gapSec / 3600)
  const gm = Math.floor((gapSec % 3600) / 60)
  const gs = gapSec % 60
  const gapTxt = gh > 0 ? `${gh}:${String(gm).padStart(2, '0')}:${String(gs).padStart(2, '0')}` : `${gm}:${String(gs).padStart(2, '0')}`

  // Session-completion celebration — the same leaf burst players get.
  const celebrating = now >= sess.end && now < sess.end + NPC_CELEBRATE_MS

  return (
    <Html position={[0, 2.55, 0]} center distanceFactor={10} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div
        className="npc-tag-wrap"
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
      >
        {celebrating && (
          <div className="npc-celebrate">
            <CelebrateBurst label={`${npc.name.split(/\d/)[0]} finished`} minutes={npc.sessionDurationMs / 60000} />
          </div>
        )}
        <div className="npc-live">
          <div className={`ptb-wrap npc-timer ${studying ? '' : 'npc-timer-break'}`}>
            <div className="ptb-track">
              <div
                className={`ptb-fill ${studying ? '' : 'ptb-fill-break'}`}
                style={{ width: `${Math.round(studying ? pct * 100 : gapPct * 100)}%` }}
              />
            </div>
            <span className={`ptb-time ${studying ? '' : 'ptb-time-break'}`}>
              {studying ? `⏳ ${remainTxt}` : `☕ ${gapTxt}`}
            </span>
          </div>
          <span className="npc-role-chip">🎓 {npc.role}</span>
        </div>
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
              {studying
                ? `${remainTxt} left in this study session`
                : `On break — next session in ${gapTxt}`}
            </p>
            <p className="npc-peek-role">🎓 {npc.role}</p>
            <button className="npc-peek-btn" onClick={onInfoClick}>Full profile</button>
          </div>
        )}
      </div>
    </Html>
  )
}

function NpcAvatar({
  npc,
  refs,
  castShadow,
  visible,
}: { npc: NpcProfile; refs: AssignRefs; castShadow: boolean; visible: boolean }) {
  const group = useRef<Group>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const lodRef = useRef<Lod>('near')
  const shadowsOn = useRef(true)
  const showProfile = useNpcProfile((s) => s.show)
  const showNameTags = useSettings((s) => s.showNameTags)
  const distantTags = useSettings((s) => s.distantTags)
  const preset = useScenePreset()
  const impostorsOn = useSettings((s) => s.impostorSprites)
  const config: AvatarConfig = useMemo(() => configFor(npc), [npc])
  // NPCs live at their desks → only the seated pose bakes (half the queue of a
  // sit+idle pair). Walking scholars keep their full 3D body while moving.
  const sitTex = useImpostorTextures(config, 'sit')

  // Billboarding state (same protocol as RemotePlayers): swapOn gates the
  // sprite fade; bodyHidden flips only when the fade fully completes, so the
  // rig and billboard never double up and nothing pops.
  const swapOn = useRef(false)
  const bodyHidden = useRef(false)
  const bodyGroup = useRef<Group>(null)

  // The chair this scholar is sitting at / walking toward right now.
  const targetSeat = useRef<Seat | null>(null)
  // In-flight walk: from → to over `dur` seconds.
  const walk = useRef<{ from: Vector3; to: Vector3; dur: number; t: number } | null>(null)
  // The last seat-assignment window this scholar reacted to.
  const walkedWindow = useRef(0)
  // True once the mount-time seat adoption ran.
  const inited = useRef(false)
  // Smoothed heading so the walk starts/ends with a natural turn.
  const yawCur = useRef(0)

  // Distance-gated tag hysteresis (only meaningful when distant tags are off).
  const [tagShown, setTagShown] = useState(showNameTags)
  const tagShownRef = useRef(showNameTags)
  const tagOnRef = useRef(true)

  useFrame(({ clock, camera }, dtRaw) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(dtRaw, 0.05)

    const asg = refs.assign.current.get(npc.idx)

    // ---- Mount adoption: the parent's assignment map may populate AFTER this
    // component's first frame, so a missing seat just means "not ready yet".
    // Once an assignment exists, adopt it silently — never walk from the spawn
    // point, never react to a window that was already current on mount.
    if (!inited.current) {
      if (!asg) return
      inited.current = true
      targetSeat.current = asg
      walkedWindow.current = refs.win.current
    }

    // ---- Desk rotation: when the assignment window advances, walk to the
    // new chair. The parent refreshes `assign` every REFRESH_MS and bumps
    // `win` at the same moment, so a walk only ever starts on a fresh map.
    if (asg && refs.win.current !== walkedWindow.current) {
      walkedWindow.current = refs.win.current
      const cur = targetSeat.current
      if (!cur || cur.id !== asg.id) {
        const from = new Vector3(g.position.x, g.position.y, g.position.z)
        const to = new Vector3(asg.pos[0], asg.pos[1], asg.pos[2])
        const d = from.distanceTo(to)
        walk.current = { from, to, dur: Math.max(0.8, d / npc.walkSpeed), t: 0 }
      } else {
        targetSeat.current = asg
      }
    }

    const wl = walk.current
    if (wl) {
      // ---- Walking between desks ---------------------------------------
      wl.t += dt
      const k = Math.min(1, wl.t / wl.dur)
      // ease out slightly so the arrival doesn't snap
      const e = 1 - Math.pow(1 - k, 1.6)
      _pos.lerpVectors(wl.from, wl.to, e)
      g.position.copy(_pos)
      _dir.subVectors(wl.to, wl.from)
      if (_dir.lengthSq() > 1e-6) {
        yawCur.current = Math.atan2(-_dir.x, -_dir.z)
      }
      g.rotation.y = yawCur.current

      loco.current.seated = false
      loco.current.speed = npc.walkSpeed
      loco.current.activity = undefined

      if (k >= 1) {
        walk.current = null
        targetSeat.current = asg ?? null
      }
    } else if (targetSeat.current) {
      // ---- Seated at the desk ------------------------------------------
      const seat = targetSeat.current
      g.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
      // ease the heading around to the desk (with the personal sway)
      const targetYaw = seat.yaw + Math.PI + Math.sin(clock.elapsedTime * 0.22 + npc.idx) * 0.05
      const dYaw = Math.atan2(Math.sin(targetYaw - yawCur.current), Math.cos(targetYaw - yawCur.current))
      yawCur.current += dYaw * (1 - Math.exp(-dt * 8))
      g.rotation.y = yawCur.current
      loco.current.seated = true
      loco.current.speed = 0
      // Per-scholar seated activity from their accessory: laptop → typing hands
      // on the machine, phone → bent over it, book → held up, book stack / none
      // → sitting idly. Same pose language as real players.
      loco.current.activity = activityOfAccessories(npc.accessories)
      g.scale.y = 1 + Math.sin(clock.elapsedTime * 0.8 + npc.totalXp) * 0.003
    }

    const dist = camera.position.distanceTo(g.position)

    // ---- Distance LOD (body rig only) -------------------------------------
    // Up close the NPC is its full 3D rig. Past LOD_CULL the rig freezes (and,
    // once the impostor setting is on, fades into a parked baked billboard so
    // far desks cost 1 draw per scholar instead of ~90 meshes).
    lodRef.current = dist < LOD_FAR ? 'near' : dist < LOD_CULL ? 'far' : 'cull'

    // ---- Billboarding (sprite swap) ----------------------------------------
    // Same hysteresis protocol as RemotePlayers. NPCs swap only while SITTING
    // (walking scholars between desks keep their full body — the sit bake would
    // look wrong mid-stride, and walks are rare/short). The sprite fades in
    // over ~0.2 s; the rig is hidden only when the fade completes (onActive).
    const swapBase = LOD_CULL * preset.impostorSwap
    if (impostorsOn && !walk.current) {
      if (swapOn.current) {
        if (dist < swapBase * SWAP_BACK) swapOn.current = false
      } else if (dist > swapBase) {
        swapOn.current = true
      }
    } else {
      swapOn.current = false
    }

    // ---- Shadow LOD ---------------------------------------------------------
    // Shadows are the dominant shadow-pass cost, so only the nearest
    // SHADOW_LIMIT NPCs (AND near bodies) cast/receive. Toggle the whole body
    // in one traversal, only when the desired state actually flips.
    const wantShadow = castShadow && lodRef.current === 'near'
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
      role: npc.role,
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
    <group ref={group} visible={visible}>
      <group ref={bodyGroup}>
        <CharacterAvatar config={config} locomotion={loco} lod={lodRef} />
      </group>
      <ImpostorSprite
        entries={sitTex}
        onRef={swapOn}
        facing={yawCur}
        onActive={(shown) => {
          if (shown !== bodyHidden.current && bodyGroup.current) {
            bodyHidden.current = shown
            bodyGroup.current.visible = !shown
          }
        }}
      />
      {tagShown && <NpcTag npc={npc} onInfoClick={handleInfoClick} />}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export — live room occupancy from npcSystem
//
//  NPCs are completely independent and permanent: every scholar is present in
//  the room around the clock, but they are NOT static fixtures — each one gets
//  up and walks to a fresh desk every swap window (NPC_SWAP_PERIOD_MS), with a
//  personal phase so the hall is always in gentle motion. They sit, study
//  (live timer above their head), and celebrate a finished session with the
//  same leaf burst real players get. The ONLY user input is the local player's
//  seat, used as a last-resort avoidance so an NPC never spawns on top of the
//  player — no NPC ever moves because of a player.
// ─────────────────────────────────────────────────────────────────────────────

export function NpcPlayers({ roomId }: { roomId?: string }) {
  const seats = useMemo(() => seatAnchors(), [])
  const camera = useThree((s) => s.camera)

  // NPCs are permanent (always online), so the room cast is computed once at
  // mount — Date.now() only seeds the deterministic set, it can't go stale.
  const online = useMemo(() => {
    const roomIdx = libraryRoomIndex(roomId)
    return roomIdx < 0 ? [] : npcOnlineInRoom(roomIdx, MOUNT_NOW)
  }, [roomId])

  // Live assignment map + the swap window it was computed for. Children read
  // these per frame without triggering renders.
  const assignRef = useRef(new Map<number, Seat | undefined>())
  const winRef = useRef(0)
  const refs = useMemo<AssignRefs>(() => ({ assign: assignRef, win: winRef }), [])

  // Remote players' occupied seats (polled — `targets` is deliberately not
  // reactive). NPCs must never claim a seat a REAL player is sitting in, or the
  // NPC would render on top of them.
  useEffect(() => {
    const sync = () => {
      const remote = Object.keys(getRemoteOccupied()).map(Number)
      const userTaken = new Set<number>(remote)
      const mySeat = useWorld.getState().seat
      if (mySeat != null) userTaken.add(mySeat)
      assignRef.current = assignNpcSeats(
        online.map((n) => n.idx),
        seats,
        userTaken,
      )
      winRef.current = npcSwapWindow(Date.now())
    }
    sync()
    const iv = window.setInterval(sync, REFRESH_MS)
    return () => window.clearInterval(iv)
  }, [online, seats])

  // Throttled ranking: NPCs only move on their own swap schedule, so their
  // distance rank mostly changes when the CAMERA moves. Every RANK_INTERVAL the
  // nearest SHADOW_LIMIT NPCs are marked as shadow casters, and the nearest
  // MAX_VISIBLE NPCs are marked visible (the rest hide entirely — they are
  // behind shelves / beyond the far LOD at normal desk distances anyway).
  // Two hysteresis buffers keep the camera from flickering a scholar in/out
  // while straddling a boundary (visible until rank > MAX_VISIBLE+2, hidden
  // only once rank <= MAX_VISIBLE again).
  const [shadowIds, setShadowIds] = useState(() => new Set(online.map((n) => n.id).slice(0, SHADOW_LIMIT)))
  const shadowRef = useRef(shadowIds)
  const [visibleIds, setVisibleIds] = useState(() => new Set(online.map((n) => n.id).slice(0, MAX_VISIBLE)))
  const visibleRef = useRef(visibleIds)
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < RANK_INTERVAL) return
    acc.current = 0

    const ids = online.map((n) => n.id)
    _camPos.copy(camera.position)
    const scored = ids.map((id) => {
      const seat = assignRef.current.get(online.find((n) => n.id === id)!.idx)
      const d = seat ? _camPos.distanceToSquared(_pos.set(seat.pos[0], seat.pos[1], seat.pos[2])) : Infinity
      return [id, d] as const
    })
    scored.sort((a, b) => a[1] - b[1])

    // Shadow casters: strictly nearest SHADOW_LIMIT.
    const next = new Set(scored.slice(0, SHADOW_LIMIT).map(([id]) => id))
    if (!sameSet(next, shadowRef.current)) {
      shadowRef.current = next
      setShadowIds(next)
    }

    // Visible set: nearest MAX_VISIBLE, with a +2 rank hysteresis buffer so a
    // scholar at the boundary never pops in/out as the camera drifts.
    const current = visibleRef.current
    let anyChange = false
    const nextVis = new Set<string>()
    scored.forEach(([id, _d], i) => {
      const was = current.has(id)
      const stays = was ? i < MAX_VISIBLE + 2 : i < MAX_VISIBLE
      if (stays) nextVis.add(id)
      if (was !== stays) anyChange = true
    })
    if (anyChange || nextVis.size !== current.size) {
      visibleRef.current = nextVis
      setVisibleIds(nextVis)
    }
  })

  if (seats.length === 0) return null

  return (
    <>
      {online.map((npc) => (
        <NpcAvatar
          key={npc.id}
          npc={npc}
          refs={refs}
          castShadow={shadowIds.has(npc.id)}
          visible={visibleIds.has(npc.id)}
        />
      ))}
    </>
  )
}

/** True when both sets hold exactly the same ids. */
function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}

/** Build the exact AvatarConfig an NPC renders with (look + accessories). */
function configFor(npc: NpcProfile): AvatarConfig {
  const ch = characterById(npc.characterId)
  return { ...ch.fallback, ...npc.look, accessories: npc.accessories }
}