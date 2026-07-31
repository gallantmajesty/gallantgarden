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

export function PendulumClock({
  remainingSeconds,
  totalSeconds,
  isRunning,
}: ClockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const swingPhaseRef = useRef(0);
  const amplitudeRef = useRef(0.15);

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const { minutes, seconds } = formatTime(remainingSeconds);

  useEffect(() => {
    if (!canvasRef.current) return;
    startTimeRef.current = Date.now();
    const canvas = canvasRef.current;
    const c = canvas.getContext("2d");
    if (!c) return;
    const ctx: CanvasRenderingContext2D = c;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const pivotY = 45;

    function drawFrame() {
      ctx.clearRect(0, 0, w, h);

      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      if (isRunning) {
        const targetAmp = 0.18;
        amplitudeRef.current += (targetAmp - amplitudeRef.current) * 0.02;
        swingPhaseRef.current = elapsed * Math.PI * 1.4;
      } else {
        amplitudeRef.current *= 0.985;
        swingPhaseRef.current += amplitudeRef.current * 0.8;
      }

      const angle = Math.sin(swingPhaseRef.current) * amplitudeRef.current;

      const rodLength = 200;
      const bobRadius = 22;
      const pivotX = cx;

      const bobX = pivotX + Math.sin(angle) * rodLength;
      const bobY = pivotY + Math.cos(angle) * rodLength;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(26,20,16,0.3)");
      grad.addColorStop(1, "rgba(13,10,8,0.3)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.shadowColor = "rgba(201,168,76,0.3)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;

      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const pivotGrad = ctx.createRadialGradient(pivotX - 3, pivotY - 3, 0, pivotX, pivotY, 12);
      pivotGrad.addColorStop(0, "#F0E080");
      pivotGrad.addColorStop(0.4, "#C9A84C");
      pivotGrad.addColorStop(1, "#8B6D2E");
      ctx.fillStyle = pivotGrad;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#E8D4A0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX - 28, pivotY - 20);
      ctx.lineTo(pivotX + 28, pivotY - 20);
      ctx.lineTo(pivotX + 20, pivotY - 6);
      ctx.lineTo(pivotX - 20, pivotY - 6);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = "rgba(201,168,76,0.08)";
      ctx.beginPath();
      ctx.moveTo(pivotX - 28, pivotY - 20);
      ctx.lineTo(pivotX + 28, pivotY - 20);
      ctx.lineTo(pivotX + 20, pivotY - 6);
      ctx.lineTo(pivotX - 20, pivotY - 6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(201,168,76,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      ctx.strokeStyle = "rgba(139,109,46,0.3)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      const shadowGrad = ctx.createRadialGradient(bobX + 5, bobY + 5, 2, bobX + 5, bobY + 5, bobRadius + 4);
      shadowGrad.addColorStop(0, "rgba(26,20,16,0.4)");
      shadowGrad.addColorStop(1, "rgba(26,20,16,0)");
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(bobX + 5, bobY + 5, bobRadius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const bobGrad = ctx.createRadialGradient(bobX - 6, bobY - 6, 2, bobX, bobY, bobRadius);
      bobGrad.addColorStop(0, "#F0E080");
      bobGrad.addColorStop(0.2, "#E8D4A0");
      bobGrad.addColorStop(0.5, "#C9A84C");
      bobGrad.addColorStop(0.8, "#A67C2E");
      bobGrad.addColorStop(1, "#6B4F10");
      ctx.fillStyle = bobGrad;
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
      ctx.fill();

      const highlightGrad = ctx.createRadialGradient(bobX - 8, bobY - 8, 0, bobX - 4, bobY - 4, bobRadius * 0.6);
      highlightGrad.addColorStop(0, "rgba(240,224,128,0.8)");
      highlightGrad.addColorStop(1, "rgba(240,224,128,0)");
      ctx.fillStyle = highlightGrad;
      ctx.beginPath();
      ctx.arc(bobX - 4, bobY - 4, bobRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(232,212,160,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = -7; i <= 7; i++) {
        const tickX = pivotX + i * 28;
        const isCenter = i === 0;
        ctx.strokeStyle = isCenter ? "#C9A84C" : "rgba(201,168,76,0.25)";
        ctx.lineWidth = isCenter ? 3 : 1.2;
        ctx.beginPath();
        ctx.moveTo(tickX, pivotY - 16);
        ctx.lineTo(tickX, pivotY - 6);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(139,109,46,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, rodLength, Math.PI / 2 + 0.2, Math.PI / 2 - 0.2, true);
      ctx.stroke();
      ctx.setLineDash([]);

      const barY = h - 50;
      const barW = 300;
      const barX = cx - barW / 2;

      ctx.fillStyle = "rgba(26,20,16,0.5)";
      ctx.fillRect(barX, barY - 3, barW, 6);

      const progressGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      progressGrad.addColorStop(0, "#F0E080");
      progressGrad.addColorStop(0.5, "#C9A84C");
      progressGrad.addColorStop(1, "#E8D4A0");
      ctx.fillStyle = progressGrad;
      ctx.fillRect(barX, barY - 3, barW * (1 - progress), 6);

      ctx.shadowColor = "#C9A84C";
      ctx.shadowBlur = 10;
      ctx.fillRect(barX, barY - 3, barW * (1 - progress), 6);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(201,168,76,0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX, barY - 3, barW, 6);

      const pct = Math.round((1 - progress) * 100);
      ctx.fillStyle = "rgba(201,168,76,0.6)";
      ctx.font = "11px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${pct}%`, cx, barY + 18);
    }

    function animate() {
      drawFrame();
      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [isRunning, progress]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <canvas
        ref={canvasRef}
        width={380}
        height={380}
        style={{ width: 380, height: 380, filter: "drop-shadow(0 15px 40px rgba(0,0,0,0.4))" }}
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