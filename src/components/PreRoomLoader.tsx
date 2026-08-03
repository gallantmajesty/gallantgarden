import { useEffect, useState } from "react";

/**
 * PreRoomLoader — a full-screen loading overlay that shows a refresh animation
 * before the room/realm scene loads. It forces a brief "refresh" visual so the
 * user knows the app is preparing the room.
 *
 * Usage: wrap your scene component with this, or use it as a gate before
 * rendering the heavy 3D scene.
 */
interface PreRoomLoaderProps {
  /** When true, the loader is shown. When false, children are rendered. */
  isLoading: boolean;
  /** Optional custom message */
  message?: string;
  /** Minimum time to show the loader (ms) */
  minDuration?: number;
  /** Children to render when not loading */
  children: React.ReactNode;
}

export function PreRoomLoader({
  isLoading,
  message = "Preparing your study world…",
  minDuration = 1500,
  children,
}: PreRoomLoaderProps) {
  const [showLoader, setShowLoader] = useState(isLoading);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoader(false);
      return;
    }
    setHasMounted(true);
    setShowLoader(true);
  }, [isLoading]);

  // Ensure minimum display duration
  useEffect(() => {
    if (!showLoader) return;
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, minDuration);
    return () => clearTimeout;
  }, [showLoader, minDuration]);

  if (!hasMounted && !isLoading) {
    return <>{children}</>;
  }

  if (showLoader) {
    return (
      <div className="pre-room-loader" role="status" aria-live="polite">
        <div className="pre-room-loader-inner">
          <div className="pre-room-refresh-ring">
            <svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="32"
                cy="32"
                r="24"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="90.5 150"
                style={{ animation: "pre-room-spin 1.2s linear infinite", transformOrigin: "center" }}
              />
            </svg>
          </div>
          <div className="pre-room-loader-title">Preparing your study world…</div>
          <div className="pre-room-loader-sub">Refreshing the scene…</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * A simpler hook-based version for use in components that manage their own loading state.
 */
export function usePreRoomLoader(initialLoading = true, minDuration = 1500) {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [showLoader, setShowLoader] = useState(initialLoading);

  useEffect(() => {
    if (!isLoading) {
      // Ensure minimum display time before hiding
      const timer = setTimeout(() => setShowLoader(false), 800);
      return () => clearTimeout(timer);
    }
    setShowLoader(true);
  }, [isLoading]);

  return { isLoading, setIsLoading, showLoader };
}