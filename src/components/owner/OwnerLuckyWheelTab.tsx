import { useRef, useState } from "react";
import { DEFAULT_WHEEL, loadWheelConfig, saveWheelConfig, type LuckyWheelConfig, type WheelPrize } from "../../lib/luckyWheel";
import { WheelStage, type WheelStageHandle } from "../focus/WheelStage";

let idCounter = 100;
const nextId = () => `p${idCounter++}`;

export default function OwnerLuckyWheelTab() {
  const [cfg, setCfg] = useState<LuckyWheelConfig>(() => loadWheelConfig());
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const stageRef = useRef<WheelStageHandle>(null);
  const [previewResult, setPreviewResult] = useState<WheelPrize | null>(null);
  const [previewSpinning, setPreviewSpinning] = useState(false);

  const spinPreview = () => {
    if (previewSpinning) return;
    setPreviewResult(null);
    setPreviewSpinning(true);
    stageRef.current?.spin();
    window.setTimeout(() => setPreviewSpinning(false), 3700);
  };

  const patch = (p: Partial<LuckyWheelConfig>) => {
    const next = { ...cfg, ...p };
    setCfg(next);
    saveWheelConfig(next);
    refresh();
  };

  const patchPrize = (id: string, p: Partial<WheelPrize>) => {
    const next = { ...cfg, prizes: cfg.prizes.map((pr) => (pr.id === id ? { ...pr, ...p } : pr)) };
    setCfg(next);
    saveWheelConfig(next);
    refresh();
  };

  const addPrize = () => {
    const prize: WheelPrize = {
      id: nextId(),
      label: "New prize",
      emoji: "🎁",
      type: "leaves",
      amount: 100,
      weight: 10,
      color: "#4c8c4c",
    };
    const next = { ...cfg, prizes: [...cfg.prizes, prize] };
    setCfg(next);
    saveWheelConfig(next);
    refresh();
  };

  const removePrize = (id: string) => {
    const next = { ...cfg, prizes: cfg.prizes.filter((pr) => pr.id !== id) };
    setCfg(next);
    saveWheelConfig(next);
    refresh();
  };

  const resetAll = () => {
    setCfg(DEFAULT_WHEEL);
    saveWheelConfig(DEFAULT_WHEEL);
    refresh();
  };

  const totalWeight = cfg.prizes.reduce((a, p) => a + Math.max(0, p.weight), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>LUCKY WHEEL</h3>
        <button onClick={resetAll} style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}>Reset defaults</button>
      </div>

      {/* LIVE PREVIEW — exactly what players see */}
      <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "linear-gradient(160deg,#141226,#1d1830)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.62rem", color: "#c9a44a", letterSpacing: "0.08em", fontWeight: 700 }}>LIVE PREVIEW</span>
          <button onClick={spinPreview} disabled={previewSpinning} style={{ fontSize: "0.62rem", color: "#141226", background: "linear-gradient(135deg,#e8c97a,#c9a44a)", border: "none", borderRadius: 4, padding: "0.3rem 0.8rem", cursor: previewSpinning ? "default" : "pointer", fontWeight: 600, opacity: previewSpinning ? 0.6 : 1 }}>
            {previewSpinning ? "Spinning…" : "🎡 Test spin"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <WheelStage ref={stageRef} cfg={cfg} size={220} onResult={(p) => setPreviewResult(p)} />
          <div style={{ flex: 1, minWidth: 200 }}>
            {previewResult ? (
              <div style={{ fontSize: "0.75rem", color: "#f2e6c9" }}>
                Landed: <b>{previewResult.emoji} {previewResult.label}</b>
                {previewResult.type === "leaves" && <div style={{ fontSize: "0.6rem", color: "#b8a77a" }}>+{previewResult.amount} 🍃 to the player's wallet</div>}
                {previewResult.type === "gold" && <div style={{ fontSize: "0.6rem", color: "#b8a77a" }}>+{previewResult.amount} 🌟 to the player's gold</div>}
                {previewResult.type === "rank_xp" && <div style={{ fontSize: "0.6rem", color: "#b8a77a" }}>+{previewResult.amount} 📈 rank XP (granted by you)</div>}
              </div>
            ) : (
              <div style={{ fontSize: "0.6rem", color: "#8d815f" }}>Press "Test spin" to preview the spin animation and weighted odds. The wheel shown is exactly what players see in the Lobby.</div>
            )}
            <div style={{ marginTop: "0.5rem", fontSize: "0.55rem", color: "#8d815f" }}>
              Cost {cfg.cost} 🍃 · {cfg.freeSpinsPerDay} free spin{cfg.freeSpinsPerDay === 1 ? "" : "s"}/day · {cfg.enabled ? "🟢 ENABLED" : "🔴 DISABLED (players can't spin)"}
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.5rem", marginBottom: "1rem" }}>
        <Toggle label="Enabled" value={cfg.enabled} onChange={(v) => patch({ enabled: v })} />
        <NumField label="Spin cost (leaves)" value={cfg.cost} onChange={(v) => patch({ cost: v })} />
        <NumField label="Free spins / day" value={cfg.freeSpinsPerDay} onChange={(v) => patch({ freeSpinsPerDay: v })} />
        <div>
          <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", marginBottom: "0.2rem" }}>Title</div>
          <input
            value={cfg.title}
            onChange={(e) => patch({ title: e.target.value })}
            style={{ width: "100%", fontSize: "0.62rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2 }}
          />
        </div>
      </div>

      {/* Prizes */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
          PRIZES ({cfg.prizes.length}) · total weight {totalWeight}
        </h4>
        <button onClick={addPrize} style={{ fontSize: "0.62rem", color: "var(--color-genshin-gold)", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 2, padding: "0.25rem 0.6rem", cursor: "pointer" }}>+ Add prize</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {cfg.prizes.map((p) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "56px 1fr 60px 90px 70px 70px 24px", gap: "0.4rem", alignItems: "center", padding: "0.5rem 0.6rem", background: "rgba(26,20,16,0.5)", border: "1px solid rgba(139,109,46,0.12)", borderRadius: 2 }}>
            <input
              value={p.emoji}
              onChange={(e) => patchPrize(p.id, { emoji: e.target.value })}
              style={{ fontSize: "0.85rem", padding: "0.15rem 0.3rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, textAlign: "center" as const }}
            />
            <input
              value={p.label}
              onChange={(e) => patchPrize(p.id, { label: e.target.value })}
              style={{ fontSize: "0.62rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2 }}
            />
            <select
              value={p.type}
              onChange={(e) => patchPrize(p.id, { type: e.target.value as WheelPrize["type"] })}
              style={{ fontSize: "0.6rem", padding: "0.2rem 0.25rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2 }}
            >
              <option value="leaves">Leaves</option>
              <option value="gold">Gold</option>
              <option value="rank_xp">Rank XP</option>
              <option value="item">Item</option>
              <option value="nothing">Nothing</option>
            </select>
            <input
              type="number"
              value={p.type === "item" ? 0 : p.amount}
              disabled={p.type === "item"}
              onChange={(e) => patchPrize(p.id, { amount: Number(e.target.value) })}
              style={{ fontSize: "0.6rem", padding: "0.2rem 0.3rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, textAlign: "right" as const }}
              title="Amount (leaves / gold / rank XP)"
            />
            <input
              type="number"
              value={p.weight}
              onChange={(e) => patchPrize(p.id, { weight: Math.max(0, Number(e.target.value)) })}
              style={{ fontSize: "0.6rem", padding: "0.2rem 0.3rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, textAlign: "right" as const }}
              title="Weight (probability)"
            />
            <input
              type="color"
              value={p.color}
              onChange={(e) => patchPrize(p.id, { color: e.target.value })}
              style={{ width: 36, height: 24, padding: 0, border: "1px solid rgba(139,109,46,0.3)", borderRadius: 2, background: "transparent", cursor: "pointer" }}
              title="Slice color"
            />
            <button onClick={() => removePrize(p.id)} style={{ fontSize: "0.6rem", color: "#e08a8a", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(26,20,16,0.6)", borderRadius: 2, fontSize: "0.58rem", color: "var(--color-genshin-bronze)", opacity: 0.9 }}>
        ℹ️ Saved locally + synced to the DB (owner_content → "wheel"). Players spin the wheel from the Lobby. Weights are relative: a prize with weight 35 is 35/(sum) probability.
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0" }}>
      <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{ fontSize: "0.6rem", color: value ? "#0a0a14" : "var(--color-genshin-bronze)", background: value ? "var(--color-genshin-gold)" : "rgba(139,109,46,0.15)", border: "1px solid rgba(139,109,46,0.3)", borderRadius: 2, padding: "0.2rem 0.55rem", cursor: "pointer", fontWeight: 600 }}
      >
        {value ? "ON" : "OFF"}
      </button>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", marginBottom: "0.2rem" }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", fontSize: "0.62rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, textAlign: "right" as const }}
      />
    </div>
  );
}
