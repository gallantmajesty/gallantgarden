import { useMemo, useRef, useState } from "react";
import { loadWheelConfig, getSpinRecord, recordSpin, type WheelPrize } from "../../lib/luckyWheel";
import { WheelStage, type WheelStageHandle } from "./WheelStage";

export function LuckyWheelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cfg = useMemo(() => loadWheelConfig(), [open]);
  const stageRef = useRef<WheelStageHandle>(null);
  const [result, setResult] = useState<WheelPrize | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

  const readBalance = () => {
    try {
      const raw = localStorage.getItem("sg.wallet.balance");
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch { return 0; }
  };

  const writeBalance = (n: number) => {
    try { localStorage.setItem("sg.wallet.balance", String(n)); } catch { /* ignore */ }
  };

  if (!open) return null;

  const bal = readBalance();
  const rec = getSpinRecord();
  const freeLeft = Math.max(0, cfg.freeSpinsPerDay - rec.free);

  const spin = () => {
    if (spinning) return;
    const balance = readBalance();
    const useFree = freeLeft > 0;
    if (!useFree && balance < cfg.cost) {
      setFlash(`Not enough leaves — a spin costs ${cfg.cost} 🍃`);
      return;
    }
    if (cfg.prizes.length === 0) { setFlash("No prizes configured on the wheel yet."); return; }

    if (!useFree) writeBalance(balance - cfg.cost);
    recordSpin(useFree);

    setResult(null);
    setFlash(null);
    setSpinning(true);
    const prize = stageRef.current?.spin();
    if (prize) {
      window.setTimeout(() => {
        setSpinning(false);
        setResult(prize);
        payOut(prize);
      }, 3700);
    } else {
      setSpinning(false);
    }
  };

  const payOut = (prize: WheelPrize) => {
    const balance = readBalance();
    if (prize.type === "leaves") writeBalance(balance + prize.amount);
    else if (prize.type === "gold") {
      try {
        const gold = localStorage.getItem("sg.wallet.gold") ? Number(localStorage.getItem("sg.wallet.gold")) : 0;
        localStorage.setItem("sg.wallet.gold", String(Number.isFinite(gold) ? gold + prize.amount : prize.amount));
      } catch { /* ignore */ }
    }
    // rank_xp / item rewards are granted by the owner via the HQ.
  };

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
        <div style={{ margin: "0 auto 0.75rem", width: "fit-content" }}>
          <WheelStage ref={stageRef} cfg={cfg} onResult={() => {}} />
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
