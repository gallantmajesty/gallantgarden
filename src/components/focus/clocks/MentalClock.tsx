import { useRef, useEffect } from "react";
import type { ClockProps } from "../../../hooks/focus/types";

function formatTime(seconds: number): { minutes: string; seconds: string } {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return {
    minutes: m.toString().padStart(2, "0"),
    seconds: s.toString().padStart(2, "0"),
  };
}

export function MentalClock({
  remainingSeconds,
  totalSeconds,
  isRunning,
  focusMinutes,
  streakDays,
  momentumScore,
}: ClockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const pulseRef = useRef(0);

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const { minutes, seconds } = formatTime(remainingSeconds);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const c = canvas.getContext("2d");
    if (!c) return;
    const ctx: CanvasRenderingContext2D = c;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    function drawFrame() {
      ctx.clearRect(0, 0, w, h);

      pulseRef.current += 0.02;
      const pulse = Math.sin(pulseRef.current) * 0.1 + 1;

      const r1 = 120;
      const r1Progress = 1 - progress;

      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(201, 168, 76, 0.2)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(cx, cy, r1, -Math.PI / 2, -Math.PI / 2 + r1Progress * Math.PI * 2);
      ctx.strokeStyle = "rgba(201, 168, 76, 0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();

      const r2 = 90;
      const momentumPct = Math.min(momentumScore / 100, 1);
      const r2Scale = pulse * (0.5 + momentumPct * 0.5);

      ctx.beginPath();
      ctx.arc(cx, cy, r2 * r2Scale, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232, 212, 160, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + pulseRef.current;
        const x = cx + Math.cos(angle) * r2 * r2Scale;
        const y = cy + Math.sin(angle) * r2 * r2Scale;
        ctx.fillStyle = `rgba(232, 212, 160, ${0.3 + 0.7 * momentumPct})`;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      const r3 = 60;
      const streakPct = Math.min(streakDays / 30, 1);

      ctx.beginPath();
      ctx.arc(cx, cy, r3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(139, 109, 46, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const streakAngle = streakPct * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r3, -Math.PI / 2, -Math.PI / 2 + streakAngle);
      ctx.strokeStyle = "#8B6D2E";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "rgba(26, 20, 16, 0.6)";
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#C9A84C";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const focusH = Math.floor(focusMinutes / 60);
      const focusM = focusMinutes % 60;
      ctx.fillText(`${focusH}h ${focusM}m`, cx, cy - 6);

      ctx.fillStyle = "#8B6D2E";
      ctx.font = "10px Georgia, serif";
      ctx.fillText("FOCUS", cx, cy + 12);

      ctx.fillStyle = "#E8D4A0";
      ctx.font = "9px Georgia, serif";
      ctx.fillText("SESSION", cx, cy - r1 - 18);
      ctx.fillText("FLOW", cx, cy - r2 - 18);
      ctx.fillText("STREAK", cx, cy - r3 - 18);

      if (streakDays > 0) {
        ctx.fillText(`x${streakDays}`, cx, cy - r3 - 6);
      }
    }

    function animate() {
      drawFrame();
      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [progress, isRunning, focusMinutes, streakDays, momentumScore]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <canvas
        ref={canvasRef}
        width={300}
        height={340}
        style={{ width: 300, height: 340 }}
      />
      <div
        style={{
          fontSize: "2.25rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          fontFamily: "var(--font-mono-display)",
          color: "var(--color-genshin-gold)",
        }}
      >
        {minutes}:{seconds}
      </div>
    </div>
  );
}
