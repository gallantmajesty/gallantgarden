import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LibraryScene } from '../three/library/LibraryScene'
import { TrainStationScene } from '../three/train/TrainStationScene'
import { useAudio } from '../audio/useAudio'
import { joystick, isTypingFocused } from '../three/library/input'
import { RealmFullscreenGate } from '../components/mobile/RealmFullscreenGate'
import {
  useSettings,
  MIN_BRIGHTNESS,
  MAX_BRIGHTNESS,
  type CameraMode,
  type Quality,
  type ShadowQuality,
  type PostQuality,
  type TextureQuality,
  type QualityPresetName,
} from '../store/settings'
import { useHud } from '../store/hud'
import { Section, Toggle, Slider, Stepper, Seg, FocusLength } from '../components/settings/controls'
import { usePomodoro, SESSION_OPTIONS, computeSegments, suggestBreakActivity } from '../store/pomodoro'
import type { TimerType } from '../store/pomodoro'
import { getRemoteOccupied, setLocalTimer } from '../multiplayer/net'
import { useWorld } from '../store/world'
import { useDesk } from '../store/desk'
import { useMagnet } from '../store/magnet'
import { useRealm, type ActiveRealm } from '../store/realm'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useAvatar } from '../avatar/store'
import { trainStationEnabled, ukCafeEnabled } from '../lib/realm'
import { useRealmNet, joinRealm, leaveRealm, updateIdentity, networkId } from '../multiplayer/net'
import { assignInstance, startHeartbeat, leavePresence, REALM_CAPACITY } from '../lib/realmPresence'
import { PublicPlayerTag, type PublicPlayer } from '../components/PublicPlayerTag'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { RankBadge } from '../components/RankBadge'
import { getRank } from '../lib/ranks'
import { AddFriendButton } from '../components/AddFriendButton'
import { Icon } from '../components/magnet/Icon'
import { LibraryFriendsPanel } from '../components/library/LibraryFriendsPanel'
import { LibraryCalc } from '../calc/ui/LibraryCalc'
import { MusicPlayer } from '../components/library/MusicPlayer'
import { TrainHUD } from '../components/train/TrainHUD'
import { FocusDomain } from '../components/FocusDomain'
import { CinematicEntry } from '../components/library/CinematicEntry'
import { FlagshipUnavailable } from '../components/FlagshipUnavailable'
import { SeatSelectionOverlay } from '../components/library/SeatSelectionOverlay'
import { NpcProfileCard } from '../components/NpcProfileCard'
import { useNpcProfile } from '../store/npcProfile'
import { useSeatFlow } from '../store/seatFlow'
import './Explore.css'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export interface ExploreProps {
  defaultWorld?: 'library' | 'train-station' | 'uk-cafe'
}

export function Explore({ defaultWorld }: ExploreProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Read world from URL query parameter, or fall back to defaultWorld prop
  const searchParams = new URLSearchParams(location.search)
  const worldFromUrl = (searchParams.get('world') as 'library' | 'train-station' | 'uk-cafe') || defaultWorld

  const realm = useRealm((s) => s.active)
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [fpOpen, setFpOpen] = useState(false)
  const fps = useSettings((s) => s.fps)
  const brightness = useSettings((s) => s.brightness)
  const set = useSettings((s) => s.set)
  const hidden = useHud((s) => s.widgetsHidden)
  const perfMode = useHud((s) => s.perfMode)
  useAudio()
  useExploreShortcuts()

  // Determine which world to render: use worldFromUrl if available, otherwise use defaultWorld prop, otherwise use realm.world
  const isTrain = worldFromUrl === 'train-station' || defaultWorld === 'train-station' || realm?.world === 'train-station'
  const isUkCafe = worldFromUrl === 'uk-cafe' || defaultWorld === 'uk-cafe' || realm?.world === 'uk-cafe'

  // Auto-collapse the desk whenever the player sits down, so the seated avatar (and
  // its sitting animation) stays visible behind a small header rather than the full
  // Study Station panel. The player taps the header to expand the desk when studying.
  const seat = useWorld((s) => s.seat)
  const cinematic = useWorld((s) => s.cinematic)
  const cineFade = useWorld((s) => s.cineFade)
  const seatFlowStage = useSeatFlow((s) => s.stage)
  const wasSeated = useRef(false)
  useEffect(() => {
    if (seat != null && !wasSeated.current) useDesk.getState().setView('collapsed')
    wasSeated.current = seat != null
  }, [seat])

  // Restore saved seat on tab return (30s expiry). If no saved seat, auto-sit
  // into seat 0, then reload so the 3D rendering boots fresh (workaround for
  // R3F context init race when conditional scene content mounts mid-init).
  useEffect(() => {
    if (isTrain) return
    const flowSeat = useSeatFlow.getState().selectedSeatId
    const worldSeat = useWorld.getState().seat
    if (flowSeat != null && worldSeat == null) {
      useWorld.getState().sit(flowSeat)
      useSeatFlow.getState().arrive()
      // Refresh once per tab session so the 3D scene boots fresh
      if (!sessionStorage.getItem('sf.seatBooted')) {
        sessionStorage.setItem('sf.seatBooted', '1')
        window.location.reload()
      }
    } else if (worldSeat == null && useSeatFlow.getState().stage === 'selecting') {
      useSeatFlow.getState().pickSeat(0)
      useWorld.getState().sit(0)
      useSeatFlow.getState().arrive()
      sessionStorage.setItem('sf.seatBooted', '1')
      window.location.reload()
    }
  }, [isTrain])

  // Keep the display awake while the Cinematic Tour runs, so it plays like a
  // video and the monitor/screen doesn't sleep ("pc get off"). Released on exit
  // or when the tab is hidden, and re-acquired whenever we return to the tab.
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => void }> } }
    if (!cinematic || !nav.wakeLock) return
    let lock: { release: () => void } | null = null
    const request = async () => {
      try { lock = await nav.wakeLock.request('screen') } catch { /* denied / unsupported */ }
    }
    request()
    const onVis = () => { if (document.visibilityState === 'visible') request() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release()
    }
  }, [cinematic])

  // Fallback: if the scene never signals ready (WebGL init failure, asset load
  // error, etc.), force the veil away after 8 seconds so the user isn't stuck on
  // a permanent dark screen. The HUD and seat overlay will still work.
  useEffect(() => {
    if (ready) return
    const t = window.setTimeout(() => {
      console.warn('[Explore] scene did not signal ready within 8 s — removing veil')
      setReady(true)
    }, 8000)
    return () => window.clearTimeout(t)
  }, [ready])

  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 8000)
    return () => window.clearTimeout(t)
  }, [])

  // Sync remote seat occupancy into the local seat picker every 2 seconds.
  // This keeps the "Occupied" / "Free" labels accurate across all clients.

  // Seat persistence on tab leave: reserve the seat for 30 seconds when hidden.
  // On return, check if the seat is still free — if taken, force re-selection.
  useEffect(() => {
    const onVis = () => {
      if (!isTrain && seat != null) {
        if (document.visibilityState === 'hidden') {
          // Tab leaving — reserve seat for 30 seconds
          useSeatFlow.getState().reserveSeat()
        } else if (document.visibilityState === 'visible') {
          // Tab returning — check if seat is still available
          const mySeat = useWorld.getState().seat
          if (mySeat != null) {
            const occupied = useSeatFlow.getState().occupied
            if (occupied[mySeat]) {
              // Someone else took the seat — force re-selection
              useWorld.getState().stand()
              useSeatFlow.getState().unlock()
            }
          }
        }
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [isTrain, seat])
  useEffect(() => {
    const sync = () => {
      const occupied = getRemoteOccupied()
      useSeatFlow.getState().setOccupied(occupied)
    }
    sync()
    const id = window.setInterval(sync, 2000)
    return () => window.clearInterval(id)
  }, [])

  // Sync local pomodoro timer state into multiplayer so other players can see
  // your live study progress as a small bar above your head.
  useEffect(() => {
    const unsub = usePomodoro.subscribe((s) => {
      if (s.phase === 'running' && s.startedAt) {
        setLocalTimer(s.startedAt, s.sessionMinutes * 60 * 1000)
      } else {
        setLocalTimer(0, 0)
      }
    })
    // Set initial state
    const s = usePomodoro.getState()
    if (s.phase === 'running' && s.startedAt) {
      setLocalTimer(s.startedAt, s.sessionMinutes * 60 * 1000)
    }
    return unsub
  }, [])

  // Enter a realm in Third-person so the player always sees their own character —
  // never spawn body-less in First-person. (They can switch to First afterward.)
  useEffect(() => {
    if (useSettings.getState().cameraMode === 'first') set('cameraMode', 'third')
  }, [set])

  // DPR is fixed at mount time — no live step-up to avoid GPU stalls / context loss.

  // Experimental-realm route guard. If someone reaches a flagship route while it
  // is hidden (public build, no dev access) — e.g. a stale link or a manual
  // navigation — show an under-development screen instead of the scene. The scene
  // and all its code stay intact; it simply isn't rendered until re-enabled.
  // Placed after every hook above so the rules of hooks are never broken.
  if (isTrain && !trainStationEnabled()) {
    return <FlagshipUnavailable name="Train Station Realm" />
  }
  if (isUkCafe && !ukCafeEnabled()) {
    return <FlagshipUnavailable name="UK Cafe Realm" />
  }

  return (
    <div className="explore-root">
      {/* Realm fullscreen enforcement — mobile/tablet only. Desktop is untouched. */}
      <RealmFullscreenGate />
      {isTrain ? (
        <TrainStationScene onReady={() => setReady(true)} />
      ) : isUkCafe ? (
        <LibraryScene onReady={() => setReady(true)} />
      ) : (
        <LibraryScene
          onReady={() => setReady(true)}
        />
      )}
      <PomodoroTicker />
      {!cinematic && <RealmConnection />}

      {/* Cinematic fade-to-black overlay — driven by PlayerController's state
          machine via useWorld.cineFade (0 = transparent, 1 = fully black). */}
      <div className="cine-fade" style={{ opacity: cineFade }} />

      {!ready && <div className="explore-veil" />}

      {/* Library seat-selection overlay — shown before the player commits to a seat.
          Once a seat is chosen we fall through to the normal in-world HUD. */}
{!isTrain && seatFlowStage === 'selecting' && <SeatSelectionOverlay />}

      {/* Cinematic entrance — "Entering the Great Hall..." title card + fade */}
      {!isTrain && <CinematicEntry />}

      {/* Cinematic Tour (key 9) runs full-screen with no letterbox bars, so the
          web viewport keeps its full height/width while the camera glides. */}

      {/* Every widget lives behind this gate. Tab / Performance Mode hides the
          whole HUD; while the Cinematic Tour (key 9) runs we ALSO hide everything
          except the timer, so the glide is an unbroken full-screen "video". */}
      {!hidden && !cinematic && (
        <>
          {/* top-left: clean realm identity + fps */}
          <div className="explore-topleft">
            <button className="explore-back" onClick={() => navigate('/lobby/realm/choose')} title="Back to realms">
              ‹ Realms
            </button>
            <span className="sf-pill">{realm ? realm.name : 'Realm'}</span>
            {realm?.kind === 'global' && <span className="sf-pill realm-kind">Global</span>}
            {realm?.kind === 'custom' && <span className="sf-pill realm-kind">Private</span>}
            {fps && <FpsMeter />}
          </div>

          {/* top-center: pomodoro */}
          <PomodoroChip onFullscreen={() => { useHud.getState().setPerfMode(true); setFpOpen(true) }} />

          {/* top-right: compact bar — brightness · menu. (Audio volume now lives
              in the Library Realm music widget, bottom-right.) */}
          <div className="explore-topbar">
            <button
              className={`explore-iconbtn ${calcOpen ? 'on' : ''}`}
              onClick={() => setCalcOpen((v) => !v)}
              title={calcOpen ? 'Close calculator' : 'Calculator'}
            >
              <CalcGlyph />
            </button>
            <span className="explore-bar-sep" />
            <SunGlyph />
            <input
              className="explore-mini"
              type="range"
              min={MIN_BRIGHTNESS}
              max={MAX_BRIGHTNESS}
              step={0.02}
              value={brightness}
              onChange={(e) => set('brightness', Number(e.target.value))}
              aria-label="Brightness"
              title="Brightness"
            />
            <button
              className={`explore-iconbtn gear ${settingsOpen ? 'on' : ''}`}
              onClick={() => setSettingsOpen((v) => !v)}
              title="Settings"
            >
              <GearGlyph />
            </button>
          </div>

          <RoomRoster />

          <CameraSwitch />

          <SeatPrompt />
          <SeatedPanel onToggleCalc={() => setCalcOpen((v) => !v)} calcOpen={calcOpen} />

          {/* Train Station realm HUD — the boarding card, live journey dock and
              arrival/reward screen. It's the realm's primary interface, so it's
              mounted only in the train world. The journey engine itself lives in
              the store + scene runtime, so this is purely its view. */}
          {isTrain && <TrainHUD />}

          {/* collapsible friends chat — hidden behind an edge tab, never covers work */}
          <LibraryFriendsPanel />

          {/* Library Realm music widget moved outside HUD gate (line 289) so its
              singleton engine keeps playing when HUD is hidden. */}

          {/* in-library calculator — a mini Basic calc docked lower-right, with a
              ⋮ menu that swaps in any other calculator (which opens quarter-screen) */}
          {calcOpen && <LibraryCalc onClose={() => setCalcOpen(false)} />}

          {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

          {isTouch && (
            <>
              <Joystick />
              <button
                className="explore-jump"
                onPointerDown={() => (joystick.jump = true)}
                onPointerUp={() => (joystick.jump = false)}
                onPointerCancel={() => (joystick.jump = false)}
              >
                Jump
              </button>
            </>
          )}
        </>
      )}

      {/* The escape-hatch chip — the ONLY thing visible while widgets are hidden,
          so there's always a way back. */}
      {hidden && (
        <button
          className={`explore-restore ${perfMode ? 'perf' : ''}`}
          onClick={() => useHud.getState().setWidgetsHidden(false)}
          title={perfMode ? 'Exit Performance Mode (Ctrl+F)' : 'Show UI (Tab)'}
        >
          {perfMode ? '⚡ Performance Mode · Ctrl+F to exit' : 'Tab to show UI'}
        </button>
      )}

      {/* Bottom-right manual controls: keys 1-8 = seated camera presets,
          9 = Cinematic Tour. Hidden while the tour runs (it's a hands-off
          full-screen "video" — exit with key 9); during the tour only the
          timer stays visible. */}
      {location.pathname === '/realm/explore' && !isTrain && !cinematic && seatFlowStage !== 'selecting' && <MusicPlayer />}
      <FocusDomain isOpen={fpOpen} onClose={() => { setFpOpen(false); useHud.getState().setPerfMode(false) }} />
      <NpcProfileOverlay />
    </div>
  )
}

/* --------------------------------------------------------- global shortcuts */

/**
 * Explore-only keyboard shortcuts that operate at the DOM level (fullscreen +
 * widget visibility), separate from the in-canvas movement keys in
 * PlayerController:
 *   Tab     — hide / show all widgets
 *   Ctrl+F  — toggle Performance Mode (fullscreen + perf quality + hidden UI)
 *   Esc     — leave Performance Mode / restore widgets
 *   F11     — native fullscreen (left to the browser)
 * The transient HUD state is force-reset on unmount so it never leaks to other
 * screens.
 */
function useExploreShortcuts() {
  useEffect(() => {
    const hud = useHud.getState
    const enterPerf = () => {
      hud().setPerfMode(true)
      hud().setWidgetsHidden(true)
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {})
    }
    const exitPerf = () => {
      hud().setPerfMode(false)
      hud().setWidgetsHidden(false)
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
    }

    const onKey = (e: KeyboardEvent) => {
      // Cinematic Tour (key 9) — handled here at the DOM level so it works
      // regardless of whether the 3D scene/PlayerController is mounted, and never
      // collides with the seated "any key exits cinematic" rule below.
      if (e.key === '9') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        e.preventDefault()
        useWorld.getState().setCinematic(!useWorld.getState().cinematic)
        return
      }
      // Ctrl/Cmd+F → toggle Performance Mode (suppress the browser find bar)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
        e.preventDefault()
        if (hud().perfMode) exitPerf()
        else enterPerf()
        return
      }
      // Tab → hide/show widgets (but let it tab between fields while typing)
      if (e.code === 'Tab' && !isTypingFocused()) {
        e.preventDefault()
        hud().toggleWidgets()
        return
      }
      if (e.code === 'Escape') {
        if (hud().perfMode) exitPerf()
        else if (hud().widgetsHidden) hud().setWidgetsHidden(false)
      }
    }
    // Exiting fullscreen by any means (Esc, F11) drops Performance Mode too.
    const onFsChange = () => {
      if (!document.fullscreenElement && hud().perfMode) {
        hud().setPerfMode(false)
        hud().setWidgetsHidden(false)
      }
    }

    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFsChange)
      hud().setPerfMode(false)
      hud().setWidgetsHidden(false)
    }
  }, [])
}

/* ----------------------------------------------------- realm multiplayer */

/** The logical realm key WITHOUT the instance suffix — the unit capacity and
 *  occupancy are tracked per. Everyone choosing the same realm shares this key;
 *  auto-instancing then splits a busy key across `#1`, `#2`, … channels. */
function roomKeyOf(a: ActiveRealm): string {
  if (a.kind === 'custom') return `custom:${a.roomId ?? a.name}`
  if (a.roomId) return `lib:${a.roomId}`
  return `flag:${a.world}`
}

/** One realtime channel per realm INSTANCE. Everyone the server assigned to the
 *  same instance of the same realm computes the same channel and meets here. */
function realmChannel(a: ActiveRealm, instance: number): string {
  return `realm:${roomKeyOf(a)}#${instance}`
}

/**
 * Non-visual connector: assigns us to an available instance of the realm (real
 * capacity + auto-instancing), joins that instance's realtime channel, broadcasts
 * our identity + avatar, and keeps a presence heartbeat so occupancy stays live.
 * Identity changes (avatar cosmetics, name, country, rank) are pushed live so
 * others re-skin us without a rejoin. Mounted at the top of Explore so the
 * connection survives Tab-hiding the HUD.
 */
function RealmConnection() {
  const active = useRealm((s) => s.active)
  const { user } = useAuth()
  const playerId = useProfile((s) => s.playerId)
  const displayName = useProfile((s) => s.displayName)
  const country = useProfile((s) => s.data.country)
  const rank = useProfile((s) => s.data.rank)
  const avatar = useAvatar((s) => s.config)
  const banner = useProfile((s) => s.pub.banner)
  const logo = useProfile((s) => s.pub.logo)

  const roomKey = active ? roomKeyOf(active) : null
  const id = networkId(user?.id)
  const name = displayName || user?.profile?.name || 'Explorer'

  // Clear seat + stand up when switching rooms so users in different rooms
  // don't share seat state. The multiplayer channel already isolates rosters,
  // but the local seat persists across room changes without this.
  const prevRoomRef = useRef(roomKey)
  useEffect(() => {
    if (prevRoomRef.current !== roomKey && roomKey != null) {
      useWorld.getState().stand()
    }
    prevRoomRef.current = roomKey
  }, [roomKey])

  // assign an instance → join its channel → heartbeat; leave + drop presence on exit
  useEffect(() => {
    if (!active || !roomKey) return
    let cancelled = false
    let stopHeartbeat: (() => void) | null = null

    void (async () => {
      const instance = await assignInstance(roomKey, REALM_CAPACITY)
      if (cancelled) {
        void leavePresence() // we were unmounted mid-assign; release the claimed slot
        return
      }
      const channel = realmChannel(active, instance)
      await joinRealm(channel, { id, name, country: country ?? null, rank: rank || '', avatar, banner, logo })
      if (cancelled) {
        void leaveRealm()
        void leavePresence()
        return
      }
      stopHeartbeat = startHeartbeat(roomKey, instance)
    })()

    return () => {
      cancelled = true
      stopHeartbeat?.()
      void leaveRealm()
      void leavePresence()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomKey, id])

  // push identity/cosmetic changes live while in-realm
  useEffect(() => {
    if (!roomKey) return
    updateIdentity({ id, name, country: country ?? null, rank: rank || '', avatar })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar, name, country, rank])

  return null
}

/* ----------------------------------------------------------------- roster */

/**
 * "In this room" — the LIVE roster. Real presence only: the signed-in user plus
 * every other player actually connected to this realm's channel (no fabricated
 * counts, no sample avatars). The count is the real number present — 1 when you
 * are alone. Every entry renders ONLY the public fields via PublicPlayerTag.
 */
function RoomRoster() {
  const { user } = useAuth()
  const country = useProfile((s) => s.data.country)
  const rank = useProfile((s) => s.data.rank)
  const playerId = useProfile((s) => s.playerId)
  const displayName = useProfile((s) => s.displayName)
  const realm = useRealm((s) => s.active)
  const roster = useRealmNet((s) => s.roster)
  const [open, setOpen] = useState(true)
  const [profileTarget, setProfileTarget] = useState<{ name: string; playerId: string; country: string | null; rank: string } | null>(null)

  if (!realm) return null

  const self: PublicPlayer = {
    name: displayName || user?.profile?.name || 'You',
    playerId,
    country,
    rank,
  }
  const rosterEntries = Object.entries(roster)
  const total = rosterEntries.length + 1

  return (
    <div className={`room-roster ${open ? 'open' : ''}`}>
      <button className="room-roster-head" onClick={() => setOpen((v) => !v)}>
        <span className="room-roster-dot" />
        In this room <strong>{total}</strong>
        <span className="room-roster-chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="room-roster-list">
          <div className="room-roster-card me">
            <div className="roster-card-banner" />
            <div className="roster-card-content">
              <div className="roster-card-avatar">
                <ProfileAvatar name={self.name} avatarUrl={null} rankId={self.rank} size={36} />
              </div>
              <div className="roster-card-info">
                <span className="roster-card-name">{self.name}</span>
                <span className="roster-card-you">You</span>
              </div>
              <RankBadge rankId={self.rank} size={20} className="roster-card-rank" />
            </div>
          </div>
          {rosterEntries.map(([id, entry]) => (
            <div
              key={id}
              className="room-roster-card clickable"
              onClick={() => setProfileTarget({ name: entry.name, playerId: id, country: entry.country, rank: entry.rank })}
            >
              <div className="roster-card-banner" style={{ '--rank-color': getRank(entry.rank).accent } as React.CSSProperties} />
              <div className="roster-card-content">
                <div className="roster-card-avatar">
                  <ProfileAvatar name={entry.name} avatarUrl={null} rankId={entry.rank} size={36} />
                </div>
                <div className="roster-card-info">
                  <span className="roster-card-name">{entry.name}</span>
                </div>
                <RankBadge rankId={entry.rank} size={20} className="roster-card-rank" />
              </div>
            </div>
          ))}
          {rosterEntries.length === 0 && (
            <p className="room-roster-empty">
              <span>Others studying in this realm will appear here live.</span>
            </p>
          )}
        </div>
      )}
      {profileTarget && (
        <div className="roster-profile-overlay" onClick={() => setProfileTarget(null)}>
          <div className="roster-profile-card" onClick={(e) => e.stopPropagation()}>
            <button className="roster-profile-close" onClick={() => setProfileTarget(null)}>×</button>
            <PublicPlayerTag player={{ name: profileTarget.name, country: profileTarget.country, rank: profileTarget.rank }} size="md" />
            <div className="roster-profile-actions">
              <AddFriendButton targetId={profileTarget.playerId} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- camera view */

/**
 * Minecraft-style camera switch (First · Third), always visible — including
 * while seated — so the player can freely change view without hunting for hotkeys.
 * Mirrors F1/F2 and the F5 cycle handled in PlayerController. Sitting stays in
 * third-person by default; First gives the seat-eye view (see PlayerController).
 */
const CAM_MODES: { id: CameraMode; label: string }[] = [
  { id: 'first', label: 'First' },
  { id: 'third', label: 'Third' },
]

function CameraSwitch() {
  const mode = useSettings((s) => s.cameraMode)
  const set = useSettings((s) => s.set)
  const cinematic = useWorld((s) => s.cinematic)
  const setCine = useWorld((s) => s.setCinematic)
  return (
    <div className="explore-cam">
      {CAM_MODES.map((m) => (
        <button
          key={m.id}
          className={`explore-cam-btn ${mode === m.id ? 'on' : ''}`}
          data-cam={m.id}
          onClick={() => set('cameraMode', m.id)}
        >
          {m.label}
        </button>
      ))}
      <button
        type="button"
        className={`explore-cam-btn cine-btn ${cinematic ? 'on' : ''}`}
        title="Cinematic Tour (key 9)"
        onClick={() => setCine(!cinematic)}
      >
        Cinematic
      </button>
      <FirstPersonHint />
    </div>
  )
}

/** One-time onboarding nudge: the first time the player EVER sits, a glowing arrow
 *  points at the First-person button for 15s so they discover the seat-eye view
 *  (the default stays third-person). Shows once ever — gated by a persisted flag —
 *  and dismisses early if they switch to First or stand up. */
const FP_HINT_KEY = 'sg.hint.firstPersonSit.v1'
function fpHintSeen(): boolean {
  try {
    return localStorage.getItem(FP_HINT_KEY) === '1'
  } catch {
    return true // storage blocked: treat as seen so we never nag
  }
}
function markFpHintSeen(): void {
  try {
    localStorage.setItem(FP_HINT_KEY, '1')
  } catch {
    /* ignore */
  }
}

function FirstPersonHint() {
  const seat = useWorld((s) => s.seat)
  const mode = useSettings((s) => s.cameraMode)
  const [show, setShow] = useState(false)
  const wasSeated = useRef(false)

  // arm on the first sit transition ever (and burn the one-time flag immediately)
  useEffect(() => {
    const seated = seat != null
    if (seated && !wasSeated.current && !fpHintSeen()) {
      setShow(true)
      markFpHintSeen()
    }
    wasSeated.current = seated
  }, [seat])

  // auto-hide after 15s
  useEffect(() => {
    if (!show) return
    const t = window.setTimeout(() => setShow(false), 15000)
    return () => window.clearTimeout(t)
  }, [show])

  // followed the hint (switched to First) or stood up → dismiss immediately
  useEffect(() => {
    if (show && (mode === 'first' || seat == null)) setShow(false)
  }, [show, mode, seat])

  if (!show) return null
  return (
    <div className="explore-fp-hint" role="status">
      <span className="explore-fp-arrow" aria-hidden>
        ←
      </span>
      <span className="explore-fp-label">Try First-person to look around</span>
    </div>
  )
}

/* -------------------------------------------------------------------- sit */

function SeatPrompt() {
  const near = useWorld((s) => s.near)
  const seat = useWorld((s) => s.seat)
  if (seat != null || near == null) return null
  return (
    <div className="explore-sit">
      {isTouch ? (
        <button className="explore-sit-btn" onClick={() => useWorld.getState().sit(near)}>
          Sit &amp; study
        </button>
      ) : (
        <span>
          Press <b>E</b> to sit &amp; study
        </span>
      )}
    </div>
  )
}

/** The single source of truth for leaving a chair lives in the seated panel
 *  header (a labelled "Stand up" button + an ✕). When the panel is minimized to
 *  a chip, a compact "Stand up" sits beside the chip so the user is never reliant
 *  on the E hotkey (which is also a typing key) to get up. */
function SeatedPanel({ onToggleCalc, calcOpen }: { onToggleCalc: () => void; calcOpen: boolean }) {
  const seat = useWorld((s) => s.seat)
  const goals = useDesk((s) => s.goals)
  const note = useDesk((s) => s.note)
  const view = useDesk((s) => s.view)
  const desk = useDesk.getState

  const [goalsOpen, setGoalsOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)
  const [goalDraft, setGoalDraft] = useState('')

  if (seat == null) return null

  const progress = desk().goalProgress()

  if (view === 'min') {
    return (
      <div className="desk-mini">
        <button className="desk-mini-bar" onClick={() => desk().setView('open')} title="Open your desk">
          <span className="desk-mini-icon">📋</span>
          {progress.total > 0 ? (
            <span className="desk-mini-progress">{progress.done}/{progress.total}</span>
          ) : (
            <span className="desk-mini-label">Goals</span>
          )}
          {note && <span className="desk-mini-dot" />}
        </button>
        <button className="desk-mini-stand" onClick={() => { useSeatFlow.getState().standUp(); useWorld.getState().stand(); }} title="Stand up">
          ⤴
        </button>
      </div>
    )
  }

  return (
    <div
      className={`desk ${view === 'collapsed' ? 'desk--collapsed' : ''}`}
      data-no-hotkeys
    >
      {/* Header */}
      <div className="desk-head">
        <div className="desk-head-left">
          <h2>Your desk</h2>
          {progress.total > 0 && (
            <span className="desk-progress-badge">{progress.done}/{progress.total}</span>
          )}
        </div>
        <div className="desk-head-actions">
          <button
            className="desk-head-btn"
            title={view === 'collapsed' ? 'Expand' : 'Collapse'}
            onClick={() => desk().setView(view === 'collapsed' ? 'open' : 'collapsed')}
          >
            {view === 'collapsed' ? '▴' : '▾'}
          </button>
          <button className="desk-head-btn" title="Minimize" onClick={() => desk().setView('min')}>
            –
          </button>
        </div>
      </div>

      {view !== 'collapsed' && (
        <div className="desk-body">
          {/* Goals Section */}
          <div className="desk-section">
            <div className="desk-section-head">
              <h3>🎯 Goals</h3>
              <button className="desk-section-toggle" onClick={() => setGoalsOpen((v) => !v)}>
                {goalsOpen ? '▾' : '▸'}
              </button>
            </div>
            {goalsOpen && (
              <div className="desk-section-content">
                {goals.length === 0 && <p className="desk-empty">Start by adding a goal</p>}
                {goals.map((g, i) => (
                  <label key={i} className={`desk-goal ${g.done ? 'desk-goal--done' : ''}`}>
                    <input type="checkbox" checked={g.done} onChange={() => desk().toggleGoal(i)} />
                    <span className="desk-goal-text">{g.t}</span>
                    <button type="button" className="desk-goal-x" title="Remove" onClick={(e) => { e.preventDefault(); desk().removeGoal(i) }}>×</button>
                  </label>
                ))}
                <form className="desk-goal-form" onSubmit={(e) => { e.preventDefault(); desk().addGoal(goalDraft); setGoalDraft('') }}>
                  <input
                    className="desk-goal-input"
                    placeholder="New goal..."
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                  />
                  <button className="desk-goal-add" type="submit" disabled={!goalDraft.trim()}>+</button>
                </form>
              </div>
            )}
          </div>

          {/* Scratch Notes Section */}
          <div className="desk-section">
            <div className="desk-section-head">
              <h3>📝 Notes</h3>
              <button className="desk-section-toggle" onClick={() => setNotesOpen((v) => !v)}>
                {notesOpen ? '▾' : '▸'}
              </button>
            </div>
            {notesOpen && (
              <div className="desk-section-content">
                <textarea className="desk-notes" placeholder="Jot anything down..." value={note} onChange={(e) => desk().setNote(e.target.value)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="desk-footer">
        <button className="desk-footer-btn" onClick={() => { useSeatFlow.getState().standUp(); useWorld.getState().stand(); }}>
          Stand up
        </button>
        <button className="desk-footer-btn" onClick={onToggleCalc} title={calcOpen ? 'Close calculator' : 'Calculator'}>
          <CalcGlyph />
        </button>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- pomodoro */

function PomodoroTicker() {
  useEffect(() => {
    const id = window.setInterval(() => usePomodoro.getState().tick(), 1000)
    return () => window.clearInterval(id)
  }, [])
  return null
}

/** SVG circular progress ring for the pomodoro timer. */
function ProgressRing({ progress, size = 80, stroke = 4, color }: {
  progress: number // 0..1
  size?: number
  stroke?: number
  color: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)
  return (
    <svg className="pomo-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background track */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

/** Reward popup shown after completing a study segment. */
function RewardPopup() {
  const lastReward = usePomodoro((s) => s.lastReward)
  const clearReward = usePomodoro((s) => s.clearReward)
  useEffect(() => {
    if (lastReward) {
      const t = setTimeout(clearReward, 4000)
      return () => clearTimeout(t)
    }
  }, [lastReward, clearReward])
  if (!lastReward) return null
  return (
    <div className="pomo-reward" onClick={clearReward}>
      <div className="pomo-reward-leaf">🍃</div>
      <div className="pomo-reward-amount">+{lastReward.leaves}</div>
      <div className="pomo-reward-label">Leaves</div>
      {lastReward.noTabBonus > 0 && (
        <div className="pomo-reward-bonus">+{lastReward.noTabBonus} deep work</div>
      )}
      {lastReward.subjectBonus > 0 && (
        <div className="pomo-reward-bonus">+{lastReward.subjectBonus} subject</div>
      )}
    </div>
  )
}

function PomodoroChip({ onFullscreen }: { onFullscreen?: () => void }) {
  const { phase, remaining, running, toggle, forfeit, subject, completed, timerType, sessionMinutes, breakCount, configure, segmentsCompleted, segmentIndex, totalSessionLeaves } = usePomodoro()
  const show = useSettings((s) => s.pomo.showTimer)
  const chimeVolume = useSettings((s) => s.pomo.chimeVolume)
  const setChimeVolume = useSettings((s) => s.setPomo)
  const autoStart = useSettings((s) => s.pomo.autoStart)
  const [configOpen, setConfigOpen] = useState(false)
  const [pickType, setPickType] = useState<TimerType>(timerType)
  const [pickDur, setPickDur] = useState(sessionMinutes)
  const [pickBreaks, setPickBreaks] = useState(breakCount)
  const chipRef = useRef<HTMLDivElement>(null)
  const [chipDrag, setChipDrag] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem('pomo-chip-pos')
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p?.x === 'number' && typeof p?.y === 'number') return { x: p.x, y: p.y }
      }
    } catch { /* ignore */ }
    return null
  })
  const chipDragAbort = useRef<AbortController | null>(null)
  if (!show) return null
  const hh = String(Math.floor(remaining / 3600)).padStart(2, '0')
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  const totalSec = sessionMinutes * 60
  const progress = phase === 'idle' ? 0 : 1 - (remaining / totalSec)

  const ringColor = phase === 'running' ? '#4ade80'
    : phase === 'break' ? '#60a5fa'
    : phase === 'paused' ? '#fbbf24'
    : '#6b7280'

  const studying = (phase === 'running' || phase === 'break') && subject ? subject : null
  const label = studying ?? (phase === 'idle' ? 'Start Studying' : phase === 'running' ? 'Focus' : phase === 'break' ? 'Break' : phase === 'paused' ? 'Paused' : 'Done')

  const isActive = phase === 'running' || phase === 'break' || phase === 'paused'

  const handleStart = () => {
    configure(pickType, pickDur, pickType === 'pomodoro' ? pickBreaks : 0)
    setConfigOpen(false)
    toggle()
  }

  const handleConfigOpen = () => {
    if (phase !== 'idle') return
    setPickType(timerType)
    setPickDur(sessionMinutes)
    setPickBreaks(breakCount)
    setConfigOpen(!configOpen)
  }

  // Reset chip drag when config closes or phase starts
  useEffect(() => {
    if (phase !== 'idle') setChipDrag(null)
  }, [phase])

  const [chipDragging, setChipDragging] = useState(false)

  const startChipDrag = useCallback(() => {
    const el = chipRef.current
    if (!el) return
    setChipDragging(true)
    const rect = el.getBoundingClientRect()
    const bx = rect.left
    const by = rect.top
    const startX = bx
    const startY = by
    let last = { x: bx, y: by }
    const ac = new AbortController()
    chipDragAbort.current = ac
    const move = (ev: PointerEvent) => {
      const x = Math.max(10, Math.min(startX + (ev.clientX - startX), window.innerWidth - el.offsetWidth - 10))
      const y = Math.max(10, Math.min(startY + (ev.clientY - startY), window.innerHeight - el.offsetHeight - 10))
      last = { x, y }
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.style.right = 'auto'
      el.style.bottom = 'auto'
    }
    const finish = () => {
      ac.abort()
      chipDragAbort.current = null
      setChipDragging(false)
      setChipDrag(last)
      try { localStorage.setItem('pomo-chip-pos', JSON.stringify(last)) } catch { /* ignore */ }
    }
    window.addEventListener('pointermove', move, { signal: ac.signal })
    window.addEventListener('pointerup', finish, { signal: ac.signal })
    window.addEventListener('pointercancel', finish, { signal: ac.signal })
  }, [])

  const chipStyle = chipDrag
    ? { left: chipDrag.x, top: chipDrag.y, right: 'auto' as const, bottom: 'auto' as const, position: 'fixed' as const }
    : undefined

  return (
    <div
      className={`explore-pomo-wrap ${chipDragging ? 'dragging' : ''}`}
      ref={chipRef}
      style={chipStyle}
      onDoubleClick={startChipDrag}
      data-no-hotkeys
    >
      <RewardPopup />
      <div className={`explore-pomo ${phase}`}>
        {/* Forfeit button — only show during active session */}
        {isActive && running && (
          <button className="pomo-forfeit" onClick={forfeit} title="Forfeit session (lose all progress)">
            <Icon name="close" size={12} />
          </button>
        )}
        <div className="pomo-ring-wrap" onClick={handleConfigOpen} title={phase === 'idle' ? 'Configure & start session' : ''}>
          <ProgressRing progress={progress} size={64} stroke={3} color={ringColor} />
          <div className="pomo-center">
            {phase === 'idle' ? (
              <Icon name="play" size={18} />
            ) : (
              <span className="pomo-time">{hh}:{mm}:{ss}</span>
            )}
          </div>
        </div>
        {isActive && (
          <button className="pomo-play" onClick={toggle} title={running ? 'Pause' : 'Resume'}>
            <Icon name={running ? 'pause' : 'play'} size={16} />
          </button>
        )}
        {/* Fullscreen Focus Mode button */}
        {isActive && onFullscreen && (
          <button className="pomo-fullscreen" onClick={onFullscreen} title="Fullscreen Focus Mode (pauses 3D rendering)">
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        )}
        {/* Session leaves counter */}
        {phase !== 'idle' && totalSessionLeaves > 0 && (
          <div className="pomo-session-xp">🍃 {totalSessionLeaves}</div>
        )}
      </div>

      {/* Subject label during focus, break suggestion during break */}
      {phase === 'running' && subject && (
        <div className="pomo-subject" title={subject}>📖 {subject}</div>
      )}
      {phase === 'break' && (() => {
        const act = suggestBreakActivity(segmentIndex - 1)
        return (
          <div className="pomo-break-tip" title="Break suggestion">
            {act.icon} {act.label} · {act.duration}s
          </div>
        )
      })()}

      {/* Segment dots — one per focus segment (breaks + 1), filled as completed */}
      {phase !== 'idle' && timerType === 'pomodoro' && breakCount > 0 && (
        <div className="pomo-dots">
          {Array.from({ length: breakCount + 1 }, (_, i) => (
            <span
              key={i}
              className={`pomo-dot ${i < segmentsCompleted ? 'filled' : i === segmentsCompleted && (phase === 'running' || phase === 'break') ? 'active' : ''}`}
            />
          ))}
        </div>
      )}

      {/* Configuration panel */}
      {configOpen && phase === 'idle' && (
        <div className="pomo-config">
          <div className="pomo-config-row">
            <span className="pomo-config-label">Mode</span>
            <div className="pomo-config-btns">
              <button className={`pomo-config-btn ${pickType === 'focus' ? 'active' : ''}`} onClick={() => setPickType('focus')}>Focus</button>
              <button className={`pomo-config-btn ${pickType === 'pomodoro' ? 'active' : ''}`} onClick={() => setPickType('pomodoro')}>Pomodoro</button>
            </div>
          </div>
          <div className="pomo-config-row">
            <span className="pomo-config-label">Duration</span>
            <div className="pomo-config-btns">
              {SESSION_OPTIONS.map((m) => (
                <button key={m} className={`pomo-config-btn ${pickDur === m ? 'active' : ''}`} onClick={() => setPickDur(m)}>
                  {m >= 60 ? `${m / 60}h` : `${m}m`}
                </button>
              ))}
            </div>
          </div>
          {pickType === 'pomodoro' && (
            <div className="pomo-config-row">
              <span className="pomo-config-label">Breaks</span>
              <div className="pomo-config-btns">
                {[1, 2, 3, 4, 5].map((n) => {
                  const segs = computeSegments(pickDur, n)
                  const segMin = segs[0]
                  return (
                    <button key={n} className={`pomo-config-btn ${pickBreaks === n ? 'active' : ''}`} onClick={() => setPickBreaks(n)}>
                      {n} <span className="pomo-config-sub">({segMin}m)</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="pomo-config-row">
            <span className="pomo-config-label">Chime Volume</span>
            <div className="pomo-config-btns">
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={chimeVolume}
                onChange={(e) => setChimeVolume({ chimeVolume: parseFloat(e.target.value) })}
                style={{ width: 80, accentColor: 'var(--color-genshin-gold)' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-genshin-bronze)' }}>{Math.round(chimeVolume * 100)}%</span>
            </div>
          </div>
          <div className="pomo-config-row">
            <span className="pomo-config-label">Auto-start</span>
            <div className="pomo-config-btns">
              <button
                className={`pomo-config-btn ${autoStart ? 'active' : ''}`}
                onClick={() => setChimeVolume({ ...useSettings.getState().pomo, autoStart: !autoStart })}
              >
                {autoStart ? 'On' : 'Off'}
              </button>
            </div>
          </div>
          <button className="pomo-config-start" onClick={handleStart}>
            Start {pickType === 'pomodoro' && pickBreaks > 0 ? `• ${pickBreaks} break${pickBreaks > 1 ? 's' : ''}` : ''} Session
          </button>
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------------- fps */

function NpcProfileOverlay() {
  const profile = useNpcProfile((s) => s.profile)
  const hide = useNpcProfile((s) => s.hide)
  if (!profile) return null
  return <NpcProfileCard profile={profile} onClose={hide} />
}

function FpsMeter() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let frames = 0
    const loop = () => {
      frames++
      const now = performance.now()
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <span className="explore-fps">{fps} FPS</span>
}

/* ---------------------------------------------------------------- settings */

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement)

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      setFullscreen(false)
    } else {
      void document.documentElement.requestFullscreen()
      setFullscreen(true)
    }
  }

  return (
    <div className="settings-scrim" onPointerDown={onClose}>
      <div className="settings-panel" onPointerDown={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2>Settings</h2>
          <button className="settings-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-body">
          <Section title="Graphics">
            <Toggle
              label="Automatic resolution (detect my device)"
              value={s.autoQuality}
              onChange={(v) => s.set('autoQuality', v)}
            />
            <Seg<Quality>
              label="Overall quality"
              value={s.quality}
              options={[
                ['low', 'Low'],
                ['medium', 'Medium'],
                ['high', 'High'],
                ['custom', 'Custom'],
              ]}
              // Picking a named preset seeds all six axes; 'Custom' is a status
              // shown when an axis was hand-tuned — clicking it is a no-op.
              onChange={(v) => {
                if (v !== 'custom') s.applyQualityPreset(v as QualityPresetName)
              }}
            />
            <Slider
              label="Resolution scale"
              display={`${Math.round(s.resolutionScale * 100)}%`}
              value={s.resolutionScale}
              min={0.5}
              max={1}
              step={0.05}
              disabled={s.autoQuality}
              onChange={(v) => s.setQualityAxis('resolutionScale', v)}
            />
            <Slider
              label="View distance"
              display={`${Math.round(s.viewDistance * 100)}%`}
              value={s.viewDistance}
              min={0.6}
              max={1}
              step={0.05}
              onChange={(v) => s.setQualityAxis('viewDistance', v)}
            />
            <Seg<ShadowQuality>
              label="Shadow quality"
              value={s.shadowQuality}
              options={[
                ['off', 'Off'],
                ['low', 'Low'],
                ['high', 'High'],
              ]}
              onChange={(v) => s.setQualityAxis('shadowQuality', v)}
            />
            <Seg<PostQuality>
              label="Post-processing (bloom + fog)"
              value={s.postProcessing}
              options={[
                ['off', 'Off'],
                ['low', 'Low'],
                ['high', 'High'],
              ]}
              onChange={(v) => s.setQualityAxis('postProcessing', v)}
            />
            <Seg<TextureQuality>
              label="Texture quality"
              value={s.textureQuality}
              options={[
                ['low', 'Low'],
                ['medium', 'Medium'],
                ['high', 'High'],
              ]}
              onChange={(v) => s.setQualityAxis('textureQuality', v)}
            />
            <Slider
              label="Mesh detail · LOD bias"
              display={s.lodBias.toFixed(2)}
              value={s.lodBias}
              min={0}
              max={1.5}
              step={0.25}
              onChange={(v) => s.setQualityAxis('lodBias', v)}
            />
            <Toggle label="Ultra effects (SSAO · god rays · DoF) — high-end GPU" value={s.ultra} onChange={(v) => s.set('ultra', v)} />
            <Toggle label="Show FPS counter" value={s.fps} onChange={(v) => s.set('fps', v)} />
          </Section>

          <Section title="Cinematic Tour (key 9)">
            <Toggle label="Enable cinematic tour" value={s.cinematicTour} onChange={(v) => s.set('cinematicTour', v)} />
            <Toggle label="Cinematic camera zoom (dolly between shots)" value={s.cinematicZoom} onChange={(v) => s.set('cinematicZoom', v)} />
            <Toggle label="Bloom during cinematic" value={s.bloom} onChange={(v) => s.set('bloom', v)} />
          </Section>

          {/* The "Audio" section was removed — all sound is controlled from the
              Library Realm music widget (bottom-right), so there's nothing to tune
              here. The underlying master/rain settings still exist in the store. */}

          {/* The "World" section (weather / day-night / time speed) was removed —
               the realm's atmosphere is now fixed for everyone (auto weather +
               day-night), so there is nothing per-user to tune here. */}

          <Section title="Atmosphere">
            <Toggle
              label="Night Mode"
              value={s.nightMode}
              onChange={(v) => s.set('nightMode', v)}
            />
          </Section>

          <Section title="View & Accessibility">
            <Seg<CameraMode>
              label="Camera"
              value={s.cameraMode}
              options={[
                ['first', 'First (F1)'],
                ['third', 'Third (F2)'],
              ]}
              onChange={(v) => s.set('cameraMode', v)}
            />
            <Slider label="Look sensitivity" display={`${Math.round(s.sensitivity * 100)}%`} value={(s.sensitivity - 0.2) / 1.8} onChange={(v) => s.set('sensitivity', 0.2 + v * 1.8)} />
            <Toggle label="Invert mouse Y" value={s.invertY} onChange={(v) => s.set('invertY', v)} />
            <Toggle label="Hide avatar when moving camera" value={s.hideAvatarWhenMovingCamera} onChange={(v) => s.set('hideAvatarWhenMovingCamera', v)} />
            <button className="settings-fs" onClick={toggleFullscreen}>
              {fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            </button>
          </Section>
        </div>
      </div>
    </div>
  )
}

/* Settings control primitives (Section/Toggle/Slider/Stepper/Seg/FocusLength)
   are shared from components/settings/controls. */

/* --------------------------------------------------------------- touch ui */

function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const RADIUS = 46

  function update(e: React.PointerEvent) {
    const base = baseRef.current
    if (!base) return
    const r = base.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    joystick.x = dx / RADIUS
    joystick.y = -dy / RADIUS
  }
  function reset() {
    setKnob({ x: 0, y: 0 })
    joystick.x = 0
    joystick.y = 0
  }

  return (
    <div
      ref={baseRef}
      className="explore-joy"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e)
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div className="explore-joy-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}

function SunGlyph() {
  return (
    <svg className="explore-sun" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M19.1 4.9l-1.4 1.4 M6.3 17.7l-1.4 1.4" />
    </svg>
  )
}

function CalcGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="2" width="16" height="20" rx="2.5" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="11" x2="8" y2="11" />
      <line x1="12" y1="11" x2="12" y2="11" />
      <line x1="16" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="8" y2="15" />
      <line x1="12" y1="15" x2="12" y2="15" />
      <line x1="16" y1="15" x2="16" y2="18" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  )
}

function GearGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M19.1 4.9L17 7 M7 17l-2.1 2.1" />
    </svg>
  )
}
