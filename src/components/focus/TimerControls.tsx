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

/* Inline icons — no emojis, no image assets. */
function IcPlay() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 1.7v12.6a.7.7 0 0 0 1.06.6l10-6.3a.7.7 0 0 0 0-1.2l-10-6.3A.7.7 0 0 0 4 1.7z" />
    </svg>
  );
}
function IcPause() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3" y="2" width="4" height="12" rx="1.2" />
      <rect x="9" y="2" width="4" height="12" rx="1.2" />
    </svg>
  );
}
function IcStop() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="1.6" />
    </svg>
  );
}
function IcSpark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
    </svg>
  );
}
function IcShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z" />
      <path d="M9.5 12l1.8 1.8 3.4-3.6" />
    </svg>
  );
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
          <IcPlay /> Begin session
        </button>
      )}

      {mode === "running" && (
        <button onClick={onPause} className="fd-btn fd-btn-secondary fd-btn-lg">
          <IcPause /> Pause
        </button>
      )}

      {mode === "paused" && (
        <>
          <button onClick={onResume} className="fd-btn fd-btn-primary fd-btn-lg fd-btn-glow">
            <IcPlay /> Resume
          </button>
          <button onClick={onReset} className="fd-btn fd-btn-secondary fd-btn-lg">
            <IcStop /> End session
          </button>
        </>
      )}

      {mode === "completed" && (
        <button onClick={onReset} className="fd-btn fd-btn-primary fd-btn-lg fd-btn-glow">
          <IcSpark /> New session
        </button>
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
          <span style={{ position: "relative", zIndex: 10, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <IcShield /> Hold to forfeit
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
