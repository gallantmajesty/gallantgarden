import { useCallback, useEffect, useRef, useState } from 'react'
import { useTrain, DEPARTURE_SEC, ARRIVAL_CINEMATIC_SEC, EXPLORE_SEC } from '../../store/train'
import { useStation } from '../../store/station'
import { TRAIN_LINES } from '../../lib/train/lines'
import { departureBoard, statusLabel, fmtCountdown, fmtHuman, platformStatus } from '../../lib/train/schedule'
import { xpFor, coinsFor } from '../../lib/train/rewards'
import { isMuted, setMuted } from '../../three/train/audio'
import { Journal, StatsPanel, SettingsPanel, ChatOverlay, PassengerList, QuickActions, ReactionBar } from './ui'
import './TrainHUD.css'

// ============================================================================
// Train Station Realm — the 2D HUD that rides above the 3D world. It is the only
// place a journey is started, watched and finished, so it is the realm's primary
// interface. It is purely a function of the journey store (phase) + the station
// store (which platform you're standing beside), so it always agrees with the
// world beneath it. Four faces, one per phase:
//
//   browsing   → a live Departures board + a "Press E to board" prompt when you
//                step into a platform's boarding zone.
//   boarding   → the Boarding Card: route, reward preview and a seat picker; you
//                pick a seat and depart (or step back off).
//   traveling  → the Journey dock: destination, a streaming progress bar, the
//                countdown to arrival, and a guarded "leave train" escape hatch.
//   arrived    → the Arrival screen: the reward you earned (XP / coins / tickets
//                / distance) and any achievements, then back to the concourse.
//
// isTouch decides whether prompts say "Press E" or render a tappable button.
// ============================================================================

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** Re-render on a steady cadence so countdowns/progress tick live. Disabled when
 *  inactive so an idle phase costs nothing. */
function useHeartbeat(active: boolean, ms = 500) {
  const [, force] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => force((n) => (n + 1) % 1_000_000), ms)
    return () => window.clearInterval(id)
  }, [active, ms])
}

export function TrainHUD() {
  const phase = useTrain((s) => s.phase)
  const departureSec = useTrain((s) => s.departureSec)
  const [activePanel, setActivePanel] = useState<string | null>(null)

  const togglePanel = useCallback((id: string) => {
    setActivePanel((prev) => (prev === id ? null : id))
  }, [])

  // Keyboard shortcuts for panels
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'KeyJ' && phase === 'traveling') togglePanel('journal')
      if (e.code === 'Escape') setActivePanel(null)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [phase, togglePanel])

  return (
    <>
      {phase === 'browsing' && <BrowsingHud />}
      {phase === 'boarding' && <BoardingCard />}
      {phase === 'traveling' && departureSec > 0 && <DepartureDock />}
      {phase === 'traveling' && departureSec === 0 && (
        <>
          <JourneyDock />
          <MilestoneToast />
          <SeatAssignedToast />
          <QuickActions activePanel={activePanel} onToggle={togglePanel} />
          {activePanel === 'journal' && <Journal onClose={() => setActivePanel(null)} />}
          {activePanel === 'stats' && <StatsPanel onClose={() => setActivePanel(null)} />}
          {activePanel === 'settings' && <SettingsPanel onClose={() => setActivePanel(null)} />}
          {activePanel === 'passengers' && <PassengerList onClose={() => setActivePanel(null)} />}
        </>
      )}
      {phase === 'traveling' && <ChatOverlay />}
      {phase === 'traveling' && <ReactionBar />}
      {phase === 'arriving' && <ArrivalCinematic />}
      {phase === 'exploring' && <ExplorationUI />}
      {phase === 'arrived' && <ArrivalScreen />}
    </>
  )
}

/* ----------------------------------------------------------------- browsing */

function BrowsingHud() {
  const [boardOpen, setBoardOpen] = useState(false)
  return (
    <>
      <DeparturesPanel open={boardOpen} onToggle={() => setBoardOpen((v) => !v)} />
      <BoardingPrompt />
      <AudioMuteToggle />
    </>
  )
}

/** A collapsible, live departures board — the five platforms with their next
 *  arrival / boarding countdowns, pinned to the left edge and out of the way. */
function DeparturesPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  useHeartbeat(open)
  const rows = departureBoard()
  return (
    <div className={`train-dep ${open ? 'open' : ''}`}>
      <button className="train-dep-tab" onClick={onToggle} title="Departures board">
        <span className="train-dep-tab-i">🚉</span>
        <span className="train-dep-tab-t">Departures</span>
      </button>

      {open && (
        <div className="train-dep-panel water-glass">
          <div className="train-dep-head">
            <strong>Departures</strong>
            <span className="train-dep-sub">Live timetable</span>
          </div>
          <ul className="train-dep-list">
            {rows.map((s) => {
              const lbl = statusLabel(s)
              return (
                <li key={s.line.id} className={`train-dep-row ${s.boardable ? 'board' : ''}`}>
                  <span className="train-dep-plat">{s.line.platform}</span>
                  <span className="train-dep-name">
                    <strong>{s.line.name}</strong>
                    <em>→ {s.line.destination}</em>
                  </span>
                  <span className="train-dep-dur">{durationLabel(s.line.minutes)}</span>
                  <span className={`train-dep-status ${s.phase}`}>
                    <b>{lbl.tag}</b>
                    <i>{lbl.detail}</i>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="train-dep-foot">Walk to a platform and press <kbd>E</kbd> to board its train.</p>
        </div>
      )}
    </div>
  )
}

/** When standing in a platform's boarding zone, a centred prompt to board that
 *  line. Always shows the line; the call-to-action adapts to input type. */
function BoardingPrompt() {
  const near = useStation((s) => s.nearPlatform)
  useHeartbeat(near != null)
  if (near == null) return null
  const line = TRAIN_LINES[near]
  if (!line) return null

  // The doors are only open during the line's live boarding window. Outside it
  // the train is either still approaching (or already gone) and the doors are
  // sealed — show a locked/awaiting state instead of "now boarding" (spec 1.4).
  const ps = platformStatus(line)
  const boardable = ps.boardable

  return (
    <div className={`train-prompt water-glass ${boardable ? '' : 'locked'}`} style={accentVars(line.mood.glow, line.mood.accent)}>
      <div className="train-prompt-plat">
        <span className="train-prompt-plat-n">{line.platform}</span>
        <span className="train-prompt-plat-l">Platform</span>
      </div>
      <div className="train-prompt-body">
        <div className="train-prompt-top">
          <strong>{line.name}</strong>
          <span className="train-prompt-dur">{durationLabel(line.minutes)}</span>
        </div>
        <span className="train-prompt-dest">→ {line.destination}</span>
        {boardable ? (
          <span className="train-prompt-status" style={{ color: '#8ef0a8', opacity: 0.95 }}>Now boarding</span>
        ) : ps.phase === 'approaching' ? (
          <span className="train-prompt-status" style={{ color: '#ffd27a', opacity: 0.95 }}>
            Arriving in {fmtCountdown(ps.phaseRemaining)}
          </span>
        ) : (
          <span className="train-prompt-status" style={{ color: '#ff8a8a', opacity: 0.95 }}>
            Doors locked · returns {fmtHuman(ps.untilArrival)}
          </span>
        )}
      </div>
      {boardable ? (
        isTouch ? (
          <button className="sf-btn water train-prompt-cta" onClick={() => useTrain.getState().beginBoarding(line.id)}>
            Board
          </button>
        ) : (
          <div className="train-prompt-key">
            Press <kbd>E</kbd>
            <span>to board</span>
          </div>
        )
      ) : (
        <div className="train-prompt-key locked">
          <span>Wait for boarding</span>
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- boarding */

/** The boarding card: the commitment screen. Shows route info, a seat picker grid,
 *  and a "Board" button. The player picks a seat here or boards and walks to one. */
function BoardingCard() {
  const line = useTrain((s) => s.line)
  if (!line) return null

  const xp = xpFor(line.minutes)
  const coins = coinsFor(line.minutes)
  const tickets = ticketsFor(line.minutes)
  const distance = Math.round((line.minutes / 60) * 72)

  return (
    <div className="train-modal-veil">
      <div className="train-card water-glass" style={accentVars(line.mood.glow, line.mood.accent)}>
        <div className="train-card-glow" />

        <header className="train-card-head">
          <div className="train-card-plat">
            <span className="train-card-plat-n">{line.platform}</span>
            <span>Platform</span>
          </div>
          <div className="train-card-title">
            <span className="sf-pill train-card-kind">Now boarding</span>
            <h2>{line.route}</h2>
            <p className="train-card-dest">→ {line.destination}</p>
          </div>
        </header>

        <p className="train-card-blurb">{line.blurb}</p>

        <div className="train-card-stats">
          <Stat label="Journey" value={durationLabel(line.minutes)} glyph="⏱" />
          <Stat label="Distance" value={`${distance} km`} glyph="🧭" />
          <Stat label="XP" value={`+${xp}`} glyph="✦" />
          <Stat label="Coins" value={`+${coins}`} glyph="🪙" />
          <Stat label="Tickets" value={`+${tickets}`} glyph="🎟" />
        </div>

        <SeatPicker />

        <div className="train-board-info">
          <p>Board the train and walk to any empty seat. Press <kbd>E</kbd> to sit down.</p>
        </div>

        <footer className="train-card-foot">
          <button className="sf-btn water" onClick={() => useTrain.getState().cancelBoarding()}>
            Step back
          </button>
          <button
            className="sf-btn water train-depart"
            onClick={() => useTrain.getState().boardTrain()}
          >
            Board the train →
          </button>
        </footer>
      </div>
    </div>
  )
}

/** Seat picker grid — shows the 5×4 carriage layout with window/aisle labels.
 *  Seats glow when empty, show as taken when occupied, and highlight on hover. */
function SeatPicker() {
  const ROWS = 5
  const COLS = 4
  const COL_LABELS = ['Window', 'Aisle', 'Aisle', 'Window']
  const ROW_LABELS = ['Row 1', 'Row 2', 'Row 3', 'Row 4', 'Row 5']

  return (
    <div className="train-seats">
      <div className="train-seats-head">
        <strong>Choose your seat</strong>
        <span>20 seats per carriage</span>
      </div>
      <div className="train-seats-grid">
        {/* column headers */}
        <div className="train-seat-row">
          <span className="train-seat-rowlabel" />
          {COL_LABELS.map((label, ci) => (
            <span key={ci} className="train-seat-rowlabel" style={{ textAlign: 'center' }}>{label}</span>
          ))}
        </div>
        {/* seat rows */}
        {Array.from({ length: ROWS }, (_, ri) => (
          <div key={ri} className="train-seat-row">
            <span className="train-seat-rowlabel">{ROW_LABELS[ri]}</span>
            {Array.from({ length: COLS }, (_, ci) => {
              const seatIdx = ri * COLS + ci
              const isWindow = ci === 0 || ci === 3
              return (
                <button
                  key={ci}
                  className={`train-seat ${isWindow ? 'window' : ''}`}
                  title={`Seat ${seatIdx + 1} — ${isWindow ? 'Window' : 'Aisle'}`}
                >
                  {seatIdx + 1}
                </button>
              )
            })}
          </div>
        ))}
        {/* legend */}
        <div className="train-seat-row" style={{ marginTop: 4 }}>
          <span className="train-seat-rowlabel" />
          <span className="train-seat-rowlabel" style={{ gridColumn: '2 / 6', textAlign: 'center', fontSize: 9, opacity: 0.45 }}>
            ● Window &nbsp; ● Aisle &nbsp; Pick any seat — or choose in-world
          </span>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- traveling */

/** The journey dock — a wide bottom bar that streams while you study aboard the
 *  moving train, with a guarded escape hatch. */
function JourneyDock() {
  useHeartbeat(true)
  const line = useTrain((s) => s.line)
  const seat = useTrain((s) => s.seat)
  const remaining = useTrain((s) => s.remainingSec)()
  const progress = useTrain((s) => s.progress)()
  const activeSec = useTrain((s) => s.activeFocusSec)
  const [confirmLeave, setConfirmLeave] = useState(false)
  if (!line) return null

  const pct = Math.round(progress * 100)

  return (
    <div className="train-dock water-glass" style={accentVars(line.mood.glow, line.mood.accent)}>
      <div className="train-dock-main">
        <div className="train-dock-route">
          <span className="train-dock-tag">En route</span>
          <strong>→ {line.destination}</strong>
          <em>{line.route}</em>
        </div>

        <div className="train-dock-progress">
          <div className="train-dock-bar">
            <div className="train-dock-fill" style={{ width: `${pct}%` }}>
              <span className="train-dock-loco">🚂</span>
            </div>
          </div>
          <div className="train-dock-meta">
            <span>{pct}% there</span>
            <span className="train-dock-count">{fmtCountdown(remaining)} to arrival</span>
            <span>focused {fmtHuman(activeSec)}</span>
          </div>
        </div>
      </div>

      {seat == null && <SitPrompt />}

      <AudioMuteToggle />

      {confirmLeave ? (
        <div className="train-dock-confirm">
          <span>Leave now? You'll forfeit this journey's reward.</span>
          <div className="train-dock-confirm-btns">
            <button className="sf-btn water sm" onClick={() => setConfirmLeave(false)}>
              Stay
            </button>
            <button
              className="sf-btn danger sm"
              onClick={() => {
                useTrain.getState().abandon()
                setConfirmLeave(false)
              }}
            >
              Leave train
            </button>
          </div>
        </div>
      ) : (
        <button className="train-dock-leave" onClick={() => setConfirmLeave(true)} title="Leave the train">
          Leave ✕
        </button>
      )}
    </div>
  )
}

/** Shown while the player is standing in the aisle — tells them how to sit. */
function SitPrompt() {
  return (
    <div className="train-sit-prompt">
      <span>Walk to a seat and press <kbd>E</kbd> to sit down</span>
    </div>
  )
}

/** Departure countdown — shown in the interior before the journey starts. */
function DepartureDock() {
  useHeartbeat(true)
  const line = useTrain((s) => s.line)
  const departureSec = useTrain((s) => s.departureSec)
  const seat = useTrain((s) => s.seat)
  if (!line) return null

  return (
    <div className="train-dock water-glass" style={accentVars(line.mood.glow, line.mood.accent)}>
      <div className="train-dock-main">
        <div className="train-dock-route">
          <strong>→ {line.destination}</strong>
          <em>Departing in</em>
        </div>
        <div className="train-dock-progress" style={{ flex: 1 }}>
          <div className="train-dock-bar">
            <div className="train-dock-fill" style={{ width: `${(1 - departureSec / DEPARTURE_SEC) * 100}%` }} />
          </div>
          <div className="train-dock-meta">
            <span>Doors open — find a seat</span>
            <span className="train-dock-count" style={{ fontSize: 20, fontWeight: 700 }}>
              {fmtCountdown(departureSec)}
            </span>
          </div>
        </div>
      </div>
      {seat == null && (
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
          <SitPrompt />
          {departureSec <= 5 && (
            <span className="train-doors-closing">⚠ Doors closing in {departureSec}s — sit now!</span>
          )}
          <span style={{ fontSize: 11, opacity: 0.6, whiteSpace: 'nowrap' }}>
            Walk to the door and press <kbd>E</kbd> to step off
          </span>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------- seat auto-assign */

/**
 * When the departure countdown hits zero and the player is still standing,
 * the store auto-assigns the nearest empty seat (or leaves them standing if
 * the carriage is full). This toast surfaces that outcome so the player gets
 * the spec's "We found you a seat!" (or "standing room only") feedback instead
 * of a silent camera snap. Purely presentational — driven by seat/departureSec
 * transitions, no store changes.
 */
function SeatAssignedToast() {
  const seat = useTrain((s) => s.seat)
  const departureSec = useTrain((s) => s.departureSec)
  const prevSeat = useRef<number | null>(seat)
  const prevDep = useRef(departureSec)
  const [toast, setToast] = useState<string | null>(null)
  const hideRef = useRef<number | null>(null)

  useEffect(() => {
    // Door just closed: departure countdown ended this tick.
    if (prevDep.current > 0 && departureSec === 0) {
      const msg =
        seat != null && prevSeat.current == null
          ? 'We found you a seat! 🪑'
          : seat == null
            ? 'Train is full — standing room only'
            : null
      if (hideRef.current) window.clearTimeout(hideRef.current)
      if (msg) {
        setToast(msg)
        hideRef.current = window.setTimeout(() => setToast(null), 4200)
      }
    }
    prevSeat.current = seat
    prevDep.current = departureSec
  }, [seat, departureSec])

  useEffect(() => () => void (hideRef.current && window.clearTimeout(hideRef.current)), [])

  if (!toast) return null
  return (
    <div className="train-seat-toast water-glass" role="status" aria-live="polite">
      {toast}
    </div>
  )
}

/* --------------------------------------------------------------- milestones */

// The progress checkpoints that earn an encouraging pop mid-journey (spec 1.7).
// Ascending order matters: when several are crossed in one tick (e.g. an offline
// catch-up), the loop lands on the highest reached.
const MILESTONES: { at: number; msg: string }[] = [
  { at: 0.25, msg: '25% there — nice focus!' },
  { at: 0.5, msg: 'Halfway! Keep going!' },
  { at: 0.75, msg: '75% — almost at the destination!' },
  { at: 0.9, msg: 'Final stretch — nearly there!' },
]

/**
 * A transient encouragement that pops as the journey passes 25/50/75/90%. It
 * derives purely from the live progress selector, fires each milestone at most
 * once per journey (keyed to startedAt so a fresh boarding re-arms them), and
 * self-dismisses. No store/persistence changes — the journey state machine and
 * its offline-resume logic stay untouched.
 */
function MilestoneToast() {
  useHeartbeat(true)
  const line = useTrain((s) => s.line)
  const startedAt = useTrain((s) => s.startedAt)
  const progress = useTrain((s) => s.progress)()

  const firedRef = useRef<Set<number>>(new Set())
  const journeyRef = useRef<number | null>(null)
  const hideRef = useRef<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Re-arm all milestones whenever a new journey begins.
  if (journeyRef.current !== startedAt) {
    journeyRef.current = startedAt
    firedRef.current = new Set()
  }

  useEffect(() => {
    if (!line || startedAt == null) return
    let next: string | null = null
    for (const m of MILESTONES) {
      if (progress >= m.at && !firedRef.current.has(m.at)) {
        firedRef.current.add(m.at)
        next = m.msg
      }
    }
    if (next) {
      setToast(next)
      milestoneChime()
      if (hideRef.current) window.clearTimeout(hideRef.current)
      // Matches the train-milestone-life animation length below.
      hideRef.current = window.setTimeout(() => setToast(null), 3600)
    }
  }, [progress, line, startedAt])

  useEffect(() => () => void (hideRef.current && window.clearTimeout(hideRef.current)), [])

  if (!toast || !line) return null
  return (
    <div className="train-milestone" style={accentVars(line.mood.glow, line.mood.accent)} role="status" aria-live="polite">
      <span className="train-milestone-spark">✦</span>
      <span className="train-milestone-msg">{toast}</span>
    </div>
  )
}

// A soft two-note rising chime as a milestone lands. Self-contained WebAudio so
// it has no dependency on the realm's audio module; silently no-ops if autoplay
// is blocked. Set CHIME to false to mute.
const CHIME = true
let chimeCtx: AudioContext | null = null
function milestoneChime() {
  if (!CHIME) return
  try {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    if (!chimeCtx) chimeCtx = new AC()
    const ctx = chimeCtx
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime
    const bus = ctx.createGain()
    bus.gain.value = 0.06
    bus.connect(ctx.destination)
    // two-note "ding-dong" up a perfect fifth (E5 → B5)
    ;[
      [659.25, 0],
      [987.77, 0.12],
    ].forEach(([freq, at]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.value = 0
      o.connect(g).connect(bus)
      const s = t0 + at
      g.gain.linearRampToValueAtTime(1, s + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.5)
      o.start(s)
      o.stop(s + 0.55)
    })
  } catch {
    /* autoplay blocked or WebAudio unavailable — milestone shows silently */
  }
}

/* ------------------------------------------------------------------ arriving */

/**
 * The arrival cinematic: a 20-second sequence as the train decelerates and
 * arrives at the destination. Audio cues fire at specific timestamps, and a
 * banner announces the destination. When the cinematic completes, the store
 * transitions to 'arrived' and the reward screen appears.
 *
 * Timeline:
 *   T-10s : deceleration begins (MovingWorld handles the visual)
 *   T-5s  : "Arriving at [Destination]" banner
 *   T-3s  : brake screech audio
 *   T-0s  : train stops (world stops scrolling)
 *   T+1s  : door unlock indicator (green)
 *   T+2s  : doors open chime
 *   T+5s  : "You may now stand" prompt
 *   T+10s : rewards (store transitions to 'arrived')
 */
function ArrivalCinematic() {
  useHeartbeat(true)
  const line = useTrain((s) => s.line)
  const arrivalSec = useTrain((s) => s.arrivalSec)
  useEffect(() => {
    if (!line || arrivalSec <= 0) return
    // Audio triggers (brake, steam, door) are now handled by InteriorAudio
  }, [arrivalSec, line])

  if (!line) return null
  const elapsed = ARRIVAL_CINEMATIC_SEC - arrivalSec
  const bannerVisible = elapsed >= 5
  const doorOpen = elapsed >= 12
  const canStand = elapsed >= 15

  return (
    <div className="train-arrival-cinematic">
      {bannerVisible && (
        <div className="train-arrival-banner water-glass" style={accentVars(line.mood.glow, line.mood.accent)}>
          <strong>Arriving at {line.destination}</strong>
          <span className="train-arrival-timer">{fmtCountdown(Math.max(0, arrivalSec - 10))}</span>
        </div>
      )}
      {doorOpen && (
        <div className="train-arrival-door water-glass">
          <span style={{ color: '#7CFFB0' }}>Doors open</span>
        </div>
      )}
      {canStand && (
        <div className="train-arrival-stand water-glass">
          <span>You may now stand up</span>
        </div>
      )}
      <AudioMuteToggle />
    </div>
  )
}

/* ------------------------------------------------------------------ exploring */

/**
 * Destination exploration phase: a 60-second countdown after arrival where the
 * player can walk around the destination. Shows a timer and a "Return to station"
 * button. When the timer expires or the player clicks return, the reward screen appears.
 */
function ExplorationUI() {
  useHeartbeat(true)
  const line = useTrain((s) => s.line)
  const exploreSec = useTrain((s) => s.exploreSec)
  if (!line) return null

  const pct = Math.round((exploreSec / EXPLORE_SEC) * 100)

  return (
    <div className="train-dock water-glass" style={accentVars(line.mood.glow, line.mood.accent)}>
      <div className="train-dock-main">
        <div className="train-dock-route">
          <span className="train-dock-tag">Exploring</span>
          <strong>{line.destination}</strong>
          <em>{line.route}</em>
        </div>
        <div className="train-dock-progress">
          <div className="train-dock-bar">
            <div className="train-dock-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="train-dock-meta">
            <span>Look around the destination</span>
            <span className="train-dock-count">{fmtCountdown(exploreSec)} remaining</span>
          </div>
        </div>
      </div>
      <button
        className="sf-btn water"
        style={{ flexShrink: 0 }}
        onClick={() => useTrain.getState().dismissExplore()}
      >
        Return to station →
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ arrived */

/** The arrival/reward screen — the celebratory payoff for completing a journey. */
function ArrivalScreen() {
  const arrived = useTrain((s) => s.arrived)
  const [show, setShow] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setShow(true), 60)
    return () => window.clearTimeout(id)
  }, [])
  useEffect(() => {
    if (!show) return
    const id = window.setTimeout(() => setShowRewards(true), 2200)
    return () => window.clearTimeout(id)
  }, [show])
  if (!arrived) return null
  const { line, reward, activeFocusSec } = arrived

  return (
    <div className="train-modal-veil">
      <div className={`train-arrive water-glass ${show ? 'in' : ''}`} style={accentVars(line.mood.glow, line.mood.accent)}>
        <div className="train-arrive-glow" />
        <span className="sf-pill train-arrive-kind">Journey complete</span>
        <h1 className="train-arrive-dest">
          {showRewards ? `Arrived at ${line.destination}` : `Welcome to ${line.destination}`}
        </h1>
        <p className="train-arrive-sub">
          {line.route} · {durationLabel(line.minutes)} · focused {fmtHuman(activeFocusSec)}
        </p>

        {showRewards && (
          <>
            <div className="train-arrive-rewards">
              <Reward glyph="✦" value={`+${reward.xp}`} label="XP" delay={0} />
              <Reward glyph="🪙" value={`+${reward.coins}`} label="Coins" delay={90} />
              <Reward glyph="🎟" value={`+${reward.tickets}`} label="Tickets" delay={180} />
              <Reward glyph="🧭" value={`${reward.distanceKm} km`} label="Travelled" delay={270} />
            </div>

            {reward.achievements.length > 0 && (
              <div className="train-arrive-ach">
                <span className="train-arrive-ach-head">Unlocked</span>
                <ul>
                  {reward.achievements.map((a) => (
                    <li key={a.id}>
                      <span className="train-ach-i">{achGlyph(a.icon)}</span>
                      <span className="train-ach-t">
                        <strong>{a.title}</strong>
                        <em>{a.detail}</em>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button className="sf-btn water train-arrive-cta" onClick={() => useTrain.getState().dismissReward()}>
              Back to the station →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- pieces */

function Stat({ label, value, glyph }: { label: string; value: string; glyph: string }) {
  return (
    <div className="train-stat">
      <span className="train-stat-g">{glyph}</span>
      <span className="train-stat-v">{value}</span>
      <span className="train-stat-l">{label}</span>
    </div>
  )
}

function Reward({ glyph, value, label, delay }: { glyph: string; value: string; label: string; delay: number }) {
  return (
    <div className="train-reward" style={{ animationDelay: `${delay}ms` }}>
      <span className="train-reward-g">{glyph}</span>
      <strong className="train-reward-v">{value}</strong>
      <span className="train-reward-l">{label}</span>
    </div>
  )
}

/* -------------------------------------------------------------------- utils */

/** Tiny mute toggle — audio was intentionally removed from Settings per project
 *  history, so the control lives in-realm. */
function AudioMuteToggle() {
  const [muted, setMutedState] = useState(isMuted())
  const onClick = () => {
    const next = !muted
    setMutedState(next)
    setMuted(next)
  }
  return (
    <button className="train-audio-mute" onClick={onClick} title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute' : 'Mute'}>
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

/** CSS custom properties so each line tints its own card/prompt warmly. */
function accentVars(glow: string, accent: string): React.CSSProperties {
  return { ['--train-glow' as string]: glow, ['--train-accent' as string]: accent }
}

/** Tickets per journey, mirrored from rewards.ticketsFor (kept local for the
 *  boarding-card preview without importing the private helper). */
function ticketsFor(minutes: number): number {
  if (minutes >= 720) return 5
  if (minutes >= 420) return 3
  if (minutes >= 180) return 2
  return 1
}

/** "20 min" / "1 hr" / "3 hr" / "12 hr" friendly journey-length label. */
function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = minutes / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`
}

const ACH_GLYPHS: Record<string, string> = {
  train: '🚂',
  mountain: '🏔',
  moon: '🌙',
  star: '⭐',
  ticket: '🎟',
  badge: '🏅',
  fire: '🔥',
}
function achGlyph(icon: string): string {
  return ACH_GLYPHS[icon] ?? '🏅'
}
