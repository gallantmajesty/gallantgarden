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
    const faceY = 92;          // clock face centre
    const faceR = 62;          // clock face radius
    const pivotY = faceY + 78; // pendulum pivot below the face

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

      const rodLength = 150;
      const bobRadius = 20;
      const pivotX = cx;

      const bobX = pivotX + Math.sin(angle) * rodLength;
      const bobY = pivotY + Math.cos(angle) * rodLength;

      // Backdrop
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(26,20,16,0.3)");
      grad.addColorStop(1, "rgba(13,10,8,0.3)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // ---- Wooden case (arched top) ----
      ctx.save();
      const caseX = cx - 92;
      const caseY = 18;
      const caseW = 184;
      const caseH = h - 70;
      const wood = ctx.createLinearGradient(caseX, caseY, caseX + caseW, caseY);
      wood.addColorStop(0, "#3E2A12");
      wood.addColorStop(0.2, "#5C3D1A");
      wood.addColorStop(0.5, "#7A5428");
      wood.addColorStop(0.8, "#5C3D1A");
      wood.addColorStop(1, "#2E1E0C");
      ctx.fillStyle = wood;
      ctx.beginPath();
      ctx.moveTo(caseX, caseY + 40);
      ctx.quadraticCurveTo(caseX, caseY, cx, caseY);
      ctx.quadraticCurveTo(caseX + caseW, caseY, caseX + caseW, caseY + 40);
      ctx.lineTo(caseX + caseW, caseY + caseH);
      ctx.lineTo(caseX, caseY + caseH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#1E130A";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Inner brass bezel
      ctx.strokeStyle = "rgba(201,168,76,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(caseX + 8, caseY + 46);
      ctx.quadraticCurveTo(caseX + 8, caseY + 8, cx, caseY + 8);
      ctx.quadraticCurveTo(caseX + caseW - 8, caseY + 8, caseX + caseW - 8, caseY + 46);
      ctx.lineTo(caseX + caseW - 8, caseY + caseH - 8);
      ctx.lineTo(caseX + 8, caseY + caseH - 8);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // ---- Clock face ----
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 12;
      // Brass rim
      const rim = ctx.createRadialGradient(cx - 8, faceY - 8, faceR * 0.2, cx, faceY, faceR + 8);
      rim.addColorStop(0, "#F0E080");
      rim.addColorStop(0.5, "#C9A84C");
      rim.addColorStop(1, "#6B4F10");
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, faceY, faceR + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Face
      const face = ctx.createRadialGradient(cx - 10, faceY - 12, 6, cx, faceY, faceR);
      face.addColorStop(0, "#FFF8E7");
      face.addColorStop(0.7, "#F0E6CC");
      face.addColorStop(1, "#D8C49A");
      ctx.fillStyle = face;
      ctx.beginPath();
      ctx.arc(cx, faceY, faceR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8B6D2E";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Hour ticks
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const inner = faceR - (i % 3 === 0 ? 12 : 7);
        ctx.strokeStyle = i % 3 === 0 ? "#5C3D1A" : "rgba(92,61,26,0.5)";
        ctx.lineWidth = i % 3 === 0 ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, faceY + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * (faceR - 3), faceY + Math.sin(a) * (faceR - 3));
        ctx.stroke();
      }

      // Hands driven by the SAME remaining time as every other clock.
      // Minute hand sweeps the current minute; the "session hand" sweeps the
      // whole session so progress is visible at a glance (linked to the ring,
      // the sand level and the digital readout).
      const secAngle = ((remainingSeconds % 60) / 60) * Math.PI * 2 - Math.PI / 2;
      const sessionAngle = (1 - progress) * Math.PI * 2 - Math.PI / 2;

      // Session/progress hand (long, gold)
      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, faceY);
      ctx.lineTo(cx + Math.cos(sessionAngle) * (faceR - 14), faceY + Math.sin(sessionAngle) * (faceR - 14));
      ctx.stroke();

      // Second hand (thin, dark)
      ctx.strokeStyle = "#5C3D1A";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, faceY);
      ctx.lineTo(cx + Math.cos(secAngle) * (faceR - 8), faceY + Math.sin(secAngle) * (faceR - 8));
      ctx.stroke();

      // Centre pin
      const pin = ctx.createRadialGradient(cx - 2, faceY - 2, 0, cx, faceY, 6);
      pin.addColorStop(0, "#F0E080");
      pin.addColorStop(1, "#6B4F10");
      ctx.fillStyle = pin;
      ctx.beginPath();
      ctx.arc(cx, faceY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ---- Pendulum ----
      ctx.save();
      ctx.strokeStyle = "rgba(201,168,76,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      // Bob shadow
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

      // Bob
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
      ctx.strokeStyle = "#C9A84C";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232,212,160,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // ---- Progress bar ----
      const barY = h - 40;
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
      ctx.fillText(`${pct}%`, cx, barY + 16);
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