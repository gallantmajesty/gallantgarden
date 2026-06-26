import { useEffect, useState } from 'react'
import { useTrain } from '../../store/train'
import { useStation } from '../../store/station'
import { TRAIN_LINES } from '../../lib/train/lines'
import { ROWS, COLS } from '../../three/train/interior'
import { departureBoard, statusLabel, statusById, fmtCountdown, fmtHuman } from '../../lib/train/schedule'
import { xpFor, coinsFor } from '../../lib/train/rewards'
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

  if (phase === 'browsing') return <BrowsingHud />
  if (phase === 'boarding') return <BoardingCard />
  if (phase === 'traveling') return <JourneyDock />
  if (phase === 'arrived') return <ArrivalScreen />
  return null
}

/* ----------------------------------------------------------------- browsing */

function BrowsingHud() {
  const [boardOpen, setBoardOpen] = useState(false)
  return (
    <>
      <DeparturesPanel open={boardOpen} onToggle={() => setBoardOpen((v) => !v)} />
      <BoardingPrompt />
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
  const status = statusById(line.id)
  const lbl = statusLabel(status)
  // You can only step aboard while the doors are open (the live boarding window).
  const canBoard = status.boardable

  return (
    <div className="train-prompt water-glass" style={accentVars(line.mood.glow, line.mood.accent)}>
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
        <span className={`train-prompt-status ${status.phase}`}>
          {lbl.tag} · {lbl.detail}
        </span>
      </div>
      {canBoard ? (
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
        // doors shut — there's no train to board; show the wait instead
        <div className="train-prompt-wait">
          <span className="train-prompt-wait-tag">{status.phase === 'approaching' ? 'Arriving' : 'Next train'}</span>
          <strong>{fmtCountdown(status.phase === 'approaching' ? status.phaseRemaining : status.untilBoarding)}</strong>
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- boarding */

/** The boarding card: the commitment screen. Choose a seat and depart on a
 *  journey of the line's full study length. */
function BoardingCard() {
  const line = useTrain((s) => s.line)
  // Front-left window seat ("best seat in the house") as the friendly default.
  const [seat, setSeat] = useState((ROWS - 1) * COLS)
  // The seat is a COMMITMENT: the player must explicitly acknowledge that it
  // locks for the whole journey before the Depart button arms.
  const [ack, setAck] = useState(false)
  if (!line) return null

  const seatCode = `${Math.floor(seat / COLS) + 1}${seat % COLS === 0 ? 'L' : 'R'}`

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

        <div className="train-seats">
          <div className="train-seats-head">
            <strong>Choose your seat</strong>
            <span>Front of train ↑ · panoramic windows</span>
          </div>
          <div className="train-seats-grid">
            {seatRows().map((row) => (
              <div className="train-seat-row" key={row.r}>
                <span className="train-seat-rowlabel">{row.label}</span>
                {row.seats.map((s) => (
                  <button
                    key={s.index}
                    className={`train-seat ${seat === s.index ? 'on' : ''}`}
                    onClick={() => setSeat(s.index)}
                    title={`Seat ${s.code}`}
                  >
                    {s.code}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* PERMANENT-SEAT warning + acknowledgement — boarding is a commitment */}
        <div className="train-seat-warn">
          <span className="train-seat-warn-ic">⚠</span>
          <div className="train-seat-warn-txt">
            <strong>Seat {seatCode} is permanent for this journey.</strong>
            <span>Once the train departs you can’t change seats until you arrive.</span>
          </div>
        </div>
        <label className="train-seat-ack">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>I understand my seat locks for the whole journey.</span>
        </label>

        <footer className="train-card-foot">
          <button className="sf-btn ghost" onClick={() => useTrain.getState().cancelBoarding()}>
            Step back
          </button>
          <button
            className="sf-btn water train-depart"
            disabled={!ack}
            title={ack ? '' : 'Confirm your seat is permanent first'}
            onClick={() => ack && useTrain.getState().confirmBoard(seat)}
          >
            Depart — study for {durationLabel(line.minutes)} →
          </button>
        </footer>
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

      {confirmLeave ? (
        <div className="train-dock-confirm">
          <span>Leave now? You'll forfeit this journey's reward.</span>
          <div className="train-dock-confirm-btns">
            <button className="sf-btn ghost sm" onClick={() => setConfirmLeave(false)}>
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

/* ------------------------------------------------------------------ arrived */

/** The arrival/reward screen — the celebratory payoff for completing a journey. */
function ArrivalScreen() {
  const arrived = useTrain((s) => s.arrived)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setShow(true), 60)
    return () => window.clearTimeout(id)
  }, [])
  if (!arrived) return null
  const { line, reward, activeFocusSec } = arrived

  return (
    <div className="train-modal-veil">
      <div className={`train-arrive water-glass ${show ? 'in' : ''}`} style={accentVars(line.mood.glow, line.mood.accent)}>
        <div className="train-arrive-glow" />
        <span className="sf-pill train-arrive-kind">Journey complete</span>
        <h1 className="train-arrive-dest">Arrived at {line.destination}</h1>
        <p className="train-arrive-sub">
          {line.route} · {durationLabel(line.minutes)} · focused {fmtHuman(activeFocusSec)}
        </p>

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

/** Seat grid rows, front of train first (row 5 → row 1). Each seat gets a code
 *  like "5L"/"5R" whose index maps straight into the carriage's SEATS array. */
function seatRows(): { r: number; label: string; seats: { index: number; code: string }[] }[] {
  const rows: { r: number; label: string; seats: { index: number; code: string }[] }[] = []
  for (let r = ROWS - 1; r >= 0; r--) {
    const seats: { index: number; code: string }[] = []
    for (let c = 0; c < COLS; c++) {
      const index = r * COLS + c
      seats.push({ index, code: `${r + 1}${c === 0 ? 'L' : 'R'}` })
    }
    rows.push({ r, label: r === ROWS - 1 ? 'Front' : `Row ${r + 1}`, seats })
  }
  return rows
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
