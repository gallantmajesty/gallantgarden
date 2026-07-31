import { useState, useCallback, useEffect } from "react";
import type { ClockMode } from "../hooks/focus/types";
import type { TimerType } from "../store/pomodoro";
import { CornerFiligree } from "./focus/CornerFiligree";
import { ClockHeader } from "./focus/ClockHeader";
import { ClockRenderer } from "./focus/ClockRenderer";
import { SideDock } from "./focus/SideDock";
import { TimerControls } from "./focus/TimerControls";
import { AstronomicalChart } from "./focus/AstronomicalChart";
import { MultiplayerBar } from "./focus/MultiplayerBar";
import { usePomodoro, computeSegments, SESSION_OPTIONS, TimerPreset, SessionSummary, SessionHistoryEntry, BREAK_ACTIVITIES } from "../store/pomodoro";
import { useWorld } from "../store/world";
import { useSettings } from "../store/settings";
import { useHardcore } from "../store/hardcore";
import { useHardcodeMode } from "../hooks/focus/useHardcodeMode";
import { useLockerTask } from "../hooks/focus/useLockerTask";
import { useMultiplayerPresence } from "../hooks/focus/useMultiplayerPresence";
import { useAstronomicalLog } from "../hooks/focus/useAstronomicalLog";
import { useSideDock } from "../hooks/focus/useSideDock";
import { WagerModal } from "./focus/WagerModal";
import "./FocusDomain.css";

interface FocusDomainProps {
  isOpen: boolean;
  onClose: () => void;
}

const S: Record<string, React.CSSProperties> = {
  root: {
    position: "absolute",
    inset: 0,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "linear-gradient(180deg, #1A1410 0%, #2D1F12 50%, #1A1410 100%)",
    fontFamily: "var(--font-serif-heading)",
    color: "var(--color-genshin-gold)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "0.75rem 1.5rem",
    gap: "1rem",
    flexShrink: 0,
    borderBottom: "1px solid var(--color-genshin-divider)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  title: {
    fontSize: "1.125rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--color-genshin-gold)",
    fontFamily: "var(--font-serif-heading)",
  },
  subtitle: {
    fontSize: "0.75rem",
    opacity: 0.7,
    color: "var(--color-genshin-bronze)",
  },
  spacer: { flex: 1 },
  stats: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    fontSize: "0.75rem",
    color: "var(--color-genshin-bronze)",
  },
  hcBtn: {
    padding: "0.25rem 0.75rem",
    fontSize: "0.75rem",
    borderRadius: 2,
    transition: "all 0.2s",
    cursor: "pointer",
    fontFamily: "var(--font-serif-heading)",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
    padding: "0 1rem",
    overflow: "hidden",
  },
  card: {
    flexShrink: 0,
  },
  logCard: {
    flexShrink: 0,
    marginTop: "0.5rem",
    padding: "1rem 1.5rem",
    width: "100%",
    maxWidth: "32rem",
  },
  logHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.75rem",
  },
  logLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.05em",
    color: "var(--color-genshin-gold)",
    fontFamily: "var(--font-serif-heading)",
  },
  logMeta: { fontSize: "0.75rem", color: "var(--color-genshin-bronze)" },
  progressBar: {
    width: "100%",
    maxWidth: "32rem",
    padding: "0 1rem",
  },
  barOuter: {
    height: 4,
    borderRadius: 999,
    background: "rgba(26, 20, 16, 0.4)",
  },
  barInner: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.3s",
    background: "var(--color-genshin-gold)",
  },
  lockedText: {
    marginTop: "0.5rem",
    textAlign: "center",
    fontSize: "0.75rem",
    color: "var(--color-genshin-gold-light)",
  },
};

function PresetsModal({ onClose }: { onClose: () => void }) {
  const { presets, addPreset, updatePreset, deletePreset, loadPreset } = usePomodoro();
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSave = (preset: TimerPreset) => {
    if (editId) {
      updatePreset(editId, { name: editName });
      setEditId(null);
      setEditName('');
    } else {
      addPreset({
        name: editName || `Preset ${presets.length + 1}`,
        timerType: preset.timerType,
        sessionMinutes: preset.sessionMinutes,
        breakCount: preset.breakCount,
        breakDurations: preset.breakDurations,
      });
      setEditName('');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      {presets.length === 0 ? (
        <div style={{ textAlign: 'center', opacity: 0.6, padding: '2rem' }}>
          <p>No presets saved yet</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Configure a timer and click "Save as Preset"
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="genshin-card"
              style={{
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {editId === preset.id ? (
                    <input
                      type="text"
                      value={editName || preset.name}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleSave(preset)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(preset)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '2px 6px',
                        fontSize: '0.85rem',
                        fontFamily: 'var(--font-serif-heading)',
                        background: 'rgba(26,20,16,0.6)',
                        border: '1px solid rgba(180,150,60,0.5)',
                        color: 'var(--color-genshin-gold)',
                        borderRadius: 2,
                        outline: 'none',
                      }}
                    />
                  ) : (
                    preset.name
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.25rem' }}>
                  {preset.timerType === 'focus' ? 'Focus' : 'Pomodoro'} · {preset.sessionMinutes}min
                  {preset.breakCount > 0 && ` · ${preset.breakCount} breaks`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => { loadPreset(preset.id); onClose(); }}
                  className="genshin-btn"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.65rem' }}
                >
                  Load
                </button>
                {editId === preset.id ? (
                  <button
                    onClick={() => { handleSave(preset); setEditId(null); }}
                    className="genshin-btn"
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.65rem' }}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => { setEditId(preset.id); setEditName(preset.name); }}
                    className="genshin-btn"
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.65rem' }}
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => { if (confirm('Delete this preset?')) deletePreset(preset.id); }}
                  className="genshin-btn"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.65rem', opacity: 0.6 }}
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(139,109,46,0.2)' }}>
        <button
          onClick={() => {
            const { timerType, sessionMinutes, breakCount, breakDurations } = usePomodoro.getState();
            if (sessionMinutes > 0) {
              addPreset({
                name: `Preset ${presets.length + 1}`,
                timerType,
                sessionMinutes,
                breakCount,
                breakDurations,
              });
            }
          }}
          className="genshin-btn"
          style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem' }}
        >
          Save Current Config as Preset
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 *  HISTORY MODAL
 * ============================================================ */

function HistoryModal({ onClose }: { onClose: () => void }) {
  const { history, clearHistory, getSessionSummary } = usePomodoro();
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    setSummary(getSessionSummary());
  }, [getSessionSummary]);

  return (
    <div style={{ padding: '1rem', maxHeight: '50vh', overflow: 'auto' }}>
      {summary && (
        <div className="genshin-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div><span style={{ opacity: 0.6 }}>Total Sessions</span><br />{summary.totalSessions}</div>
            <div><span style={{ opacity: 0.6 }}>Focus Time</span><br />{Math.round(summary.totalFocusMinutes / 60)}h {summary.totalFocusMinutes % 60}m</div>
            <div><span style={{ opacity: 0.6 }}>Leaves Earned</span><br />{summary.totalLeavesEarned}</div>
            <div><span style={{ opacity: 0.6 }}>Completed</span><br />{summary.completedSessions}</div>
            <div><span style={{ opacity: 0.6 }}>Avg Session</span><br />{Math.round(summary.averageSessionLength)}min</div>
            <div><span style={{ opacity: 0.6 }}>Current Streak</span><br />{summary.currentStreak}d</div>
            <div><span style={{ opacity: 0.6 }}>Longest Streak</span><br />{summary.longestStreak}d</div>
            <div><span style={{ opacity: 0.6 }}>Focus Sessions</span><br />{summary.sessionsByType.focus}</div>
            <div><span style={{ opacity: 0.6 }}>Pomodoro Sessions</span><br />{summary.sessionsByType.pomodoro}</div>
          </div>
        </div>
      )}
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', opacity: 0.6, padding: '2rem' }}>
          <p>No sessions recorded yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {history.slice(0, 50).map((session) => (
            <div
              key={session.id}
              className="genshin-card"
              style={{ padding: '0.75rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>
                  {session.timerType === 'focus' ? '🎯 Focus' : '🍅 Pomodoro'}
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                  {new Date(session.date).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div>{session.sessionMinutes}min</div>
                <div>{session.leavesEarned} leaves</div>
                <div>{session.subject || '—'}</div>
                <div>{session.completed ? '✓ Done' : '✗ Incomplete'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => {
            if (confirm('Clear all session history? This cannot be undone.')) {
              clearHistory();
              setSummary(getSessionSummary());
            }
          }}
          className="genshin-btn"
          style={{ flex: 1, opacity: 0.6 }}
        >
          Clear History
        </button>
        <button
          onClick={() => {
            const data = JSON.stringify(history, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `studyforest-history-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="genshin-btn"
          style={{ flex: 1 }}
        >
          Export JSON
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 *  EXPORT MODAL
 * ============================================================ */

function ExportModal({ onClose }: { onClose: () => void }) {
  const { history, getSessionSummary, presets } = usePomodoro();
  const [format, setFormat] = useState<'json' | 'csv'>('json');

  return (
    <div style={{ padding: '1rem' }}>
      <div className="genshin-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Export Options</div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="radio" name="format" value="json" checked={format === 'json'} onChange={() => setFormat('json')} />
            <span>JSON (full data)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="radio" name="format" value="csv" checked={format === 'csv'} onChange={() => setFormat('csv')} />
            <span>CSV (spreadsheet)</span>
          </label>
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
          {history.length} sessions · {presets.length} presets
        </div>
      </div>
      <button
        onClick={() => {
          const data = {
            exportedAt: new Date().toISOString(),
            summary: getSessionSummary(),
            history,
            presets,
          };
          let content: string;
          let mimeType: string;
          let ext: string;
          if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            ext = 'json';
          } else {
            const headers = ['Date', 'Type', 'Duration (min)', 'Breaks', 'Leaves', 'Subject', 'Completed'];
            const rows = history.map((s) => [
              new Date(s.date).toISOString(),
              s.timerType,
              s.sessionMinutes.toString(),
              s.breakCount.toString(),
              s.leavesEarned.toString(),
              s.subject,
              s.completed ? 'Yes' : 'No',
            ]);
            content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
            mimeType = 'text/csv';
            ext = 'csv';
          }
          const blob = new Blob([content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `studyforest-export-${Date.now()}.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
          onClose();
        }}
        className="genshin-btn"
        style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}
      >
        Download {format.toUpperCase()}
      </button>
    </div>
  );
}

export function FocusDomain({ isOpen, onClose }: FocusDomainProps) {
  const [clockMode, setClockMode] = useState<ClockMode>("sand");
  const [streakDays, setStreakDays] = useState(7);
  const [momentumScore, setMomentumScore] = useState(65);
  const [wallClock, setWallClock] = useState(new Date());
  const [pickType, setPickType] = useState<TimerType>("focus");
  const [pickDur, setPickDur] = useState(60);
  const [pickBreaks, setPickBreaks] = useState(0);
  const [customDur, setCustomDur] = useState("");
  const [customBreaks, setCustomBreaks] = useState<Record<number, number>>({});
  const [showPresets, setShowPresets] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showBreakActivities, setShowBreakActivities] = useState(false);
  const [showWager, setShowWager] = useState(false);
  const chimeVolume = useSettings((s) => s.pomo.chimeVolume);
  const setChimeVolume = useSettings((s) => s.setPomo);
  const [tabataRounds, setTabataRounds] = useState(8);
  const [tabataWorkSec, setTabataWorkSec] = useState(20);
  const [tabataRestSec, setTabataRestSec] = useState(10);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const {
    phase,
    remaining,
    totalElapsed,
    sessionMinutes,
    breakCount,
    segmentIndex,
    segmentsCompleted,
    running,
    timerType,
    toggle,
    forfeit,
    configure,
  } = usePomodoro();
  const hardcode = useHardcodeMode();
  const locker = useLockerTask();
  const multiplayer = useMultiplayerPresence();
  const astroLog = useAstronomicalLog();
  const dock = useSideDock();

  const isIdle = phase === "idle";

  // Load presets and history on mount
  useEffect(() => {
    const presets = usePomodoro.getState().presets;
    setShowPresets(presets.length > 0);
  }, []);

  useEffect(() => {
    const summary = usePomodoro.getState().getSessionSummary();
    setSummary(summary);
  }, []);

  useEffect(() => {
    if (isIdle) {
      setPickType(timerType);
      setPickDur(sessionMinutes);
      setPickBreaks(breakCount);
      setCustomDur("");
      setCustomBreaks({});
    }
  }, [isIdle, timerType, sessionMinutes, breakCount]);

  useEffect(() => {
    const id = setInterval(() => setWallClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const segments = computeSegments(sessionMinutes, breakCount);
  const currentSegmentMin = segments[segmentIndex] ?? 25;
  const breakMin = Math.max(2, Math.round(sessionMinutes / (breakCount + 1) * 0.2));

  const isFocusPhase = phase === "running";
  const isBreakPhase = phase === "break";
  const isFinishedPhase = phase === "finished";
  const isPausedPhase = phase === "paused";

  const isRunning = running && (isFocusPhase || isBreakPhase);
  const isPaused = isPausedPhase || (!running && (isFocusPhase || isBreakPhase));

  const timerMode = isFinishedPhase ? "completed" : (isFocusPhase || isBreakPhase) ? "running" : phase;

  const totalSeconds = isBreakPhase
    ? breakMin * 60
    : isFocusPhase
      ? currentSegmentMin * 60
      : 0;

  const timerProgress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0;

  const handleStart = useCallback(() => {
    const dur = customDur.trim()
      ? parseInt(customDur, 10)
      : pickDur;
    if (dur > 0 && dur <= 999) {
      configure(pickType, dur, pickType === 'pomodoro' ? pickBreaks : 0, customBreaks);
    }
    toggle();
  }, [toggle, pickType, pickDur, pickBreaks, customDur, customBreaks, configure]);

  const handleLockIn = useCallback(
    (taskId: string, _duration: number) => {
      locker.setActiveTask(taskId);
      toggle();
    },
    [locker, toggle]
  );

  const handleReset = useCallback(() => {
    if (isFinishedPhase || isPausedPhase) {
      const focusMin = Math.floor(totalElapsed / 60);
      if (focusMin > 0) {
        astroLog.recordSession(focusMin, clockMode);
        setMomentumScore((s) => Math.min(100, s + 5));
        setStreakDays((s) => s + (astroLog.log.currentStreak > s ? 1 : 0));
      }
    }
    forfeit();
  }, [isFinishedPhase, isPausedPhase, totalElapsed, astroLog, clockMode, forfeit]);

  const handleHardcoreStart = useCallback((wager: number, minutes: number) => {
    const ok = useHardcore.getState().start(wager, minutes);
    if (!ok) return;
    configure(pickType, minutes, pickType === 'pomodoro' ? pickBreaks : 0, customBreaks);
    toggle();
    dock.setTab('tasks');
    setShowWager(false);
  }, [pickType, pickBreaks, customBreaks, configure, toggle, dock]);

  // Win: timer finished while hardcore was active → credit wager + earnings.
  useEffect(() => {
    if (phase === 'finished' && hardcode.hardcodeActive) {
      useHardcore.getState().win();
    }
  }, [phase, hardcode.hardcodeActive]);

  // Fail (fullscreen grace expired or forfeit): settle the pomodoro timer.
  useEffect(() => {
    if (hardcode.status === 'failed' && phase !== 'idle') {
      forfeit();
    }
  }, [hardcode.status, phase, forfeit]);

  // Surface the result modal automatically when a session is won or lost.
  useEffect(() => {
    if (hardcode.status === 'won' || hardcode.status === 'failed') {
      setShowWager(true);
    }
  }, [hardcode.status]);

  useEffect(() => {
    if (isOpen) {
      useWorld.getState().setRenderPaused(true);
    } else {
      useWorld.getState().setRenderPaused(false);
    }
    return () => {
      useWorld.getState().setRenderPaused(false);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hcStyle: React.CSSProperties = {
    ...S.hcBtn,
    background: hardcode.hardcodeActive
      ? "rgba(201, 168, 76, 0.15)"
      : "rgba(26, 20, 16, 0.4)",
    border: `1px solid ${
      hardcode.hardcodeActive ? "var(--color-genshin-gold)" : "rgba(139, 109, 46, 0.3)"
    }`,
    color: hardcode.hardcodeActive
      ? "var(--color-genshin-gold)"
      : "var(--color-genshin-bronze)",
  };

  const closeStyle: React.CSSProperties = {
    ...S.hcBtn,
    border: "1px solid rgba(139, 109, 46, 0.3)",
    color: "var(--color-genshin-bronze)",
  };

  const cfgBtn = (active: boolean): React.CSSProperties => ({
    fontSize: '0.75rem',
    fontFamily: 'var(--font-mono-display)',
    background: active ? 'rgba(180,150,60,0.2)' : 'rgba(26,20,16,0.5)',
    border: active ? '1px solid rgba(180,150,60,0.5)' : '1px solid rgba(139,109,46,0.2)',
    color: active ? 'var(--color-genshin-gold)' : 'var(--color-genshin-bronze)',
    borderRadius: 2,
    padding: '4px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={S.root}>
      <CornerFiligree />

      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.title}>✦ GENSHIN FOCUS DOMAIN ✦</span>
          <span style={S.subtitle}>Scholar Sanctuary</span>
        </div>

        <div style={{ ...S.spacer }} />

        <div style={{
          fontSize: "0.8rem",
          fontFamily: "var(--font-mono-display)",
          color: "var(--color-genshin-gold)",
          letterSpacing: "0.05em",
        }}>
          {wallClock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>

        <div style={S.stats}>
          <span>Streak: {streakDays}d</span>
          <span>Leaves: {astroLog.log.totalLeaves} ✦</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <input
            type="number"
            min={1}
            max={999}
            placeholder="min"
            value={customDur}
            onChange={(e) => setCustomDur(e.target.value)}
            style={{
              width: 52,
              padding: '2px 5px',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono-display)',
              background: 'rgba(26,20,16,0.6)',
              border: customDur ? '1px solid rgba(180,150,60,0.5)' : '1px solid rgba(139,109,46,0.3)',
              color: 'var(--color-genshin-gold)',
              borderRadius: 2,
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '0.65rem', color: 'var(--color-genshin-bronze)' }}>min</span>
        </div>

        <button onClick={() => setShowWager(true)} style={hcStyle}>
          {hardcode.hardcodeActive
            ? `HARDCODE • ${hardcode.wager} 🍃`
            : hardcode.status === "won"
              ? "HARDCODE • WON"
              : hardcode.status === "failed"
                ? "HARDCODE • LOST"
                : "HARDCODE"}
        </button>

        <button onClick={onClose} style={closeStyle}>
          ✕
        </button>
      </div>

      <ClockHeader currentMode={clockMode} onModeChange={setClockMode} />

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        padding: "0 1rem",
        overflow: "hidden",
        justifyContent: "center",
      }}>
        <div style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {timerMode === "idle" ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.2rem',
              padding: '0 1rem',
              maxWidth: '36rem',
              width: '100%',
            }}>
              <span style={{
                fontSize: "1rem",
                fontFamily: "var(--font-serif-heading)",
                color: "var(--color-genshin-gold)",
                letterSpacing: "0.1em",
              }}>
                TIMER CONFIGURATION
              </span>

              {/* Mode */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-genshin-bronze)', width: 64 }}>Mode</span>
                <button onClick={() => setPickType('focus')} style={cfgBtn(pickType === 'focus')}>Focus</button>
                <button onClick={() => setPickType('pomodoro')} style={cfgBtn(pickType === 'pomodoro')}>Pomodoro</button>
                <button onClick={() => setPickType('tabata')} style={cfgBtn(pickType === 'tabata')}>Tabata</button>
              </div>

              {/* Duration */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-genshin-bronze)', width: 64 }}>Duration</span>
                {SESSION_OPTIONS.map((m) => (
                  <button key={m} onClick={() => { setPickDur(m); setCustomDur(''); }} style={cfgBtn(pickDur === m && customDur === '')}>
                    {m >= 60 ? `${m / 60}h` : `${m}m`}
                  </button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    placeholder="custom"
                    value={customDur}
                    onChange={(e) => { setCustomDur(e.target.value); }}
                    style={{
                      width: 80,
                      padding: '4px 8px',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-mono-display)',
                      background: 'rgba(26,20,16,0.6)',
                      border: customDur ? '1px solid rgba(180,150,60,0.6)' : '1px solid rgba(139,109,46,0.25)',
                      color: 'var(--color-genshin-gold)',
                      borderRadius: 2,
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-genshin-bronze)' }}>min</span>
                </div>
              </div>

              {/* Breaks (pomodoro only) */}
              {pickType === 'pomodoro' && (
                <>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-genshin-bronze)', width: 64 }}>Breaks</span>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                      const d = customDur ? parseInt(customDur, 10) || pickDur : pickDur;
                      const segs = computeSegments(d, n);
                      const segMin = segs[0];
                      return (
                        <button key={n} onClick={() => setPickBreaks(n)} style={cfgBtn(pickBreaks === n)}>
                          {n} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>({segMin}m)</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-genshin-bronze)', width: 64 }}>Break Dur</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {Array.from({ length: pickBreaks }, (_, i) => i).map((i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-genshin-bronze)' }}>Break {i + 1}:</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={customBreaks[i] || ((i + 1) % 4 === 0 ? 15 : 5)}
                            onChange={(e) => setCustomBreaks({ ...customBreaks, [i]: parseInt(e.target.value) || ((i + 1) % 4 === 0 ? 15 : 5) })}
                            style={{
                              width: 50,
                              padding: '2px 6px',
                              fontSize: '0.7rem',
                              fontFamily: 'var(--font-mono-display)',
                              background: 'rgba(26,20,16,0.6)',
                              border: '1px solid rgba(139,109,46,0.3)',
                              color: 'var(--color-genshin-gold)',
                              borderRadius: 2,
                              textAlign: 'center',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-genshin-bronze)' }}>min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Tabata settings */}
              {pickType === 'tabata' && (
                <>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-genshin-bronze)', width: 64 }}>Rounds</span>
                    {[4, 6, 8, 10].map((n) => (
                      <button key={n} onClick={() => setTabataRounds(n)} style={cfgBtn(tabataRounds === n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-genshin-bronze)', width: 64 }}>Work</span>
                    {[10, 15, 20, 25, 30].map((n) => (
                      <button key={n} onClick={() => setTabataWorkSec(n)} style={cfgBtn(tabataWorkSec === n)}>
                        {n}s
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-genshin-bronze)', width: 64 }}>Rest</span>
                    {[5, 10, 15, 20].map((n) => (
                      <button key={n} onClick={() => setTabataRestSec(n)} style={cfgBtn(tabataRestSec === n)}>
                        {n}s
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Auto-start & Sound */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-genshin-bronze)' }}>
                  <input type="checkbox" checked={useSettings.getState().pomo.autoStart} onChange={(e) => useSettings.getState().setPomo({ autoStart: e.target.checked })} />
                  Auto-start next
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-genshin-bronze)' }}>🔊</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={chimeVolume}
                    onChange={(e) => useSettings.getState().setPomo({ chimeVolume: parseFloat(e.target.value) })}
                    style={{ width: 80, height: 4, accentColor: 'var(--color-genshin-gold)' }}
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-genshin-bronze)' }}>{Math.round(chimeVolume * 100)}%</span>
                </div>
              </div>

              <button onClick={handleStart} style={{
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono-display)',
                background: 'linear-gradient(135deg, rgba(180,150,60,0.25), rgba(120,90,30,0.25))',
                border: '1px solid rgba(180,150,60,0.5)',
                color: 'var(--color-genshin-gold)',
                borderRadius: 3,
                padding: '10px 36px',
                cursor: 'pointer',
                letterSpacing: '0.1em',
                marginTop: '0.8rem',
              }}>
                START {pickType === 'tabata' ? 'TABATA' : pickType === 'pomodoro' ? `POMODORO${pickBreaks > 0 ? ` • ${pickBreaks} BREAKS` : ''}` : 'FOCUS'}
              </button>

              {/* Presets & History */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(139,109,46,0.2)' }}>
                <button onClick={() => setShowPresets(true)} style={cfgBtn(false)}>
                  Presets
                </button>
                <button onClick={() => setShowHistory(true)} style={cfgBtn(false)}>
                  History
                </button>
                <button onClick={() => setShowExport(true)} style={cfgBtn(false)}>
                  Export
                </button>
              </div>
            </div>
          ) : (
            <ClockRenderer
              mode={clockMode}
              remainingSeconds={remaining}
              totalSeconds={totalSeconds}
              isRunning={isRunning}
              isPaused={isPaused}
              focusMinutes={Math.floor(totalElapsed / 60)}
              streakDays={streakDays}
              momentumScore={momentumScore}
            />
          )}
        </div>

        <div style={S.card}>
          <TimerControls
            mode={timerMode}
            hardcodeActive={hardcode.hardcodeActive}
            exitHoldProgress={hardcode.exitHoldProgress}
            onStart={handleStart}
            onPause={toggle}
            onResume={toggle}
            onReset={handleReset}
            onStartExitHold={() =>
              hardcode.startExitHold(() => {
                forfeit();
              })
            }
            onCancelExitHold={hardcode.cancelExitHold}
          />
        </div>

        {timerMode === "idle" && astroLog.log.sessions.length > 0 && (
          <div style={S.logCard} className="genshin-card">
            <div style={S.logHead}>
              <span style={S.logLabel}>ASTRONOMICAL LOG</span>
              <span style={S.logMeta}>
                {astroLog.log.totalLeaves} leaves · Rank:{" "}
                {astroLog.log.totalFocusMinutes >= 6000
                  ? "Grand Sage"
                  : astroLog.log.totalFocusMinutes >= 3000
                    ? "Adeptus Scholar"
                    : astroLog.log.totalFocusMinutes >= 1000
                      ? "Celestial Archivist"
                      : astroLog.log.totalFocusMinutes >= 300
                        ? "Diligent Reader"
                        : "Apprentice"}
              </span>
            </div>
            <AstronomicalChart
              sessions={astroLog.log.sessions}
              totalFocusMinutes={astroLog.log.totalFocusMinutes}
              totalLeaves={astroLog.log.totalLeaves}
              currentStreak={astroLog.log.currentStreak}
              longestStreak={astroLog.log.longestStreak}
            />
          </div>
        )}

        {timerMode !== "idle" && (
          <div style={S.progressBar}>
            <div style={S.barOuter}>
              <div
                style={{
                  ...S.barInner,
                  width: `${timerProgress * 100}%`,
                  minWidth: timerProgress > 0 ? 4 : 0,
                }}
              />
            </div>

            {locker.activeTask && (
              <div style={S.lockedText}>Locked in: {locker.activeTask.title}</div>
            )}
          </div>
        )}

        {/* Break Activity Suggestions */}
        {isBreakPhase && (
          <div style={{ ...S.card, width: '100%', maxWidth: '32rem', padding: '0.75rem 1rem', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-genshin-gold)', fontFamily: 'var(--font-serif-heading)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              ☕ BREAK TIME — Suggestions
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {BREAK_ACTIVITIES.map((a) => (
                <div key={a.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 3,
                  background: 'rgba(26,20,16,0.4)',
                  border: '1px solid rgba(139,109,46,0.2)',
                  fontSize: '0.7rem',
                  color: 'var(--color-genshin-bronze)',
                  cursor: 'pointer',
                }}>
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                  <span style={{ opacity: 0.5 }}>{a.duration}s</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <MultiplayerBar
        scholars={multiplayer.scholars}
        activeCount={multiplayer.activeCount}
        totalCount={multiplayer.totalCount}
      />

      <SideDock
        isOpen={dock.isOpen}
        activeTab={dock.activeTab}
        width={dock.width}
        onTabChange={dock.setTab}
        onClose={dock.close}
        lockOpen={hardcode.hardcodeActive}
        tasks={locker.tasks}
        activeTaskId={locker.activeTaskId}
        onAddTask={locker.addTask}
        onRemoveTask={locker.removeTask}
        onSetActive={locker.setActiveTask}
        onAddSubTask={locker.addSubTask}
        onToggleSubTask={locker.toggleSubTask}
        onLockIn={handleLockIn}
      />

      {/* Presets Modal */}
      {showPresets && (
        <div className="udm-overlay" onClick={() => setShowPresets(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="udm-head">
              <div className="udm-head-left">
                <span className="udm-head-name">Timer Presets</span>
              </div>
              <button className="udm-close" onClick={() => setShowPresets(false)}>×</button>
            </div>
            <div className="udm-body">
              <PresetsModal onClose={() => setShowPresets(false)} />
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="udm-overlay" onClick={() => setShowHistory(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="udm-head">
              <div className="udm-head-left">
                <span className="udm-head-name">Session History</span>
              </div>
              <button className="udm-close" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="udm-body">
              <HistoryModal onClose={() => setShowHistory(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <div className="udm-overlay" onClick={() => setShowExport(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="udm-head">
              <div className="udm-head-left">
                <span className="udm-head-name">Export Data</span>
              </div>
              <button className="udm-close" onClick={() => setShowExport(false)}>×</button>
            </div>
            <div className="udm-body">
              <ExportModal onClose={() => setShowExport(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Wager Modal */}
      {showWager && (
        <div className="udm-overlay" onClick={() => setShowWager(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="udm-head">
              <div className="udm-head-left">
                <span className="udm-head-name">Hardcore Wager</span>
              </div>
              <button className="udm-close" onClick={() => setShowWager(false)}>×</button>
            </div>
            <WagerModal
              onClose={() => setShowWager(false)}
              onStart={handleHardcoreStart}
              onForfeit={() => {
                forfeit();
                setShowWager(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Fullscreen grace countdown */}
      {hardcode.hardcodeActive && hardcode.graceLeft > 0 && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(30, 8, 8, 0.72)",
          backdropFilter: "blur(3px)",
        }}>
          <div style={{
            textAlign: "center",
            padding: "2rem 3rem",
            border: "1px solid rgba(220,80,60,0.7)",
            background: "rgba(26,16,14,0.95)",
            boxShadow: "0 0 60px rgba(220,80,60,0.35)",
          }}>
            <div style={{ fontSize: "0.85rem", letterSpacing: "0.2em", color: "rgba(255,180,160,1)", fontWeight: 700 }}>
              ⚠️ FULLSCREEN REQUIRED
            </div>
            <div style={{ fontSize: "3rem", color: "var(--color-genshin-gold)", fontFamily: "var(--font-mono-display)", margin: "0.75rem 0" }}>
              {hardcode.graceLeft}
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,200,180,0.85)", maxWidth: 340, lineHeight: 1.5 }}>
              Return to fullscreen within {hardcode.graceLeft}s or the session fails and you lose{" "}
              <b>{hardcode.wager} 🍃</b>. Your timer is still running.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}