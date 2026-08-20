import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LibraryScene } from '../three/library/LibraryScene'
import { TrainStationScene } from '../three/train/TrainStationScene'
import { ChineseCafeScene } from '../three/chinese-cafe/ChineseCafeScene'
import { useAudio } from '../audio/useAudio'
import { joystick, isTypingFocused } from '../three/library/input'
import { RoomLoader } from '../components/RoomLoader'
import { FullscreenButton } from '../components/mobile/FullscreenButton'
import { RotatePrompt } from '../components/mobile/RotatePrompt'
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
import { usePomodoro, SESSION_OPTIONS, computeSegments, liveFocusLeaves, formatLiveLeaves, suggestBreakActivity } from '../store/pomodoro'
import { hardcoreMultiplier, minWagerFor } from '../store/hardcore'
import { useDeviceBoost } from '../lib/deviceBoost'
import { useIsMobileOrTablet } from '../hooks/useDevice'
import { enterRealmLowFirst } from '../three/realmQuality'
import { getCachedDeviceProfile, onDeviceProfile, type DeviceProfile } from '../lib/deviceProfile'
import { DeviceConnect } from '../components/focus/DeviceConnect'
import type { TimerType, PomoPhase } from '../store/pomodoro'
import { getRemoteOccupied, setLocalTimer, setLocalCelebrate } from '../multiplayer/net'
import { useWorld } from '../store/world'
import { useDesk } from '../store/desk'
import { useMagnet } from '../store/magnet'
import { useRealm, type ActiveRealm } from '../store/realm'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useAvatar } from '../avatar/store'
import { ROOM_CAPACITIES, trainStationEnabled, ukCafeEnabled, chineseCafeEnabled } from '../lib/realm'
import { roomTheme } from '../lib/roomThemes'
import { useRealmNet, joinRealm, leaveRealm, updateIdentity, networkId } from '../multiplayer/net'
import { assignInstance, startHeartbeat, leavePresence, REALM_CAPACITY } from '../lib/realmPresence'
import { PublicPlayerTag, type PublicPlayer } from '../components/PublicPlayerTag'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { RankBadge } from '../components/RankBadge'
import { getRank, rankForLifetime } from '../lib/ranks'
import { AddFriendButton } from '../components/AddFriendButton'
import { GREEN_LEAF_ICON } from '../lib/leafIcons'
import { Icon } from '../components/magnet/Icon'
import { SocialHub } from '../features/social/SocialHub'
import { LibraryCalc } from '../calc/ui/LibraryCalc'
import { MusicPlayer } from '../components/library/MusicPlayer'
import { TrainHUD } from '../components/train/TrainHUD'
import { FocusDomain } from '../components/FocusDomain'
import { CinematicEntry } from '../components/library/CinematicEntry'
import { FlagshipUnavailable } from '../components/FlagshipUnavailable'
import { SeatSelectionOverlay } from '../components/library/SeatSelectionOverlay'
import { LibraryHelpMascot } from '../components/library/LibraryHelpMascot'
import { ChineseCafeSeatSelectionOverlay } from '../three/chinese-cafe/ChineseCafeSeatSelectionOverlay'
import { NpcProfileCard } from '../components/NpcProfileCard'
import { useNpcProfile } from '../store/npcProfile'
import { useSeatFlow } from '../store/seatFlow'
import './Explore.css'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export interface ExploreProps {
  defaultWorld?: 'library' | 'train-station' | 'uk-cafe' | 'chinese-cafe'
}

export function Explore({ defaultWorld }: ExploreProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Read world from URL query parameter, or fall back to defaultWorld prop
  const searchParams = new URLSearchParams(location.search)
  const worldFromUrl = (searchParams.get('world') as 'library' | 'train-station' | 'uk-cafe' | 'chinese-cafe') || defaultWorld

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
  const mobile = useIsMobileOrTablet()
  useExploreShortcuts()



  // Determine which world to render: use worldFromUrl if available, otherwise use defaultWorld prop, otherwise use realm.world
  const isTrain = worldFromUrl === 'train-station' || defaultWorld === 'train-station' || realm?.world === 'train-station'
  const isUkCafe = worldFromUrl === 'uk-cafe' || defaultWorld === 'uk-cafe' || realm?.world === 'uk-cafe'
  const isChineseCafe = worldFromUrl === 'chinese-cafe' || defaultWorld === 'chinese-cafe' || realm?.world === 'chinese-cafe'
  const seatFlowStage = useSeatFlow((s) => s.stage)

  // Rain/ambience must NOT play over the seat picker: the Library & UK Café
  // hold the soundscape until the player is actually in the world (past seat
  // selection). The Train has no seat picker and always enables it.
  useAudio({ enabled: isTrain || seatFlowStage !== 'selecting' })

  // Auto-collapse the desk whenever the player sits down, so the seated avatar (and
  // its sitting animation) stays visible behind a small header rather than the full
  // Study Station panel. The player taps the header to expand the desk when studying.
  const seat = useWorld((s) => s.seat)
  const cinematic = useWorld((s) => s.cinematic)
  const cineFade = useWorld((s) => s.cineFade)
  const wasSeated = useRef(false)
  useEffect(() => {
    if (seat != null && !wasSeated.current) useDesk.getState().setView('collapsed')
    wasSeated.current = seat != null
  }, [seat])

  // Reset readiness whenever the player returns to the seat picker (stand-up
  // or unlock). The scene is unmounted during 'selecting' (it would compile
  // every shader at page entry and freeze the picker), so on re-join it mounts
  // fresh and MUST wait for the loader again — never reuse the stale flag.
  useEffect(() => {
    if (seatFlowStage === 'selecting') setReady(false)
  }, [seatFlowStage])

  // Delay the scene's first mount by a beat after seat commit so the loader's
  // first frame ALWAYS paints before the WebGL world mounts. The very first
  // Canvas render compiles shaders synchronously — if that happens on the same
  // tick as the commit, the main thread blocks before the loader is ever on
  // screen, which looks like a hard freeze (and a fresh browser keeps the old
  // chunks anyway). A 450 ms gap guarantees the loading veil is visible first;
  // the primer then slices the compile cost across its frames.
  const [sceneMounted, setSceneMounted] = useState(false)
  useEffect(() => {
    if (seatFlowStage === 'selecting') {
      setSceneMounted(false)
      return
    }
    const t = window.setTimeout(() => setSceneMounted(true), 450)
    return () => window.clearTimeout(t)
  }, [seatFlowStage])

  // Realm entry — drop the resolution for a fast first settle (auto-quality
  // only; the player's own axes are left untouched). The scene steps back up
  // to the detected tier once it signals ready.
  useEffect(() => {
    if (sceneMounted && seatFlowStage !== 'selecting') enterRealmLowFirst()
  }, [sceneMounted, seatFlowStage])

  // Restore saved seat on tab return (30s expiry). Fresh entries stay in
  // 'selecting' so the seat picker (with occupied seats) always shows before
  // the player commits to a seat. NOTE: the seat is NOT auto-resumed — a saved
  // seat used to jump straight into 'seated', mounting the heavy WebGL scene at
  // page load and freezing returning users (the shader-compile storm fired
  // before the picker/loader ever showed). The picker always comes first; it
  // shows the saved seat as available/occupied so nothing is lost.
  // (The reserve-on-hidden logic in useSeatFlow still writes the 30 s expiry —
  // it's just not honoured for an automatic mount anymore.)

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
  // error, etc.), force the veil away so the user isn't stuck on a permanent
  // dark screen. MUST NOT start counting until the loader is actually visible
  // (seat committed): the seat picker can sit open for minutes, and a fallback
  // that fires during it would mark the room "ready" before it ever rendered a
  // frame — the loader would blink out onto a half-compiled scene.
  useEffect(() => {
    if (ready || seatFlowStage === 'selecting') return
    const t = window.setTimeout(() => {
      console.warn('[Explore] scene did not signal ready — removing veil')
      setReady(true)
    }, 15_000)
    return () => window.clearTimeout(t)
  }, [ready, seatFlowStage])

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
      const remote = getRemoteOccupied()
      const occupied = { ...remote }
      useSeatFlow.getState().setOccupied(occupied)
    }
    sync()
    const id = window.setInterval(sync, 2000)
    return () => window.clearInterval(id)
  }, [])

  // Sync local pomodoro timer state into multiplayer so other players can see
  // your live study progress as a small bar above your head. Breaks are
  // broadcast as a fresh short countdown so friends see you're on a break.
  useEffect(() => {
    let prevPhase: PomoPhase = usePomodoro.getState().phase
    const push = (s: ReturnType<typeof usePomodoro.getState>) => {
      // When the whole session completes (phase -> 'finished'), broadcast a
      // celebration so other players see the leaf burst over this avatar.
      if (prevPhase !== 'finished' && s.phase === 'finished') {
        setLocalCelebrate(Date.now())
      }
      prevPhase = s.phase
      if (s.phase === 'running' && s.startedAt) {
        setLocalTimer(s.startedAt, s.sessionMinutes * 60 * 1000, 'focus')
      } else if (s.phase === 'break' && s.remaining > 0) {
        setLocalTimer(Date.now(), s.remaining * 1000, 'break')
      } else {
        setLocalTimer(0, 0, '')
      }
    }
    const unsub = usePomodoro.subscribe(push)
    // Set initial state
    push(usePomodoro.getState())
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
  if (isChineseCafe && !chineseCafeEnabled()) {
    return <FlagshipUnavailable name="Jade Lantern Café" />
  }

  return (
    <div className="explore-root">
      {/* Rotate nudge for portrait phones — the 3D worlds need landscape. */}
      <RotatePrompt />
      {/* Room loader — doors stay closed until the scene signals ready.
          Shows the room name + logo riding the loading bar underneath.
          The loader holds for a generous minimum on EVERY entry (first sit or
          re-seat): the hall is big and needs real time to render stably, and
          SceneReady only fires once the world has actually rendered for a
          while — the doors never open onto a janky scene.

          The scene itself only MOUNTS after the seat is committed (not while
          the picker is open): mounting the WebGL world at page entry would
          compile every shader synchronously on the first frame and freeze the
          seat picker for seconds. Deferred to the Join click, that cost lands
          under the loader, where SceneReady's progressive primer slices the
          compile stalls across frames instead. */}
      <RoomLoader
        ready={ready}
        roomName={realm?.name ?? (isTrain ? 'Train Station' : isChineseCafe ? 'Jade Lantern Study House' : isUkCafe ? 'UK Café' : 'The Great Library')}
        accent={isChineseCafe ? '#38a27f' : isUkCafe || isTrain ? undefined : roomTheme(realm?.roomId).accent}
        minDuration={6000}
        show={seatFlowStage !== 'selecting'}
      >
        {isTrain || (sceneMounted && seatFlowStage !== 'selecting') ? (
          /* The 3D world layer — brightness dims only this, never the HUD. */
          <div className="explore-world">
            {isTrain ? (
              <TrainStationScene onReady={() => setReady(true)} />
            ) : isChineseCafe ? (
              <ChineseCafeScene onReady={() => setReady(true)} />
            ) : isUkCafe ? (
              <LibraryScene
                onReady={() => setReady(true)}
                roomId={undefined}
              />
            ) : (
              <LibraryScene
                onReady={() => setReady(true)}
                roomId={realm?.roomId}
              />
            )}
          </div>
        ) : null}
      </RoomLoader>
      <PomodoroTicker />
      {!cinematic && <RealmConnection />}

      {/* Cinematic fade-to-black overlay — driven by PlayerController's state
          machine via useWorld.cineFade (0 = transparent, 1 = fully black). */}
      <div className="cine-fade" style={{ opacity: cineFade }} />

      {/* Surfaces any silent LibraryScene crash as a small visible badge so
          the player (or support) can read the error without DevTools. */}
      <SceneErrorBadge />

      {/* Library seat-selection overlay — shown before the player commits to a seat.
          Once a seat is chosen we fall through to the normal in-world HUD. */}
      {!isTrain && seatFlowStage === 'selecting' && (
        isChineseCafe ? <ChineseCafeSeatSelectionOverlay /> : <SeatSelectionOverlay />
      )}

      {/* Cinematic entrance — "Entering the Great Hall..." title card + fade */}
      {!isTrain && !isChineseCafe && <CinematicEntry />}

      {/* Cinematic Tour (key 9) runs full-screen with no letterbox bars, so the
          web viewport keeps its full height/width while the camera glides. */}

      {/* Every widget lives behind this gate. Tab / Performance Mode hides the
          whole HUD; while the Cinematic Tour (key 9) runs we ALSO hide everything
          except the timer, so the glide is an unbroken full-screen "video". */}
      {!hidden && !cinematic && (
        mobile ? (
          seatFlowStage !== 'selecting' && (
            <MobileRealmHud
              realm={realm}
              navigate={navigate}
              settingsOpen={settingsOpen}
              setSettingsOpen={setSettingsOpen}
              calcOpen={calcOpen}
              setCalcOpen={setCalcOpen}
              setFpOpen={setFpOpen}
            />
          )
        ) : (
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
            {mobile && <FullscreenButton />}
          </div>

          <RoomRoster />

          {/* Max — tiny floating helper, top-left. Click for the controls guide.
              Library + UK Café share the same LibraryScene controls; the train
              and Chinese café have their own HUDs. */}
          {!isTrain && !isChineseCafe && <LibraryHelpMascot />}

          <SeatPrompt />
          <SeatedPanel onToggleCalc={() => setCalcOpen((v) => !v)} calcOpen={calcOpen} />

          {/* Train Station realm HUD — the boarding card, live journey dock and
              arrival/reward screen. It's the realm's primary interface, so it's
              mounted only in the train world. The journey engine itself lives in
              the store + scene runtime, so this is purely its view. */}
          {isTrain && <TrainHUD />}

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
        )
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

      {/* Unified social hub — lobby chat bar / mini dock / full-screen Explore.
          Rendered OUTSIDE the HUD-hidden gate so it stays reachable while widgets
          are toggled off. Pauses 3D rendering while open (LibraryScene / TrainStationScene). */}
      <SocialHub />

      {/* Bottom-right manual controls: keys 1-8 = seated camera presets,
          9 = Cinematic Tour. Hidden while the tour runs (it's a hands-off
          full-screen "video" — exit with key 9); during the tour only the
          timer stays visible. */}
      {location.pathname === '/lobby/explore' && !isTrain && !cinematic && seatFlowStage !== 'selecting' && <MusicPlayer />}
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
  if (a.roomId && a.world === 'chinese-cafe') return `chinese-cafe:${a.roomId}`
  if (a.roomId) return `lib:${a.roomId}`
  return `flag:${a.world}`
}

/** One realtime channel per realm INSTANCE. Everyone the server assigned to the
 *  same instance of the same realm computes the same channel and meets here. */
function realmChannel(a: ActiveRealm, instance: number): string {
  return `realm:${roomKeyOf(a)}#${instance}`
}

/* Shows a red badge with the LibraryScene crash message (set by CanvasGuard)
   so silent WebGL failures surface without DevTools. Polls the flag a couple
   of times a second; clears once the scene stops reporting. */
function SceneErrorBadge() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    const t = window.setInterval(() => {
      const cur = (window as any).__libCanvasError as string | undefined
      setMsg((prev) => (cur ? cur : prev && !document.hidden ? prev : cur ?? null))
      if (!cur) setMsg(null)
    }, 700)
    return () => window.clearInterval(t)
  }, [])
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 12, left: 12, zIndex: 1000,
      background: 'rgba(60,8,8,0.92)', color: '#ffb4b0', fontSize: 12,
      padding: '8px 12px', borderRadius: 8, maxWidth: 420,
      fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.4,
    }}>
      Scene failed: {msg}
    </div>
  )
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
  const rank = useProfile((s) => rankForLifetime(s.rankXp, s.xp, s.premiumXp).id)
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
      const capacity = active.roomId ? (ROOM_CAPACITIES[active.roomId] ?? REALM_CAPACITY) : REALM_CAPACITY
      const instance = await assignInstance(roomKey, capacity)
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
    updateIdentity({ id, name, country: country ?? null, rank: rank || '', avatar, banner, logo })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar, name, country, rank, banner, logo])

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
  const rank = useProfile((s) => rankForLifetime(s.rankXp, s.xp, s.premiumXp).id)
  const playerId = useProfile((s) => s.playerId)
  const displayName = useProfile((s) => s.displayName)
  const realm = useRealm((s) => s.active)
  const roster = useRealmNet((s) => s.roster)
  const [open, setOpen] = useState(false)
  const [profileTarget, setProfileTarget] = useState<{ name: string; playerId: string; country: string | null; rank: string } | null>(null)
  const [cardTarget, setCardTarget] = useState<{ name: string; playerId: string; country: string | null; rank: string; banner?: string; logo?: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const rosterEntries = Object.entries(roster)
  const total = rosterEntries.length + 1

  useEffect(() => {
    if (open && scrollRef.current) handleScroll()
  }, [open, rosterEntries.length])

  if (!realm) return null

  const self: PublicPlayer = {
    name: displayName || user?.profile?.name || 'You',
    playerId,
    country,
    rank,
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const cards = el.querySelectorAll<HTMLElement>('.roster-user-card')
    const containerTop = el.scrollTop
    const containerH = el.clientHeight
    const center = containerTop + containerH / 2
    cards.forEach((card) => {
      const cardCenter = card.offsetTop + card.offsetHeight / 2
      const dist = (center - cardCenter) / (containerH / 2)
      const clamped = Math.max(-1, Math.min(dist, 1))
      const abs = Math.abs(clamped)
      const scale = 1 - abs * 0.12
      const rotateX = clamped * 6
      const translateZ = -abs * 20
      card.style.transform = `perspective(500px) rotateX(${rotateX}deg) scale(${scale}) translateZ(${translateZ}px)`
      card.style.opacity = `${1 - abs * 0.25}`
    })
  }

  return (
    <div className={`room-roster ${open ? '' : 'collapsed'}`}>
      <button className="room-roster-toggle" onClick={() => setOpen((v) => !v)} title="In this room">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span className="room-roster-badge">{total}</span>
      </button>
      {open && (
        <div className="room-roster-panel">
          <div className="room-roster-panel-head">
            <span className="room-roster-dot" />
            <span>In this room</span>
            <strong>{total}</strong>
          </div>
          <div className="room-roster-scroll" ref={scrollRef} onScroll={handleScroll}>
            <div className="roster-user-card me">
              <div className="roster-user-banner" />
              <div className="roster-user-body">
                <div className="roster-user-avatar">
                  <ProfileAvatar name={self.name} avatarUrl={null} rankId={self.rank} size={32} />
                </div>
                <span className="roster-user-name">{self.name} <span className="roster-user-you">You</span></span>
                <button className="roster-user-info" onClick={() => setProfileTarget({ name: self.name, playerId: self.playerId != null ? String(self.playerId) : '', country: self.country, rank: self.rank })} title="Profile">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </button>
              </div>
            </div>
            {rosterEntries.map(([id, entry]) => (
              <div
                key={id}
                className="roster-user-card clickable"
                onClick={() => setCardTarget({ name: entry.name, playerId: id, country: entry.country, rank: entry.rank, banner: entry.banner, logo: entry.logo })}
              >
                <div className="roster-user-banner" style={{ '--rank-color': getRank(entry.rank).accent } as React.CSSProperties} />
                <div className="roster-user-body">
                  <div className="roster-user-avatar">
                    <ProfileAvatar name={entry.name} avatarUrl={null} rankId={entry.rank} size={32} />
                  </div>
                  <span className="roster-user-name">{entry.name}</span>
                  <button className="roster-user-info" onClick={(e) => { e.stopPropagation(); setCardTarget({ name: entry.name, playerId: id, country: entry.country, rank: entry.rank, banner: entry.banner, logo: entry.logo }) }} title="Info">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </button>
                </div>
              </div>
            ))}
            {rosterEntries.length === 0 && (
              <p className="room-roster-empty">
                Others studying in this realm will appear here live.
              </p>
            )}
          </div>
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
      {cardTarget && (
        <NpcProfileCard
          profile={{
            name: cardTarget.name,
            rank: cardTarget.rank,
            country: cardTarget.country,
            status: 'studying',
            isUser: true,
            banner: cardTarget.banner,
            logo: cardTarget.logo,
          }}
          onClose={() => setCardTarget(null)}
          onMoreInfo={() => {
            setCardTarget(null)
            setProfileTarget({ name: cardTarget.name, playerId: cardTarget.playerId, country: cardTarget.country, rank: cardTarget.rank })
          }}
        />
      )}
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
  const phase = usePomodoro((s) => s.phase)
  const [warn, setWarn] = useState(false)

  const [goalsOpen, setGoalsOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)
  const [goalDraft, setGoalDraft] = useState('')

  if (seat == null) return null

  const progress = desk().goalProgress()

  // Changing seats is locked while a study session is active — standing up
  // would let the player dodge the timer, so we block it and surface a warning.
  const sessionActive = phase === 'running' || phase === 'break' || phase === 'paused'
  const tryStandUp = () => {
    if (sessionActive) {
      setWarn(true)
      window.setTimeout(() => setWarn(false), 3200)
      return
    }
    useSeatFlow.getState().standUp()
    useWorld.getState().stand()
  }

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
        <button className="desk-mini-stand" onClick={tryStandUp} title={sessionActive ? 'Finish or cancel your session first' : 'Stand up'}>
          ⤴
        </button>
        {warn && <div className="desk-mini-warn">Finish your session before changing seats</div>}
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
        <button className="desk-footer-btn" onClick={tryStandUp} title={sessionActive ? 'Finish or cancel your session first' : 'Stand up'}>
          Stand up
        </button>
        <button className="desk-footer-btn" onClick={onToggleCalc} title={calcOpen ? 'Close calculator' : 'Calculator'}>
          <CalcGlyph />
        </button>
      </div>
      {warn && (
        <div className="desk-warn" role="status">
          Finish or cancel your study session before changing seats
        </div>
      )}
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

/** Full-session completion celebration — shown ONLY when the whole timer is
 *  finished (never on a break). Leaves fly in and collect into a count-up of
 *  the total leaves earned for the session. Auto-dismisses or click to close. */
function SessionCelebration() {
  const phase = usePomodoro((s) => s.phase)
  const leaves = usePomodoro((s) => s.totalSessionLeaves)
  const [show, setShow] = useState(false)
  const [count, setCount] = useState(0)
  const prevPhase = useRef(phase)

  // Fire once on the transition into 'finished' (whole session done).
  useEffect(() => {
    if (prevPhase.current !== 'finished' && phase === 'finished') {
      setShow(true)
      setCount(0)
    }
    prevPhase.current = phase
  }, [phase])

  // Count the leaves up to the session total, then auto-dismiss.
  useEffect(() => {
    if (!show) return
    const target = Math.max(0, Math.round(leaves))
    const dur = 1300
    const start = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setCount(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    const t = window.setTimeout(() => setShow(false), 3600)
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t) }
  }, [show, leaves])

  if (!show) return null
  return (
    <div className="pomo-celebrate" onClick={() => setShow(false)}>
      {/* Full-screen falling leaf rain */}
      <div className="pomo-celebrate-rain">
        {Array.from({ length: 34 }).map((_, i) => (
          <img
            key={i}
            className="pomo-rain-leaf"
            src={GREEN_LEAF_ICON}
            alt=""
            draggable={false}
            style={{ ['--i' as string]: i }}
          />
        ))}
      </div>
      {/* Center burst */}
      <div className="pomo-celebrate-burst">
        {Array.from({ length: 16 }).map((_, i) => (
          <img
            key={i}
            className="pomo-celebrate-leaf"
            src={GREEN_LEAF_ICON}
            alt=""
            draggable={false}
            style={{ ['--i' as string]: i }}
          />
        ))}
      </div>
      <div className="pomo-celebrate-card">
        <div className="pomo-celebrate-title">Session Complete</div>
        <img className="pomo-celebrate-leaf-big" src={GREEN_LEAF_ICON} alt="" draggable={false} />
        <div className="pomo-celebrate-amount">+{count}</div>
        <div className="pomo-celebrate-label">leaves collected</div>
      </div>
    </div>
  )
}

function PomodoroChip({ onFullscreen }: { onFullscreen?: () => void }) {
  const { phase, remaining, running, toggle, forfeit, subject, completed, timerType, sessionMinutes, breakCount, configure, setFocusMode, focusMode, segmentsCompleted, segmentIndex, totalSessionLeaves } = usePomodoro()
  // Live leaves during the running segment (ticks up each store tick).
  const liveLeaves = liveFocusLeaves(usePomodoro.getState())
  const show = useSettings((s) => s.pomo.showTimer)
  const chimeVolume = useSettings((s) => s.pomo.chimeVolume)
  const setChimeVolume = useSettings((s) => s.setPomo)
  const autoStart = useSettings((s) => s.pomo.autoStart)
  const [configOpen, setConfigOpen] = useState(false)
  const [pickType, setPickType] = useState<TimerType>(timerType)
  const [pickDur, setPickDur] = useState(sessionMinutes)
  const [pickBreaks, setPickBreaks] = useState(breakCount)
  const [pickMode, setPickMode] = useState<'easy' | 'medium' | 'hardcore'>(focusMode === 'medium' ? 'medium' : focusMode === 'hardcore' ? 'hardcore' : 'easy')
  const [showConnect, setShowConnect] = useState(false)
  const deviceCount = useDeviceBoost((s) => s.deviceCount)
  if (!show) return null
  const hh = String(Math.floor(remaining / 3600)).padStart(2, '0')
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  const totalSec = sessionMinutes * 60
  const progress = phase === 'idle' ? 0 : 1 - (remaining / totalSec)

  const ringColor = focusMode === 'hardcore' ? '#f87171'
    : focusMode === 'medium' ? '#fbbf24'
    : phase === 'running' ? '#34d399'
    : phase === 'break' ? '#60a5fa'
    : phase === 'paused' ? '#fbbf24'
    : '#6b7280'

  const studying = (phase === 'running' || phase === 'break') && subject ? subject : null
  const label = studying ?? (phase === 'idle' ? 'Start Studying' : phase === 'running' ? 'Focus' : phase === 'break' ? 'Break' : phase === 'paused' ? 'Paused' : 'Done')

  const isActive = phase === 'running' || phase === 'break' || phase === 'paused'

  const handleStart = () => {
    configure(pickType, pickDur, pickType === 'pomodoro' ? pickBreaks : 0)
    setFocusMode(pickMode)
    setConfigOpen(false)
    // Medium/Hardcore need fullscreen enforcement + (for hardcore) a wager, which
    // are configured inside the Focus Domain. Route there with the config applied.
    if (pickMode !== 'easy') {
      onFullscreen?.()
      return
    }
    toggle()
  }

  const handleConfigOpen = () => {
    if (phase !== 'idle' && phase !== 'finished') return
    setPickType(timerType)
    setPickDur(sessionMinutes)
    setPickBreaks(breakCount)
    setPickMode(focusMode === 'medium' ? 'medium' : focusMode === 'hardcore' ? 'hardcore' : 'easy')
    setConfigOpen(!configOpen)
  }

  return (
    <div
      className="explore-pomo-wrap"
      data-no-hotkeys
    >
      <RewardPopup />
      <SessionCelebration />
      <div className={`explore-pomo ${phase}`}>
        {/* Forfeit button */}
        {isActive && running && (
          <button className="pomo-forfeit" onClick={forfeit} title="Forfeit session">
            <Icon name="close" size={12} />
          </button>
        )}

        {/* Left pill: Timer label + time */}
        <div className="pomo-pill pomo-timer-pill" onClick={handleConfigOpen} title={phase === 'idle' || phase === 'finished' ? 'Configure & start a new session' : ''}>
          <span className="pomo-pill-label">Timer</span>
          {isActive && <span className="pomo-pill-time">{mm}:{ss}</span>}
          {phase === 'finished' && <span className="pomo-pill-time pomo-pill-done">Done</span>}
        </div>

        {/* Center: Play / Pause button */}
        <button className="pomo-play-btn" onClick={toggle} title={phase === 'idle' || phase === 'finished' ? 'Start new session' : running ? 'Pause' : 'Resume'}>
          <Icon name={running ? 'pause' : 'play'} size={16} />
        </button>

        {/* Right pill: live leaf counter — fractional while the current segment
            accrues, so it visibly counts up in points instead of rounding */}
        <div className="pomo-pill pomo-xp-pill">
          <img className="pomo-pill-leaf" src={GREEN_LEAF_ICON} alt="" draggable={false} />
          <span className="pomo-pill-xp">{formatLiveLeaves(liveLeaves ?? totalSessionLeaves)}</span>
        </div>
      </div>

      {/* Fullscreen button */}
      {isActive && onFullscreen && (
        <button className="pomo-fullscreen" onClick={onFullscreen} title="Fullscreen Focus Mode">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      )}

      {/* Configuration panel */}
      {configOpen && (phase === 'idle' || phase === 'finished') && (
        <div className="pomo-config">
          <div className="pomo-config-row">
            <span className="pomo-config-label">Tier</span>
            <div className="pomo-config-btns">
              <button className={`pomo-config-btn ${pickMode === 'easy' ? 'active' : ''}`} onClick={() => setPickMode('easy')}>🟢 Easy</button>
              <button className={`pomo-config-btn ${pickMode === 'medium' ? 'active' : ''}`} onClick={() => setPickMode('medium')}>🟡 Medium</button>
              <button className="pomo-config-btn" disabled title="Coming soon">🔴 Hardcore · SOON</button>
            </div>
          </div>
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
          {pickMode === 'hardcore' && (
            <div className="pomo-config-row pomo-config-info" style={{ justifyContent: 'center' }}>
              <span style={{ fontSize: '0.66rem', color: '#f87171' }}>
                🔴 Hardcore: min wager <b>{minWagerFor(pickDur)} 🍃</b> · {hardcoreMultiplier(pickDur)}× · opens in the Focus Domain
              </span>
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
            Start {pickMode === 'easy' ? '🟢' : pickMode === 'medium' ? '🟡' : '🔴'} {pickMode} {pickType === 'pomodoro' && pickBreaks > 0 ? `• ${pickBreaks} break${pickBreaks > 1 ? 's' : ''}` : ''} Session
          </button>
          <button className="pomo-config-start pomo-config-connect" onClick={() => setShowConnect(true)}>
            🔗 Hardcore Connect {deviceCount > 0 ? `· ${deviceCount} device${deviceCount > 1 ? 's' : ''}` : ''}
          </button>
        </div>
      )}

      {showConnect && (
        <div className="udm-overlay" onClick={() => setShowConnect(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="udm-head">
              <div className="udm-head-left"><span className="udm-head-name">Hardcore Connect</span></div>
              <button className="udm-close" onClick={() => setShowConnect(false)}>×</button>
            </div>
            <div className="udm-body" style={{ maxHeight: '70vh', overflow: 'auto', padding: '0.75rem' }}>
              <DeviceConnect />
            </div>
          </div>
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
  // Detected device tier — reacts when the app-start probe completes.
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(() => getCachedDeviceProfile())
  useEffect(() => onDeviceProfile(setDeviceProfile), [])

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
              value={s.postProcessing === 'off' ? 'low' : s.postProcessing}
              options={[
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
            {/* Detected device read-out from the app-start probe — proves the
                auto-detection actually ran and shows what it decided. */}
            <div className="set-row set-row--device">
              <span>Detected device</span>
              <span className={`ls-device-tier ls-device-tier--${deviceProfile?.tier ?? 'high'}`}>
                {deviceProfile
                  ? deviceProfile.tier === 'low'
                    ? 'Low'
                    : deviceProfile.tier === 'medium'
                      ? 'Medium'
                      : deviceProfile.tier === 'blocked'
                        ? 'Blocked'
                        : 'High'
                  : 'Detecting…'}
              </span>
            </div>
          </Section>

          <Section title="Players & Performance">
            <Toggle
              label="Show name tags"
              value={s.showNameTags}
              onChange={(v) => s.set('showNameTags', v)}
            />
            <Toggle
              label="Show name tags for distant players"
              value={s.distantTags}
              onChange={(v) => s.set('distantTags', v)}
            />
            <Toggle
              label="Pause rendering when tab is hidden"
              value={s.pauseWhenHidden}
              onChange={(v) => s.set('pauseWhenHidden', v)}
            />
          </Section>

          <Section title="Cinematic Tour (key 9)">
            <Toggle label="Enable cinematic tour" value={s.cinematicTour} onChange={(v) => s.set('cinematicTour', v)} />
            <Toggle label="Cinematic camera zoom (dolly between shots)" value={s.cinematicZoom} onChange={(v) => s.set('cinematicZoom', v)} />
            <Toggle label="Bloom during cinematic" value={s.bloom} onChange={(v) => s.set('bloom', v)} />
          </Section>

          <Section title="Audio">
            <Toggle label="Rain sound" value={s.rainOn} onChange={(v) => s.set('rainOn', v)} />
            <Slider
              label="Rain volume"
              display={`${Math.round(s.rainVol * 100)}%`}
              value={s.rainVol}
              min={0}
              max={1}
              step={0.05}
              disabled={!s.rainOn}
              onChange={(v) => s.set('rainVol', v)}
            />
          </Section>

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

          <Section title="Power">
            <Toggle
              label="Keep screen awake (prevent sleep while studying)"
              value={s.keepAwake}
              onChange={(v) => s.set('keepAwake', v)}
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

/* --------------------------------------------------- mobile realm interior HUD */

/**
 * Mobile-only interior UI for the 3D realm. The desktop layout (top bars,
 * roster, help mascot, seated panel, pomodoro chip) is far too dense and
 * confusing on a phone, so on touch devices we swap it for a single clean
 * bottom dock: Settings · Calc · Focus · Leave — plus the movement controls.
 * Everything else (music, social, focus domain) stays reachable via their own
 * always-on widgets.
 */
function MobileRealmHud({
  realm,
  navigate,
  settingsOpen,
  setSettingsOpen,
  calcOpen,
  setCalcOpen,
  setFpOpen,
}: {
  realm: ActiveRealm | null
  navigate: (path: string) => void
  settingsOpen: boolean
  setSettingsOpen: (v: boolean | ((p: boolean) => boolean)) => void
  calcOpen: boolean
  setCalcOpen: (v: boolean | ((p: boolean) => boolean)) => void
  setFpOpen: (v: boolean | ((p: boolean) => boolean)) => void
}) {
  const leave = () => {
    useWorld.getState().stand()
    navigate('/lobby/realm/choose')
  }

  return (
    <>
      <div className="explore-topleft">
        <button className="explore-back" onClick={() => navigate('/lobby/realm/choose')} title="Back to realms">
          ‹ Realms
        </button>
        <span className="sf-pill">{realm ? realm.name : 'Realm'}</span>
      </div>

      <Joystick />
      <button
        className="explore-jump"
        onPointerDown={() => (joystick.jump = true)}
        onPointerUp={() => (joystick.jump = false)}
        onPointerCancel={() => (joystick.jump = false)}
      >
        Jump
      </button>

      <div className="mrh-dock">
        <button className="mrh-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
          <GearGlyph />
          <span>Settings</span>
        </button>
        <button className="mrh-btn" onClick={() => setCalcOpen((v) => !v)} aria-label="Calculator">
          <CalcGlyph />
          <span>Calc</span>
        </button>
        <button className="mrh-btn" onClick={() => setFpOpen(true)} aria-label="Focus timer">
          <SunGlyph />
          <span>Focus</span>
        </button>
        <button className="mrh-btn mrh-leave" onClick={leave} aria-label="Leave realm">
          <span>Leave</span>
        </button>
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {calcOpen && <LibraryCalc onClose={() => setCalcOpen(false)} />}
    </>
  )
}
