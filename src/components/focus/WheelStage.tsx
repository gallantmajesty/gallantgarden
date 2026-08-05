import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { LuckyWheelConfig, WheelPrize } from "../../lib/luckyWheel";

const WHEEL_SIZE = 300;

export interface WheelStageHandle {
  /** Spin and land on a random weighted prize. Returns the prize. */
  spin: () => WheelPrize | null;
  /** Spin and land on a specific prize. */
  spinTo: (prize: WheelPrize) => void;
}

/**
 * Shared lucky-wheel renderer used by BOTH the player-facing modal and the
 * /owner editor preview. Renders the same conic-gradient wheel, spins, and
 * reports the result via the onResult callback.
 */
export const WheelStage = forwardRef<WheelStageHandle, {
  cfg: LuckyWheelConfig;
  size?: number;
  onResult?: (prize: WheelPrize) => void;
}>(function WheelStage({ cfg, size = WHEEL_SIZE, onResult }, ref) {
  const [spinDeg, setSpinDeg] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onResultDoneRef = useRef(onResult);
  onResultDoneRef.current = onResult;

  const totalWeight = cfg.prizes.reduce((a, p) => a + Math.max(0, p.weight), 0);
  const segAngle = (p: WheelPrize) => (totalWeight > 0 ? (Math.max(0, p.weight) / totalWeight) * 360 : 0);

  let cursor = 0;
  const stops: string[] = [];
  for (const p of cfg.prizes) {
    const from = cursor;
    const to = cursor + segAngle(p);
    stops.push(`${p.color} ${from}deg ${to}deg`);
    cursor = to;
  }

  const spinTo = (prize: WheelPrize) => {
    if (spinning || cfg.prizes.length === 0) return;
    const idx = cfg.prizes.indexOf(prize);
    if (idx < 0) return;
    let centerDeg = 0;
    for (let i = 0; i < idx; i++) centerDeg += segAngle(cfg.prizes[i]);
    centerDeg += segAngle(prize) / 2;
    const target = 360 * 6 + (90 - centerDeg);
    setSpinning(true);
    setSpinDeg((prev) => prev + target - ((prev % 360) + 360) % 360);
    window.setTimeout(() => {
      setSpinning(false);
      onResultRef.current?.(prize);
    }, 3600);
  };

  const spin = (): WheelPrize | null => {
    if (cfg.prizes.length === 0) return null;
    const total = cfg.prizes.reduce((a, p) => a + Math.max(0, p.weight), 0);
    let r = Math.random() * total;
    let prize = cfg.prizes[cfg.prizes.length - 1];
    for (const p of cfg.prizes) {
      r -= Math.max(0, p.weight);
      if (r <= 0) { prize = p; break; }
    }
    spinTo(prize);
    return prize;
  };

  useImperativeHandle(ref, () => ({ spin, spinTo }));

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          width: size, height: size, borderRadius: "50%",
          background: `conic-gradient(${stops.join(", ")})`,
          transform: `rotate(${spinDeg}deg)`,
          transition: spinning ? "transform 3.6s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
          border: "4px solid #c9a44a",
          boxShadow: "0 0 30px rgba(0,0,0,0.5)",
        }}
      />
      <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: "1.4rem", zIndex: 3, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>📍</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: size * 0.18, height: size * 0.18, borderRadius: "50%", background: "#0e0d1a", border: "3px solid #c9a44a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.045 }}>🎡</div>
      </div>
      {cfg.prizes.map((p, i) => {
        let deg = 0;
        for (let j = 0; j < i; j++) deg += segAngle(cfg.prizes[j]);
        deg += segAngle(p) / 2;
        const rad = (deg * Math.PI) / 180;
        const r = size / 2 - size * 0.12;
        const x = size / 2 + r * Math.cos(rad);
        const y = size / 2 + r * Math.sin(rad);
        return (
          <span key={p.id} style={{ position: "absolute", left: x - size * 0.04, top: y - size * 0.04, fontSize: size * 0.045, zIndex: 2, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}>
            {p.emoji}
          </span>
        );
      })}
    </div>
  );
});
