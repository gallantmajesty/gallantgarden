import { useEffect, useRef, useState } from 'react'
import { getTrain, useTrainX } from '../../store/trainx'
import { royaleChapter } from '../../three/trainx/ParallaxWindow'
import { playChime } from '../../three/trainx/sound'
import './StudyHUD.css'

const STUDY_MS = 25 * 60 * 1000
const BREAK_MS = 5 * 60 * 1000

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':')
}

export function StudyHUD() {
  const train = getTrain(useTrainX((s) => s.selectedTrainId))
  const seat = useTrainX((s) => s.seat)
  const elapsedActive = useTrainX((s) => s.elapsedActive)
  const rewards = useTrainX((s) => s.rewards)
  const departed = useTrainX((s) => s.departed)
  const stopsReached = useTrainX((s) => s.stopsReached)
  const tabHidden = useTrainX((s) => s.visible) === false
  const tickActive = useTrainX((s) => s.tickActive)
  const setVisible = useTrainX((s) => s.setVisible)

  const [now, setNow] = useState(Date.now())
  const lastTick = useRef(Date.now())
  const lastStops = useRef(0)

  // magical "reward banked" chime each time a stop is reached
  useEffect(() => {
    if (stopsReached > lastStops.current) playChime('reward')
    lastStops.current = stopsReached
  }, [stopsReached])

  // One-second heartbeat: advance the active timer only while visible. Hidden tab
  // time is NOT counted (lastTick is reset on the visibilitychange that returns
  // us to the tab), so the countdown + rewards pause when the screen is off.
  useEffect(() => {
    if (!train) return
    const onVis = () => {
      if (document.hidden) setVisible(false)
      else {
        setVisible(true)
        lastTick.current = Date.now()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    const id = window.setInterval(() => {
      setNow(Date.now())
      if (document.hidden) return
      const t = Date.now()
      const dt = t - lastTick.current
      lastTick.current = t
      tickActive(dt)
    }, 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(id)
    }
  }, [train, tickActive, setVisible])

  if (!train) return null

  const total = train.durationHours * 3600 * 1000
  const elapsed = elapsedActive
  const remaining = Math.max(0, total - elapsed)
  const progress = Math.min(1, elapsed / total)
  const cycle = elapsed % (STUDY_MS + BREAK_MS)
  const inStudy = cycle < STUDY_MS
  const stopPct = (i: number) => ((i + 1) / train.stops) * 100

  const status = tabHidden
    ? 'Tab hidden — timer paused'
    : !departed
      ? 'Departing… timer starts when the train leaves'
      : inStudy
        ? 'Study block — rewards accruing'
        : 'Short break — rewards accruing'

  const statusClass = tabHidden
    ? 'sh__status--off'
    : !departed
      ? 'sh__status--break'
      : inStudy
        ? 'sh__status--study'
        : 'sh__status--break'

  const chapter = train?.vip
    ? royaleChapter(elapsedActive, train.durationHours * 3600 * 1000)
    : null

  return (
    <div className="sh">
      <div className="sh__top">
        <div className="sh__train">
          🚂 <b>{train.name}</b> · <span>{seat?.label}</span>
        </div>
        <div className={`sh__status ${statusClass}`}>{status}</div>
      </div>

      {chapter && (
        <div className="sh__chapter">
          ⭐ VIP Journey · Chapter {chapter.index + 1}/7 — {chapter.name}
        </div>
      )}

      <div className="sh__timer">
        <span className="sh__timer-glyph">⏳</span>
        {fmt(remaining)} <small>remaining</small>
      </div>

      <div className="sh__bar" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
        <div className="sh__bar-fill" style={{ width: `${progress * 100}%` }} />
        <span className="sh__bar-pct">{Math.round(progress * 100)}%</span>
        {Array.from({ length: train.stops - 1 }, (_, i) => (
          <div
            key={i}
            className="sh__stop"
            style={{ left: `${stopPct(i)}%` }}
            title={`Stop ${i + 1}`}
          />
        ))}
      </div>

      <div className="sh__xpline">
        <span>XP <b>{rewards.xp}</b></span>
        <span>Coins <b>{rewards.coins}</b></span>
        {rewards.items.length > 0 && <span>Items <b>{rewards.items.join(', ')}</b></span>}
      </div>
      <div className="sh__xpline sh__xpline--sub">
        {train.stops} reward stops · {stopsLabel(stopsReached, train.stops)} · rewards banked at every stop, kept even if you leave early
      </div>

      <div className="sh__note">
        The timer only counts while this screen is open and the train is moving. Closing the realm
        pauses the journey — you keep rewards already earned at each stop, but forfeit the rest.
      </div>
    </div>
  )
}

function stopsLabel(reached: number, total: number) {
  return `${reached} / ${total} stops reached`
}
