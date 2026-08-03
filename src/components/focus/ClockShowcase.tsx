import { useEffect, useRef } from "react";
import type { ClockMode } from "../../hooks/focus/types";
import type { ClockProps } from "../../hooks/focus/types";
import { SandClock } from "./clocks/SandClock";
import { PendulumClock } from "./clocks/PendulumClock";
import { DigitalClock } from "./clocks/DigitalClock";

/**
 * ClockShowcase — a horizontal, side-scrolling gallery of LIVE clock models.
 *
 * Each clock renders as a real, animated preview (not just a word). Clicking a
 * card selects that clock for the session. The strip scrolls horizontally and
 * auto-centers the currently selected clock.
 */

interface ClockDef {
  mode: ClockMode;
  name: string;
  tagline: string;
  accent: string;
}

const CLOCKS: ClockDef[] = [
  { mode: "sand", name: "Sangtok Hourglass", tagline: "Rune-lit sandglass", accent: "#c9a84c" },
  { mode: "pendulum", name: "Grandmaster Pendulum", tagline: "Soothing pendulum swing", accent: "#b9a2ff" },
  { mode: "digital", name: "Celestia Readout", tagline: "Crystal celestial display", accent: "#4ade80" },
];

/** Full-timer preview props so the models render fully. */
const PREVIEW: ClockProps = {
  remainingSeconds: 25 * 60,
  totalSeconds: 25 * 60,
  isRunning: false,
  isPaused: false,
  focusMinutes: 0,
  streakDays: 0,
  momentumScore: 0,
};

function PreviewModel({ mode }: { mode: ClockMode }) {
  // SandClock auto-scales to its container (ResizeObserver). The fixed-pixel
  // SVG/canvas clocks are wrapped in a scaled frame to fit the card.
  if (mode === "sand") {
    return (
      <div className="fd-clock-preview fd-clock-preview-sand">
        <SandClock {...PREVIEW} />
      </div>
    );
  }
  if (mode === "pendulum") {
    return (
      <div className="fd-clock-preview fd-clock-preview-pendulum">
        <div className="fd-clock-preview-frame">
          <PendulumClock {...PREVIEW} />
        </div>
      </div>
    );
  }
  return (
    <div className="fd-clock-preview fd-clock-preview-digital">
      <div className="fd-clock-preview-frame">
        <DigitalClock {...PREVIEW} />
      </div>
    </div>
  );
}

export function ClockShowcase({ currentMode, onModeChange }: { currentMode: ClockMode; onModeChange: (mode: ClockMode) => void }) {
  const stripRef = useRef<HTMLDivElement>(null);

  // Auto-center the selected card in the horizontal strip.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const el = strip.querySelector<HTMLElement>(`[data-clock="${currentMode}"]`);
    if (!el) return;
    const target = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [currentMode]);

  return (
    <div className="fd-clocks">
      <div className="fd-clocks-head">
        <span className="fd-clocks-title">◆ TIMEPIECE</span>
        <span className="fd-clocks-hint">← choose your clock →</span>
      </div>
      <div className="fd-clock-strip" ref={stripRef}>
        {CLOCKS.map((c) => {
          const active = c.mode === currentMode;
          return (
            <button
              key={c.mode}
              data-clock={c.mode}
              className={`fd-clock-card ${active ? "active" : ""}`}
              style={active ? { borderColor: c.accent, boxShadow: `0 0 28px ${c.accent}33` } : undefined}
              onClick={() => onModeChange(c.mode)}
            >
              <div className="fd-clock-card-glow" style={{ background: active ? `radial-gradient(circle, ${c.accent}22 0%, transparent 70%)` : undefined }} />
              <PreviewModel mode={c.mode} />
              <div className="fd-clock-card-meta">
                <span className="fd-clock-card-name" style={{ color: active ? c.accent : undefined }}>{c.name}</span>
                <span className="fd-clock-card-tag">{c.tagline}</span>
              </div>
              <div className={`fd-clock-card-dot ${active ? "on" : ""}`} style={active ? { background: c.accent } : undefined} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
