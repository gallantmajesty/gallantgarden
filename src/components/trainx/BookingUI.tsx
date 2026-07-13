import { useEffect, useState } from 'react'
import { TRAINS, getTrain, trainMaster, useTrainX, vipUnlocked } from '../../store/trainx'
import { playChime } from '../../three/trainx/sound'

/** Ticking clock so the data displays feel live. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function fmtHHMM(ms: number) {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Estimated departure = now + a per-train travel cycle offset. */
function departureFor(i: number, now: number) {
  const cycleMin = 24
  const offsetMin = i * 3
  const epochMin = now / 60000
  const depMin = Math.ceil((epochMin + offsetMin) / cycleMin) * cycleMin - offsetMin
  return depMin * 60000
}

/** Live "booked" seat count — wobbles over time so the board feels real-time. */
function occupancy(t: (typeof TRAINS)[number], i: number, now: number) {
  const base = t.seatsTotal * 0.45
  const wobble = Math.sin(now / 37000 + i * 1.7) * (t.seatsTotal * 0.22)
  const slow = Math.sin(now / 150000 + i) * (t.seatsTotal * 0.12)
  return Math.max(2, Math.min(t.seatsTotal, Math.round(base + wobble + slow)))
}

/** Compact, collapsible live-departures panel docked top-right (always visible). */
function DepartureStrip() {
  const now = useNow()
  const completed = useTrainX((s) => s.completedTrains)
  const standardTotal = TRAINS.filter((t) => !t.vip).length
  const [open, setOpen] = useState(true)
  return (
    <div className={`tx-board ${open ? '' : 'tx-board--collapsed'}`}>
      <button className="tx-board__head" onClick={() => setOpen((o) => !o)}>
        <span>✦ FOCUS LILY RAIL — LIVE DEPARTURES</span>
        <span className="tx-board__caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <>
          <div className="tx-board__row tx-board__row--head">
            <span>DEPARTS</span>
            <span>TRAIN</span>
            <span>DUR</span>
            <span>PASSENGERS</span>
            <span>SEATS</span>
            <span>DESTINATION</span>
          </div>
          {TRAINS.map((t, i) => {
            const booked = occupancy(t, i, now)
            const dest = t.locked
              ? vipUnlocked(completed)
                ? t.scenery
                : `🔒 Unlock ${completed.length}/${standardTotal}`
              : t.scenery
            return (
              <div className="tx-board__row" key={t.id}>
                <span>{t.locked && !vipUnlocked(completed) ? '—' : fmtHHMM(departureFor(i, now))}</span>
                <span className="tx-board__name">{t.name}</span>
                <span>{t.durationHours}h</span>
                <span>{t.locked && !vipUnlocked(completed) ? '—' : booked}</span>
                <span>{t.locked && !vipUnlocked(completed) ? '—' : `${booked}/${t.seatsTotal} booked`}</span>
                <span>{dest}</span>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

/** Mini scenery + interior preview thumbnail for a train card. */
function TrainPreview({ t }: { t: (typeof TRAINS)[number] }) {
  const [c0, c1, c2] = t.palette
  return (
    <div className="tx-preview" style={{ background: `linear-gradient(160deg, ${c2}, ${c1} 55%, ${c0})` }}>
      <div className="tx-preview__sky" />
      <div className="tx-preview__cabin">
        <div className="tx-preview__chair" />
        <div className="tx-preview__chair" />
        <div className="tx-preview__table" />
        <div className="tx-preview__window" style={{ background: `linear-gradient(90deg, ${c0}, ${c1})` }} />
      </div>
      <div className="tx-preview__label">{t.scenery}</div>
    </div>
  )
}

function TrainCards() {
  const selectTrain = useTrainX((s) => s.selectTrain)
  const completed = useTrainX((s) => s.completedTrains)
  const now = useNow()
  const vipOpen = vipUnlocked(completed)
  return (
    <div className="tx-modal">
      <div className="tx-modal__panel">
        <h2>Choose your train</h2>
        <p className="tx-sub">Walk up to the agent in the grand hall and book a carriage. Once booked, you can't switch.</p>
        {!vipOpen && (
          <p className="tx-vip-progress">
            ⭐ VIP Royale unlocks after you complete all {TRAINS.filter((t) => !t.vip).length} standard trains —
            you've finished <b>{completed.length}</b>/{TRAINS.filter((t) => !t.vip).length}.
          </p>
        )}
        <div className="tx-cards">
          {TRAINS.map((t, i) => {
            const booked = occupancy(t, i, now)
            const bookable = !t.locked || (t.vip && vipOpen)
            return (
              <button
                key={t.id}
                className={`tx-card ${!bookable ? 'tx-card--locked' : ''}`}
                style={{ background: `linear-gradient(135deg, ${t.palette[0]}, ${t.palette[1]})` }}
                disabled={!bookable}
                onClick={() => {
                  if (bookable) {
                    playChime('tap')
                    selectTrain(t.id)
                  }
                }}
              >
                <TrainPreview t={t} />
                <div className="tx-card__top">
                  <span className="tx-card__name">{t.name}</span>
                  {!bookable && <span className="tx-card__lock">🔒</span>}
                  {t.vip && <span className="tx-card__vip">VIP</span>}
                </div>
                <div className="tx-card__meta">
                  <span>⏱ {t.durationHours}h</span>
                  <span>🕒 {!bookable ? '—' : `dep ${fmtHHMM(departureFor(i, now))}`}</span>
                </div>
                <div className="tx-card__scenery">{t.scenery}</div>
                <div className="tx-card__meta">
                  <span>👥 {!bookable ? '—' : booked} passengers</span>
                  <span>🪑 {!bookable ? '—' : `${booked}/${t.seatsTotal} booked`}</span>
                </div>
                <div className="tx-card__tier">Reward tier: {t.rewardTier}</div>
                {t.stops > 1 && <div className="tx-card__stops">{t.stops} reward stops</div>}
                {t.vip && !bookable && (
                  <div className="tx-card__req">Finish all standard trains to unlock</div>
                )}
                {t.vip && vipOpen && <div className="tx-card__req tx-card__req--open">⚡ Priority boarding unlocked</div>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RulesSection() {
  return (
    <details className="tx-rules">
      <summary>📜 Booking Center Rules</summary>
      <ul>
        <li>Each train is staffed by its own themed manager — walk to a counter to book.</li>
        <li>Once you book a train you <b>cannot cancel or switch</b> to another.</li>
        <li>The journey timer starts when the train departs, and only counts while this screen is open.</li>
        <li>Rewards are banked at each stop along the route — close the realm and you <b>keep what you've earned</b>, but forfeit the rest.</li>
        <li>Boarding opens when your train arrives on the right (arrival) track.</li>
        <li>The Eternal Journey (VIP, 9h) unlocks later — stay tuned.</li>
      </ul>
    </details>
  )
}

function WarningModal() {
  const selectedTrainId = useTrainX((s) => s.selectedTrainId)
  const setPhase = useTrainX((s) => s.setPhase)
  const confirmBooking = useTrainX((s) => s.confirmBooking)
  const t = getTrain(selectedTrainId)
  if (!t) return null
  return (
    <div className="tx-modal">
      <div className="tx-modal__panel tx-modal__panel--sm">
        <h2>Confirm booking</h2>
        <p className="tx-warn">
          <b>WARNING:</b> Once you book <b>{t.name}</b>, you <b>cannot cancel or switch</b>. The journey
          timer only runs while this screen is open — close the realm and you keep rewards already banked
          at each stop, but forfeit the rest. Do you confirm?
        </p>
        <div className="tx-actions">
          <button className="tx-btn tx-btn--ghost" onClick={() => setPhase('desk')}>
            Go Back
          </button>
          <button
            className="tx-btn tx-btn--primary"
            onClick={() => {
              playChime('confirm')
              confirmBooking()
            }}
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  )
}

function SeatCard() {
  const seat = useTrainX((s) => s.seat)
  const t = getTrain(useTrainX((s) => s.selectedTrainId))
  return (
    <div className="tx-modal">
      <div className="tx-modal__panel tx-modal__panel--sm">
        <h2>Booking confirmed ✦</h2>
        {t && <p className="tx-sub">You're on the {t.name} to {t.scenery}.</p>}
        <div className="tx-seat">
          <div className="tx-seat__label">{seat?.label ?? 'Seat assigned'}</div>
          <div className="tx-seat__hint">Walking to the platform…</div>
        </div>
      </div>
    </div>
  )
}

/** Non-blocking banner shown while waiting for the real-time train to arrive,
 *  so the player can actually watch their carriage pull in. */
function WaitingBanner() {
  const seat = useTrainX((s) => s.seat)
  const t = getTrain(useTrainX((s) => s.selectedTrainId))
  return (
    <div className="tx-wait">
      <div className="tx-wait__title">✓ Booked · {t?.name}</div>
      <div className="tx-wait__seat">{seat?.label}</div>
      <div className="tx-wait__hint">
        When it stops on the right track, walk to the <b>glowing green doors</b> to board. You'll fade in already seated.
      </div>
    </div>
  )
}

function SeatedPlaceholder({ onExit }: { onExit: () => void }) {
  const resetBooking = useTrainX((s) => s.resetBooking)
  return (
    <div className="tx-modal">
      <div className="tx-modal__panel tx-modal__panel--sm">
        <h2>All aboard ✦</h2>
        <p className="tx-sub">
          You're in your carriage. The study session (Phase 2) and rewards (Phase 3) load here next.
        </p>
        <div className="tx-actions">
          <button className="tx-btn tx-btn--ghost" onClick={onExit}>
            Leave TrainX
          </button>
          <button
            className="tx-btn tx-btn--primary"
            onClick={() => {
              resetBooking()
            }}
          >
            Back to Booking Center
          </button>
        </div>
      </div>
    </div>
  )
}

function ArrivalModal({ onExit }: { onExit: () => void }) {
  const t = getTrain(useTrainX((s) => s.selectedTrainId))
  const rewards = useTrainX((s) => s.rewards)
  const stops = useTrainX((s) => s.stopsReached)
  const completed = useTrainX((s) => s.completedTrains)
  const resetBooking = useTrainX((s) => s.resetBooking)
  const master = trainMaster(completed)
  return (
    <div className="tx-modal">
      <div className="tx-modal__panel tx-modal__panel--sm">
        <h2>You've arrived! 🎉</h2>
        <p className="tx-sub">{t ? `The ${t.name} has reached its destination.` : 'You have reached your destination.'}</p>
        {master && (
          <div className="tx-master">🏅 TRAIN MASTER — you've completed every route!</div>
        )}
        <div className="tx-rewards">
          <div><span>XP earned</span><b>{rewards.xp}</b></div>
          <div><span>Coins earned</span><b>{rewards.coins}</b></div>
          <div><span>Stops completed</span><b>{stops}{t ? ` / ${t.stops}` : ''}</b></div>
          <div><span>Reward tier</span><b>{t ? t.rewardTier : '—'}</b></div>
          {rewards.items.length > 0 && (
            <div><span>Items</span><b>{rewards.items.join(', ')}</b></div>
          )}
        </div>
        {t?.vip && (
          <div className="tx-vip-note">
            ⭐ VIP perks banked: 2× rewards, exclusive study pack, achievement badge, priority boarding.
          </div>
        )}
        <div className="tx-expand">
          Future expansion hooks: seasonal trains, multiplayer study rooms, seat decoration, and a global
          leaderboard are planned (local-only for now — no backend yet).
        </div>
        <div className="tx-actions">
          <button
            className="tx-btn tx-btn--primary"
            onClick={() => {
              resetBooking()
              onExit()
            }}
          >
            Return to Platform
          </button>
        </div>
      </div>
    </div>
  )
}

export function BookingUI({ onExit }: { onExit: () => void }) {
  const phase = useTrainX((s) => s.phase)
  return (
    <>
      <DepartureStrip />
      {phase === 'desk' && <TrainCards />}
      {phase === 'desk' && <RulesSection />}
      {phase === 'warning' && <WarningModal />}
      {phase === 'confirmed' && <WaitingBanner />}
      {phase === 'boarding' && <SeatCard />}
      {phase === 'arrived' && <ArrivalModal onExit={onExit} />}
    </>
  )
}
