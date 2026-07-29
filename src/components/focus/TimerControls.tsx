interface TimerControlsProps {
  mode: "idle" | "running" | "paused" | "completed";
  hardcodeActive: boolean;
  exitHoldProgress: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStartExitHold: () => void;
  onCancelExitHold: () => void;
}

export function TimerControls({
  mode,
  hardcodeActive,
  exitHoldProgress,
  onStart,
  onPause,
  onResume,
  onReset,
  onStartExitHold,
  onCancelExitHold,
}: TimerControlsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {mode === "idle" && (
          <button onClick={onStart} className="genshin-btn" style={{ fontSize: "0.875rem", padding: "0.75rem 2rem" }}>
            Begin Session
          </button>
        )}

        {mode === "running" && (
          <button onClick={onPause} className="genshin-btn" style={{ fontSize: "0.875rem", padding: "0.75rem 2rem" }}>
            Pause
          </button>
        )}

        {mode === "paused" && (
          <>
            <button onClick={onResume} className="genshin-btn" style={{ fontSize: "0.875rem", padding: "0.75rem 1.5rem" }}>
              Resume
            </button>
            <button onClick={onReset} className="genshin-btn genshin-btn-secondary" style={{ fontSize: "0.875rem", padding: "0.75rem 1.5rem" }}>
              End Session
            </button>
          </>
        )}

        {mode === "completed" && (
          <button onClick={onReset} className="genshin-btn" style={{ fontSize: "0.875rem", padding: "0.75rem 2rem" }}>
            New Session
          </button>
        )}

        {(mode === "running" || mode === "paused") && hardcodeActive && (
          <button
            onMouseDown={onStartExitHold}
            onMouseUp={onCancelExitHold}
            onMouseLeave={onCancelExitHold}
            onTouchStart={onStartExitHold}
            onTouchEnd={onCancelExitHold}
            className="genshin-btn genshin-btn-secondary"
            style={{ fontSize: "0.75rem", padding: "0.75rem 1rem", position: "relative", overflow: "hidden" }}
          >
            <span style={{ position: "relative", zIndex: 10 }}>
              HOLD TO EXIT
              {exitHoldProgress > 0 && ` (${Math.ceil(exitHoldProgress / 20)}s)`}
            </span>
            <div
              style={{
                position: "absolute",
                inset: 0,
                left: 0,
                top: 0,
                transition: "all 0.1s",
                width: `${(exitHoldProgress / 60) * 100}%`,
                background: "rgba(201, 168, 76, 0.2)",
              }}
            />
          </button>
        )}
      </div>
    </div>
  );
}
