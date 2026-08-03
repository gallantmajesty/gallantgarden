// Thin React hook over the hardcore store. All wager/fullscreen/grace logic
// lives in src/store/hardcore.ts (module-level, readable by the pomodoro store);
// this hook only adds the local "hold to exit" progress state for the UI.

import { useCallback, useRef, useState } from "react";
import { useHardcore, hardcoreRateFor, hardcoreMultiplier, minWagerFor, effectiveMultiplier, type FocusMode } from "../../store/hardcore";

export function useHardcodeMode() {
  const hardcodeActive = useHardcore((s) => s.active);
  const status = useHardcore((s) => s.status);
  const mode = useHardcore((s) => s.mode);
  const wager = useHardcore((s) => s.wager);
  const sessionMinutes = useHardcore((s) => s.sessionMinutes);
  const graceLeft = useHardcore((s) => s.graceLeft);
  const wonAmount = useHardcore((s) => s.wonAmount);
  const devices = useHardcore((s) => s.devices);
  const lastMultiplier = useHardcore((s) => s.lastMultiplier);
  const [exitHoldProgress, setExitHoldProgress] = useState(0);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startExitHold = useCallback((onComplete: () => void) => {
    setExitHoldProgress(0);
    let progress = 0;
    holdIntervalRef.current = setInterval(() => {
      progress += 1;
      setExitHoldProgress(progress);

      if (progress >= 60) {
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        setExitHoldProgress(0);
        onComplete();
      }
    }, 50);
  }, []);

  const cancelExitHold = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setExitHoldProgress(0);
  }, []);

  // Effective tier + rate for the current enforcement session (or the given one).
  const rate = hardcodeActive ? hardcoreRateFor(sessionMinutes) : 0;
  const mult = hardcodeActive ? hardcoreMultiplier(sessionMinutes) : 1;
  // Include wager + device bonuses for hardcore even after the session settles
  // (the ceremony/summary reads this right after a win or fail).
  const effMult = mode === 'hardcore' && wager > 0
    ? effectiveMultiplier(sessionMinutes, wager, devices)
    : (hardcodeActive ? hardcoreMultiplier(sessionMinutes) : mult);
  const minWager = minWagerFor(sessionMinutes || 60);

  return {
    hardcodeActive,
    status,
    mode: mode as FocusMode,
    wager,
    sessionMinutes,
    graceLeft,
    wonAmount,
    devices,
    lastMultiplier,
    rate,
    mult,
    effMult,
    minWager,
    exitHoldProgress,
    startExitHold,
    cancelExitHold,
  };
}
