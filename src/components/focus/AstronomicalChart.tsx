import { useRef, useEffect } from "react";
import type { SessionRecord } from "../../hooks/focus/types";

interface AstronomicalChartProps {
  sessions: SessionRecord[];
  totalFocusMinutes: number;
  totalLeaves: number;
  currentStreak: number;
  longestStreak: number;
}

export function AstronomicalChart({
  sessions,
  totalFocusMinutes,
  totalLeaves,
  currentStreak,
  longestStreak,
}: AstronomicalChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) / 2 - 40;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(201, 168, 76, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(cx, cy, outerR * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(139, 109, 46, 0.2)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const recentSessions = sessions.slice(-30);
    const maxMinutes = Math.max(...recentSessions.map((s) => s.focusMinutes), 1);

    recentSessions.forEach((session, i) => {
      const angle = (i / Math.max(recentSessions.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
      const normalizedMinutes = session.focusMinutes / maxMinutes;
      const r = outerR * 0.2 + normalizedMinutes * outerR * 0.7;

      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      const size = 2 + normalizedMinutes * 6;
      ctx.fillStyle = session.streakDay ? "#C9A84C" : "rgba(139, 109, 46, 0.5)";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      if (session.streakDay) {
        ctx.fillStyle = "rgba(232, 212, 160, 0.4)";
        ctx.beginPath();
        ctx.arc(x, y, size + 3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (i > 0 && session.streakDay) {
        const prev = recentSessions[i - 1];
        if (prev.streakDay) {
          const prevNormalized = prev.focusMinutes / maxMinutes;
          const prevR = outerR * 0.2 + prevNormalized * outerR * 0.7;
          const prevAngle = ((i - 1) / Math.max(recentSessions.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
          const prevX = cx + Math.cos(prevAngle) * prevR;
          const prevY = cy + Math.sin(prevAngle) * prevR;

          ctx.strokeStyle = "rgba(201, 168, 76, 0.2)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    });

    ctx.fillStyle = "rgba(26, 20, 16, 0.7)";
    ctx.beginPath();
    ctx.arc(cx, cy, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#C9A84C";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.floor(totalFocusMinutes / 60)}h`, cx, cy - 16);

    ctx.fillStyle = "#E8D4A0";
    ctx.font = "10px Georgia, serif";
    ctx.fillText("TOTAL FOCUS", cx, cy - 4);

    ctx.fillStyle = "#C9A84C";
    ctx.font = "bold 12px monospace";
    ctx.fillText(`${totalLeaves} ✦`, cx, cy + 14);

    ctx.fillStyle = "#8B6D2E";
    ctx.font = "9px Georgia, serif";
    ctx.fillText(`Streak: ${currentStreak}d  Best: ${longestStreak}d`, cx, cy + 30);

    const labels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * outerR * 1.25;
      const y = cy + Math.sin(angle) * outerR * 1.25;

      ctx.fillStyle = "rgba(139, 109, 46, 0.4)";
      ctx.font = "8px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], x, y);
    }
  }, [sessions, totalFocusMinutes, totalLeaves, currentStreak, longestStreak]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      style={{ width: "100%", maxWidth: 300, height: "auto", display: "block", margin: "0 auto" }}
    />
  );
}
