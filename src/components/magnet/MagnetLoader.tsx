import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../store/magnet'
import { getTheme } from '../../lib/magnet/themes'
import './MagnetLoader.css'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Count up from 0 → target once `active` flips, for a live "real-time" feel. */
function useCountUp(target: number, active: boolean, duration = 850): number {
  const [val, setVal] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (!active) {
      setVal(0)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, active, duration])
  return val
}

export function MagnetLoader({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const ready = useMagnet((s) => s.ready)
  const data = useMagnet((s) => s.data)

  const [begin, setBegin] = useState(false)
  const [exiting, setExiting] = useState(false)

  // Live stats straight from the magnet store — the same task objects the
  // Library drives, so the numbers prove the connection is real, not faked.
  const total = data.tasks.length
  const done = data.tasks.filter((x) => x.done).length
  const due = data.tasks.filter((x) => x.due === todayKey() && !x.done).length

  const totalN = useCountUp(total, begin)
  const doneN = useCountUp(done, begin)
  const dueN = useCountUp(due, begin)

  // Keep the latest onDone without re-scheduling the timers on every render.
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const dismissed = useRef(false)
  const finish = useCallback(() => {
    if (dismissed.current) return
    dismissed.current = true
    setExiting(true)
    // Let the fade-out play, then hand control back to the app.
    window.setTimeout(() => onDoneRef.current(), 360)
  }, [])

  // Start the reveal the moment the world is hydrated (schedule once).
  const revealScheduled = useRef(false)
  useEffect(() => {
    if (ready && !revealScheduled.current) {
      revealScheduled.current = true
      setBegin(true)
      const id = window.setTimeout(finish, 1300)
      return () => window.clearTimeout(id)
    }
  }, [ready, finish])

  // Hard safety net: even if hydration never reports ready, the loader is gone
  // in 4.5s so it can never get stuck on screen.
  useEffect(() => {
    const id = window.setTimeout(finish, 4500)
    return () => window.clearTimeout(id)
  }, [finish])

  const theme = getTheme(data.theme)
  const style = {
    ['--mg-accent' as string]: theme.vars.accent,
    ['--mg-accent2' as string]: theme.vars.accent2,
  } as React.CSSProperties

  return (
    <div
      className={`mg-loader${exiting ? ' mg-loader--out' : ''}`}
      style={style}
      role="status"
      aria-live="polite"
      aria-busy={!ready}
    >
      <div className="mg-loader-card">
        {/* Library → Task Magnet: floating task chips get pulled across the
            wire into the magnet — the "send-off" that shows they're linked. */}
        <div className="mg-loader-link">
          <div className="mg-loader-node">
            <span className="mg-loader-glyph" aria-hidden>📚</span>
            <span className="mg-loader-name">{t('taskMagnet.loadingKicker')}</span>
          </div>

          <div className="mg-loader-wire" aria-hidden>
            <span className="mg-loader-spark" />
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="mg-loader-chip" style={{ animationDelay: `${i * 0.28}s` }} />
            ))}
          </div>

          <div className="mg-loader-node mg-loader-node--mag">
            <img className="mg-loader-logo" src="/task-mgmt-logo.png" alt="Task Magnet" />
            <span className="mg-loader-name">{t('taskMagnet.loadingMagnet')}</span>
          </div>
        </div>

        <h2 className="mg-loader-title">{t('taskMagnet.loadingTitle')}</h2>
        <p className="mg-loader-body">{t('taskMagnet.loadingBody')}</p>

        <div className="mg-loader-stats">
          <div className="mg-loader-stat">
            <strong>{totalN}</strong>
            <span>{t('taskMagnet.loadingTasks')}</span>
          </div>
          <div className="mg-loader-stat">
            <strong>{dueN}</strong>
            <span>{t('taskMagnet.loadingDue')}</span>
          </div>
          <div className="mg-loader-stat">
            <strong>{doneN}</strong>
            <span>{t('taskMagnet.loadingDone')}</span>
          </div>
        </div>

        <div className="mg-loader-bar">
          <span className={`mg-loader-bar-fill${begin ? ' is-on' : ''}`} />
        </div>
        <p className="mg-loader-foot">{t('taskMagnet.loadingAnalyzing')}</p>
      </div>
    </div>
  )
}
