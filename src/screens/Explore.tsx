import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LibraryScene } from '../three/library/LibraryScene'
import { LoadingVeil } from '../components/LoadingVeil'
import { useAudio } from '../audio/useAudio'
import { joystick } from '../three/library/input'
import { useSettings, type CameraMode, type Quality } from '../store/settings'
import { Section, Toggle, Slider, Stepper, Seg, FocusLength } from '../components/settings/controls'
import { usePomodoro } from '../store/pomodoro'
import { useWorld } from '../store/world'
import { useDesk } from '../store/desk'
import { useRealm } from '../store/realm'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { GLOBAL_ROOMS, mockOccupancy } from '../lib/realm'
import { mockRoster } from '../lib/presenceMock'
import { PublicPlayerTag, type PublicPlayer } from '../components/PublicPlayerTag'
import { Icon } from '../components/magnet/Icon'
import { LibraryFriendsPanel } from '../components/library/LibraryFriendsPanel'
import './Explore.css'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export function Explore() {
  const navigate = useNavigate()
  const realm = useRealm((s) => s.active)
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fps = useSettings((s) => s.fps)
  const ambientOn = useSettings((s) => s.ambientOn)
  const master = useSettings((s) => s.master)
  const set = useSettings((s) => s.set)
  useAudio()

  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 8000)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="explore-root">
      <LibraryScene onReady={() => setReady(true)} />
      <PomodoroTicker />

      {!ready && (
        <div className="explore-veil">
          <LoadingVeil label="Entering the library…" />
        </div>
      )}

      {/* top-left: lobby + realm + fps */}
      <div className="explore-topleft">
        <button className="sf-btn secondary" onClick={() => navigate('/realm')}>
          ‹ Realms
        </button>
        <span className="sf-pill">{realm ? realm.name : 'Realm'}</span>
        {realm?.kind === 'global' && <span className="sf-pill realm-kind">Global</span>}
        {realm?.kind === 'custom' && <span className="sf-pill realm-kind">Private</span>}
        {fps && <FpsMeter />}
      </div>

      {/* top-center: pomodoro */}
      <PomodoroChip />

      {/* top-right: music quick + settings */}
      <div className="explore-topright">
        <button
          className={`explore-iconbtn ${ambientOn ? 'on' : ''}`}
          onClick={() => set('ambientOn', !ambientOn)}
          title={ambientOn ? 'Mute ambience' : 'Play ambience'}
        >
          <MusicGlyph on={ambientOn} />
        </button>
        <input
          className="explore-vol"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={master}
          onChange={(e) => set('master', Number(e.target.value))}
          aria-label="Master volume"
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
            : 'Drag to look · WASD move · Shift run · Space jump · F5 / buttons to switch view'}
        </div>
      )}

      <RoomRoster />

      <CameraSwitch />

      <SeatPrompt />
      <SeatedPanel />

      {/* collapsible friends chat — hidden behind an edge tab, never covers work */}
      <LibraryFriendsPanel />

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
    </div>
  )
}

/* ----------------------------------------------------------------- roster */

/**
 * "In this room" — the public-lobby player list. For Global realms it shows the
 * current user plus a stable mock roster (real presence sync isn't wired yet,
 * see realm.ts). Every entry renders ONLY the public fields via PublicPlayerTag:
 * country flag, username, rank badge — never age, email, name, or provider.
 */
function RoomRoster() {
  const { user } = useAuth()
  const country = useProfile((s) => s.data.country)
  const rank = useProfile((s) => s.data.rank)
  const realm = useRealm((s) => s.active)
  const [open, setOpen] = useState(true)

  const roster = useMemo<PublicPlayer[]>(() => {
    if (realm?.kind !== 'global' || !realm.roomId) return []
    const room = GLOBAL_ROOMS.find((r) => r.id === realm.roomId)
    const seed = room?.seed ?? 1
    // room occupancy includes us; fill the rest from the mock roster
    const others = Math.max(0, mockOccupancy(seed) - 1)
    return mockRoster(seed, others)
  }, [realm])

  if (realm?.kind !== 'global') return null

  const self: PublicPlayer = {
    username: user?.profile?.name || user?.email?.split('@')[0] || 'You',
    country,
    rank,
  }
  const total = roster.length + 1

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
          {roster.map((p: PublicPlayer, i: number) => (
            <div key={`${p.username}-${i}`} className="room-roster-row">
              <PublicPlayerTag player={p} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- camera view */

/**
 * Minecraft-style camera switch (First · Front · Third), always visible so the
 * player can see their character without hunting for hotkeys. Mirrors F1/F2/F3
 * and the F5 cycle handled in PlayerController. Hidden while seated (the desk
 * locks the view).
 */
const CAM_MODES: { id: CameraMode; label: string }[] = [
  { id: 'first', label: 'First' },
  { id: 'front', label: 'Front' },
  { id: 'third', label: 'Third' },
]

function CameraSwitch() {
  const mode = useSettings((s) => s.cameraMode)
  const set = useSettings((s) => s.set)
  const seat = useWorld((s) => s.seat)
  if (seat != null) return null
  return (
    <div className="explore-cam">
      {CAM_MODES.map((m) => (
        <button
          key={m.id}
          className={`explore-cam-btn ${mode === m.id ? 'on' : ''}`}
          onClick={() => set('cameraMode', m.id)}
        >
          {m.label}
        </button>
      ))}
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
  const { mode, remaining, running, toggle, skip, reset } = usePomodoro()
  // Goals / notes / view live in the persisted desk store so they survive
  // stand-up → sit-down and page refreshes (never cleared on stand up).
  const goals = useDesk((s) => s.goals)
  const draft = useDesk((s) => s.draft)
  const note = useDesk((s) => s.note)
  const view = useDesk((s) => s.view)
  const desk = useDesk.getState
  if (seat == null) return null

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const label = mode === 'idle' ? 'Ready' : mode === 'study' ? 'Studying' : mode === 'long' ? 'Long break' : 'Break'

  // minimized → a small unobtrusive chip so the world is fully visible, with a
  // compact stand-up beside it (the panel header isn't shown while minimized)
  if (view === 'min') {
    return (
      <div className="station-min">
        <button className="station-chip" onClick={() => desk().setView('open')} title="Open your desk">
          <span className="station-chip-dot" /> {mode === 'idle' ? 'Your desk' : `${mm}:${ss}`} ▸
        </button>
        <button className="station-min-stand" onClick={() => useWorld.getState().stand()} title="Stand up (leave chair)">
          ⤴ Stand up
        </button>
      </div>
    )
  }

  return (
    <div className={`station ${view === 'collapsed' ? 'collapsed' : ''}`} data-no-hotkeys>
      <div className="station-head">
        <div className="station-title">
          <span className="sf-pill">Study Station</span>
          <h2>Your desk</h2>
        </div>
        <div className="station-controls">
          <button
            className="station-ctrl"
            title={view === 'collapsed' ? 'Expand' : 'Collapse'}
            onClick={() => desk().setView(view === 'collapsed' ? 'open' : 'collapsed')}
          >
            {view === 'collapsed' ? '▴' : '▾'}
          </button>
          <button className="station-ctrl" title="Minimize" onClick={() => desk().setView('min')}>
            –
          </button>
          <button className="station-stand" onClick={() => useWorld.getState().stand()}>
            ⤴ Stand up
          </button>
          <button className="station-x" title="Stand up (leave chair)" aria-label="Stand up" onClick={() => useWorld.getState().stand()}>
            ✕
          </button>
        </div>
      </div>

      <div className="station-grid">
        <div className="station-card">
          <h3><Icon name="clock" size={16} /> Focus timer</h3>
          <div className={`station-timer ${mode}`}>
            <span className="station-mode">{label}</span>
            <span className="station-time">{mode === 'idle' ? '25:00' : `${mm}:${ss}`}</span>
          </div>
          <div className="station-row">
            <button className="sf-btn" onClick={toggle}>
              {running ? 'Pause' : 'Start'}
            </button>
            <button className="sf-btn secondary" onClick={skip}>
              Skip
            </button>
            <button className="sf-btn secondary" onClick={reset}>
              Reset
            </button>
          </div>
        </div>

        <div className="station-card">
          <h3><Icon name="target" size={16} /> Daily goals</h3>
          <div className="station-goals">
            {goals.length === 0 && <p className="station-empty">Add what you want to get done today.</p>}
            {goals.map((g, i) => (
              <label key={i} className={`station-goal ${g.done ? 'done' : ''}`}>
                <input type="checkbox" checked={g.done} onChange={() => desk().toggleGoal(i)} />
                <span>{g.t}</span>
                <button
                  type="button"
                  className="station-goal-x"
                  title="Remove"
                  aria-label="Remove goal"
                  onClick={(e) => {
                    e.preventDefault()
                    desk().removeGoal(i)
                  }}
                >
                  ×
                </button>
              </label>
            ))}
          </div>
          <form
            className="station-row"
            onSubmit={(e) => {
              e.preventDefault()
              desk().addGoal(draft)
            }}
          >
            <input className="sf-input" placeholder="New goal…" value={draft} onChange={(e) => desk().setDraft(e.target.value)} />
            <button className="sf-btn" type="submit">
              Add
            </button>
          </form>
        </div>

        <div className="station-card wide">
          <h3><Icon name="note" size={16} /> Scratch notes</h3>
          <textarea className="station-notes" placeholder="Jot anything down…" value={note} onChange={(e) => desk().setNote(e.target.value)} />
        </div>
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

function PomodoroChip() {
  const { mode, remaining, running, toggle, skip } = usePomodoro()
  const show = useSettings((s) => s.pomo.showTimer)
  if (!show) return null
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const label = mode === 'idle' ? 'Focus' : mode === 'study' ? 'Study' : mode === 'long' ? 'Long break' : 'Break'
  return (
    <div className={`explore-pomo ${mode}`}>
      <span className="explore-pomo-label">{label}</span>
      <span className="explore-pomo-time">{mode === 'idle' ? '25:00' : `${mm}:${ss}`}</span>
      <button className="explore-pomo-btn" onClick={toggle} title={running ? 'Pause' : 'Start'}>
        <Icon name={running ? 'pause' : 'play'} size={15} />
      </button>
      <button className="explore-pomo-btn" onClick={skip} title="Skip">
        <Icon name="skip" size={15} />
      </button>
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
            <Seg<Quality>
              label="Quality"
              value={s.quality}
              options={[
                ['low', 'Low'],
                ['medium', 'Medium'],
                ['high', 'High'],
              ]}
              onChange={(v) => s.set('quality', v)}
            />
            <Toggle label="Cinematic effects (bloom + fog)" value={s.cinematic} onChange={(v) => s.set('cinematic', v)} />
            <Toggle label="Show FPS counter" value={s.fps} onChange={(v) => s.set('fps', v)} />
          </Section>

          <Section title="Focus timer">
            <FocusLength value={s.pomo.study} onChange={(v) => s.setPomo({ study: v })} />
            <Stepper label="Break (min)" value={s.pomo.break} onChange={(v) => s.setPomo({ break: v })} min={1} max={60} step={1} />
            <Stepper label="Long break (min)" value={s.pomo.longBreak} onChange={(v) => s.setPomo({ longBreak: v })} min={5} max={90} step={5} />
            <Toggle label="Auto-start next session" value={s.pomo.autoStart} onChange={(v) => s.setPomo({ autoStart: v })} />
            <Toggle label="Notification sound" value={s.pomo.sound} onChange={(v) => s.setPomo({ sound: v })} />
            <Toggle label="Show timer on screen" value={s.pomo.showTimer} onChange={(v) => s.setPomo({ showTimer: v })} />
          </Section>

          <Section title="Audio">
            <Slider label="Master volume" value={s.master} onChange={(v) => s.set('master', v)} />
            <Slider label="Ambient music" value={s.ambientVol} onChange={(v) => s.set('ambientVol', v)} />
            <Slider label="Rain / weather" value={s.rainVol} onChange={(v) => s.set('rainVol', v)} />
            <Toggle label="Ambient music" value={s.ambientOn} onChange={(v) => s.set('ambientOn', v)} />
            <Toggle label="Rain sounds" value={s.rainOn} onChange={(v) => s.set('rainOn', v)} />
          </Section>

          <Section title="World">
            <Seg
              label="Weather"
              value={s.weatherAuto ? 'auto' : s.weather}
              options={[
                ['auto', 'Auto'],
                ['clear', 'Clear'],
                ['light-rain', 'Light'],
                ['heavy-rain', 'Storm'],
                ['fog', 'Fog'],
              ]}
              onChange={(v) => {
                if (v === 'auto') s.set('weatherAuto', true)
                else {
                  s.set('weatherAuto', false)
                  s.set('weather', v as typeof s.weather)
                }
              }}
            />
            <Toggle label="Pause day / night cycle" value={s.timePaused} onChange={(v) => s.set('timePaused', v)} />
            <Slider label="Time speed" value={s.timeSpeed / 4} onChange={(v) => s.set('timeSpeed', Math.max(0.1, v * 4))} />
          </Section>

          <Section title="View & Accessibility">
            <Seg<CameraMode>
              label="Camera"
              value={s.cameraMode}
              options={[
                ['first', 'First (F1)'],
                ['third', 'Third (F2)'],
                ['front', 'Front (F3)'],
              ]}
              onChange={(v) => s.set('cameraMode', v)}
            />
            <Slider label="Look sensitivity" value={(s.sensitivity - 0.2) / 1.8} onChange={(v) => s.set('sensitivity', 0.2 + v * 1.8)} />
            <Toggle label="Invert mouse Y" value={s.invertY} onChange={(v) => s.set('invertY', v)} />
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

function MusicGlyph({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V6l10-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
      {!on && <line x1="3" y1="3" x2="21" y2="21" />}
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
