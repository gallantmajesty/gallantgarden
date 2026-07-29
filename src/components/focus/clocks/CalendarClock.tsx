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
    const outerR = 140;
    const midR = 110;
    const innerR = 80;
    const centerR = 30;
    let rot = 0;

    const segments = 36;

    function hexToRgba(hex: string, a: number): string {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    function drawGlow(x: number, y: number, r: number, color: string, blur: number) {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, hexToRgba(color, 0.6));
      grad.addColorStop(0.5, hexToRgba(color, 0.2));
      grad.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function orbPoint(angle: number, radius: number) {
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    }

    function drawRing(radius: number, count: number, active: number, rotOffset: number, color: string) {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + rotOffset;
        const p = orbPoint(angle, radius);
        const isActive = i < active;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isActive ? 2.5 : 1.2, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? color : hexToRgba(color, isActive ? 0.5 : 0.15);
        ctx.fill();
        if (isActive) {
          drawGlow(p.x, p.y, 6, color, 8);
        }
      }
    }

    function drawConstellation(radius: number, rotOffset: number) {
      const stars = [0, 3, 7, 11, 14, 19, 23, 27, 30, 33];
      stars.forEach((i) => {
        const angle = (i / segments) * Math.PI * 2 + rotOffset;
        const pos = orbPoint(angle, radius);
        ctx.fillStyle = hexToRgba("#E8D4A0", 0.4);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function animate() {
      ctx.clearRect(0, 0, w, h);

      if (isRunning) rot += 0.0008;

      // Outer space background glow
      drawGlow(cx, cy, outerR + 30, "#C9A84C", 60);
      drawGlow(cx, cy, centerR + 20, "#E8D4A0", 30);

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba("#C9A84C", 0.25);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Outer ring glow
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba("#C9A84C", 0.06);
      ctx.lineWidth = 8;
      ctx.stroke();

      // Outer constellation dots
      drawConstellation(outerR - 2, 0);

      // Outer active arc (progress glow)
      const endAngle = -Math.PI / 2 + (1 - progress) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR - 1, -Math.PI / 2, endAngle);
      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Outer active arc glow
      ctx.beginPath();
      ctx.arc(cx, cy, outerR + 2, -Math.PI / 2, endAngle);
      ctx.strokeStyle = hexToRgba("#C9A84C", 0.3);
      ctx.lineWidth = 6;
      ctx.stroke();

      // Outer ring tick marks
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
        const isMajor = i % 6 === 0;
        const isActive = i < Math.floor((1 - progress) * segments);
        const r1 = outerR - (isMajor ? 12 : 8);
        const r2 = outerR - 2;
        const p1 = orbPoint(angle, r1);
        const p2 = orbPoint(angle, r2);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = isActive ? hexToRgba("#C9A84C", 0.6) : hexToRgba("#C9A84C", 0.12);
        ctx.lineWidth = isMajor ? 2 : 0.8;
        ctx.stroke();
      }

      // Inner ring markers
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const p1 = orbPoint(angle, innerR - 12);
        const p2 = orbPoint(angle, innerR - 2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = hexToRgba("#E8D4A0", 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Inner ring active arc
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, -Math.PI / 2, -Math.PI / 2 + (1 - progress) * Math.PI * 2);
      ctx.strokeStyle = "#E8D4A0";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Center celestial body
      const phase = (1 - progress) * Math.PI * 2;
      const isSun = Math.sin(phase) > 0;
      const bodyColor = isSun ? "#E8D4A0" : "#8B6D2E";

      // Sun glow
      drawGlow(cx, cy, centerR + 25, isSun ? "#E8D4A0" : "#4A3520", 40);

      // Center circle
      ctx.beginPath();
      ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(bodyColor, 0.15);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(bodyColor, 0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner center orb
      ctx.beginPath();
      ctx.arc(cx, cy, centerR - 8, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(bodyColor, 0.3);
      ctx.fill();

      // Sun rays
      if (isSun) {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + rot * 0.5;
          const inner = orbPoint(angle, centerR + 4);
          const outer = orbPoint(angle, centerR + 14);
          ctx.beginPath();
          ctx.moveTo(inner.x, inner.y);
          ctx.lineTo(outer.x, outer.y);
          ctx.strokeStyle = hexToRgba("#E8D4A0", 0.3);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Moon craters
      if (!isSun) {
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 + rot;
          const dist = 6 + i * 3;
          const crater = orbPoint(angle, dist);
          ctx.beginPath();
          ctx.arc(cx + crater.x, cy + crater.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba("#1A1410", 0.3);
          ctx.fill();
        }
      }

      // Orbiting satellite dots
      const satCount = 3;
      for (let i = 0; i < satCount; i++) {
        const satAngle = rot * 2 + (i / satCount) * Math.PI * 2;
        const satR = outerR + 8;
        const sat = orbPoint(satAngle, satR);
        ctx.beginPath();
        ctx.arc(sat.x, sat.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#C9A84C";
        ctx.fill();
        drawGlow(sat.x, sat.y, 5, "#C9A84C", 10);
      }

      // Cardinal directions
      const dirs = ["N", "E", "S", "W"];
      dirs.forEach((d, i) => {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const pos = orbPoint(angle, outerR + 18);
        ctx.fillStyle = hexToRgba("#8B6D2E", 0.6);
        ctx.font = "9px Georgia, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d, pos.x, pos.y);
      });

      // Hour numbers on outer ring
      for (let i = 1; i <= 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const pos = orbPoint(angle, outerR + 28);
        ctx.fillStyle = hexToRgba("#E8D4A0", 0.35);
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i.toString(), pos.x, pos.y);
      }

      // Progress percentage at bottom
      const pct = Math.round(progress * 100);
      ctx.fillStyle = hexToRgba("#C9A84C", 0.5);
      ctx.font = "8px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${pct}%`, cx, outerR + 40);

      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [progress, isRunning]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <canvas ref={canvasRef} width={380} height={380} style={{ width: 380, height: 380 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
        <span style={{ fontSize: "2.25rem", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "var(--font-mono-display)", color: "var(--color-genshin-gold)" }}>
          {hours}
        </span>
        <span style={{ fontSize: "1.25rem", color: "var(--color-genshin-bronze)", opacity: 0.6 }}>:</span>
        <span style={{ fontSize: "2.25rem", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "var(--font-mono-display)", color: "var(--color-genshin-gold)" }}>
          {minutes}
        </span>
        <span style={{ fontSize: "1.25rem", color: "var(--color-genshin-bronze)", opacity: 0.6 }}>:</span>
        <span style={{ fontSize: "2.25rem", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "var(--font-mono-display)", color: "var(--color-genshin-gold)" }}>
          {seconds}
        </span>
      </div>
    </div>
  );
}