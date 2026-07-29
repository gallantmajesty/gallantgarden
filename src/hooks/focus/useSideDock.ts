import { useState, useCallback } from "react";
import type { DockTab } from "./types";

const STORAGE_KEY = "sg.focus.side-dock";

function loadPrefs(): { open: boolean; tab: DockTab; width: number } {
  if (typeof window === "undefined") return { open: false, tab: "ai", width: 400 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { open: false, tab: "ai", width: 400 };
  } catch {
    return { open: false, tab: "ai", width: 400 };
  }
}

function savePrefs(prefs: { open: boolean; tab: DockTab; width: number }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore
  }
}

export function useSideDock() {
  const [prefs, setPrefs] = useState(loadPrefs);

  const toggle = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, open: !prev.open };
      savePrefs(next);
      return next;
    });
  }, []);

  const setTab = useCallback((tab: DockTab) => {
    setPrefs((prev) => {
      const next = { ...prev, tab, open: true };
      savePrefs(next);
      return next;
    });
  }, []);

  const setWidth = useCallback((width: number) => {
    setPrefs((prev) => {
      const next = { ...prev, width: Math.max(320, Math.min(600, width)) };
      savePrefs(next);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, open: false };
      savePrefs(next);
      return next;
    });
  }, []);

  return {
    isOpen: prefs.open,
    activeTab: prefs.tab,
    width: prefs.width,
    toggle,
    setTab,
    setWidth,
    close,
  };
}
