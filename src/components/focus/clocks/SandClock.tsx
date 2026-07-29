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

export function SandClock({
  remainingSeconds,
  totalSeconds,
  isRunning,
}: ClockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{ x: number; y: number; vy: number; size: number; opacity: number }[]>([]);
  const frameRef = useRef<number>(0);

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
    const bulbTop = 70;
    const bulbBottom = h - 70;
    const bulbRadius = 55;
    const neckY = h / 2;
    const neckWidth = 6;

    function drawFrame() {
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(cx - neckWidth, neckY);
      ctx.lineTo(cx - bulbRadius, bulbTop + bulbRadius);
      ctx.arcTo(cx - bulbRadius, bulbTop, cx, bulbTop - 10, bulbRadius);
      ctx.arcTo(cx + bulbRadius, bulbTop, cx + bulbRadius, bulbTop + bulbRadius, bulbRadius);
      ctx.lineTo(cx + neckWidth, neckY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - neckWidth, neckY);
      ctx.lineTo(cx - bulbRadius, bulbBottom - bulbRadius);
      ctx.arcTo(cx - bulbRadius, bulbBottom, cx, bulbBottom + 10, bulbRadius);
      ctx.arcTo(cx + bulbRadius, bulbBottom, cx + bulbRadius, bulbBottom - bulbRadius, bulbRadius);
      ctx.lineTo(cx + neckWidth, neckY);
      ctx.stroke();

      ctx.strokeStyle = "#E8D4A0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - neckWidth - 4, neckY - 2);
      ctx.lineTo(cx + neckWidth + 4, neckY - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - neckWidth - 4, neckY + 2);
      ctx.lineTo(cx + neckWidth + 4, neckY + 2);
      ctx.stroke();

      const sandProgress = 1 - progress;
      const sandHeight = bulbRadius * 1.3 * sandProgress;
      ctx.fillStyle = "rgba(201, 168, 76, 0.4)";
      ctx.beginPath();
      const bottomCenter = bulbBottom - bulbRadius + 5;
      const sandTop = bottomCenter - sandHeight;
      ctx.ellipse(cx, sandTop, bulbRadius - 8, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(201, 168, 76, 0.6)";
      ctx.fillRect(cx - bulbRadius + 8, sandTop, (bulbRadius - 8) * 2, sandHeight + 5);

      const sandConeHeight = bulbRadius * 0.3 * (1 - sandProgress);
      ctx.fillStyle = "rgba(201, 168, 76, 0.3)";
      ctx.beginPath();
      ctx.moveTo(cx - neckWidth, neckY);
      ctx.lineTo(cx, neckY - sandConeHeight);
      ctx.lineTo(cx + neckWidth, neckY);
      ctx.fill();

      if (isRunning && progress > 0) {
        if (Math.random() < 0.3) {
          particlesRef.current.push({
            x: cx - neckWidth + Math.random() * neckWidth * 2,
            y: neckY + 2,
            vy: 1 + Math.random() * 2,
            size: 0.5 + Math.random() * 1.5,
            opacity: 0.3 + Math.random() * 0.7,
          });
        }
      }

      ctx.fillStyle = "#C9A84C";
      for (const p of particlesRef.current) {
        p.y += p.vy;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      particlesRef.current = particlesRef.current.filter(
        (p) => p.y < bulbBottom
      );

      ctx.strokeStyle = "#8B6D2E";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 - Math.PI / 2;
        const rx = cx + Math.cos(angle) * (bulbRadius - 20);
        const ry = neckY + Math.sin(angle) * 50 * (i < 2 ? -1 : 1);
        ctx.beginPath();
        ctx.arc(rx, ry, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rx - 5, ry);
        ctx.lineTo(rx + 5, ry);
        ctx.moveTo(rx, ry - 5);
        ctx.lineTo(rx, ry + 5);
        ctx.stroke();
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <canvas
        ref={canvasRef}
        width={280}
        height={340}
        style={{ width: 280, height: 340 }}
      />
      <div
        style={{
          fontSize: "3rem",
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
