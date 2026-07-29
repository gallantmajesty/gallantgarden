import type { ClockProps } from "../../../hooks/focus/types";

function formatTime(seconds: number): {
  hours: string;
  minutes: string;
  seconds: string;
} {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    hours: h.toString().padStart(2, "0"),
    minutes: m.toString().padStart(2, "0"),
    seconds: s.toString().padStart(2, "0"),
  };
}

export function DigitalClock({ remainingSeconds, totalSeconds }: ClockProps) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const { hours, minutes, seconds } = formatTime(remainingSeconds);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <svg
        width="300"
        height="200"
        viewBox="0 0 300 200"
        style={{ width: 300, height: 200 }}
      >
        <defs>
          <linearGradient id="octGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#E8D4A0" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <polygon
          points="30,10 270,10 290,30 290,170 270,190 30,190 10,170 10,30"
          fill="rgba(26, 20, 16, 0.6)"
          stroke="url(#octGold)"
          strokeWidth="1.5"
        />

        <polygon
          points="33,13 267,13 287,33 287,167 267,187 33,187 13,167 13,33"
          fill="none"
          stroke="rgba(201, 168, 76, 0.15)"
          strokeWidth="0.5"
        />

        {[
          [22, 22],
          [278, 22],
          [278, 178],
          [22, 178],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="4" fill="none" stroke="#C9A84C" strokeWidth="0.8" />
            <circle cx={cx} cy={cy} r="1.5" fill="#C9A84C" />
            <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="#C9A84C" strokeWidth="0.5" opacity="0.5" />
            <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#C9A84C" strokeWidth="0.5" opacity="0.5" />
          </g>
        ))}

        <text
          x="150"
          y="95"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-mono-display)"
          fontSize="52"
          fontWeight="bold"
          fill="#C9A84C"
          letterSpacing="4"
        >
          {hours}:{minutes}:{seconds}
        </text>

        <rect x="40" y="155" width="220" height="3" fill="rgba(26, 20, 16, 0.4)" rx="1" />
        <rect x="40" y="155" width={220 * (1 - progress)} height="3" fill="#C9A84C" rx="1" />

        <text
          x="150"
          y="185"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fontFamily="Georgia, serif"
          fill="#8B6D2E"
          letterSpacing="3"
        >
          CELESTIA READOUT
        </text>
      </svg>
    </div>
  );
}
