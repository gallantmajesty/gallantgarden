import { useMemo, useRef, useState } from "react";
import { loadWheelConfig, rollPrize, getSpinRecord, recordSpin, type WheelPrize } from "../../lib/luckyWheel";

const WHEEL_SIZE = 300;

export function LuckyWheelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cfg = useMemo(() => loadWheelConfig(), [open]);
  const [spinDeg, setSpinDeg] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelPrize | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const lastBalance = useRef(0);

  const readBalance = () => {
    try {
      const raw = localStorage.getItem("sg.wallet.balance");
      const n = raw ? Number(raw) : 0;
      lastBalance.current = Number.isFinite(n) && n >= 0 ? n : 0;
    } catch { lastBalance.current = 0; }
    return lastBalance.current;
  };

  const writeBalance = (n: number) => {
    lastBalance.current = n;
    try { localStorage.setItem("sg.wallet.balance", String(n)); } catch { /* ignore */ }
  };

  if (!open) return null;

  const totalWeight = cfg.prizes.reduce((a, p) => a + Math.max(0, p.weight), 0);
  const segAngle = (p: WheelPrize) => (Math.max(0, p.weight) / totalWeight) * 360;

  // conic gradient built from prizes (angles computed as cumulative fractions)
  let cursor = 0;
  const stops: string[] = [];
  for (const p of cfg.prizes) {
    const a = segAngle(p);
    const from = cursor;
    const to = cursor + a;
    stops.push(`${p.color} ${from}deg ${to}deg`);
    cursor = to;
  }

  const spin = () => {
    if (spinning) return;
    const bal = readBalance();
    const rec = getSpinRecord();
    const freeLeft = Math.max(0, cfg.freeSpinsPerDay - rec.free);
    const useFree = freeLeft > 0;
    if (!useFree && bal < cfg.cost) {
      setFlash(`Not enough leaves — a spin costs ${cfg.cost} 🍃`);
      return;
    }
    if (cfg.prizes.length === 0) { setFlash("No prizes configured on the wheel yet."); return; }

    if (!useFree) writeBalance(bal - cfg.cost);
    recordSpin(useFree);

    const prize = rollPrize(cfg);
    setResult(null);
    setFlash(null);
    setSpinning(true);

    // Land the pointer (12 o'clock) on the prize slice: rotate so slice center is at -90°
    const idx = cfg.prizes.indexOf(prize);
    let centerDeg = 0;
    for (let i = 0; i < idx; i++) centerDeg += segAngle(cfg.prizes[i]);
    centerDeg += segAngle(prize) / 2;
    const target = 360 * 6 + (90 - centerDeg);
    setSpinDeg((prev) => prev + target - ((prev % 360) + 360) % 360);

    window.setTimeout(() => {
      setSpinning(false);
      setResult(prize);
      payOut(prize);
    }, 3600);
  };

  const payOut = (prize: WheelPrize) => {
    const bal = readBalance();
    if (prize.type === "leaves") writeBalance(bal + prize.amount);
    else if (prize.type === "gold") {
      const gold = localStorage.getItem("sg.wallet.gold") ? Number(localStorage.getItem("sg.wallet.gold")) : 0;
      try { localStorage.setItem("sg.wallet.gold", String(Number.isFinite(gold) ? gold + prize.amount : prize.amount)); } catch { /* ignore */ }
    }
    // rank_xp / item rewards are granted server-side by the owner; the toast acknowledges the win.
  };

  const bal = readBalance();
  const rec = getSpinRecord();
  const freeLeft = Math.max(0, cfg.freeSpinsPerDay - rec.free);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,5,10,0.8)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: "92vw", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(160deg,#141226,#1d1830)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 12, padding: "1.25rem", boxShadow: "0 0 60px rgba(201,168,76,0.15)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", color: "#f2e6c9", letterSpacing: "0.04em" }}>🎡 {cfg.title}</h2>
          <button onClick={onClose} style={{ fontSize: "0.9rem", color: "#b8a77a", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
        </div>

        {/* Wheel */}
        <div style={{ position: "relative", width: WHEEL_SIZE, height: WHEEL_SIZE, margin: "0 auto 0.75rem" }}>
          <div
            style={{
              width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: "50%",
              background: `conic-gradient(${stops.join(", ")})`,
              transform: `rotate(${spinDeg}deg)`,
              transition: spinning ? "transform 3.6s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
              border: "4px solid #c9a44a",
              boxShadow: "0 0 30px rgba(0,0,0,0.5)",
            }}
          />
          <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: "1.4rem", zIndex: 3, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>📍</div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#0e0d1a", border: "3px solid #c9a44a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>🎡</div>
          </div>
          {/* slice labels */}
          {cfg.prizes.map((p, i) => {
            let deg = 0;
            for (let j = 0; j < i; j++) deg += segAngle(cfg.prizes[j]);
            deg += segAngle(p) / 2;
            const rad = (deg * Math.PI) / 180;
            const r = WHEEL_SIZE / 2 - 34;
            const x = WHEEL_SIZE / 2 + r * Math.cos(rad);
            const y = WHEEL_SIZE / 2 + r * Math.sin(rad);
            return (
              <span key={p.id} style={{ position: "absolute", left: x - 12, top: y - 12, fontSize: "1.1rem", zIndex: 2, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}>
                {p.emoji}
              </span>
            );
          })}
        </div>

        {/* Prize list */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", justifyContent: "center", marginBottom: "0.75rem" }}>
          {cfg.prizes.map((p) => (
            <span key={p.id} style={{ fontSize: "0.6rem", color: "#d9cba4", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 999, padding: "0.2rem 0.5rem" }}>
              {p.emoji} {p.label}
            </span>
          ))}
        </div>

        {/* Result / flash */}
        {result && (
          <div style={{ marginBottom: "0.75rem", padding: "0.6rem 0.75rem", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 8, textAlign: "center", fontSize: "0.8rem", color: "#f2e6c9" }}>
            {result.type === "nothing" ? "😅 Better luck next time!" : `You won: ${result.emoji} ${result.label}!`}
            {result.type === "rank_xp" && <div style={{ fontSize: "0.6rem", color: "#b8a77a", marginTop: "0.2rem" }}>Rank XP is credited by the owner.</div>}
            {result.type === "item" && <div style={{ fontSize: "0.6rem", color: "#b8a77a", marginTop: "0.2rem" }}>Item will be granted by the owner.</div>}
          </div>
        )}
        {flash && (
          <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(160,60,60,0.15)", border: "1px solid rgba(160,60,60,0.35)", borderRadius: 8, textAlign: "center", fontSize: "0.72rem", color: "#e08a8a" }}>{flash}</div>
        )}

        {/* Actions */}
        <button
          onClick={spin}
          disabled={spinning}
          style={{
            width: "100%", padding: "0.65rem", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.06em",
            color: "#141226", background: "linear-gradient(135deg,#e8c97a,#c9a44a)", border: "none", borderRadius: 8, cursor: spinning ? "default" : "pointer", opacity: spinning ? 0.6 : 1,
          }}
        >
          {spinning ? "Spinning…" : freeLeft > 0 ? `🎡 SPIN (free ${freeLeft} left today)` : `🎡 SPIN — ${cfg.cost} 🍃`}
        </button>
        <div style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.6rem", color: "#8d815f" }}>
          Balance: {bal.toLocaleString()} 🍃
        </div>
      </div>
    </div>
  );
}
