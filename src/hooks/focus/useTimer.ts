import { useState, useRef, useCallback, useEffect } from "react";
import type { TimerState } from "./types";

const DEFAULT_DURATION = 25 * 60;
const DEFAULT_BREAK = 5 * 60;

export function useTimer() {
  const [state, setState] = useState<TimerState>({
    mode: "idle",
    totalSeconds: DEFAULT_DURATION,
    remainingSeconds: DEFAULT_DURATION,
    startedAt: null,
    pausedAt: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sessionDuration, setSessionDuration] = useState(DEFAULT_DURATION);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK);
  const [accumulatedFocusSeconds, setAccumulatedFocusSeconds] = useState(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (customDuration?: number) => {
      clearTimer();
      const duration = customDuration ?? sessionDuration;
      const now = Date.now();

      setState({
        mode: "running",
        totalSeconds: duration,
        remainingSeconds: duration,
        startedAt: now,
        pausedAt: null,
      });

      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.mode !== "running") return prev;
          const elapsed = Math.floor((Date.now() - (prev.startedAt ?? now)) / 1000);
          const remaining = Math.max(0, prev.totalSeconds - elapsed);

          if (remaining <= 0) {
            clearTimer();
            return { ...prev, mode: "completed", remainingSeconds: 0 };
          }

          return { ...prev, remainingSeconds: remaining };
        });
      }, 100);
    },
    [sessionDuration, clearTimer]
  );

  const pause = useCallback(() => {
    clearTimer();
    setState((prev) => ({
      ...prev,
      mode: "paused",
      pausedAt: Date.now(),
    }));
  }, [clearTimer]);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.mode !== "paused") return prev;
      const alreadyElapsed = prev.totalSeconds - prev.remainingSeconds;
      const newStartedAt = Date.now() - alreadyElapsed * 1000;

      intervalRef.current = setInterval(() => {
        setState((current) => {
          if (current.mode !== "running") return current;
          const elapsed = Math.floor(
            (Date.now() - (current.startedAt ?? newStartedAt)) / 1000
          );
          const remaining = Math.max(0, current.totalSeconds - elapsed);

          if (remaining <= 0) {
            clearTimer();
            return { ...current, mode: "completed", remainingSeconds: 0 };
          }

          return { ...current, remainingSeconds: remaining };
        });
      }, 100);

      return { ...prev, mode: "running", startedAt: newStartedAt, pausedAt: null };
    });
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setState({
      mode: "idle",
      totalSeconds: sessionDuration,
      remainingSeconds: sessionDuration,
      startedAt: null,
      pausedAt: null,
    });
  }, [sessionDuration, clearTimer]);

  const setDuration = useCallback((seconds: number) => {
    setSessionDuration(seconds);
    setState((prev) => ({
      ...prev,
      totalSeconds: seconds,
      remainingSeconds: prev.mode === "idle" ? seconds : prev.remainingSeconds,
    }));
  }, []);

  useEffect(() => {
    if (state.mode !== "running") return;
    const tracker = setInterval(() => {
      setAccumulatedFocusSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(tracker);
  }, [state.mode]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    timerState: state,
    sessionDuration,
    breakDuration,
    accumulatedFocusMinutes: Math.floor(accumulatedFocusSeconds / 60),
    start,
    pause,
    resume,
    reset,
    setDuration,
    setBreakDuration,
  };
}
