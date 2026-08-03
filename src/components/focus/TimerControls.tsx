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
    <div className="fd-controls">
      {mode === "idle" && (
        <button onClick={onStart} className="fd-btn fd-btn-primary fd-btn-lg fd-btn-glow">
          ▶ Begin Session
        </button>
      )}

      {mode === "running" && (
        <button onClick={onPause} className="fd-btn fd-btn-secondary fd-btn-lg">
          ⏸ Pause
        </button>
      )}

      {mode === "paused" && (
        <>
          <button onClick={onResume} className="fd-btn fd-btn-primary fd-btn-lg fd-btn-glow">▶ Resume</button>
          <button onClick={onReset} className="fd-btn fd-btn-secondary fd-btn-lg">⏹ End Session</button>
        </>
      )}

      {mode === "completed" && (
        <button onClick={onReset} className="fd-btn fd-btn-primary fd-btn-lg fd-btn-glow">✦ New Session</button>
      )}

      {(mode === "running" || mode === "paused") && hardcodeActive && (
        <button
          onMouseDown={onStartExitHold}
          onMouseUp={onCancelExitHold}
          onMouseLeave={onCancelExitHold}
          onTouchStart={onStartExitHold}
          onTouchEnd={onCancelExitHold}
          className="fd-btn fd-btn-exit fd-btn-lg"
          style={{ position: "relative", overflow: "hidden", borderRadius: 10 }}
        >
          <span style={{ position: "relative", zIndex: 10 }}>
            🛑 HOLD TO FORFEIT
            {exitHoldProgress > 0 && ` (${Math.ceil(exitHoldProgress / 20)}s)`}
          </span>
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${(exitHoldProgress / 60) * 100}%`,
              background: "rgba(248,113,113,0.3)",
              transition: "width 0.1s linear",
            }}
          />
        </button>
      )}
    </div>
  );
}
