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
  const timeStr = `${hours}:${minutes}:${seconds}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
      <svg
        width="420"
        height="260"
        viewBox="0 0 420 260"
        style={{ width: 420, height: 260, filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.5))" }}
      >
        <defs>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0d0a08" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#1a1410" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0d0a08" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8D4A0" />
            <stop offset="25%" stopColor="#C9A84C" />
            <stop offset="50%" stopColor="#F0E080" />
            <stop offset="75%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#E8D4A0" />
          </linearGradient>

          <linearGradient id="goldGlowGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0E080" stopOpacity="0" />
            <stop offset="50%" stopColor="#C9A84C" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#F0E080" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="cornerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.15" />
            <stop offset="70%" stopColor="#C9A84C" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </radialGradient>

          <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F0E080" />
            <stop offset="50%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#E8D4A0" />
          </linearGradient>
        </defs>

        <rect width="420" height="260" rx="8" fill="url(#bgGrad)" />

        <rect x="2" y="2" width="416" height="256" rx="6" fill="none" stroke="url(#goldGrad)" strokeWidth="1.5" opacity="0.6" />

        <rect x="4" y="4" width="412" height="252" rx="4" fill="none" stroke="rgba(201,168,76,0.1)" strokeWidth="0.5" />

        <ellipse cx="210" cy="130" rx="180" ry="100" fill="url(#cornerGlow)" />

        {[8, 412, 8, 412].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={i < 2 ? 8 : 252} r="6" fill="none" stroke="#C9A84C" strokeWidth="1.5" />
            <circle cx={x} cy={i < 2 ? 8 : 252} r="2.5" fill="#C9A84C" />
            <line x1={x - 10} y1={i < 2 ? 8 : 252} x2={x + 10} y2={i < 2 ? 8 : 252} stroke="#C9A84C" strokeWidth="0.8" opacity="0.6" />
            <line x1={x} y1={i < 2 ? -2 : 242} x2={x} y2={i < 2 ? 18 : 262} stroke="#C9A84C" strokeWidth="0.8" opacity="0.6" />
          </g>
        ))}

        <g filter="url(#textGlow)">
          <text
            x="210"
            y="120"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-mono-display)"
            fontSize="68"
            fontWeight="bold"
            fill="url(#goldGrad)"
            letterSpacing="6"
            style={{ textShadow: "0 0 30px rgba(201,168,76,0.8), 0 0 60px rgba(201,168,76,0.4)" }}
          >
            {timeStr}
          </text>
        </g>

        <g filter="url(#strongGlow)">
          <text
            x="210"
            y="120"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-mono-display)"
            fontSize="68"
            fontWeight="bold"
            fill="url(#goldGrad)"
            letterSpacing="6"
            opacity="0.3"
          >
            {timeStr}
          </text>
        </g>

        <rect x="50" y="170" width="320" height="4" fill="rgba(26, 20, 16, 0.5)" rx="2" />
        <rect x="50" y="170" width={320 * (1 - progress)} height="4" fill="url(#progressGrad)" rx="2">
          <animate attributeName="width" from="0" to={320 * (1 - progress)} dur="0.8s" fill="freeze" />
        </rect>

        <rect x="50" y="170" width={320 * (1 - progress)} height="4" fill="url(#progressGrad)" rx="2" filter="url(#strongGlow)" opacity="0.6" />

        <text
          x="210"
          y="205"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fontFamily="Georgia, serif"
          fill="#8B6D2E"
          letterSpacing="4"
          opacity="0.8"
        >
          CELESTIA READOUT
        </text>

        <g style={{ animation: "pulse 2s ease-in-out infinite" }}>
          <text
            x="210"
            y="230"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontFamily="var(--font-mono-display)"
            fill="#C9A84C"
            letterSpacing="2"
            opacity="0.5"
          >
            SYNCHRONIZED
          </text>
        </g>

        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 0.9; }
            }
          `}
        </style>
      </svg>
    </div>
  );
}