import { useState, useCallback, useEffect, useMemo } from "react";
import type { TimerType } from "../store/pomodoro";
import type { FocusMode } from "../store/hardcore";
import { CornerFiligree } from "./focus/CornerFiligree";
import { SideDock } from "./focus/SideDock";
import { TimerControls } from "./focus/TimerControls";
import { MultiplayerBar } from "./focus/MultiplayerBar";
import { usePomodoro, computeSegments, liveFocusLeaves, SESSION_OPTIONS, BREAK_ACTIVITIES, suggestBreakActivity } from "../store/pomodoro";
import type { TimerPreset, SessionSummary, SessionHistoryEntry } from "../store/pomodoro";
import { useWorld } from "../store/world";
import { useSettings } from "../store/settings";
import { useProfile } from "../store/profile";
import { useHardcore, EASY_RATE, MEDIUM_RATE, hardcoreRateFor, hardcoreMultiplier, minWagerFor, wagerBonusMultiplier } from "../store/hardcore";
import { useDeviceBoost, boostPct } from "../lib/deviceBoost";
import { useHardcodeMode } from "../hooks/focus/useHardcodeMode";
import { useLockerTask } from "../hooks/focus/useLockerTask";
import { useMultiplayerPresence } from "../hooks/focus/useMultiplayerPresence";
import { useSideDock } from "../hooks/focus/useSideDock";
import { WagerModal } from "./focus/WagerModal";
import { HelpGuide } from "./focus/HelpGuide";
import { DeviceConnect } from "./focus/DeviceConnect";
import "./FocusDomain.css";

interface FocusDomainProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ============================================================
 *  INLINE SVG ICONS — no emojis, no image assets
 * ============================================================ */
function IconLeaf({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20C4 11 9 4 20 4c0 11-7 16-16 16z" />
      <path d="M4 20c4-6 8-10 13-13" />
    </svg>
  );
}
function IconDevice({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}
function IconWarn({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function IconBook({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function IconLink({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}
function IconGear({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  );
}
function IconPlay({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 1.7v12.6a.7.7 0 0 0 1.06.6l10-6.3a.7.7 0 0 0 0-1.2l-10-6.3A.7.7 0 0 0 4 1.7z" />
    </svg>
  );
}
function IconPause({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3" y="2" width="4" height="12" rx="1.2" />
      <rect x="9" y="2" width="4" height="12" rx="1.2" />
    </svg>
  );
}
function IconBreak({ id }: { id: string }) {
  const common = {
    width: 13, height: 13, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (id) {
    case 'walk':
      return <svg {...common}><path d="M13 4a2 2 0 1 0-4 0 2 2 0 0 0 4 0z" /><path d="M6 21l2-5 3 1 2 4M10 12l1-3 3 1 1 4M12 9l2-2 3 1" /></svg>;
    case 'hydrate':
      return <svg {...common}><path d="M12 2v4M12 6a5 5 0 0 1 5 5v6a5 5 0 0 1-10 0v-6a5 5 0 0 1 5-5z" /><path d="M12 6v2" /></svg>;
    case 'eyes':
      return <svg {...common}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.6" /></svg>;
    case 'breathe':
      return <svg {...common}><path d="M12 3v5M12 16v5M12 8a4 4 0 0 1 0 8" /><path d="M3 8h2a4 4 0 0 1 0 8H3M21 8h-2a4 4 0 0 0 0 8h2" /></svg>;
    case 'snack':
      return <svg {...common}><path d="M8 20V10a4 4 0 0 1 8 0v10" /><path d="M4 20h16M5 14h14M8 7h8M10 3h4" /></svg>;
    case 'chat':
      return <svg {...common}><path d="M21 12a8 8 0 0 1-8 8H4l1.5-3.5A8 8 0 1 1 21 12z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></svg>;
    case 'music':
      return <svg {...common}><path d="M9 18.5V6.8a1 1 0 0 1 .76-.97l8-2A1 1 0 0 1 19 4.8v11.2a2.8 2.8 0 1 1-1.6-2.53V7.4l-6.4 1.6v9.5a2.8 2.8 0 1 1-2-2.5z" /></svg>;
    default: // stretch
      return <svg {...common}><path d="M9 3H3v6" /><path d="M21 3h-6M15 21h6v-6" /><path d="M3 21v-6M21 3l-5 5M8 12h.01M12 12h.01M16 12h.01" /></svg>;
  }
}

/* ============================================================
 *  TIER META — Easy / Medium / Hardcore
 * ============================================================ */
type TierKey = "easy" | "medium" | "hardcore";
interface TierMeta {
  key: TierKey;
  name: string;
  rate: number;
  desc: string;
  color: string;
  softColor: string;
  reward: string;
  risk: string;
}

function tierMeta(key: TierKey, minutes: number): TierMeta {
  const base: Record<TierKey, Omit<TierMeta, "rate">> = {
    easy: {
      key: "easy", name: "Easy",
      desc: "Free-roam focus. No fullscreen, no wager. The timer pauses when you step away — nothing is lost.",
      color: "#34d399", softColor: "rgba(52,211,153,0.14)",
      reward: "Split rewards on breaks · banked per segment",
      risk: "None — step away freely",
    },
    medium: {
      key: "medium", name: "Medium",
      desc: "Fullscreen discipline. Higher leaves, end-only payout.",
      color: "#fbbf24", softColor: "rgba(251,191,36,0.14)",
      reward: "Rewards granted only at the end",
      risk: "20s warning on fullscreen exit",
    },
    hardcore: {
      key: "hardcore", name: "Hardcore",
      desc: "Wager escrow + fullscreen. Scaling multiplier + device boost.",
      color: "#f87171", softColor: "rgba(248,113,113,0.14)",
      reward: "Wager back + scaled earnings on win",
      risk: "Lose wager on fail",
    },
  };
  const b = base[key];
  const rate = key === "easy" ? EASY_RATE : key === "medium" ? MEDIUM_RATE : hardcoreRateFor(minutes);
  return { ...b, rate };
}

/* ============================================================
 *  PRESETS MODAL
 * ============================================================ */
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
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Configure a timer and click "Save as Preset"</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {presets.map((preset) => (
            <div key={preset.id} className="fd-card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
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
                      className="fd-input"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '2px 6px' }}
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
                <button onClick={() => { loadPreset(preset.id); onClose(); }} className="fd-btn fd-btn-sm">Load</button>
                {editId === preset.id ? (
                  <button onClick={() => { handleSave(preset); setEditId(null); }} className="fd-btn fd-btn-sm">Save</button>
                ) : (
                  <button onClick={() => { setEditId(preset.id); setEditName(preset.name); }} className="fd-btn fd-btn-sm">Edit</button>
                )}
                <button onClick={() => { if (confirm('Delete this preset?')) deletePreset(preset.id); }} className="fd-btn fd-btn-sm" style={{ opacity: 0.6 }}>Del</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => {
            const { timerType, sessionMinutes, breakCount, breakDurations } = usePomodoro.getState();
            if (sessionMinutes > 0) {
              addPreset({ name: `Preset ${presets.length + 1}`, timerType, sessionMinutes, breakCount, breakDurations });
            }
          }}
          className="fd-btn"
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

  useEffect(() => { setSummary(getSessionSummary()); }, [getSessionSummary]);

  return (
    <div style={{ padding: '1rem', maxHeight: '50vh', overflow: 'auto' }}>
      {summary && (
        <div className="fd-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
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
        <div style={{ textAlign: 'center', opacity: 0.6, padding: '2rem' }}><p>No sessions recorded yet</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {history.slice(0, 50).map((session) => (
            <div key={session.id} className="fd-card" style={{ padding: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>
                  {session.timerType === 'focus' ? 'Focus' : 'Pomodoro'}
                  <span className="fd-mode-dot" style={{ marginLeft: 8, display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: tierMeta(session.focusMode, session.sessionMinutes).color }} />
                  {session.focusMode}
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{new Date(session.date).toLocaleString()}</span>
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
        <button onClick={() => { if (confirm('Clear all session history? This cannot be undone.')) { clearHistory(); setSummary(getSessionSummary()); } }} className="fd-btn" style={{ flex: 1, opacity: 0.6 }}>Clear History</button>
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
          className="fd-btn" style={{ flex: 1 }}
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
      <div className="fd-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
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
        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{history.length} sessions · {presets.length} presets</div>
      </div>
      <button
        onClick={() => {
          const data = { exportedAt: new Date().toISOString(), summary: getSessionSummary(), history, presets };
          let content: string;
          let mimeType: string;
          let ext: string;
          if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            ext = 'json';
          } else {
            const headers = ['Date', 'Type', 'Mode', 'Duration (min)', 'Breaks', 'Leaves', 'Subject', 'Completed'];
            const rows = history.map((s) => [
              new Date(s.date).toISOString(),
              s.timerType,
              s.focusMode,
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
        className="fd-btn"
        style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}
      >
        Download {format.toUpperCase()}
      </button>
    </div>
  );
}

/* ============================================================
 *  FOCUS DOMAIN
 * ============================================================ */
export function FocusDomain({ isOpen, onClose }: FocusDomainProps) {
  const [wallClock, setWallClock] = useState(new Date());
  const [pickTier, setPickTier] = useState<TierKey>("easy");
  const [pickType, setPickType] = useState<TimerType>("focus");
  const [pickDur, setPickDur] = useState(60);
  const [pickBreaks, setPickBreaks] = useState(0);
  const [showPresets, setShowPresets] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showWager, setShowWager] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const chimeVolume = useSettings((s) => s.pomo.chimeVolume);
  const setChimeVolume = useSettings((s) => s.setPomo);
  // Spendable leaf wallet — the balance the Shop actually spends. (The
  // astronomical log's totalLeaves is a lifetime stat, not the wallet.)
  const walletLeaves = useProfile((s) => s.xp);
  const [tabataRounds, setTabataRounds] = useState(8);
  const [tabataWorkSec, setTabataWorkSec] = useState(20);
  const [tabataRestSec, setTabataRestSec] = useState(10);

  const {
    focusMode,
    phase,
    remaining,
    totalElapsed,
    sessionMinutes,
    breakCount,
    breakDurations,
    segmentIndex,
    segmentsCompleted,
    running,
    timerType,
    toggle,
    forfeit,
    configure,
    setFocusMode,
    totalSessionLeaves,
    subject,
    lastReward,
    clearReward,
    history,
  } = usePomodoro();
  const hardcode = useHardcodeMode();
  const boost = useDeviceBoost();
  const locker = useLockerTask();
  const multiplayer = useMultiplayerPresence();
  const dock = useSideDock();

  // Streak from REAL session history — the same source the Focus Score panel
  // uses — so the header always matches the analytics. Consecutive days with a
  // completed session count; updates live the moment a session completes.
  const { currentStreak, bestStreak } = useMemo(() => {
    const days = [...new Set(history.map((h) => {
      const d = new Date(h.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }))].sort((a, b) => a - b);
    let best = 0;
    let cur = 0;
    let prev: number | null = null;
    for (const t of days) {
      cur = prev !== null && t - prev === 86400000 ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = t;
    }
    return { currentStreak: cur, bestStreak: best };
  }, [history]);

  const isIdle = phase === "idle";
  // Live leaves counter: banked segments + the running segment's continuous
  // accrual. Recomputes each render; FocusDomain re-renders every store tick
  // (remaining changes each second), so the count ticks up live.
  const liveLeaves = liveFocusLeaves(usePomodoro.getState());

  // Keep the picker in sync when a session resets. Hardcore is "Coming Soon" —
  // never auto-select it, fall back to Easy.
  useEffect(() => {
    if (isIdle) {
      setPickTier(focusMode === 'medium' ? 'medium' : 'easy');
      setPickType(timerType);
      setPickDur(sessionMinutes);
      setPickBreaks(breakCount);
    }
  }, [isIdle, focusMode, timerType, sessionMinutes, breakCount]);

  useEffect(() => {
    const id = setInterval(() => setWallClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const segments = computeSegments(sessionMinutes, breakCount);
  const currentSegmentMin = segments[segmentIndex] ?? 25;

  const isFocusPhase = phase === "running";
  const isBreakPhase = phase === "break";
  const isFinishedPhase = phase === "finished";
  const isPausedPhase = phase === "paused";

  const isRunning = running && (isFocusPhase || isBreakPhase);
  const isPaused = isPausedPhase || (!running && (isFocusPhase || isBreakPhase));

  const timerMode = isFinishedPhase ? "completed" : (isFocusPhase || isBreakPhase) ? "running" : phase;

  const activeTier = tierMeta(pickTier, pickDur);
  const sessionTier = tierMeta(focusMode, sessionMinutes);

  // Current phase's total length in seconds (for the progress ring).
  let totalSeconds = 0;
  if (isBreakPhase) {
    const breakIndex = Math.max(0, segmentIndex - 1);
    const defaultBreakMin = (breakIndex + 1) % 4 === 0 ? 15 : 5;
    totalSeconds = (Math.max(1, (breakDurations[breakIndex] ?? defaultBreakMin))) * 60;
  } else if (isFocusPhase) {
    totalSeconds = currentSegmentMin * 60;
  }

  const timerProgress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0;

  const handleStart = useCallback(() => {
    const dur = pickDur;
    if (dur <= 0) return;
    setFocusMode(pickTier as FocusMode);
    configure(pickType, dur, pickType === 'pomodoro' ? pickBreaks : 0);
    if (pickTier !== 'easy') {
      // Medium/Hardcore engage fullscreen enforcement. Hardcore opens the wager
      // modal first (start is driven by WagerModal.onStart); Medium starts here.
      if (pickTier === 'medium') {
        const ok = useHardcore.getState().start('medium', dur, 0, boost.deviceCount);
        if (!ok) return;
      } else {
        setShowWager(true);
        return;
      }
    }
    toggle();
    dock.setTab('tasks');
  }, [pickTier, pickDur, pickType, pickBreaks, setFocusMode, configure, toggle, dock, boost.deviceCount]);

  const handleHardcoreStart = useCallback((mode: FocusMode, wager: number, minutes: number) => {
    const ok = useHardcore.getState().start(mode, minutes, wager, boost.deviceCount);
    if (!ok) return;
    configure(pickType, minutes, pickType === 'pomodoro' ? pickBreaks : 0);
    toggle();
    dock.setTab('tasks');
    setShowWager(false);
  }, [pickType, pickBreaks, configure, toggle, dock, boost.deviceCount]);

  const handleReset = useCallback(() => {
    forfeit();
  }, [forfeit]);

  // Win: timer finished while hardcore/medium was active → settle enforcement.
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

  // Surface the result modal automatically when a HARDCODE session is won or
  // lost. Medium settles through the end-credit + ceremony (no wager modal).
  useEffect(() => {
    if ((hardcode.status === 'won' || hardcode.status === 'failed') && hardcode.mode === 'hardcore') {
      setShowWager(true);
    }
  }, [hardcode.status, hardcode.mode]);

  useEffect(() => {
    if (isOpen) {
      useWorld.getState().setRenderPaused(true);
    } else {
      useWorld.getState().setRenderPaused(false);
    }
    return () => { useWorld.getState().setRenderPaused(false); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Re-enter fullscreen with F when a Medium/Hardcore session demands it.
      if ((e.key === 'f' || e.key === 'F') && useHardcore.getState().active && !document.fullscreenElement) {
        e.preventDefault();
        useHardcore.getState().enterFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Easy tab-leave: no grace countdown anymore — the timer just pauses and
  // resumes freely when the user returns.

  if (!isOpen) return null;

  const modeLabel = (m: string) => m === 'easy' ? 'Easy' : m === 'medium' ? 'Medium' : 'Hardcore';

  const cfgBtn = (active: boolean, accent?: string): React.CSSProperties => ({
    fontSize: '0.75rem',
    fontFamily: 'var(--font-mono-display)',
    background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
    border: active ? `1px solid ${accent || 'rgba(255,255,255,0.4)'}` : '1px solid rgba(255,255,255,0.12)',
    color: active ? (accent || '#fff') : 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    padding: '6px 12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div className="fd-root">
      <div className="fd-vignette" />

      {/* ============================ HEADER ============================ */}
      <div className="fd-header">
        <div className="fd-header-left">
          <span className="fd-title"><span className="fd-title-leaf"><IconLeaf size={16} /></span> FOCUS DOMAIN</span>
          <span className="fd-subtitle">
            {phase === 'idle' ? 'The candlelit study' : `${modeLabel(focusMode)} · ${sessionTier.rate} leaves/min`}
          </span>
        </div>

        <div className="fd-spacer" />

        <div className="fd-wallclock">
          {wallClock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>

        <div className="fd-stats">
          <span>Streak: {currentStreak}d</span>
          <span title={`Best streak ${bestStreak}d`}>Leaves: {walletLeaves}</span>
        </div>

        <button onClick={() => setShowConnect(true)} className="fd-close fd-icon-btn" style={{ marginRight: "0.25rem" }} title="Hardcore Connect — paste a boost code or see connected devices"><IconLink /></button>
        <button onClick={() => setShowHelp(true)} className="fd-close fd-icon-btn" style={{ marginRight: "0.25rem" }} title="How focus modes work"><IconBook /></button>
        {hardcode.hardcodeActive && (
          <button
            onClick={() => useHardcore.getState().exitFullscreen()}
            className="fd-btn fd-btn-sm fd-exit-fullscreen"
            title="Leave fullscreen — you get a 20s warning to return before the session ends"
          >
            Exit Fullscreen
          </button>
        )}
        <button onClick={onClose} className="fd-close">✕</button>
      </div>

      {/* Timer — only shown once a session is actually running (mode + duration chosen) */}

      {/* ============================ BODY ============================ */}
      <div className="fd-body">
        {phase === "idle" ? (
          <div className="fd-idle">
            <span className="fd-idle-heading">CHOOSE YOUR FOCUS TIER</span>

            {/* Tier cards */}
            <div className="fd-tiers">
              {(["easy", "medium", "hardcore"] as TierKey[]).map((t) => {
                const meta = tierMeta(t, pickDur);
                const sel = pickTier === t;
                const comingSoon = t === 'hardcore';
                return (
                  <button
                    key={t}
                    className={`fd-tier-card ${sel ? 'selected' : ''} ${comingSoon ? 'soon' : ''}`}
                    style={sel ? { borderColor: meta.color, boxShadow: `0 0 30px ${meta.softColor}` } : undefined}
                    onClick={() => { if (!comingSoon) setPickTier(t); }}
                    disabled={comingSoon}
                  >
                    <div className="fd-tier-head">
                      <span className="fd-tier-dot" style={{ background: meta.color }} />
                      <span className="fd-tier-name">{meta.name.toUpperCase()}</span>
                    </div>
                    <div className="fd-tier-rate" style={{ color: meta.color }}>
                      {meta.rate} <span className="fd-tier-rate-unit">leaves/min</span>
                    </div>
                    <div className="fd-tier-desc">{meta.desc}</div>
                    <div className="fd-tier-row"><span>Reward</span><b>{meta.reward}</b></div>
                    <div className="fd-tier-row"><span>Risk</span><b style={{ color: t === 'hardcore' ? '#f87171' : 'rgba(255,255,255,0.6)' }}>{meta.risk}</b></div>
                    {comingSoon && (
                      <>
                        <div className="fd-tier-row">
                          <span>Min wager</span>
                          <b style={{ color: '#fbbf24' }}>{minWagerFor(pickDur)} <IconLeaf /></b>
                        </div>
                        <div className="fd-tier-row">
                          <span>Mult</span>
                          <b style={{ color: '#fbbf24' }}>{hardcoreMultiplier(pickDur)}×{wagerBonusMultiplier(minWagerFor(pickDur), pickDur) > 0 ? ` +${wagerBonusMultiplier(minWagerFor(pickDur), pickDur)}×` : ''}</b>
                        </div>
                        <div className="fd-tier-row">
                          <span>Device boost</span>
                          <b style={{ color: '#34d399' }}><IconDevice /> +{boostPct(1)}% each</b>
                        </div>
                        <div className="fd-tier-soon">COMING SOON</div>
                      </>
                    )}
                    {sel && !comingSoon && (
                      <div className="fd-tier-check" style={{ background: meta.color }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10200f" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12l4 4 10-10" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Config */}
            <div className="fd-config">
              <div className="fd-config-row">
                <span className="fd-config-label">Mode</span>
                <div className="fd-config-btns">
                  <button onClick={() => setPickType('focus')} style={cfgBtn(pickType === 'focus')}>Focus</button>
                  <button onClick={() => setPickType('pomodoro')} style={cfgBtn(pickType === 'pomodoro')}>Pomodoro</button>
                  <button onClick={() => setPickType('tabata')} style={cfgBtn(pickType === 'tabata')}>Tabata</button>
                </div>
              </div>

              <div className="fd-config-row">
                <span className="fd-config-label">Duration</span>
                <div className="fd-config-btns fd-config-presets">
                  {SESSION_OPTIONS.map((m) => (
                    <button key={m} onClick={() => setPickDur(m)} style={cfgBtn(pickDur === m, sessionTier.color)}>
                      {m >= 60 ? `${m / 60}h` : `${m}m`}
                    </button>
                  ))}
                </div>
              </div>

              {pickType === 'pomodoro' && (
                <div className="fd-config-row">
                  <span className="fd-config-label">Breaks</span>
                  <div className="fd-config-btns">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                      const segs = computeSegments(pickDur, n);
                      const segMin = segs[0];
                      return (
                        <button key={n} onClick={() => setPickBreaks(n)} style={cfgBtn(pickBreaks === n)}>
                          {n} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>({segMin}m)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {pickType === 'tabata' && (
                <>
                  <div className="fd-config-row">
                    <span className="fd-config-label">Rounds</span>
                    <div className="fd-config-btns">
                      {[4, 6, 8, 10].map((n) => (
                        <button key={n} onClick={() => setTabataRounds(n)} style={cfgBtn(tabataRounds === n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div className="fd-config-row">
                    <span className="fd-config-label">Work</span>
                    <div className="fd-config-btns">
                      {[10, 15, 20, 25, 30].map((n) => (
                        <button key={n} onClick={() => setTabataWorkSec(n)} style={cfgBtn(tabataWorkSec === n)}>{n}s</button>
                      ))}
                    </div>
                  </div>
                  <div className="fd-config-row">
                    <span className="fd-config-label">Rest</span>
                    <div className="fd-config-btns">
                      {[5, 10, 15, 20].map((n) => (
                        <button key={n} onClick={() => setTabataRestSec(n)} style={cfgBtn(tabataRestSec === n)}>{n}s</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="fd-config-row">
                <span className="fd-config-label">Sound</span>
                <div className="fd-config-btns">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={chimeVolume}
                    onChange={(e) => setChimeVolume({ chimeVolume: parseFloat(e.target.value) })}
                    style={{ width: 90, accentColor: sessionTier.color }}
                  />
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{Math.round(chimeVolume * 100)}%</span>
                </div>
              </div>

              <button
                onClick={handleStart}
                className="fd-btn fd-btn-primary fd-btn-start"
                style={{ borderColor: activeTier.color, background: activeTier.softColor, color: activeTier.color }}
              >
                {pickTier === 'hardcore' ? 'COMING SOON' : `START ${activeTier.name.toUpperCase()}`}
                {pickTier !== 'hardcore' && (pickType === 'tabata' ? ' TABATA' : pickType === 'pomodoro' && pickBreaks > 0 ? ` • ${pickBreaks} BREAKS` : '')}
              </button>

              <div className="fd-config-footer">
                <button onClick={() => setShowPresets(true)} className="fd-link">Presets</button>
                <button onClick={() => setShowHistory(true)} className="fd-link">History</button>
                <button onClick={() => setShowExport(true)} className="fd-link">Export</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="fd-session">
            {/* Session mode chip */}
            <div className="fd-session-chip" style={{ borderColor: sessionTier.color, color: sessionTier.color, background: sessionTier.softColor }}>
              <span className="fd-tier-dot" style={{ background: sessionTier.color }} /> {modeLabel(focusMode).toUpperCase()} · {sessionTier.rate} leaves/min
              {focusMode === 'hardcore' && hardcode.wager > 0 && <span> · WAGER {hardcode.wager} <IconLeaf /></span>}
              {focusMode === 'hardcore' && <span> · {hardcode.effMult}×</span>}
              {focusMode === 'hardcore' && hardcode.devices > 0 && <span> · <IconDevice /> +{hardcode.devices}</span>}
            </div>

            <div className="fd-clock-wrap">
              <div className="fd-orb">
                <div className="fd-orb-ambient" />
                <svg className="fd-orb-ring" viewBox="0 0 100 100" aria-hidden>
                  {/* brass graduations — 60 ticks around the rim, majors every 5th */}
                  {Array.from({ length: 60 }, (_, i) => {
                    const major = i % 5 === 0;
                    return (
                      <line
                        key={i}
                        x1="50"
                        y1={major ? 1.6 : 2.6}
                        x2="50"
                        y2={major ? 5.2 : 4.2}
                        stroke={major ? 'rgba(233,189,127,0.6)' : 'rgba(233,189,127,0.22)'}
                        strokeWidth={major ? 1.1 : 0.6}
                        transform={`rotate(${i * 6} 50 50)`}
                      />
                    );
                  })}
                  {/* astrolabe rings */}
                  <circle cx="50" cy="50" r="46.4" fill="none" stroke="rgba(185,138,68,0.28)" strokeWidth="0.8" />
                  <circle cx="50" cy="50" r="43.2" fill="none" stroke="rgba(185,138,68,0.16)" strokeWidth="0.5" strokeDasharray="1 2.6" />
                  {/* progress comet trail */}
                  <circle
                    cx="50" cy="50" r="44.6" fill="none"
                    stroke={sessionTier.color}
                    strokeOpacity="0.16"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44.6 * 0.28}
                    strokeDashoffset={2 * Math.PI * 44.6 * (1 - Math.max(0, Math.min(1, timerProgress)))}
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                  />
                  {/* progress arc */}
                  <circle
                    cx="50" cy="50" r="44.6" fill="none"
                    stroke={sessionTier.color}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44.6}
                    strokeDashoffset={2 * Math.PI * 44.6 * (1 - Math.max(0, Math.min(1, timerProgress)))}
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.4s ease', filter: `drop-shadow(0 0 5px ${sessionTier.color})` }}
                  />
                  {/* inner dial */}
                  <circle cx="50" cy="50" r="34.4" fill="none" stroke="rgba(185,138,68,0.18)" strokeWidth="0.7" />
                  <circle cx="50" cy="50" r="32.2" fill="none" stroke="rgba(185,138,68,0.12)" strokeWidth="0.5" strokeDasharray="0.7 2.2" />
                </svg>
                <div className="fd-orb-inner">
                  <div className="fd-timer-display">
                    {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
                  </div>
                  <div className="fd-timer-status">
                    {isPaused
                      ? <span className="fd-status-inline"><IconPause /> Paused</span>
                      : isRunning
                        ? <span className="fd-status-inline"><IconPlay /> Running</span>
                        : <span className="fd-status-inline"><IconPause /> Paused</span>}
                  </div>
                  {timerType === 'pomodoro' && breakCount > 0 && (
                    <div className="fd-orb-pips">
                      {Array.from({ length: breakCount + 1 }, (_, i) => (
                        <span
                          key={i}
                          className={`fd-orb-pip ${i < segmentsCompleted ? 'filled' : i === segmentsCompleted && (isFocusPhase || isBreakPhase) ? 'active' : ''}`}
                        />
                      ))}
                    </div>
                  )}
                  <div className="fd-orb-phase" style={{ color: sessionTier.color }}>
                    {isBreakPhase ? 'Break' : isFocusPhase ? 'Focus' : 'Session'}
                    {subject && ` · ${subject}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="fd-controls-wrap">
              <TimerControls
                mode={timerMode}
                hardcodeActive={hardcode.hardcodeActive}
                exitHoldProgress={hardcode.exitHoldProgress}
                onStart={handleStart}
                onPause={toggle}
                onResume={toggle}
                onReset={handleReset}
                onStartExitHold={() => hardcode.startExitHold(() => { forfeit(); })}
                onCancelExitHold={hardcode.cancelExitHold}
              />
            </div>

            {/* Back to the tier picker — end the current session and open the
                Choose Your Focus Tier page (Easy / Medium / Hardcore coming soon) */}
            <div className="fd-session-config-row">
              <button
                onClick={handleReset}
                className="fd-btn fd-btn-sm"
                title="End the current session and choose a new tier (Easy / Medium / Hardcore coming soon)"
              >
                <IconGear /> Choose Tier
              </button>
            </div>

            {/* Session leaves counter — live: banked segments + the current
                segment's continuous accrual, ticking every second */}
            <div className="fd-session-leaves">
              <IconLeaf /> {liveLeaves.toFixed(1)} <span className="fd-session-leaves-label">{focusMode === 'easy' ? 'earned so far' : focusMode === 'hardcore' ? 'projected win' : 'session total'} · live</span>
            </div>

            {/* Progress bar */}
            <div className="fd-progress">
              <div className="fd-progress-track">
                <div className="fd-progress-fill" style={{ width: `${timerProgress * 100}%`, background: sessionTier.color }} />
              </div>
              {locker.activeTask && <div className="fd-locked">Locked in: {locker.activeTask.title}</div>}
            </div>

            {/* Reward popup */}
            {lastReward && (
              <div className="fd-reward" onClick={clearReward}>
                <span className="fd-reward-leaf"><IconLeaf size={15} /></span>
                <span className="fd-reward-amount">+{lastReward.leaves}</span>
                <span className="fd-reward-label">Leaves</span>
                {lastReward.noTabBonus > 0 && <span className="fd-reward-bonus">+{lastReward.noTabBonus} deep work</span>}
                {lastReward.subjectBonus > 0 && <span className="fd-reward-bonus">+{lastReward.subjectBonus} subject</span>}
              </div>
            )}

            {/* Break activity suggestions */}
            {isBreakPhase && (() => {
              const suggested = suggestBreakActivity(segmentIndex - 1);
              return (
                <div className="fd-break-card">
                  <div className="fd-break-head"><IconBreak id="music" /> BREAK TIME — Suggested: <IconBreak id={suggested.icon} /> {suggested.label}</div>
                  <div className="fd-break-list">
                    {BREAK_ACTIVITIES.map((a) => {
                      const isSuggested = a.id === suggested.id;
                      return (
                        <div key={a.id} className={`fd-break-chip ${isSuggested ? 'suggested' : ''}`} style={isSuggested ? { borderColor: sessionTier.color } : undefined}>
                          <IconBreak id={a.icon} />
                          <span>{a.label}</span>
                          <span className="fd-break-sec">{a.duration}s</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <MultiplayerBar scholars={multiplayer.scholars} activeCount={multiplayer.activeCount} totalCount={multiplayer.totalCount} />

      <SideDock
        isOpen={dock.isOpen}
        activeTab={dock.activeTab}
        width={dock.width}
        onTabChange={dock.setTab}
        onClose={dock.close}
        onResizeWidth={dock.setWidth}
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

      {/* ============================ MODALS ============================ */}
      {showPresets && (
        <div className="udm-overlay" onClick={() => setShowPresets(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="udm-head">
              <div className="udm-head-left"><span className="udm-head-name">Timer Presets</span></div>
              <button className="udm-close" onClick={() => setShowPresets(false)}>×</button>
            </div>
            <div className="udm-body"><PresetsModal onClose={() => setShowPresets(false)} /></div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="udm-overlay" onClick={() => setShowHistory(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="udm-head">
              <div className="udm-head-left"><span className="udm-head-name">Session History</span></div>
              <button className="udm-close" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="udm-body"><HistoryModal onClose={() => setShowHistory(false)} /></div>
          </div>
        </div>
      )}

      {showExport && (
        <div className="udm-overlay" onClick={() => setShowExport(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="udm-head">
              <div className="udm-head-left"><span className="udm-head-name">Export Data</span></div>
              <button className="udm-close" onClick={() => setShowExport(false)}>×</button>
            </div>
            <div className="udm-body"><ExportModal onClose={() => setShowExport(false)} /></div>
          </div>
        </div>
      )}

      {showConnect && (
        <div className="udm-overlay" onClick={() => setShowConnect(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="udm-head">
              <div className="udm-head-left"><span className="udm-head-name">Hardcore Connect</span></div>
              <button className="udm-close" onClick={() => setShowConnect(false)}>×</button>
            </div>
            <div className="udm-body" style={{ maxHeight: '70vh', overflow: 'auto', padding: '0.75rem' }}>
              <DeviceConnect />
            </div>
          </div>
        </div>
      )}

      {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}

      {showWager && (
        <div className="udm-overlay" onClick={() => setShowWager(false)}>
          <div className="udm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="udm-head">
              <div className="udm-head-left"><span className="udm-head-name">Hardcore Wager</span></div>
              <button className="udm-close" onClick={() => setShowWager(false)}>×</button>
            </div>
            <WagerModal
              onClose={() => setShowWager(false)}
              onStart={handleHardcoreStart}
              onForfeit={() => { forfeit(); setShowWager(false); }}
            />
          </div>
        </div>
      )}

      {/* Fullscreen grace countdown (Medium/Hardcore) */}
      {hardcode.hardcodeActive && hardcode.graceLeft > 0 && (
        <div className="fd-warning-overlay">
          <div className="fd-warning-box">
            <div className="fd-warning-label"><IconWarn /> FULLSCREEN REQUIRED</div>
            <div className="fd-warning-count" style={{ color: sessionTier.color }}>{hardcode.graceLeft}</div>
            <div className="fd-warning-text">
              Return to fullscreen within <b>{hardcode.graceLeft}s</b> or the session fails
              {focusMode === 'hardcore' && hardcode.wager > 0 ? ` and you lose ${hardcode.wager} leaves` : ' and rewards are lost'}. Your timer is still running.
            </div>
            <button
              className="fd-btn fd-btn-primary fd-reenter"
              onClick={() => useHardcore.getState().enterFullscreen()}
            >
              RE-ENTER FULLSCREEN <span className="fd-key-hint">F</span>
            </button>
          </div>
        </div>
      )}

      {/* Easy: leaving the tab pauses the timer — no warning, nothing is lost. */}

      {/* Session-complete ceremony */}
      {isFinishedPhase && (
        <div className="fd-ceremony">
          <div className="fd-ceremony-box" style={{ borderColor: sessionTier.color }}>
            <div className="fd-ceremony-label" style={{ color: sessionTier.color }}>✦ SESSION COMPLETE ✦</div>
            <div className="fd-ceremony-leaves" style={{ color: sessionTier.color }}>
              <IconLeaf size={26} /> +{focusMode === 'hardcore' ? hardcode.wonAmount : totalSessionLeaves}
            </div>
            <div className="fd-ceremony-meta">
              {Math.floor(totalElapsed / 60)} minutes of deep focus{subject ? ` · ${subject}` : ""}
            </div>

            {/* Session summary */}
            <div className="fd-summary">
              <div className="fd-summary-row"><span>Mode</span><b style={{ color: sessionTier.color }}><span className="fd-tier-dot" style={{ background: sessionTier.color }} /> {modeLabel(focusMode)}</b></div>
              <div className="fd-summary-row"><span>Rate</span><b>{sessionTier.rate} leaves/min</b></div>
              {focusMode === 'hardcore' && (
                <>
                  <div className="fd-summary-row"><span>Multiplier</span><b style={{ color: '#fbbf24' }}>{hardcode.effMult}×</b></div>
                  <div className="fd-summary-row"><span>Wager</span><b>{hardcode.wager} <IconLeaf /> {hardcode.status === 'won' ? '(returned)' : '(lost)'}</b></div>
                  {hardcode.devices > 0 && <div className="fd-summary-row"><span>Devices</span><b><IconDevice /> +{hardcode.devices}</b></div>}
                </>
              )}
              <div className="fd-summary-row"><span>Payout</span><b style={{ color: '#34d399' }}>{focusMode === 'easy' ? 'Split per segment' : 'End of session'}</b></div>
            </div>

            <div className="fd-ceremony-hint">Press reset to return, or Esc to close the domain</div>
          </div>
        </div>
      )}
    </div>
  );

  function handleLockIn(taskId: string, _duration: number) {
    locker.setActiveTask(taskId);
    toggle();
  }
}
