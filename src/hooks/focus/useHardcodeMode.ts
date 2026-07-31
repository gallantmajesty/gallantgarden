// Thin React hook over the hardcore store. All wager/fullscreen/grace logic
// lives in src/store/hardcore.ts (module-level, readable by the pomodoro store);
// this hook only adds the local "hold to exit" progress state for the UI.

import { useCallback, useRef, useState } from "react";
import { useHardcore } from "../../store/hardcore";

export function useHardcodeMode() {
  const hardcodeActive = useHardcore((s) => s.active);
  const status = useHardcore((s) => s.status);
  const wager = useHardcore((s) => s.wager);
  const sessionMinutes = useHardcore((s) => s.sessionMinutes);
  const graceLeft = useHardcore((s) => s.graceLeft);
  const wonAmount = useHardcore((s) => s.wonAmount);
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

  return {
    hardcodeActive,
    status,
    wager,
    sessionMinutes,
    graceLeft,
    wonAmount,
    exitHoldProgress,
    startExitHold,
    cancelExitHold,
  };
}
