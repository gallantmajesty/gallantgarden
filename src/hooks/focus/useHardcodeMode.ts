import { useCallback, useRef, useState } from "react";

export function useHardcodeMode() {
  const [hardcodeActive, setHardcodeActive] = useState(false);
  const [exitHoldProgress, setExitHoldProgress] = useState(0);
  const [tabViolations, setTabViolations] = useState(0);
  const [xpPenalty, setXpPenalty] = useState(0);
  const tabTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hardcodeActiveRef = useRef(false);

  const enterFullscreen = useCallback(() => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may not be supported
    }
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      tabTimeoutRef.current = setTimeout(() => {
        setTabViolations((v) => v + 1);
        setXpPenalty((p) => p + 50);
      }, 60000);
    } else {
      if (tabTimeoutRef.current) {
        clearTimeout(tabTimeoutRef.current);
        tabTimeoutRef.current = null;
      }
    }
  }, []);

  const handleFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement && hardcodeActiveRef.current) {
      setTimeout(() => enterFullscreen(), 500);
    }
  }, [enterFullscreen]);

  const activate = useCallback(() => {
    setHardcodeActive(true);
    hardcodeActiveRef.current = true;
    enterFullscreen();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
  }, [enterFullscreen, handleVisibilityChange, handleFullscreenChange]);

  const deactivate = useCallback(() => {
    setHardcodeActive(false);
    hardcodeActiveRef.current = false;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [handleVisibilityChange, handleFullscreenChange]);

  const startExitHold = useCallback(
    (onComplete: () => void) => {
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
          deactivate();
          onComplete();
        }
      }, 50);
    },
    [deactivate]
  );

  const cancelExitHold = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setExitHoldProgress(0);
  }, []);

  return {
    hardcodeActive,
    exitHoldProgress,
    tabViolations,
    xpPenalty,
    activate,
    deactivate,
    startExitHold,
    cancelExitHold,
  };
}
