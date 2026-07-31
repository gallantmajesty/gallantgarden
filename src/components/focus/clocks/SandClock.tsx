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

const COLORS = {
  SAND: '#c89830',
  SAND_L: '#ddb84a',
  SAND_D: '#8a6818',
  SAND_XL: '#e8cc60',
  BRONZE1: '#8B6914',
  BRONZE2: '#A67C2E',
  BRONZE3: '#6B4F10',
  BRONZE4: '#C49A3A',
  BROWN1: '#5C3D1A',
  BROWN2: '#7A5428',
  BROWN3: '#3E2A12',
  BROWN4: '#9B7040',
  PATINA: '#4A6B3A',
  PATINA2: '#3A5530',
  GOLD_HI: '#F0E080',
  GOLD_MID: '#C8A030',
  GOLD_DARK: '#6B4F10',
  AMBER: '#D4882A',
  COPPER: '#B87333',
  RUST: '#8B4513',
  AGED: '#705030',
};

const BASE_W = 400;
const BASE_H = 740;

export function SandClock({
  remainingSeconds,
  totalSeconds,
  isRunning,
  isPaused,
}: ClockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sandParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number; color: string }[]>([]);
  const ambientPartsRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; phase: number }[]>([]);
  const timeRef = useRef(0);
  const frameRef = useRef<number>(0);
  const topSandRef = useRef(1);
  const bottomSandRef = useRef(0);
  const remainingRef = useRef(0);
  const targetTopRef = useRef(1);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const scaleRef = useRef(1);
  const ambientInitRef = useRef(false);
  const glowPulseRef = useRef(0);

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const { minutes, seconds } = formatTime(remainingSeconds);

  targetTopRef.current = progress;
  remainingRef.current = remainingSeconds;
  isRunningRef.current = isRunning;
  isPausedRef.current = isPaused;

  useEffect(() => {
    if (ambientInitRef.current) return;
    ambientInitRef.current = true;
    for (let i = 0; i < 80; i++) {
      ambientPartsRef.current.push({
        x: Math.random() * BASE_W,
        y: Math.random() * BASE_H,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -Math.random() * 0.15 - 0.03,
        size: Math.random() * 2.2 + 0.3,
        alpha: Math.random() * 0.3 + 0.05,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let scale = 1;

    function setSize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;
      scale = Math.min(cw / BASE_W, ch / BASE_H, 1.5);
      scaleRef.current = scale;
      const sw = Math.round(BASE_W * scale);
      const sh = Math.round(BASE_H * scale);
      canvas.width = sw * dpr;
      canvas.height = sh * dpr;
      canvas.style.width = sw + 'px';
      canvas.style.height = sh + 'px';
    }
    setSize();

    const ro = new ResizeObserver(() => setSize());
    ro.observe(container);

    const W = BASE_W;
    const H = BASE_H;
    const cx = W / 2;
    const cy = H / 2 - 15;

    function bronzeGrad(x: number, y: number, w: number, h: number, horiz: boolean) {
      const g = horiz
        ? ctx.createLinearGradient(x, y, x + w, y)
        : ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, COLORS.BROWN3);
      g.addColorStop(0.08, COLORS.BROWN1);
      g.addColorStop(0.2, COLORS.BRONZE2);
      g.addColorStop(0.35, COLORS.BRONZE4);
      g.addColorStop(0.48, COLORS.GOLD_HI);
      g.addColorStop(0.55, COLORS.BRONZE4);
      g.addColorStop(0.7, COLORS.BRONZE2);
      g.addColorStop(0.85, COLORS.BROWN1);
      g.addColorStop(1, COLORS.BROWN3);
      return g;
    }

    function agedBronze(x: number, y: number, w: number, h: number, horiz: boolean) {
      const g = horiz
        ? ctx.createLinearGradient(x, y, x + w, y)
        : ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, COLORS.BROWN3);
      g.addColorStop(0.15, COLORS.BROWN1);
      g.addColorStop(0.3, COLORS.AGED);
      g.addColorStop(0.45, COLORS.BRONZE2);
      g.addColorStop(0.5, COLORS.GOLD_MID);
      g.addColorStop(0.55, COLORS.BRONZE2);
      g.addColorStop(0.7, COLORS.AGED);
      g.addColorStop(0.85, COLORS.BROWN1);
      g.addColorStop(1, COLORS.BROWN3);
      return g;
    }

    function patinaOverlay(x: number, y: number, w: number, h: number, alpha: number) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const pg = ctx.createLinearGradient(x, y, x + w, y + h);
      pg.addColorStop(0, 'rgba(74,107,58,0)');
      pg.addColorStop(0.3, 'rgba(74,107,58,0.18)');
      pg.addColorStop(0.5, 'rgba(58,85,48,0.1)');
      pg.addColorStop(0.7, 'rgba(74,107,58,0.15)');
      pg.addColorStop(1, 'rgba(74,107,58,0)');
      ctx.fillStyle = pg;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    function drawRoundedRect(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawBase(by: number, bw: number, bh: number, isTop: boolean) {
      ctx.save();
      const bx = cx - bw / 2;
      drawRoundedRect(bx, by, bw, bh, 8);
      ctx.fillStyle = agedBronze(bx, by, bw, bh, true);
      ctx.fill();
      ctx.strokeStyle = COLORS.BROWN3;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const grooveY = by + bh * 0.22;
      ctx.strokeStyle = 'rgba(50,30,10,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 12, grooveY);
      ctx.lineTo(bx + bw - 12, grooveY);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,160,60,0.25)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(bx + 12, grooveY + 2);
      ctx.lineTo(bx + bw - 12, grooveY + 2);
      ctx.stroke();
      if (!isTop) {
        const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᛏ', 'ᛒ'];
        const sp = bw / (runes.length + 1);
        ctx.fillStyle = 'rgba(160,120,40,0.7)';
        ctx.font = 'bold 11px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < runes.length; i++) {
          const rx = bx + sp * (i + 1);
          const ry = by + bh * 0.55;
          ctx.save();
          ctx.shadowColor = 'rgba(200,160,60,0.3)';
          ctx.shadowBlur = 3;
          ctx.fillText(runes[i], rx, ry);
          ctx.restore();
        }
        ctx.strokeStyle = 'rgba(50,30,10,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + 12, by + bh * 0.78);
        ctx.lineTo(bx + bw - 12, by + bh * 0.78);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(200,160,60,0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bx + 12, by + bh * 0.78 + 1.5);
        ctx.lineTo(bx + bw - 12, by + bh * 0.78 + 1.5);
        ctx.stroke();
      }
      if (isTop) {
        ctx.strokeStyle = 'rgba(50,30,10,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + 12, by + bh * 0.82);
        ctx.lineTo(bx + bw - 12, by + bh * 0.82);
        ctx.stroke();
      }
      patinaOverlay(bx, by, bw, bh, 0.15);
      ctx.restore();
    }

    function drawInscriptionBand(ty: number, bw: number, bh: number) {
      ctx.save();
      const bx = cx - bw / 2;
      drawRoundedRect(bx, ty, bw, bh, 6);
      ctx.fillStyle = bronzeGrad(bx, ty, bw, bh, true);
      ctx.fill();
      ctx.strokeStyle = COLORS.BROWN3;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(50,30,10,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx + 15, ty + bh * 0.2);
      ctx.lineTo(bx + bw - 15, ty + bh * 0.2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,224,128,0.3)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(bx + 15, ty + bh * 0.2 + 1.5);
      ctx.lineTo(bx + bw - 15, ty + bh * 0.2 + 1.5);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = 'rgba(200,160,60,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = COLORS.GOLD_HI;
      ctx.font = 'bold 15px Georgia,serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '4px';
      ctx.fillText('S A N G T O K', cx, ty + bh * 0.58);
      ctx.restore();
      ctx.strokeStyle = 'rgba(50,30,10,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx + 15, ty + bh * 0.82);
      ctx.lineTo(bx + bw - 15, ty + bh * 0.82);
      ctx.stroke();
      patinaOverlay(bx, ty, bw, bh, 0.1);
      ctx.restore();
    }

    function drawPillar(px: number, py: number, ph: number) {
      ctx.save();
      const pw = 12;
      const pg = ctx.createLinearGradient(px - pw / 2, py, px + pw / 2, py);
      pg.addColorStop(0, COLORS.BROWN3);
      pg.addColorStop(0.2, COLORS.BROWN2);
      pg.addColorStop(0.4, COLORS.BRONZE4);
      pg.addColorStop(0.5, COLORS.GOLD_MID);
      pg.addColorStop(0.6, COLORS.BRONZE4);
      pg.addColorStop(0.8, COLORS.BROWN2);
      pg.addColorStop(1, COLORS.BROWN3);
      ctx.fillStyle = pg;
      drawRoundedRect(px - pw / 2, py, pw, ph, 3);
      ctx.fill();
      ctx.strokeStyle = COLORS.BROWN3;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      for (let i = 0; i < Math.floor(ph / 25); i++) {
        const ny = py + 12 + i * 25;
        ctx.strokeStyle = 'rgba(50,30,10,0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px - pw / 2 + 2, ny);
        ctx.lineTo(px + pw / 2 - 2, ny);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(200,160,60,0.1)';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(px - pw / 2 + 2, ny + 1);
        ctx.lineTo(px + pw / 2 - 2, ny + 1);
        ctx.stroke();
      }
      const capH = 10;
      const capW = pw + 8;
      ctx.fillStyle = bronzeGrad(px - capW / 2, py - 2, capW, capH, true);
      drawRoundedRect(px - capW / 2, py - 2, capW, capH, 3);
      ctx.fill();
      ctx.strokeStyle = COLORS.BROWN3;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.fillStyle = bronzeGrad(px - capW / 2, py + ph - capH + 2, capW, capH, true);
      drawRoundedRect(px - capW / 2, py + ph - capH + 2, capW, capH, 3);
      ctx.fill();
      ctx.strokeStyle = COLORS.BROWN3;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      patinaOverlay(px - pw / 2, py, pw, ph, 0.12);
      ctx.restore();
    }

    function drawGlassBulb(gy: number, gh: number, isTop: boolean) {
      const gw = 150;
      const topS = topSandRef.current;
      const botS = bottomSandRef.current;
      ctx.save();
      ctx.beginPath();
      if (isTop) {
        ctx.moveTo(cx - gw / 2, gy);
        ctx.bezierCurveTo(cx - gw / 2, gy + gh * 0.55, cx - gw * 0.06, gy + gh * 0.82, cx - 2, gy + gh);
        ctx.lineTo(cx + 2, gy + gh);
        ctx.bezierCurveTo(cx + gw * 0.06, gy + gh * 0.82, cx + gw / 2, gy + gh * 0.55, cx + gw / 2, gy);
      } else {
        ctx.moveTo(cx - gw / 2, gy + gh);
        ctx.bezierCurveTo(cx - gw / 2, gy + gh * 0.45, cx - gw * 0.06, gy + gh * 0.18, cx - 2, gy);
        ctx.lineTo(cx + 2, gy);
        ctx.bezierCurveTo(cx + gw * 0.06, gy + gh * 0.18, cx + gw / 2, gy + gh * 0.45, cx + gw / 2, gy + gh);
      }
      ctx.closePath();
      const glassFill = ctx.createLinearGradient(cx - gw / 2, gy, cx + gw / 2, gy);
      glassFill.addColorStop(0, 'rgba(60,45,25,0.15)');
      glassFill.addColorStop(0.15, 'rgba(80,60,30,0.08)');
      glassFill.addColorStop(0.5, 'rgba(100,80,40,0.04)');
      glassFill.addColorStop(0.85, 'rgba(80,60,30,0.08)');
      glassFill.addColorStop(1, 'rgba(60,45,25,0.15)');
      ctx.fillStyle = glassFill;
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,110,60,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const hlG = ctx.createLinearGradient(cx - gw * 0.4, gy, cx - gw * 0.15, gy + gh);
      hlG.addColorStop(0, 'rgba(255,240,200,0.18)');
      hlG.addColorStop(0.3, 'rgba(255,240,200,0.08)');
      hlG.addColorStop(0.6, 'rgba(255,240,200,0.02)');
      hlG.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.strokeStyle = hlG;
      ctx.lineWidth = 5;
      ctx.stroke();
      const hlR = ctx.createLinearGradient(cx + gw * 0.2, gy, cx + gw * 0.45, gy + gh * 0.6);
      hlR.addColorStop(0, 'rgba(255,240,200,0)');
      hlR.addColorStop(0.5, 'rgba(255,240,200,0.04)');
      hlR.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.strokeStyle = hlR;
      ctx.lineWidth = 3;
      ctx.stroke();
      const sandLevel = isTop ? topS : botS;
      const sandH = gh * sandLevel * 0.82;
      if (sandH > 2) {
        ctx.save();
        ctx.beginPath();
        if (isTop) {
          ctx.moveTo(cx - gw / 2, gy);
          ctx.bezierCurveTo(cx - gw / 2, gy + gh * 0.55, cx - gw * 0.06, gy + gh * 0.82, cx - 2, gy + gh);
          ctx.lineTo(cx + 2, gy + gh);
          ctx.bezierCurveTo(cx + gw * 0.06, gy + gh * 0.82, cx + gw / 2, gy + gh * 0.55, cx + gw / 2, gy);
        } else {
          ctx.moveTo(cx - gw / 2, gy + gh);
          ctx.bezierCurveTo(cx - gw / 2, gy + gh * 0.45, cx - gw * 0.06, gy + gh * 0.18, cx - 2, gy);
          ctx.lineTo(cx + 2, gy);
          ctx.bezierCurveTo(cx + gw * 0.06, gy + gh * 0.18, cx + gw / 2, gy + gh * 0.45, cx + gw / 2, gy + gh);
        }
        ctx.closePath();
        ctx.clip();
        const sandTop = gy + gh - sandH;
        const sg = ctx.createLinearGradient(cx - gw / 2, sandTop, cx + gw / 2, sandTop);
        sg.addColorStop(0, COLORS.SAND_D);
        sg.addColorStop(0.2, COLORS.SAND);
        sg.addColorStop(0.4, COLORS.SAND_L);
        sg.addColorStop(0.5, COLORS.SAND_XL);
        sg.addColorStop(0.6, COLORS.SAND_L);
        sg.addColorStop(0.8, COLORS.SAND);
        sg.addColorStop(1, COLORS.SAND_D);
        ctx.fillStyle = sg;
        ctx.beginPath();
        if (isTop) {
          const cd = 6 * sandLevel;
          const wobble = Math.sin(timeRef.current * 0.002) * 1.5 * sandLevel;
          ctx.moveTo(cx - gw / 2 - 10, sandTop + cd + wobble);
          ctx.quadraticCurveTo(cx - gw * 0.15, sandTop - cd * 0.5 + wobble * 0.5, cx, sandTop - cd + wobble);
          ctx.quadraticCurveTo(cx + gw * 0.15, sandTop - cd * 0.5 - wobble * 0.5, cx + gw / 2 + 10, sandTop + cd - wobble);
          ctx.lineTo(cx + gw / 2 + 10, gy + gh + 10);
          ctx.lineTo(cx - gw / 2 - 10, gy + gh + 10);
        } else {
          const moundH = 15 * sandLevel;
          ctx.moveTo(cx - gw / 2 - 10, sandTop);
          ctx.quadraticCurveTo(cx, sandTop - moundH, cx + gw / 2 + 10, sandTop);
          ctx.lineTo(cx + gw / 2 + 10, gy + gh + 10);
          ctx.lineTo(cx - gw / 2 - 10, gy + gh + 10);
        }
        ctx.closePath();
        ctx.fill();
        const depthG = ctx.createLinearGradient(cx, sandTop, cx, gy + gh);
        depthG.addColorStop(0, 'rgba(221,184,74,0.25)');
        depthG.addColorStop(0.3, 'rgba(200,152,48,0.12)');
        depthG.addColorStop(1, 'rgba(100,70,20,0.18)');
        ctx.fillStyle = depthG;
        ctx.beginPath();
        if (isTop) {
          const cd = 6 * sandLevel;
          const wobble = Math.sin(timeRef.current * 0.002) * 1.5 * sandLevel;
          ctx.moveTo(cx - gw / 2 - 10, sandTop + cd + wobble);
          ctx.quadraticCurveTo(cx, sandTop - cd + wobble, cx + gw / 2 + 10, sandTop + cd - wobble);
          ctx.lineTo(cx + gw / 2 + 10, gy + gh + 10);
          ctx.lineTo(cx - gw / 2 - 10, gy + gh + 10);
        } else {
          const moundH = 15 * sandLevel;
          ctx.moveTo(cx - gw / 2 - 10, sandTop);
          ctx.quadraticCurveTo(cx, sandTop - moundH, cx + gw / 2 + 10, sandTop);
          ctx.lineTo(cx + gw / 2 + 10, gy + gh + 10);
          ctx.lineTo(cx - gw / 2 - 10, gy + gh + 10);
        }
        ctx.closePath();
        ctx.fill();
        const specG = ctx.createLinearGradient(cx - gw * 0.3, sandTop, cx - gw * 0.1, sandTop + sandH * 0.5);
        specG.addColorStop(0, 'rgba(232,204,96,0.2)');
        specG.addColorStop(1, 'rgba(232,204,96,0)');
        ctx.fillStyle = specG;
        ctx.fillRect(cx - gw / 2, sandTop, gw, sandH);
        ctx.restore();
      }
      ctx.restore();
    }

    function drawNeck(ny: number) {
      ctx.save();
      const nw = 18;
      const nh = 20;
      const ng = ctx.createLinearGradient(cx - nw / 2, ny - nh / 2, cx + nw / 2, ny - nh / 2);
      ng.addColorStop(0, COLORS.BROWN3);
      ng.addColorStop(0.3, COLORS.BRONZE2);
      ng.addColorStop(0.5, COLORS.GOLD_MID);
      ng.addColorStop(0.7, COLORS.BRONZE2);
      ng.addColorStop(1, COLORS.BROWN3);
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.moveTo(cx - nw / 2 - 8, ny - nh / 2);
      ctx.quadraticCurveTo(cx - nw / 2 + 2, ny, cx - nw / 2 - 2, ny + nh / 2);
      ctx.lineTo(cx + nw / 2 + 2, ny + nh / 2);
      ctx.quadraticCurveTo(cx + nw / 2 - 2, ny, cx + nw / 2 + 8, ny - nh / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = COLORS.BROWN3;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      const bandW = 40;
      const bandH = 6;
      for (let i = -1; i <= 1; i += 2) {
        const bandY = ny + i * 5 - bandH / 2;
        ctx.fillStyle = bronzeGrad(cx - bandW / 2, bandY, bandW, bandH, true);
        drawRoundedRect(cx - bandW / 2, bandY, bandW, bandH, 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.BROWN3;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawStream(ny: number) {
      const topS = topSandRef.current;
      if (topS <= 0.005) return;
      ctx.save();
      const streamAlpha = Math.min(1, topS * 5);
      ctx.globalAlpha = streamAlpha;
      const sLen = 25;
      const sg = ctx.createLinearGradient(cx, ny - sLen, cx, ny + sLen);
      sg.addColorStop(0, 'rgba(200,152,48,0.95)');
      sg.addColorStop(0.3, COLORS.SAND_L);
      sg.addColorStop(0.5, COLORS.SAND);
      sg.addColorStop(0.7, COLORS.SAND_D);
      sg.addColorStop(1, 'rgba(138,104,24,0.7)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      const wTop = 2.5;
      const wBot = 1.2;
      ctx.moveTo(cx - wTop, ny - sLen);
      ctx.lineTo(cx + wTop, ny - sLen);
      ctx.lineTo(cx + wBot, ny + sLen);
      ctx.lineTo(cx - wBot, ny + sLen);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawDragon(x: number, y: number, scale: number, flip: boolean, variant: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale * (flip ? -1 : 1), scale);
      ctx.strokeStyle = 'rgba(160,120,40,0.7)';
      ctx.lineWidth = 1.2;
      ctx.fillStyle = 'rgba(120,90,30,0.25)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(5, -12, 15, -18, 22, -12);
      ctx.bezierCurveTo(28, -6, 24, 2, 18, 1);
      ctx.bezierCurveTo(22, 8, 28, 6, 32, 12);
      ctx.bezierCurveTo(35, 18, 28, 22, 22, 19);
      ctx.bezierCurveTo(16, 17, 14, 10, 9, 13);
      ctx.bezierCurveTo(4, 16, -1, 8, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(22, -12);
      ctx.bezierCurveTo(25, -16, 32, -17, 34, -11);
      ctx.bezierCurveTo(36, -7, 32, -4, 28, -5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(32, -11);
      ctx.bezierCurveTo(35, -14, 38, -12, 36, -8);
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,160,60,0.8)';
      ctx.beginPath();
      ctx.arc(28, -9, 1.2, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const sx = 3 + i * 4.5;
        const sy = 1 + Math.sin(i * 0.7) * 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + 1.5, sy - 3.5, sx + 4, sy - 2.5, sx + 3.5, sy + 0.5);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-4, 4);
      ctx.bezierCurveTo(-8, 8, -7, 15, -2, 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, 12);
      ctx.bezierCurveTo(-5, 16, -1, 18, 2, 15);
      ctx.stroke();
      if (variant === 1) {
        ctx.beginPath();
        ctx.moveTo(35, 12);
        ctx.bezierCurveTo(40, 10, 42, 15, 38, 17);
        ctx.bezierCurveTo(36, 18, 34, 16, 35, 12);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawFloral(x: number, y: number, s: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.strokeStyle = 'rgba(160,120,40,0.5)';
      ctx.lineWidth = 0.8;
      ctx.fillStyle = 'rgba(160,120,40,0.12)';
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(2.5, -7, 7, -9, 4.5, -2.5);
        ctx.bezierCurveTo(7, -9, 2.5, -11, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(200,160,60,0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawScrollwork(x: number, y: number, w: number) {
      ctx.save();
      ctx.strokeStyle = 'rgba(160,120,40,0.4)';
      ctx.lineWidth = 0.8;
      const hw = w / 2;
      ctx.beginPath();
      ctx.moveTo(x - hw, y);
      ctx.bezierCurveTo(x - hw * 0.6, y - 8, x - hw * 0.2, y - 6, x, y - 3);
      ctx.bezierCurveTo(x + hw * 0.2, y - 6, x + hw * 0.6, y - 8, x + hw, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - hw, y);
      ctx.bezierCurveTo(x - hw * 0.6, y + 8, x - hw * 0.2, y + 6, x, y + 3);
      ctx.bezierCurveTo(x + hw * 0.2, y + 6, x + hw * 0.6, y + 8, x + hw, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,160,60,0.3)';
      ctx.beginPath();
      ctx.arc(x - hw, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + hw, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawMoon(x: number, y: number, r: number) {
      ctx.save();
      ctx.fillStyle = 'rgba(160,120,40,0.5)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.BROWN2;
      ctx.beginPath();
      ctx.arc(x + r * 0.4, y, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawSun(x: number, y: number, r: number) {
      ctx.save();
      ctx.fillStyle = 'rgba(200,160,60,0.5)';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,120,40,0.5)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        const ir = r * 0.65;
        const or = r * (i % 2 === 0 ? 1 : 0.85);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * ir, y + Math.sin(a) * ir);
        ctx.lineTo(x + Math.cos(a) * or, y + Math.sin(a) * or);
        ctx.stroke();
      }
      ctx.restore();
    }

    function emitSandParticles() {
      const topS = topSandRef.current;
      if (topS <= 0.005) return;
      if (isPausedRef.current) return;
      const ny = cy;
      const count = Math.ceil(3 * topS);
      for (let i = 0; i < count; i++) {
        if (Math.random() < 0.75) {
          sandParticlesRef.current.push({
            x: cx + (Math.random() - 0.5) * 4,
            y: ny + 18 + Math.random() * 4,
            vx: (Math.random() - 0.5) * 0.5,
            vy: Math.random() * 1.5 + 0.5,
            size: Math.random() * 1.5 + 0.4,
            alpha: 0.7 + Math.random() * 0.3,
            life: 0,
            maxLife: 180 + Math.random() * 300,
            color: Math.random() > 0.5 ? COLORS.SAND : COLORS.SAND_L,
          });
        }
      }
    }

    function updateSandParticles(dt: number) {
      for (let i = sandParticlesRef.current.length - 1; i >= 0; i--) {
        const p = sandParticlesRef.current[i];
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.vy += 0.015 * dt * 0.06;
        p.vx *= 0.998;
        p.life += dt;
        p.alpha = Math.max(0, 0.8 * (1 - p.life / p.maxLife));
        if (p.life > p.maxLife) sandParticlesRef.current.splice(i, 1);
      }
    }

    function drawSandParticles() {
      for (const p of sandParticlesRef.current) {
        ctx.fillStyle = p.color === COLORS.SAND
          ? `rgba(200,152,48,${p.alpha})`
          : `rgba(221,184,74,${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function updateAmbient(dt: number) {
      for (const p of ambientPartsRef.current) {
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.phase += 0.001 * dt;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
      }
    }

    function drawAmbient() {
      for (const p of ambientPartsRef.current) {
        const a = Math.max(0, p.alpha * (0.6 + 0.4 * Math.sin(p.phase)));
        ctx.fillStyle = `rgba(180,140,50,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawGlow() {
      const topS = topSandRef.current;
      glowPulseRef.current += 0.01;
      const pulse = 0.7 + 0.3 * Math.sin(glowPulseRef.current);
      const g1 = ctx.createRadialGradient(cx, cy, 5, cx, cy, 200);
      g1.addColorStop(0, `rgba(180,130,40,${0.08 * pulse})`);
      g1.addColorStop(0.4, `rgba(140,100,30,${0.04 * pulse})`);
      g1.addColorStop(1, 'rgba(100,70,20,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);
      if (topS > 0.005) {
        const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
        g2.addColorStop(0, `rgba(220,180,60,${0.15 * pulse})`);
        g2.addColorStop(1, 'rgba(220,180,60,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(cx - 40, cy - 40, 80, 80);
      }
    }

    function drawOrnament(y: number, bw: number) {
      ctx.save();
      const bx = cx - bw / 2;
      ctx.fillStyle = bronzeGrad(bx, y, bw, 5, true);
      ctx.fillRect(bx, y, bw, 5);
      ctx.strokeStyle = COLORS.BROWN3;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, y, bw, 5);
      ctx.restore();
    }

    let lastTime = performance.now();

    let layout: {
      baseW: number; baseH: number; inscH: number; glassH: number;
      topBaseY: number; inscY: number; topGlassY: number;
      neckY: number; botGlassY: number; botBaseY: number;
    } = { baseW: 0, baseH: 0, inscH: 0, glassH: 0, topBaseY: 0, inscY: 0, topGlassY: 0, neckY: 0, botGlassY: 0, botBaseY: 0 };

    function computeLayout() {
      const baseW = 210;
      const baseH = 48;
      const inscH = 38;
      const glassH = 175;
      const topBaseY = cy - glassH - baseH - inscH - 25;
      const baseY = topBaseY;
      const inscY = baseY + baseH;
      const topGlassY = inscY + inscH;
      const neckY = topGlassY + glassH + 10;
      const botGlassY = neckY + 10;
      const botBaseY = botGlassY + glassH;
      layout = { baseW, baseH, inscH, glassH, topBaseY, inscY, topGlassY, neckY, botGlassY, botBaseY };
    }

    function draw() {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;
      timeRef.current += dt;

      const s = scaleRef.current;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);

      const target = targetTopRef.current;
      const current = topSandRef.current;
      const diff = target - current;
      const speed = 0.08;
      topSandRef.current = current + diff * speed;
      if (Math.abs(diff) < 0.001) topSandRef.current = target;
      bottomSandRef.current = 1 - topSandRef.current;

      ctx.clearRect(0, 0, W, H);
      computeLayout();
      const L = layout;
      drawGlow();
      updateAmbient(dt);
      drawAmbient();
      drawBase(L.topBaseY, L.baseW, L.baseH, true);
      drawInscriptionBand(L.inscY, L.baseW, L.inscH);
      drawBase(L.botBaseY, L.baseW, L.baseH, false);
      const pX1 = cx - L.baseW / 2 + 18;
      const pX2 = cx + L.baseW / 2 - 18;
      const pTop = L.inscY + L.inscH;
      const pBot = L.botBaseY;
      drawPillar(pX1, pTop, pBot - pTop);
      drawPillar(pX2, pTop, pBot - pTop);
      drawGlassBulb(L.topGlassY, L.glassH, true);
      drawGlassBulb(L.botGlassY, L.glassH, false);
      drawNeck(L.neckY);
      drawStream(L.neckY);
      emitSandParticles();
      updateSandParticles(dt);
      drawSandParticles();
      drawOrnament(L.topGlassY - 2, 155);
      drawOrnament(L.botGlassY + L.glassH - 3, 155);
      const decoMidTop = L.topGlassY + L.glassH * 0.35;
      drawDragon(cx - 98, decoMidTop, 1.3, false, 0);
      drawDragon(cx + 98, decoMidTop, 1.3, true, 1);
      const decoMidBot = L.botGlassY + L.glassH * 0.5;
      drawDragon(cx - 98, decoMidBot, 1.2, true, 1);
      drawDragon(cx + 98, decoMidBot, 1.2, false, 0);
      drawFloral(cx - L.baseW / 2 + 10, L.topGlassY + 25, 0.9);
      drawFloral(cx + L.baseW / 2 - 10, L.topGlassY + 25, 0.9);
      drawFloral(cx - L.baseW / 2 + 10, L.botGlassY + L.glassH - 25, 0.8);
      drawFloral(cx + L.baseW / 2 - 10, L.botGlassY + L.glassH - 25, 0.8);
      drawScrollwork(cx, L.neckY, L.baseW * 0.6);
      drawSun(cx - L.baseW / 2 + 35, L.neckY, 7);
      drawMoon(cx + L.baseW / 2 - 35, L.neckY, 7);
      drawFloral(cx - L.baseW / 2 + 10, L.inscY + 5, 0.45);
      drawFloral(cx + L.baseW / 2 - 10, L.inscY + 5, 0.45);
      drawFloral(cx, L.topBaseY - 12, 0.5);
      const orbR = 9;
      const orbG = ctx.createRadialGradient(cx - 2, L.topBaseY - 10, 0, cx, L.topBaseY - 8, orbR);
      orbG.addColorStop(0, COLORS.GOLD_HI);
      orbG.addColorStop(0.4, COLORS.GOLD_MID);
      orbG.addColorStop(0.8, COLORS.BRONZE2);
      orbG.addColorStop(1, COLORS.BROWN3);
      ctx.fillStyle = orbG;
      ctx.beginPath();
      ctx.arc(cx, L.topBaseY - 8, orbR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.BROWN3;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      const vignette = ctx.createRadialGradient(cx, cy + 30, 100, cx, cy + 30, Math.max(W, H) * 0.7);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      const rem = remainingRef.current;
      const rM = Math.floor(rem / 60);
      const rS = rem % 60;
      const timeStr = `${rM.toString().padStart(2, '0')}:${rS.toString().padStart(2, '0')}`;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 48px serif';
      ctx.shadowColor = 'rgba(180,130,40,0.7)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = COLORS.GOLD_HI;
      ctx.fillText(timeStr, cx, L.botBaseY + L.baseH + 40);
      ctx.restore();

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      width: '100%',
      minHeight: 0,
      flex: 1,
    }}>
      <div ref={containerRef} style={{
        flex: 1,
        width: '100%',
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block' }}
        />
      </div>
      <div
        style={{
          fontSize: "2.25rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          fontFamily: "var(--font-mono-display)",
          color: "var(--color-genshin-gold)",
          textShadow: "0 0 15px rgba(180,130,40,0.6), 0 0 35px rgba(180,130,40,0.25), 0 0 60px rgba(180,130,40,0.1)",
          flexShrink: 0,
        }}
      >
        {minutes}:{seconds}
      </div>
    </div>
  );
}