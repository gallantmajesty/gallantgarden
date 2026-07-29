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

export function CuckooClock({
  remainingSeconds,
  totalSeconds,
  isRunning,
  isPaused,
}: ClockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const gearAnglesRef = useRef({ gear1: 0, gear2: 0, gear3: 0, gear4: 0 });
  const cuckooRef = useRef(false);
  const lastSegRef = useRef(-1);

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
    const gy = h / 2;

    function drawGear(x: number, y: number, radius: number, teeth: number, rotation: number, color: string) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a1 = (i / teeth) * Math.PI * 2;
        const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
        const rOuter = radius + 4;
        const rInner = radius - 2;

        ctx.moveTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
        ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner);
        ctx.lineTo(Math.cos(a2) * rInner, Math.sin(a2) * rInner);
        ctx.lineTo(Math.cos(a2) * rOuter, Math.sin(a2) * rOuter);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawFrame() {
      ctx.clearRect(0, 0, w, h);

      const { gear1, gear2, gear3, gear4 } = gearAnglesRef.current;

      if (isRunning) {
        gearAnglesRef.current.gear1 += 0.01;
        gearAnglesRef.current.gear2 -= 0.015;
        gearAnglesRef.current.gear3 += 0.008;
        gearAnglesRef.current.gear4 -= 0.012;
      }

      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(cx - 120, h - 40);
      ctx.lineTo(cx - 140, h);
      ctx.lineTo(cx + 140, h);
      ctx.lineTo(cx + 120, h - 40);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 100, gy + 100);
      ctx.lineTo(cx - 120, h - 40);
      ctx.lineTo(cx + 120, h - 40);
      ctx.lineTo(cx + 100, gy + 100);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, gy - 140);
      ctx.lineTo(cx - 110, gy - 40);
      ctx.lineTo(cx + 110, gy - 40);
      ctx.closePath();
      ctx.stroke();

      drawGear(cx - 50, gy - 10, 28, 8, gear1, "#C9A84C");
      drawGear(cx + 35, gy - 25, 20, 6, gear2, "#E8D4A0");
      drawGear(cx + 50, gy + 30, 24, 7, gear3, "#8B6D2E");
      drawGear(cx - 40, gy + 40, 18, 5, gear4, "#C9A84C");

      const pendulumAngle = Math.sin(Date.now() / 1000) * 0.2;
      ctx.save();
      ctx.translate(cx, gy + 90);
      ctx.rotate(pendulumAngle);
      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 50);
      ctx.stroke();
      ctx.fillStyle = "#C9A84C";
      ctx.beginPath();
      ctx.arc(0, 50, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#E8D4A0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 50, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(26, 20, 16, 0.5)";
      ctx.strokeStyle = "#8B6D2E";
      ctx.fillRect(cx - 25, h - 100, 50, 60);
      ctx.strokeRect(cx - 25, h - 100, 50, 60);
      ctx.beginPath();
      ctx.arc(cx, h - 50, 20, Math.PI, 0);
      ctx.stroke();

      const seg = Math.floor(remainingSeconds / (totalSeconds > 0 ? totalSeconds / 4 : 1));
      if (seg !== lastSegRef.current) {
        lastSegRef.current = seg;
        cuckooRef.current = true;
        setTimeout(() => (cuckooRef.current = false), 800);
      }

      if (cuckooRef.current) {
        const popAngle = Math.sin(Date.now() / 100) * 0.1;
        ctx.save();
        ctx.translate(cx, gy - 40);
        ctx.rotate(popAngle);
        ctx.fillStyle = "#E8D4A0";
        ctx.strokeStyle = "#C9A84C";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, -3);
        ctx.lineTo(8, -8);
        ctx.lineTo(5, -6);
        ctx.stroke();
        ctx.fillStyle = "#2D1F12";
        ctx.beginPath();
        ctx.arc(3, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, gy - 10, 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    function animate() {
      drawFrame();
      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [isRunning, isPaused, remainingSeconds, totalSeconds]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <canvas
        ref={canvasRef}
        width={320}
        height={360}
        style={{ width: 320, height: 360 }}
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
