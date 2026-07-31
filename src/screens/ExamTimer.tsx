import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './ExamTimer.css'

type Phase = 'setup' | 'running' | 'paused' | 'results'

interface QuestionResult {
  index: number
  elapsed: number
  completed: boolean
}

export function ExamTimer() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('setup')

  // Setup state
  const [totalQuestions, setTotalQuestions] = useState(30)
  const [timePerQuestion, setTimePerQuestion] = useState(60)

  // Running state
  const [currentQ, setCurrentQ] = useState(0)
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0)
  const [masterElapsed, setMasterElapsed] = useState(0)
  const [results, setResults] = useState<QuestionResult[]>([])

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const masterRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const questionStartRef = useRef<number>(0)
  const pausedRef = useRef(false)

  // Format seconds → hh:mm:ss
  const fmt = useCallback((s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }, [])

  // ─── Setup helpers ───
  const handleStart = useCallback(() => {
    if (totalQuestions < 1 || timePerQuestion < 1) return
    const initial = Array.from({ length: totalQuestions }, (_, i) => ({
      index: i,
      elapsed: 0,
      completed: false,
    }))
    setResults(initial)
    setCurrentQ(0)
    setQuestionTimeLeft(timePerQuestion)
    setMasterElapsed(0)
    startTimeRef.current = Date.now()
    questionStartRef.current = Date.now()
    pausedRef.current = false
    setPhase('running')
  }, [totalQuestions, timePerQuestion])

  // ─── Tick: question countdown + master elapsed ───
  useEffect(() => {
    if (phase !== 'running' && phase !== 'paused') {
      if (tickRef.current) clearInterval(tickRef.current)
      if (masterRef.current) clearInterval(masterRef.current)
      return
    }

    // Master timer — counts up every second
    if (phase === 'running' && !pausedRef.current) {
      masterRef.current = setInterval(() => {
        setMasterElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 250)
    }

    // Question timer — counts down every second
    if (phase === 'running' && !pausedRef.current) {
      tickRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 1) {
            // Time up — auto-advance
            handleNext(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (masterRef.current) clearInterval(masterRef.current)
    }
  }, [phase, pausedRef.current])

  // ─── Mark done (question completed within time) ───
  const handleDone = useCallback(() => {
    const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000)
    setResults((prev) => {
      const next = [...prev]
      next[currentQ] = { ...next[currentQ], elapsed, completed: true }
      return next
    })
    handleNext(true)
  }, [currentQ])

  // ─── Next question (auto or manual) ───
  const handleNext = useCallback(
    (completed: boolean) => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (masterRef.current) clearInterval(masterRef.current)

      setResults((prev) => {
        if (!completed) {
          const next = [...prev]
          const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000)
          next[currentQ] = { ...next[currentQ], elapsed, completed: false }
          return next
        }
        return prev
      })

      setCurrentQ((prev) => {
        const next = prev + 1
        if (next >= totalQuestions) {
          // All done — show results after a tick
          setTimeout(() => setPhase('results'), 100)
          return prev
        }
        setQuestionTimeLeft(timePerQuestion)
        questionStartRef.current = Date.now()
        return next
      })
    },
    [currentQ, totalQuestions, timePerQuestion],
  )

  // ─── Pause / Resume ───
  const togglePause = useCallback(() => {
    if (phase === 'results' || phase === 'setup') return
    pausedRef.current = !pausedRef.current
    if (pausedRef.current) {
      if (tickRef.current) clearInterval(tickRef.current)
      if (masterRef.current) clearInterval(masterRef.current)
      setPhase('paused')
    } else {
      questionStartRef.current = Date.now() - (timePerQuestion - questionTimeLeft) * 1000
      startTimeRef.current = Date.now() - masterElapsed * 1000
      setPhase('running')
    }
  }, [phase, questionTimeLeft, timePerQuestion, masterElapsed])

  // ─── Skip question ───
  const handleSkip = useCallback(() => {
    handleNext(false)
  }, [handleNext])

  // ─── Quit ───
  const handleQuit = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (masterRef.current) clearInterval(masterRef.current)
    setPhase('setup')
    setResults([])
    setCurrentQ(0)
    setMasterElapsed(0)
    setQuestionTimeLeft(0)
  }, [])

  // ─── Results computed ───
  const completedCount = results.filter((r) => r.completed).length
  const totalTime = results.reduce((sum, r) => sum + r.elapsed, 0)
  const avgTime = completedCount > 0 ? Math.round(totalTime / completedCount) : 0
  const questionPct = timePerQuestion > 0 ? ((timePerQuestion - questionTimeLeft) / timePerQuestion) * 100 : 0
  const masterPct = totalQuestions * timePerQuestion > 0
    ? (masterElapsed / (totalQuestions * timePerQuestion)) * 100
    : 0

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'running' || phase === 'paused') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault()
          if (phase === 'paused') togglePause()
          else handleDone()
        }
        if (e.code === 'Escape') togglePause()
        if (e.code === 'KeyS') handleSkip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, handleDone, togglePause, handleSkip])

  // ─── Setup screen ───
  if (phase === 'setup') {
    return (
      <div className="et-root">
        <button className="et-back" onClick={() => navigate(-1)}>
          <svg className="et-back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t('common.back')}
        </button>

        <div className="et-setup">
          <div className="et-setup-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <h1 className="et-setup-title">{t('examTimer.title')}</h1>
          <p className="et-setup-sub">{t('examTimer.subtitle')}</p>

          <div className="et-setup-fields">
            <label className="et-field">
              <span className="et-field-label">{t('examTimer.totalQuestions')}</span>
              <div className="et-field-input-wrap">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                  className="et-field-input"
                />
                <div className="et-field-btns">
                  <button className="et-field-btn" onClick={() => setTotalQuestions((v) => Math.min(999, v + 1))}>+</button>
                  <button className="et-field-btn" onClick={() => setTotalQuestions((v) => Math.max(1, v - 1))}>−</button>
                </div>
              </div>
            </label>

            <label className="et-field">
              <span className="et-field-label">{t('examTimer.timePerQuestion')}</span>
              <div className="et-field-input-wrap">
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Math.max(5, Math.min(600, Number(e.target.value) || 5)))}
                  className="et-field-input"
                />
                <div className="et-field-btns">
                  <button className="et-field-btn" onClick={() => setTimePerQuestion((v) => Math.min(600, v + 5))}>+</button>
                  <button className="et-field-btn" onClick={() => setTimePerQuestion((v) => Math.max(5, v - 5))}>−</button>
                </div>
              </div>
              <span className="et-field-hint">
                {timePerQuestion >= 60
                  ? `${Math.floor(timePerQuestion / 60)}m ${timePerQuestion % 60 > 0 ? timePerQuestion % 60 + 's' : ''}`
                  : `${timePerQuestion}s`}
                {' '}per question · {fmt(totalQuestions * timePerQuestion)} total
              </span>
            </label>
          </div>

          <button className="et-start-btn" onClick={handleStart}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M8 5v14l11-7z" />
            </svg>
            {t('examTimer.startChallenge')}
          </button>
        </div>
      </div>
    )
  }

  // ─── Results screen ───
  if (phase === 'results') {
    return (
      <div className="et-root">
        <div className="et-results">
          <div className="et-results-header">
            <div className="et-results-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="et-results-title">{t('examTimer.challengeComplete')}</h1>
            <p className="et-results-sub">{completedCount} of {totalQuestions} completed · {fmt(masterElapsed)} total</p>
          </div>

          <div className="et-stats-row">
            <div className="et-stat-card">
              <div className="et-stat-value">{completedCount}/{totalQuestions}</div>
              <div className="et-stat-label">{t('examTimer.solved')}</div>
            </div>
            <div className="et-stat-card">
              <div className="et-stat-value">{fmt(avgTime)}</div>
              <div className="et-stat-label">{t('examTimer.avgPerQ')}</div>
            </div>
            <div className="et-stat-card">
              <div className="et-stat-value">{fmt(masterElapsed)}</div>
              <div className="et-stat-label">{t('examTimer.totalTimeLabel')}</div>
            </div>
          </div>

          <div className="et-results-list">
            {results.map((r) => (
              <div key={r.index} className={`et-result-item ${r.completed ? 'done' : 'missed'}`}>
                <span className="et-result-num">Q{r.index + 1}</span>
                <span className="et-result-time">
                  {r.completed ? fmt(r.elapsed) : '—'}
                </span>
                <span className="et-result-bar">
                  <span
                    className="et-result-bar-fill"
                    style={{
                      width: r.completed
                        ? `${Math.min(100, (r.elapsed / timePerQuestion) * 100)}%`
                        : '100%',
                    }}
                  />
                </span>
                {r.completed && r.elapsed <= timePerQuestion && (
                  <span className="et-result-badge">✓</span>
                )}
                {!r.completed && (
                  <span className="et-result-badge missed">✗</span>
                )}
              </div>
            ))}
          </div>

          <div className="et-results-actions">
            <button className="et-start-btn" onClick={handleStart}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
              {t('examTimer.retry')}
            </button>
            <button className="et-secondary-btn" onClick={handleQuit}>
              {t('common.back')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Running / Paused screen ───
  const ringSize = 220
  const ringStroke = 10
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const questionOffset = ringCircumference * (1 - questionPct / 100)

  return (
    <div className="et-root et-running-root">
      {/* Master timer bar — always visible at top */}
      <div className="et-master-bar">
        <div className="et-master-bar-fill" style={{ width: `${Math.min(100, masterPct)}%` }} />
        <div className="et-master-bar-content">
          <span className="et-master-label">{t('examTimer.masterTimer')}</span>
          <span className="et-master-time">{fmt(masterElapsed)}</span>
          <span className="et-master-remaining">{fmt(totalQuestions * timePerQuestion - masterElapsed)} left</span>
        </div>
      </div>

      <div className="et-running">
        {/* Question counter */}
        <div className="et-q-counter">
          <span className="et-q-current">{currentQ + 1}</span>
          <span className="et-q-sep">/</span>
          <span className="et-q-total">{totalQuestions}</span>
        </div>

        {/* Circular timer */}
        <div className="et-ring-wrap">
          <svg className="et-ring" width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
            <circle
              className="et-ring-bg"
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={ringStroke}
            />
            <circle
              className="et-ring-progress"
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke={questionTimeLeft <= 10 ? 'var(--danger)' : 'var(--accent)'}
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={questionOffset}
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s ease' }}
            />
          </svg>
          <div className="et-ring-time">
            <span className={`et-ring-seconds ${questionTimeLeft <= 10 ? 'et-ring-seconds--warn' : ''}`}>
              {questionTimeLeft}
            </span>
            <span className="et-ring-unit">sec</span>
          </div>
        </div>

        {/* Controls */}
        <div className="et-controls">
          <button
            className={`et-ctrl-btn et-ctrl-done ${phase === 'paused' ? 'et-ctrl-paused' : ''}`}
            onClick={phase === 'running' ? handleDone : togglePause}
            title={phase === 'paused' ? `${t('examTimer.resume')} (Space)` : `${t('examTimer.done')} (Space)`}
          >
            {phase === 'paused' ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            <span>{phase === 'paused' ? t('examTimer.resume') : t('examTimer.done')}</span>
          </button>

          <button className="et-ctrl-btn et-ctrl-skip" onClick={handleSkip} title={`${t('examTimer.skip')} (S)`}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" /></svg>
            <span>{t('examTimer.skip')}</span>
          </button>

          <button className="et-ctrl-btn et-ctrl-pause" onClick={togglePause} title={`${t('examTimer.pause')} (Esc)`}>
            {phase === 'paused' ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            )}
            <span>{phase === 'paused' ? t('examTimer.resume') : t('examTimer.pause')}</span>
          </button>
        </div>

        <button className="et-quit-btn" onClick={handleQuit}>
          {t('examTimer.cancelChallenge')}
        </button>
      </div>

      {/* Paused overlay */}
      {phase === 'paused' && (
        <div className="et-paused-overlay" onClick={togglePause}>
          <div className="et-paused-card" onClick={(e) => e.stopPropagation()}>
            <div className="et-paused-icon">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <h2>{t('examTimer.paused')}</h2>
            <p>{t('examTimer.question', { current: currentQ + 1, total: totalQuestions })}</p>
            <div className="et-paused-actions">
              <button className="et-start-btn" onClick={togglePause}>{t('examTimer.resume')}</button>
              <button className="et-secondary-btn" onClick={handleQuit}>{t('examTimer.quit')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
