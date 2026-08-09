import { useEffect, useRef } from "react";
import { useSettings } from "../store/settings";

/**
 * KeepAwake — uses the Screen Wake Lock API to prevent the screen from turning off
 * when the `keepAwake` setting is enabled and the document is visible.
 *
 * Falls back gracefully if the Wake Lock API is not supported.
 */
export function useKeepAwake(): void {
  const keepAwake = useSettings((s) => s.keepAwake);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!keepAwake) {
      // Release any existing wake lock
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => { /* ignore */ });
        wakeLockRef.current = null;
      }
      return;
    }

    let cancelled = false;

    // Request the wake lock
    const requestWakeLock = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (!cancelled) {
          wakeLockRef.current = lock;
          lock.addEventListener("release", () => {
            wakeLockRef.current = null;
          });
        }
      } catch {
        /* Wake Lock API not supported or denied — fail silently */
      }
    };

    // Request when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && keepAwake) {
        requestWakeLock();
      } else if (wakeLockRef.current) {
        // Release when hidden
        wakeLockRef.current.release().catch(() => { /* ignore */ });
        wakeLockRef.current = null;
      }
    };

    // Initial request if page is visible
    if (document.visibilityState === "visible") {
      requestWakeLock();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => { /* ignore */ });
        wakeLockRef.current = null;
      }
    };
  }, [keepAwake]);
}