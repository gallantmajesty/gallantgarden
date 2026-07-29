import type { ClockMode } from "../../hooks/focus/types";

const clockLabels: { mode: ClockMode; label: string; icon: string }[] = [
  { mode: "sand", label: "Archon Hourglass", icon: "⏳" },
  { mode: "calendar", label: "Celestial Dial", icon: "☀" },
  { mode: "mental", label: "Focus Flowmeter", icon: "◎" },
  { mode: "cuckoo", label: "Mechanical Clocktower", icon: "⚙" },
  { mode: "pendulum", label: "Grandmaster Pendulum", icon: "🕰" },
  { mode: "digital", label: "Celestia Readout", icon: "◆" },
];

interface ClockHeaderProps {
  currentMode: ClockMode;
  onModeChange: (mode: ClockMode) => void;
}

export function ClockHeader({ currentMode, onModeChange }: ClockHeaderProps) {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      padding: "0.75rem 1rem",
    }}>
      {clockLabels.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          style={{
            padding: "0.5rem 0.75rem",
            transition: "all 0.2s",
            border: `1px solid ${mode === currentMode ? "var(--color-genshin-gold)" : "rgba(139, 109, 46, 0.2)"}`,
            background: mode === currentMode ? "rgba(201, 168, 76, 0.1)" : "transparent",
            borderRadius: 2,
            cursor: "pointer",
          }}
          title={label}
        >
          <span style={{
            fontSize: "0.75rem",
            letterSpacing: "0.05em",
            color: mode === currentMode ? "var(--color-genshin-gold)" : "var(--color-genshin-bronze)",
            fontFamily: "var(--font-serif-heading)",
            opacity: mode === currentMode ? 1 : 0.6,
          }}>
            {icon} {label}
          </span>
        </button>
      ))}
    </div>
  );
}
