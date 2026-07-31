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
  const rotRef = useRef(0);

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
    const outerR = 150;
    const midR = 115;
    const innerR = 85;
    const centerR = 35;

    function hexToRgba(hex: string, a: number): string {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    function drawGlow(x: number, y: number, r: number, color: string, blur: number) {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, hexToRgba(color, 0.7));
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
        ctx.arc(p.x, p.y, isActive ? 3 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? color : hexToRgba(color, isActive ? 0.5 : 0.12);
        ctx.fill();
        if (isActive) {
          drawGlow(p.x, p.y, 8, color, 12);
        }
      }
    }

    function drawConstellation(radius: number, rotOffset: number) {
      const stars = [0, 3, 7, 11, 14, 19, 23, 27, 30, 33];
      stars.forEach((i) => {
        const angle = (i / 36) * Math.PI * 2 + rotOffset;
        const pos = orbPoint(angle, radius);
        ctx.fillStyle = hexToRgba("#E8D4A0", 0.5);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function animate() {
      ctx.clearRect(0, 0, w, h);

      if (isRunning) rotRef.current += 0.001;

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
      bgGrad.addColorStop(0, "rgba(26,20,16,0.2)");
      bgGrad.addColorStop(1, "rgba(13,10,8,0.2)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      drawGlow(cx, cy, outerR + 40, "#C9A84C", 80);
      drawGlow(cx, cy, centerR + 30, "#E8D4A0", 40);

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba("#C9A84C", 0.3);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba("#C9A84C", 0.08);
      ctx.lineWidth = 10;
      ctx.stroke();

      drawConstellation(outerR - 2, rotRef.current);

      const endAngle = -Math.PI / 2 + (1 - progress) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR - 1, -Math.PI / 2, endAngle);
      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = "#C9A84C";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR + 2, -Math.PI / 2, endAngle);
      ctx.strokeStyle = hexToRgba("#C9A84C", 0.4);
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2 - Math.PI / 2;
        const isMajor = i % 6 === 0;
        const isActive = i < Math.floor((1 - progress) * 36);
        const r1 = outerR - (isMajor ? 14 : 9);
        const r2 = outerR - 2;
        const p1 = orbPoint(angle, r1);
        const p2 = orbPoint(angle, r2);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = isActive ? hexToRgba("#C9A84C", 0.7) : hexToRgba("#C9A84C", 0.1);
        ctx.lineWidth = isMajor ? 2.5 : 1;
        ctx.stroke();
      }

      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const p1 = orbPoint(angle, innerR - 14);
        const p2 = orbPoint(angle, innerR - 2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = hexToRgba("#E8D4A0", 0.35);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.strokeStyle = "#E8D4A0";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const phase = (1 - progress) * Math.PI * 2;
      const isSun = Math.sin(phase) > 0;
      const bodyColor = isSun ? "#E8D4A0" : "#8B6D2E";

      drawGlow(cx, cy, centerR + 35, isSun ? "#E8D4A0" : "#4A3520", 50);

      ctx.beginPath();
      ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(bodyColor, 0.2);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(bodyColor, 0.6);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, centerR - 10, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(bodyColor, 0.35);
      ctx.fill();

      if (isSun) {
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + rotRef.current * 0.5;
          const inner = orbPoint(angle, centerR + 5);
          const outer = orbPoint(angle, centerR + 18);
          ctx.beginPath();
          ctx.moveTo(inner.x, inner.y);
          ctx.lineTo(outer.x, outer.y);
          ctx.strokeStyle = hexToRgba("#E8D4A0", 0.35);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      if (!isSun) {
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + rotRef.current;
          const dist = 8 + i * 4;
          const crater = orbPoint(angle, dist);
          ctx.beginPath();
          ctx.arc(cx + crater.x, cy + crater.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba("#1A1410", 0.35);
          ctx.fill();
        }
      }

      const satCount = 4;
      for (let i = 0; i < satCount; i++) {
        const satAngle = rotRef.current * 2.5 + (i / satCount) * Math.PI * 2;
        const satR = outerR + 12;
        const sat = orbPoint(satAngle, satR);
        ctx.beginPath();
        ctx.arc(sat.x, sat.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#C9A84C";
        ctx.fill();
        drawGlow(sat.x, sat.y, 7, "#C9A84C", 12);
      }

      const dirs = ["N", "E", "S", "W"];
      dirs.forEach((d, i) => {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const pos = orbPoint(angle, outerR + 20);
        ctx.fillStyle = hexToRgba("#8B6D2E", 0.7);
        ctx.font = "10px Georgia, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d, pos.x, pos.y);
      });

      for (let i = 1; i <= 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const pos = orbPoint(angle, outerR + 32);
        ctx.fillStyle = hexToRgba("#E8D4A0", 0.45);
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i.toString(), pos.x, pos.y);
      }

      const pct = Math.round(progress * 100);
      ctx.fillStyle = hexToRgba("#C9A84C", 0.6);
      ctx.font = "9px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${pct}%`, cx, outerR + 48);

      frameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [progress, isRunning]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <canvas
        ref={canvasRef}
        width={420}
        height={420}
        style={{ width: 420, height: 420, filter: "drop-shadow(0 15px 40px rgba(0,0,0,0.4))" }}
      />
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
        <span style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "0.15em", fontFamily: "var(--font-mono-display)", color: "var(--color-genshin-gold)", textShadow: "0 0 20px rgba(201,168,76,0.5), 0 0 40px rgba(201,168,76,0.2)", fontVariantNumeric: "tabular-nums" }}>
          {hours}
        </span>
        <span style={{ fontSize: "1.5rem", color: "var(--color-genshin-bronze)", opacity: 0.5 }}>:</span>
        <span style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "0.15em", fontFamily: "var(--font-mono-display)", color: "var(--color-genshin-gold)", textShadow: "0 0 20px rgba(201,168,76,0.5), 0 0 40px rgba(201,168,76,0.2)", fontVariantNumeric: "tabular-nums" }}>
          {minutes}
        </span>
        <span style={{ fontSize: "1.5rem", color: "var(--color-genshin-bronze)", opacity: 0.5 }}>:</span>
        <span style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "0.15em", fontFamily: "var(--font-mono-display)", color: "var(--color-genshin-gold)", textShadow: "0 0 20px rgba(201,168,76,0.5), 0 0 40px rgba(201,168,76,0.2)", fontVariantNumeric: "tabular-nums" }}>
          {seconds}
        </span>
      </div>
    </div>
  );
}