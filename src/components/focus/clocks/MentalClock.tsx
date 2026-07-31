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
  const flowAngleRef = useRef(0);

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

      flowAngleRef.current += 0.005;
      const flowAngle = flowAngleRef.current;

      const r1 = 130;
      const r1Progress = 1 - progress;

      const outerGlow = ctx.createRadialGradient(cx, cy, r1 - 10, cx, cy, r1 + 20);
      outerGlow.addColorStop(0, "rgba(201,168,76,0.06)");
      outerGlow.addColorStop(1, "rgba(201,168,76,0)");
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, r1 + 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(201,168,76,0.15)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      const r1Grad = ctx.createLinearGradient(cx, cy, cx + r1, cy);
      r1Grad.addColorStop(0, "rgba(201,168,76,0.1)");
      r1Grad.addColorStop(0.5, "rgba(201,168,76,0.6)");
      r1Grad.addColorStop(1, "rgba(201,168,76,0.8)");

      ctx.beginPath();
      ctx.arc(cx, cy, r1, -Math.PI / 2, -Math.PI / 2 + r1Progress * Math.PI * 2);
      ctx.strokeStyle = r1Grad;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = "rgba(201,168,76,0.5)";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, -Math.PI / 2, -Math.PI / 2 + r1Progress * Math.PI * 2);
      ctx.strokeStyle = "rgba(201,168,76,0.3)";
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < 64; i++) {
        const angle = (i / 64) * Math.PI * 2 + flowAngle;
        const x = cx + Math.cos(angle) * r1;
        const y = cy + Math.sin(angle) * r1;
        const isActive = i / 64 < r1Progress;
        const a = isActive ? 0.7 : 0.1;
        const s = isActive ? 2.5 : 1;
        ctx.fillStyle = `rgba(201,168,76,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
      }

      const r2 = 95;
      const momentumPct = Math.min(momentumScore / 100, 1);
      const r2Scale = pulse * (0.5 + momentumPct * 0.5);

      ctx.beginPath();
      ctx.arc(cx, cy, r2 * r2Scale, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232,212,160,0.2)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      const r2Grad = ctx.createLinearGradient(cx, cy, cx + r2, cy);
      r2Grad.addColorStop(0, "rgba(232,212,160,0.1)");
      r2Grad.addColorStop(0.5, "rgba(232,212,160,0.5)");
      r2Grad.addColorStop(1, "rgba(232,212,160,0.7)");

      ctx.beginPath();
      ctx.arc(cx, cy, r2 * r2Scale, -Math.PI / 2, -Math.PI / 2 + momentumPct * Math.PI * 2);
      ctx.strokeStyle = r2Grad;
      ctx.lineWidth = 3;
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + flowAngle * 2;
        const x = cx + Math.cos(angle) * r2 * r2Scale;
        const y = cy + Math.sin(angle) * r2 * r2Scale;
        const a = 0.3 + 0.7 * momentumPct;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
        g.addColorStop(0, `rgba(232,212,160,${a})`);
        g.addColorStop(1, `rgba(232,212,160,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(232,212,160,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      const r3 = 60;
      const streakPct = Math.min(streakDays / 30, 1);

      const r3Glow = ctx.createRadialGradient(cx, cy, r3 - 10, cx, cy, r3 + 15);
      r3Glow.addColorStop(0, "rgba(139,109,46,0.08)");
      r3Glow.addColorStop(1, "rgba(139,109,46,0)");
      ctx.fillStyle = r3Glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r3 + 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(139,109,46,0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const streakAngle = streakPct * Math.PI * 2;
      const streakGrad = ctx.createLinearGradient(cx, cy, cx + r3, cy);
      streakGrad.addColorStop(0, "#8B6D2E");
      streakGrad.addColorStop(1, "#C9A84C");

      ctx.beginPath();
      ctx.arc(cx, cy, r3, -Math.PI / 2, -Math.PI / 2 + streakAngle);
      ctx.strokeStyle = streakGrad;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = "rgba(139,109,46,0.4)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r3, -Math.PI / 2, -Math.PI / 2 + streakAngle);
      ctx.strokeStyle = "rgba(139,109,46,0.3)";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r3;
        const y = cy + Math.sin(angle) * r3;
        ctx.fillStyle = "rgba(139,109,46,0.4)";
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(26,20,16,0.7)";
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fill();

      const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38);
      innerGlow.addColorStop(0, "rgba(201,168,76,0.1)");
      innerGlow.addColorStop(1, "rgba(201,168,76,0)");
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
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
      ctx.fillText("SESSION", cx, cy - r1 - 22);
      ctx.fillText("FLOW", cx, cy - r2 - 22);
      ctx.fillText("STREAK", cx, cy - r3 - 22);

      if (streakDays > 0) {
        ctx.fillStyle = "#C9A84C";
        ctx.font = "bold 10px Georgia, serif";
        ctx.fillText(`x${streakDays}`, cx, cy - r3 - 8);
      }

      const orbR = 5;
      const orbG = ctx.createRadialGradient(cx - 2, cy - r1 - 22, 0, cx, cy - r1 - 22, orbR);
      orbG.addColorStop(0, "#F0E080");
      orbG.addColorStop(1, "#8B6D2E");
      ctx.fillStyle = orbG;
      ctx.beginPath();
      ctx.arc(cx, cy - r1 - 22, orbR, 0, Math.PI * 2);
      ctx.fill();

      const orbG2 = ctx.createRadialGradient(cx - 2, cy - r2 - 22, 0, cx, cy - r2 - 22, orbR);
      orbG2.addColorStop(0, "#E8D4A0");
      orbG2.addColorStop(1, "#8B6D2E");
      ctx.fillStyle = orbG2;
      ctx.beginPath();
      ctx.arc(cx, cy - r2 - 22, orbR, 0, Math.PI * 2);
      ctx.fill();

      const orbG3 = ctx.createRadialGradient(cx - 2, cy - r3 - 22, 0, cx, cy - r3 - 22, orbR);
      orbG3.addColorStop(0, "#C9A84C");
      orbG3.addColorStop(1, "#6B4F10");
      ctx.fillStyle = orbG3;
      ctx.beginPath();
      ctx.arc(cx, cy - r3 - 22, orbR, 0, Math.PI * 2);
      ctx.fill();
    }

    function animate() {
      drawFrame();
      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [progress, isRunning, focusMinutes, streakDays, momentumScore]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <canvas
        ref={canvasRef}
        width={340}
        height={380}
        style={{ width: 340, height: 380, filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.4))" }}
      />
      <div
        style={{
          fontSize: "2.75rem",
          fontWeight: 700,
          letterSpacing: "0.15em",
          fontFamily: "var(--font-mono-display)",
          color: "var(--color-genshin-gold)",
          textShadow: "0 0 20px rgba(201,168,76,0.6), 0 0 40px rgba(201,168,76,0.3)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {minutes}:{seconds}
      </div>
    </div>
  );
}