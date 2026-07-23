import { useEffect, useRef, useState } from 'react'
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
import { usePomodoro, SESSION_OPTIONS, computeSegments } from '../store/pomodoro'
import type { TimerType } from '../store/pomodoro'
import { getRemoteOccupied } from '../multiplayer/net'
import { useWorld } from '../store/world'
import { useDesk } from '../store/desk'
import { useMagnet } from '../store/magnet'
import { useRealm, type ActiveRealm } from '../store/realm'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useAvatar } from '../avatar/store'
import { trainStationEnabled } from '../lib/realm'
import { enterRealmLowFirst } from '../three/realmQuality'
import { useRealmNet, joinRealm, leaveRealm, updateIdentity, networkId } from '../multiplayer/net'
import { assignInstance, startHeartbeat, leavePresence, REALM_CAPACITY } from '../lib/realmPresence'
import { PublicPlayerTag, type PublicPlayer } from '../components/PublicPlayerTag'
import { Icon } from '../components/magnet/Icon'
import { LibraryFriendsPanel } from '../components/library/LibraryFriendsPanel'
import { LibraryCalc } from '../calc/ui/LibraryCalc'
import { MusicPlayer } from '../components/library/MusicPlayer'
import { TrainHUD } from '../components/train/TrainHUD'
import { SeatSelectionOverlay } from '../components/library/SeatSelectionOverlay'
import { CinematicEntry } from '../components/library/CinematicEntry'
import { FlagshipUnavailable } from '../components/FlagshipUnavailable'
import { useSeatFlow } from '../store/seatFlow'
import './Explore.css'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export interface ExploreProps {
  defaultWorld?: 'library' | 'train-station'
}

export function Explore({ defaultWorld }: ExploreProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Read world from URL query parameter, or fall back to defaultWorld prop
  const searchParams = new URLSearchParams(location.search)
  const worldFromUrl = (searchParams.get('world') as 'library' | 'train-station') || defaultWorld

  const realm = useRealm((s) => s.active)
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const fps = useSettings((s) => s.fps)
  const brightness = useSettings((s) => s.brightness)
  const set = useSettings((s) => s.set)
  const hidden = useHud((s) => s.widgetsHidden)
  const perfMode = useHud((s) => s.perfMode)
  const seatFlowStage = useSeatFlow((s) => s.stage)
  useAudio()
  useExploreShortcuts()

  // Determine which world to render: use worldFromUrl if available, otherwise use defaultWorld prop, otherwise use realm.world
  const isTrain = worldFromUrl === 'train-station' || defaultWorld === 'train-station' || realm?.world === 'train-station'

  // Auto-minimize the desk whenever the player sits down, so the seated avatar (and
  // its sitting animation) stays visible behind a small chip rather than the full
  // Study Station panel. The player taps the chip to expand the desk when studying.
  const seat = useWorld((s) => s.seat)
  const cinematic = useWorld((s) => s.cinematic)
  const wasSeated = useRef(false)
  useEffect(() => {
    if (seat != null && !wasSeated.current) useDesk.getState().setView('min')
    wasSeated.current = seat != null
  }, [seat])

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
  useEffect(() => {
    const sync = () => {
      const occupied = getRemoteOccupied()
      useSeatFlow.getState().setOccupied(occupied)
    }
    sync()
    const id = window.setInterval(sync, 2000)
    return () => window.clearInterval(id)
  }, [])

  // Enter a realm in Third-person so the player always sees their own character —
  // never spawn body-less in First-person. (They can switch to First afterward.)
  useEffect(() => {
    if (useSettings.getState().cameraMode === 'first') set('cameraMode', 'third')
  }, [set])

  // Realm-entry quality: open at Low for a fast settle, then auto-step up (or
  // restore the manual choice) once the scene reports ready. See realmQuality.ts.
  useEffect(() => {
    enterRealmLowFirst()
  }, [])

  // Experimental-realm route guard. If someone reaches a flagship route while it
  // is hidden (public build, no dev access) — e.g. a stale link or a manual
  // navigation — show an under-development screen instead of the scene. The scene
  // and all its code stay intact; it simply isn't rendered until re-enabled.
  // Placed after every hook above so the rules of hooks are never broken.
  if (isTrain && !trainStationEnabled()) {
    return <FlagshipUnavailable name="Train Station Realm" />
  }

  return (
    <div className="explore-root">
      {/* Realm fullscreen enforcement — mobile/tablet only. Desktop is untouched. */}
      <RealmFullscreenGate />
      {isTrain ? (
        <TrainStationScene onReady={() => setReady(true)} />
      ) : (
        <LibraryScene
          onReady={() => setReady(true)}
          frameloop={seatFlowStage === 'selecting' ? 'demand' : 'always'}
        />
      )}
      <PomodoroTicker />
      {!cinematic && <RealmConnection />}

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
            <button className="explore-back" onClick={() => navigate('/realm')} title="Back to realms">
              ‹ Realms
            </button>
            <span className="sf-pill">{realm ? realm.name : 'Realm'}</span>
            {realm?.kind === 'global' && <span className="sf-pill realm-kind">Global</span>}
            {realm?.kind === 'custom' && <span className="sf-pill realm-kind">Private</span>}
            {fps && <FpsMeter />}
          </div>

          {/* top-center: pomodoro */}
          <PomodoroChip />

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

          {hint && (
            <div className="explore-hint" onPointerDown={() => setHint(false)}>
              {isTouch
                ? 'Drag to look · joystick to walk · tap Jump'
                : 'Drag to look · WASD move · 1/2/3 view · Tab hide UI · Ctrl+F performance'}
            </div>
          )}

          <RoomRoster />

          <CameraSwitch />

          <SeatPrompt />
          <SeatedPanel />

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
      {!isTrain && !cinematic && (
        <div className="cine-controls">
          <span className="magic-hint">Press <b>9</b> to see the magic ✨</span>
          <div className="cine-keyrow">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
              <button
                key={k}
                type="button"
                className={`cine-key${k === '9' ? ' magic' : ''}`}
                title={k === '9' ? 'Cinematic Tour (key 9)' : `Camera preset ${k}`}
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
      {!isTrain && !cinematic && <MusicPlayer />}
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
      await joinRealm(channel, { id, name, country: country ?? null, rank: rank || '', avatar })
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

  if (!realm) return null

  const self: PublicPlayer = {
    name: displayName || user?.profile?.name || 'You',
    playerId,
    country,
    rank,
  }
  const others: PublicPlayer[] = Object.values(roster).map((p) => ({
    name: p.name,
    country: p.country,
    rank: p.rank,
  }))
  const total = others.length + 1

  return (
    <div className={`room-roster ${open ? 'open' : ''}`}>
      <button className="room-roster-head" onClick={() => setOpen((v) => !v)}>
        <span className="room-roster-dot" />
        In this room <strong>{total}</strong>
        <span className="room-roster-chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="room-roster-list">
          <div className="room-roster-row me">
            <PublicPlayerTag player={self} size="sm" />
            <span className="room-roster-you">You</span>
          </div>
          {others.map((p: PublicPlayer, i: number) => (
            <div key={`${p.name}-${i}`} className="room-roster-row">
              <PublicPlayerTag player={p} size="sm" />
            </div>
          ))}
          {others.length === 0 && (
            <p className="room-roster-empty">
              You’re the only one here right now.
              <br />
              <span>Others studying in this realm will appear here live.</span>
            </p>
          )}
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
function SeatedPanel() {
  const seat = useWorld((s) => s.seat)
  const { phase, remaining, running, toggle, forfeit } = usePomodoro()
  // What the student is studying — tags every completed focus block so analytics
  // can break focus time down by subject. Options come from Task Magnet.
  const subject = usePomodoro((s) => s.subject)
  const setSubject = usePomodoro((s) => s.setSubject)
  const subjects = useMagnet((s) => s.data.subjects)
  // Goals / notes / view live in the persisted desk store so they survive
  // stand-up → sit-down and page refreshes (never cleared on stand up).
  const goals = useDesk((s) => s.goals)
  const draft = useDesk((s) => s.draft)
  const note = useDesk((s) => s.note)
  const view = useDesk((s) => s.view)
  const desk = useDesk.getState

  // Change-seat cooldown: 10 minutes from when the user sat down
  const seatLockUntil = useSeatFlow((s) => s.seatLockUntil)
  const [seatCooldown, setSeatCooldown] = useState(0)
  useEffect(() => {
    if (seatLockUntil == null) { setSeatCooldown(0); return }
    const tick = () => {
      const sec = Math.max(0, Math.ceil((seatLockUntil - Date.now()) / 1000))
      setSeatCooldown(sec)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [seatLockUntil])
  const canChangeSeat = seatCooldown === 0
  const seatMm = String(Math.floor(seatCooldown / 60)).padStart(2, '0')
  const seatSs = String(seatCooldown % 60).padStart(2, '0')
  const [seatInput, setSeatInput] = useState('')

  const handleChangeSeatToNumber = () => {
    const num = parseInt(seatInput, 10)
    const seats = useSeatFlow.getState().seats
    const occupied = useSeatFlow.getState().occupied
    if (isNaN(num) || num < 0 || num >= seats.length) return
    if (occupied[num]) return
    useWorld.getState().stand()
    useSeatFlow.getState().pickSeat(num)
    useSeatFlow.getState().startWalk()
    useSeatFlow.getState().arrive()
    useWorld.getState().sit(num)
    useSeatFlow.getState().markEntrancePlayed()
    setSeatInput('')
  }

  const [goalsOpen, setGoalsOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)

  if (seat == null) return null

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const label = phase === 'idle' ? 'Ready' : phase === 'running' ? 'Studying' : phase === 'break' ? 'Break' : phase === 'paused' ? 'Paused' : 'Done'

  // minimized → a small unobtrusive chip so the world is fully visible, with a
  // compact stand-up beside it (the panel header isn't shown while minimized)
  if (view === 'min') {
    return (
      <div className="station-min">
        <button className="station-chip" onClick={() => desk().setView('open')} title="Open your desk">
          <span className="station-chip-dot" /> {phase === 'idle' ? 'Your desk' : `${mm}:${ss}`} ▸
        </button>
        <span className="station-seat-input-wrap">
          <input
            className="station-seat-input"
            type="number"
            min="0"
            placeholder="Seat #"
            value={seatInput}
            onChange={(e) => setSeatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChangeSeatToNumber()}
            title={canChangeSeat ? 'Enter seat number to change' : `You sat ${seatMm}:${seatSs} ago — switch anytime`}
          />
          <button
            className={`station-change-seat ${seatInput ? 'ready' : ''}`}
            onClick={handleChangeSeatToNumber}
            disabled={!seatInput}
          >
            ↕
          </button>
        </span>
        <button className="station-min-stand" onClick={() => { useSeatFlow.getState().unlock(); useSeatFlow.getState().clearSeat(); useWorld.getState().stand(); }} title="Stand up (leave chair)">
          ⤴ Stand up
        </button>
    </div>
  )
  }

  return (
    <div className={`station ${view === 'collapsed' ? 'collapsed' : ''}`} data-no-hotkeys>
      <div className="station-head">
        <div className="station-head-left">
          <h2>Your desk</h2>
        </div>
        <div className="station-head-actions">
          <button className="station-head-btn" title={view === 'collapsed' ? 'Expand' : 'Collapse'} onClick={() => desk().setView(view === 'collapsed' ? 'open' : 'collapsed')}>
            {view === 'collapsed' ? '▴' : '▾'}
          </button>
          <button className="station-head-btn" title="Minimize" onClick={() => desk().setView('min')}>
            –
          </button>
        </div>
      </div>

      <div className="station-body">
        {/* Focus Timer */}
        <div className="station-sect">
          <div className="station-timer">
            <span className="station-time-label">{label}</span>
            <span className="station-time">{phase === 'idle' ? '--:--' : `${mm}:${ss}`}</span>
            <div className="station-timer-actions">
              <button className="station-timer-btn primary" onClick={toggle}>
                {phase === 'idle' ? 'Start' : running ? 'Pause' : 'Resume'}
              </button>
              <button className="station-timer-btn" onClick={forfeit}>
                Forfeit
              </button>
            </div>
          </div>
          <input
            className="station-subject-input"
            list="station-subjects"
            placeholder="What are you studying?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <datalist id="station-subjects">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {/* Daily Goals */}
        <div className="station-sect">
          <div className="station-sect-header">
            <h3>Daily Goals</h3>
            <button className="station-sect-toggle" onClick={() => setGoalsOpen((v) => !v)}>
              {goalsOpen ? '▾' : '▸'}
            </button>
          </div>
          {goalsOpen && (
            <>
              <div className="station-goals">
                {goals.length === 0 && <p className="station-empty">Nothing yet</p>}
                {goals.map((g, i) => (
                  <label key={i} className={`station-goal ${g.done ? 'done' : ''}`}>
                    <input type="checkbox" checked={g.done} onChange={() => desk().toggleGoal(i)} />
                    <span>{g.t}</span>
                    <button type="button" className="station-goal-x" title="Remove" onClick={(e) => { e.preventDefault(); desk().removeGoal(i) }}>×</button>
                  </label>
                ))}
              </div>
              <form className="station-goal-form" onSubmit={(e) => { e.preventDefault(); desk().addGoal(draft) }}>
                <input className="station-goal-input" placeholder="Add a goal…" value={draft} onChange={(e) => desk().setDraft(e.target.value)} />
                <button className="station-goal-add" type="submit">Add</button>
              </form>
            </>
          )}
        </div>

        {/* Scratch Notes */}
        <div className="station-sect">
          <div className="station-sect-header">
            <h3>Scratch Notes</h3>
            <button className="station-sect-toggle" onClick={() => setNotesOpen((v) => !v)}>
              {notesOpen ? '▾' : '▸'}
            </button>
          </div>
          {notesOpen && (
            <textarea className="station-notes" placeholder="Jot anything down…" value={note} onChange={(e) => desk().setNote(e.target.value)} />
          )}
        </div>
      </div>

      {/* Footer — change seat + stand up */}
      <div className="station-footer">
        <button className="station-footer-btn danger" onClick={() => useWorld.getState().stand()}>
          Stand up
        </button>
        <span className="station-seat-input-wrap">
          <input
            className="station-seat-input"
            type="number"
            min="0"
            placeholder="Seat #"
            value={seatInput}
            onChange={(e) => setSeatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChangeSeatToNumber()}
            title={canChangeSeat ? 'Enter seat number to change' : `You sat ${seatMm}:${seatSs} ago — switch anytime`}
          />
          <button
            className={`station-footer-btn ${seatInput ? 'ready' : ''}`}
            onClick={handleChangeSeatToNumber}
            disabled={!seatInput}
          >
            Go
          </button>
        </span>
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

function PomodoroChip() {
  const { phase, remaining, running, toggle, forfeit, subject, completed, timerType, sessionMinutes, breakCount, configure, segmentsCompleted, totalSessionLeaves } = usePomodoro()
  const show = useSettings((s) => s.pomo.showTimer)
  const [configOpen, setConfigOpen] = useState(false)
  const [pickType, setPickType] = useState<TimerType>(timerType)
  const [pickDur, setPickDur] = useState(sessionMinutes)
  const [pickBreaks, setPickBreaks] = useState(breakCount)
  if (!show) return null
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
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

  return (
    <div className="explore-pomo-wrap">
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
              <span className="pomo-time">{mm}:{ss}</span>
            )}
          </div>
        </div>
        {isActive && (
          <button className="pomo-play" onClick={toggle} title={running ? 'Pause' : 'Resume'}>
            <Icon name={running ? 'pause' : 'play'} size={16} />
          </button>
        )}
        {/* Session leaves counter */}
        {phase !== 'idle' && totalSessionLeaves > 0 && (
          <div className="pomo-session-xp">🍃 {totalSessionLeaves}</div>
        )}
      </div>

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
          <button className="pomo-config-start" onClick={handleStart}>
            Start {pickType === 'pomodoro' && pickBreaks > 0 ? `• ${pickBreaks} break${pickBreaks > 1 ? 's' : ''}` : ''} Session
          </button>
        </div>
      )}

      {/* Segment progress dots */}
      {isActive && (
        <div className="pomo-segments">
          {computeSegments(sessionMinutes, breakCount).map((_, i) => (
            <span key={i} className={`pomo-seg-dot ${i < segmentsCompleted ? 'filled' : ''} ${i === segmentsCompleted && phase === 'running' ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------------- fps */

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

          <Section title="Focus timer">
            <FocusLength value={s.pomo.study} onChange={(v) => s.setPomo({ study: v })} />
            <Stepper label="Break (min)" value={s.pomo.break} onChange={(v) => s.setPomo({ break: v })} min={1} max={60} step={1} />
            <Stepper label="Long break (min)" value={s.pomo.longBreak} onChange={(v) => s.setPomo({ longBreak: v })} min={5} max={90} step={5} />
            <Toggle label="Auto-start next session" value={s.pomo.autoStart} onChange={(v) => s.setPomo({ autoStart: v })} />
            <Toggle label="Notification sound" value={s.pomo.sound} onChange={(v) => s.setPomo({ sound: v })} />
            <Toggle label="Show timer on screen" value={s.pomo.showTimer} onChange={(v) => s.setPomo({ showTimer: v })} />
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
