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
    const cy = 40;

    function drawFrame() {
      ctx.clearRect(0, 0, w, h);

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const frequency = 1.5;
      const amplitude = isRunning ? 0.15 : 0.02;
      const dampingFactor = isRunning ? 1 : 0.3;
      const angle = Math.sin(elapsed * Math.PI * frequency) * amplitude * dampingFactor;

      const rodLength = 170;
      const bobRadius = 18;
      const pivotX = cx;
      const pivotY = cy;

      const bobX = pivotX + Math.sin(angle) * rodLength;
      const bobY = pivotY + Math.cos(angle) * rodLength;

      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#C9A84C";
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#E8D4A0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pivotX - 20, pivotY - 15);
      ctx.lineTo(pivotX + 20, pivotY - 15);
      ctx.lineTo(pivotX + 15, pivotY - 5);
      ctx.lineTo(pivotX - 15, pivotY - 5);
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      ctx.fillStyle = "rgba(26, 20, 16, 0.3)";
      ctx.beginPath();
      ctx.arc(bobX + 4, bobY + 4, bobRadius, 0, Math.PI * 2);
      ctx.fill();

      const bobGrad = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobRadius);
      bobGrad.addColorStop(0, "#E8D4A0");
      bobGrad.addColorStop(0.7, "#C9A84C");
      bobGrad.addColorStop(1, "#8B6D2E");
      ctx.fillStyle = bobGrad;
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(232, 212, 160, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bobX, bobY - bobRadius + 4);
      ctx.lineTo(bobX, bobY + bobRadius - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bobX - bobRadius + 4, bobY);
      ctx.lineTo(bobX + bobRadius - 4, bobY);
      ctx.stroke();

      for (let i = -6; i <= 6; i++) {
        const tickX = pivotX + i * 30;
        ctx.strokeStyle = i === 0 ? "#C9A84C" : "rgba(201, 168, 76, 0.3)";
        ctx.lineWidth = i === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(tickX, pivotY - 12);
        ctx.lineTo(tickX, pivotY - 4);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(139, 109, 46, 0.3)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, rodLength, Math.PI / 2 + 0.15, Math.PI / 2 - 0.15, true);
      ctx.stroke();
      ctx.setLineDash([]);

      const barY = h - 40;
      const barW = 260;
      const barX = cx - barW / 2;

      ctx.fillStyle = "rgba(26, 20, 16, 0.4)";
      ctx.fillRect(barX, barY - 2, barW, 4);

      ctx.fillStyle = "#C9A84C";
      ctx.fillRect(barX, barY - 2, barW * (1 - progress), 4);

      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY - 2, barW, 4);
    }

    function animate() {
      drawFrame();
      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [isRunning, progress]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        style={{ width: 320, height: 320 }}
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
