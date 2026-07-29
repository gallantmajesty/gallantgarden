import { useState, useEffect } from "react";
import type { ScholarPresence } from "./types";

const MOCK_SCHOLARS: ScholarPresence[] = [
  { id: "s1", name: "Aether", rank: "Grand Sage", rankBadge: "✦✦✦", isStudying: true, focusMinutes: 240 },
  { id: "s2", name: "Lumine", rank: "Adeptus Scholar", rankBadge: "✦✦", isStudying: true, focusMinutes: 185 },
  { id: "s3", name: "Xiao", rank: "Vigilant Reader", rankBadge: "✦✦✦", isStudying: true, focusMinutes: 320 },
  { id: "s4", name: "Ganyu", rank: "Celestial Archivist", rankBadge: "✦✦✦✦", isStudying: true, focusMinutes: 450 },
  { id: "s5", name: "Albedo", rank: "Chief Alchemist", rankBadge: "✦✦✦", isStudying: true, focusMinutes: 290 },
  { id: "s6", name: "Kazuha", rank: "Wandering Scholar", rankBadge: "✦✦", isStudying: false, focusMinutes: 150 },
  { id: "s7", name: "Mona", rank: "Astrologian", rankBadge: "✦✦✦✦", isStudying: true, focusMinutes: 380 },
];

export function useMultiplayerPresence() {
  const [scholars, setScholars] = useState<ScholarPresence[]>(MOCK_SCHOLARS);

  useEffect(() => {
    const interval = setInterval(() => {
      setScholars((prev) =>
        prev.map((s) => ({
          ...s,
          isStudying: Math.random() > 0.3,
          focusMinutes: s.focusMinutes + (s.isStudying ? Math.floor(Math.random() * 3) : 0),
        }))
      );
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const activeCount = scholars.filter((s) => s.isStudying).length;

  return { scholars, activeCount, totalCount: scholars.length };
}
