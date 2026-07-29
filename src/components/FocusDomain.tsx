import { useState, useCallback, useEffect } from "react";
import type { ClockMode } from "../hooks/focus/types";
import { CornerFiligree } from "./focus/CornerFiligree";
import { ClockHeader } from "./focus/ClockHeader";
import { ClockRenderer } from "./focus/ClockRenderer";
import { SideDock } from "./focus/SideDock";
import { TimerControls } from "./focus/TimerControls";
import { AstronomicalChart } from "./focus/AstronomicalChart";
import { MultiplayerBar } from "./focus/MultiplayerBar";
import { usePomodoro } from "../store/pomodoro";
import { useWorld } from "../store/world";
import { useHardcodeMode } from "../hooks/focus/useHardcodeMode";
import { useLockerTask } from "../hooks/focus/useLockerTask";
import { useMultiplayerPresence } from "../hooks/focus/useMultiplayerPresence";
import { useAstronomicalLog } from "../hooks/focus/useAstronomicalLog";
import { useSideDock } from "../hooks/focus/useSideDock";
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

export function FocusDomain({ isOpen, onClose }: FocusDomainProps) {
  const [clockMode, setClockMode] = useState<ClockMode>("sand");
  const [streakDays, setStreakDays] = useState(7);
  const [momentumScore, setMomentumScore] = useState(65);
  const [wallClock, setWallClock] = useState(new Date());

  const { phase, remaining, totalElapsed, toggle, forfeit } = usePomodoro();
  const hardcode = useHardcodeMode();
  const locker = useLockerTask();
  const multiplayer = useMultiplayerPresence();
  const astroLog = useAstronomicalLog();
   const dock = useSideDock();

  useEffect(() => {
    const id = setInterval(() => setWallClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

   const timerMode = phase === "finished" ? "completed" : phase === "break" ? "running" : phase;
  const totalSeconds = remaining + totalElapsed;

  const handleStart = useCallback(() => {
    if (hardcode.hardcodeActive) {
      hardcode.activate();
    }
    toggle();
  }, [toggle, hardcode]);

  const handleLockIn = useCallback(
    (taskId: string, _duration: number) => {
      locker.setActiveTask(taskId);
      toggle();
      if (hardcode.hardcodeActive) hardcode.activate();
    },
    [locker, toggle, hardcode]
  );

  const handleReset = useCallback(() => {
    if (phase === "finished" || phase === "paused") {
      const focusMin = Math.floor(totalElapsed / 60);
      if (focusMin > 0) {
        astroLog.recordSession(focusMin, clockMode);
        setMomentumScore((s) => Math.min(100, s + 5));
        setStreakDays((s) => s + (astroLog.log.currentStreak > s ? 1 : 0));
      }
    }
    forfeit();
  }, [phase, totalElapsed, astroLog, clockMode, forfeit]);

  const handleHardcodeToggle = useCallback(() => {
    if (!hardcode.hardcodeActive) {
      hardcode.activate();
    } else {
      hardcode.deactivate();
    }
  }, [hardcode]);

  const timerProgress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0;

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

        <button onClick={handleHardcodeToggle} style={hcStyle}>
          {hardcode.hardcodeActive ? "HARDCODE ON" : "HARDCODE OFF"}
        </button>

        <button onClick={onClose} style={closeStyle}>
          ✕
        </button>
      </div>

      <ClockHeader currentMode={clockMode} onModeChange={setClockMode} />

      <div style={S.center}>
        <div style={S.card}>
          <ClockRenderer
            mode={clockMode}
            remainingSeconds={remaining}
            totalSeconds={totalSeconds}
            isRunning={phase === "running"}
            isPaused={phase === "paused"}
            focusMinutes={Math.floor(totalElapsed / 60)}
            streakDays={streakDays}
            momentumScore={momentumScore}
          />
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
        tasks={locker.tasks}
        activeTaskId={locker.activeTaskId}
        onAddTask={locker.addTask}
        onRemoveTask={locker.removeTask}
        onSetActive={locker.setActiveTask}
        onAddSubTask={locker.addSubTask}
        onToggleSubTask={locker.toggleSubTask}
        onLockIn={handleLockIn}
      />
    </div>
  );
}
