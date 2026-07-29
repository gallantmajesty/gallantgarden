import { useState, useCallback } from "react";
import type { SessionRecord, AstronomicalLog, ClockMode } from "./types";

const LOG_KEY = "sg.focus.astronomical-log";

function loadLog(): AstronomicalLog {
  if (typeof window === "undefined")
    return { sessions: [], totalFocusMinutes: 0, totalLeaves: 0, currentStreak: 0, longestStreak: 0 };
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw
      ? JSON.parse(raw)
      : { sessions: [], totalFocusMinutes: 0, totalLeaves: 0, currentStreak: 0, longestStreak: 0 };
  } catch {
    return { sessions: [], totalFocusMinutes: 0, totalLeaves: 0, currentStreak: 0, longestStreak: 0 };
  }
}

function saveLog(log: AstronomicalLog) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    // Ignore
  }
}

export function useAstronomicalLog() {
  const [log, setLog] = useState<AstronomicalLog>(() => loadLog());

  const recordSession = useCallback(
    (focusMinutes: number, clockMode: ClockMode) => {
      setLog((prev) => {
        const today = new Date().toISOString().split("T")[0];
        const leavesEarned = Math.floor(focusMinutes / 5);

        let currentStreak = prev.currentStreak;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const didStudyYesterday = prev.sessions.some((s) => s.date === yesterday);

        if (prev.sessions.some((s) => s.date === today)) {
          currentStreak = prev.currentStreak;
        } else if (didStudyYesterday || prev.sessions.length === 0) {
          currentStreak = prev.currentStreak + 1;
        } else {
          currentStreak = 1;
        }

        const existingSessionIndex = prev.sessions.findIndex((s) => s.date === today);
        let updatedSessions: SessionRecord[];

        if (existingSessionIndex >= 0) {
          updatedSessions = prev.sessions.map((s, i) => {
            if (i !== existingSessionIndex) return s;
            return {
              ...s,
              totalMinutes: s.totalMinutes + focusMinutes,
              focusMinutes: s.focusMinutes + focusMinutes,
              leavesEarned: s.leavesEarned + leavesEarned,
              streakDay: true,
            };
          });
        } else {
          updatedSessions = [
            ...prev.sessions,
            {
              date: today,
              totalMinutes: focusMinutes,
              focusMinutes,
              leavesEarned,
              streakDay: true,
              clockMode,
            },
          ];
        }

        const newLog: AstronomicalLog = {
          sessions: updatedSessions,
          totalFocusMinutes: prev.totalFocusMinutes + focusMinutes,
          totalLeaves: prev.totalLeaves + leavesEarned,
          currentStreak,
          longestStreak: Math.max(prev.longestStreak, currentStreak),
        };

        saveLog(newLog);
        return newLog;
      });
    },
    []
  );

  return { log, recordSession };
}
