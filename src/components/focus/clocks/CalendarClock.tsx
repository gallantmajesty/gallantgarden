import { useRef, useEffect } from "react";
import type { ClockProps } from "../../../hooks/focus/types";

function formatTime(seconds: number): { minutes: string; seconds: string; hours: string } {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return {
    hours: h.toString().padStart(2, "0"),
    minutes: m.toString().padStart(2, "0"),
    seconds: s.toString().padStart(2, "0"),
  };
}

export function CalendarClock({
  remainingSeconds,
  totalSeconds,
  isRunning,
}: ClockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const rotationRef = useRef(0);

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const { hours, minutes, seconds } = formatTime(remainingSeconds);

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
    const outerR = 130;
    const innerR = 95;

    function drawRing(
      radius: number,
      segments: number,
      highlightCount: number,
      rotation: number,
      color: string,
      alpha: number
    ) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x1 = Math.cos(angle) * (radius - 10);
        const y1 = Math.sin(angle) * (radius - 10);
        const x2 = Math.cos(angle) * radius;
        const y2 = Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      for (let i = 0; i < highlightCount; i++) {
        const angle = (i / highlightCount) * Math.PI * 2;
        const x1 = Math.cos(angle) * (radius - 10);
        const y1 = Math.sin(angle) * (radius - 10);
        const x2 = Math.cos(angle) * radius;
        const y2 = Math.sin(angle) * radius;

        ctx.strokeStyle = "#C9A84C";
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawFrame() {
      ctx.clearRect(0, 0, w, h);

      if (isRunning) rotationRef.current += 0.001;
      const outerRot = rotationRef.current;
      const innerRot = -rotationRef.current * 1.5;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(201, 168, 76, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, outerR - 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(201, 168, 76, 0.2)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawRing(outerR, 24, Math.floor((1 - progress) * 24), outerRot, "#C9A84C", 0.8);

      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232, 212, 160, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232, 212, 160, 0.15)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawRing(innerR, 30, Math.floor((1 - progress) * 30), innerRot, "#E8D4A0", 0.6);

      ctx.beginPath();
      ctx.arc(cx, cy, outerR + 5, -Math.PI / 2, -Math.PI / 2 + (1 - progress) * Math.PI * 2);
      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const moonPhase = Math.floor((1 - progress) * 30) % 30;
      const isSun = moonPhase < 15;

      ctx.fillStyle = isSun ? "rgba(232, 212, 160, 0.8)" : "rgba(139, 109, 46, 0.8)";
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();

      if (!isSun) {
        ctx.fillStyle = "#1A1410";
        ctx.beginPath();
        ctx.arc(cx + 3, cy - 3, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      const directions = ["N", "E", "S", "W"];
      directions.forEach((d, i) => {
        const angle = (i * Math.PI) / 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * (outerR + 15);
        const y = cy + Math.sin(angle) * (outerR + 15);
        ctx.fillStyle = "#8B6D2E";
        ctx.font = "10px Georgia, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d, x, y);
      });

      for (let i = 0; i < 12; i++) {
        const angle = ((i * 30 - 90) * Math.PI) / 180;
        const x = cx + Math.cos(angle) * (innerR - 15);
        const y = cy + Math.sin(angle) * (innerR - 15);
        ctx.fillStyle = "#E8D4A0";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const hour = (i + 6) % 12 || 12;
        ctx.fillText(hour.toString(), x, y);
      }
    }

    function animate() {
      drawFrame();
      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [progress, isRunning]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <canvas
        ref={canvasRef}
        width={340}
        height={340}
        style={{ width: 340, height: 340 }}
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
        {hours}:{minutes}:{seconds}
      </div>
    </div>
  );
}
