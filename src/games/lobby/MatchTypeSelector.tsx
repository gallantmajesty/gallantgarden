// Lava Pad Match Type Selector — choose session duration, breaks, and play mode

import { useState } from 'react'
import { MATCH_TYPE_LIST } from '../../three/lava-pad/matchSchedule'
import type { SessionType } from '../../three/lava-pad/matchSchedule'
import { useSessionStore } from '../../three/lava-pad/sessionStore'

interface MatchTypeSelectorProps {
  onConfirm: () => void
  onBack: () => void
}

export function MatchTypeSelector({ onConfirm, onBack }: MatchTypeSelectorProps) {
  const sessionType = useSessionStore((s) => s.sessionType)
  const playMode = useSessionStore((s) => s.playMode)
  const selectSessionType = useSessionStore((s) => s.selectSessionType)
  const selectPlayMode = useSessionStore((s) => s.selectPlayMode)
  const [hoveredType, setHoveredType] = useState<SessionType | null>(null)

  const canConfirm = sessionType !== null

  function handleConfirm() {
    if (!canConfirm) return
    onConfirm()
  }

  return (
    <div className="match-type-root">
      <div className="match-type-card water-glass">
        <button className="match-type-back" onClick={onBack} aria-label="Back">
          ←
        </button>

        <h2 className="match-type-title">Lava Pad</h2>
        <p className="match-type-subtitle">Choose your session</p>

        {/* Session type cards */}
        <div className="match-type-list">
          {MATCH_TYPE_LIST.map((mt) => {
            const isSel = sessionType === mt.id
            const isHover = hoveredType === mt.id
            const breaks = mt.segments.filter((s) => !s.active).length
            const games = mt.segments.filter((s) => s.active).length
            return (
              <button
                key={mt.id}
                className={`match-type-item ${isSel ? 'selected' : ''} ${isHover ? 'hover' : ''}`}
                onClick={() => selectSessionType(mt.id)}
                onMouseEnter={() => setHoveredType(mt.id)}
                onMouseLeave={() => setHoveredType((h) => (h === mt.id ? null : h))}
              >
                <div className="match-type-item-head">
                  <span className="match-type-item-name">{mt.name}</span>
                  <span className="match-type-item-time">{mt.totalMinutes} min</span>
                </div>
                <div className="match-type-item-desc">{mt.description}</div>
                <div className="match-type-item-stats">
                  <span>{games} game{games > 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{breaks} break{breaks > 1 ? 's' : ''}</span>
                </div>
                {/* Timeline preview */}
                <div className="match-type-timeline" aria-hidden="true">
                  {mt.segments.map((seg, i) => {
                    const dur = seg.endMin - seg.startMin
                    const frac = dur / mt.totalMinutes * 100
                    return (
                      <div
                        key={i}
                        className={`match-type-timeline-seg ${seg.active ? 'active' : 'break'}`}
                        style={{ width: `${frac}%` }}
                        title={`${seg.label} · ${dur} min`}
                      />
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>

        {/* Play mode toggle (single vs multiplayer) */}
        <div className="match-type-mode">
          <span className="match-type-mode-label">Mode</span>
          <div className="match-type-mode-toggle">
            <button
              className={`match-type-mode-btn ${playMode === 'single' ? 'active' : ''}`}
              onClick={() => selectPlayMode('single')}
            >
              Single Player
            </button>
            <button
              className={`match-type-mode-btn ${playMode === 'multi' ? 'active' : ''}`}
              onClick={() => selectPlayMode('multi')}
            >
              Multiplayer
            </button>
          </div>
          <p className="match-type-mode-hint">
            {playMode === 'single'
              ? 'Start immediately — play by yourself.'
              : 'Wait for other players to join before the match begins.'}
          </p>
        </div>

        {/* Confirm */}
        <button
          className={`sf-btn match-type-confirm ${!canConfirm ? 'disabled' : ''}`}
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {canConfirm ? 'Continue' : 'Pick a session'}
        </button>
      </div>

      <style>{`
        .match-type-root {
          position: absolute; inset: 0; display: grid; place-items: center;
          background: rgba(0,0,0,0.5); padding: 20px; z-index: 6;
          animation: match-type-in 0.3s ease;
        }
        @keyframes match-type-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .match-type-card {
          position: relative; text-align: center; padding: 28px 24px 24px;
          border-radius: 28px; max-width: 440px; width: 100%;
          backdrop-filter: blur(12px);
          max-height: 90vh; overflow-y: auto;
        }
        .match-type-back {
          position: absolute; top: 16px; left: 16px;
          width: 32px; height: 32px; border-radius: 50%;
          background: transparent; border: 1px solid var(--glass-border);
          color: var(--ink-soft); font-size: 18px; cursor: pointer;
          display: grid; place-items: center; transition: all 0.15s;
        }
        .match-type-back:hover { background: var(--glass-fill); color: var(--ink); }
        .match-type-title {
          font-family: var(--display); font-weight: 800; font-size: 26px;
          color: var(--ink); margin: 0 0 4px;
        }
        .match-type-subtitle {
          font-size: 13px; color: var(--ink-soft); margin: 0 0 20px;
          text-transform: uppercase; letter-spacing: 2px;
        }
        .match-type-list {
          display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;
        }
        .match-type-item {
          text-align: left; padding: 14px 16px; border-radius: 16px;
          background: var(--glass-fill); border: 1.5px solid var(--glass-border);
          cursor: pointer; transition: all 0.18s ease; width: 100%;
        }
        .match-type-item.hover { transform: translateY(-1px); }
        .match-type-item.selected {
          border-color: var(--accent, #ffce54);
          background: color-mix(in srgb, var(--accent, #ffce54) 12%, var(--glass-fill));
          box-shadow: 0 0 0 3px rgba(255,206,84,0.15);
        }
        .match-type-item-head {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 4px;
        }
        .match-type-item-name {
          font-family: var(--display); font-weight: 700; font-size: 17px;
          color: var(--ink);
        }
        .match-type-item-time {
          font-size: 13px; font-weight: 700; color: var(--accent, #ffce54);
          font-variant-numeric: tabular-nums;
        }
        .match-type-item-desc {
          font-size: 12px; color: var(--ink-soft); margin-bottom: 8px;
        }
        .match-type-item-stats {
          display: flex; gap: 6px; font-size: 11px; color: var(--ink-soft);
          margin-bottom: 10px;
        }
        .match-type-timeline {
          display: flex; gap: 3px; height: 8px; border-radius: 5px;
          overflow: hidden; background: rgba(0,0,0,0.1);
        }
        .match-type-timeline-seg {
          height: 100%; border-radius: 2px;
        }
        .match-type-timeline-seg.active {
          background: linear-gradient(90deg, #ff8844, #ff5522);
        }
        .match-type-timeline-seg.break {
          background: rgba(255,255,255,0.25);
        }

        /* Play mode toggle */
        .match-type-mode {
          margin-bottom: 18px; padding: 14px; border-radius: 14px;
          background: var(--glass-fill); border: 1px solid var(--glass-border);
        }
        .match-type-mode-label {
          display: block; font-size: 11px; text-transform: uppercase;
          letter-spacing: 1.5px; color: var(--ink-soft); margin-bottom: 10px;
        }
        .match-type-mode-toggle {
          display: flex; gap: 8px; margin-bottom: 8px;
        }
        .match-type-mode-btn {
          flex: 1; padding: 10px; border-radius: 12px;
          background: rgba(0,0,0,0.15); border: 1.5px solid transparent;
          color: var(--ink-soft); font-weight: 600; font-size: 14px;
          cursor: pointer; transition: all 0.15s;
        }
        .match-type-mode-btn.active {
          background: color-mix(in srgb, var(--accent, #ffce54) 18%, transparent);
          border-color: var(--accent, #ffce54);
          color: var(--ink);
        }
        .match-type-mode-hint {
          font-size: 11px; color: var(--ink-soft); margin: 0;
          text-align: center;
        }

        .match-type-confirm {
          width: 100%; padding: 14px; font-size: 16px; font-weight: 700;
        }
        .match-type-confirm.disabled {
          opacity: 0.5; cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .match-type-card { padding: 22px 16px 20px; }
          .match-type-item { padding: 12px; }
          .match-type-title { font-size: 22px; }
        }
      `}</style>
    </div>
  )
}