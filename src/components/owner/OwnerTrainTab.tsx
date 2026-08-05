import { useState } from "react";
import { TRAIN_LINES } from "../../lib/train/lines";
import { xpFor, coinsFor } from "../../lib/train/rewards";
import { setNestedOverride, getNestedOverride, clearSystem } from "../../lib/ownerOverrides";

export default function OwnerTrainTab() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>TRAIN LINES & REWARDS</h3>
        <button onClick={() => { clearSystem("train"); refresh(); }} style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}>Reset all</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "0.75rem" }}>
        {TRAIN_LINES.map((line) => {
          const minutes = getNestedOverride("train", "lines", line.id, "minutes", line.minutes);
          const cadenceSec = getNestedOverride("train", "lines", line.id, "cadenceSec", line.cadenceSec);
          const boardSec = getNestedOverride("train", "lines", line.id, "boardSec", line.boardSec);
          const previewXp = xpFor(minutes);
          const previewCoins = coinsFor(minutes);

          return (
            <div key={line.id} style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.2rem", color: line.mood.glow }}>🚂</span>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-genshin-gold)" }}>{line.name}</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>Platform {line.platform} → {line.destination}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <NumField label="Duration (min)" value={minutes} fallback={line.minutes} onChange={(v) => { setNestedOverride("train", "lines", line.id, "minutes", v); refresh(); }} />
                <NumField label="Cadence (sec)" value={cadenceSec} fallback={line.cadenceSec} onChange={(v) => { setNestedOverride("train", "lines", line.id, "cadenceSec", v); refresh(); }} />
                <NumField label="Board time (sec)" value={boardSec} fallback={line.boardSec} onChange={(v) => { setNestedOverride("train", "lines", line.id, "boardSec", v); refresh(); }} />
              </div>

              <div style={{ marginTop: "0.5rem", padding: "0.35rem 0.5rem", background: "rgba(26,20,16,0.6)", borderRadius: 2, fontSize: "0.58rem", color: "var(--color-genshin-bronze)" }}>
                Preview: ~{previewXp} XP · ~{previewCoins} coins · {(minutes / 60).toFixed(1)}h
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NumField({ label, value, fallback, onChange }: { label: string; value: number; fallback: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0" }}>
      <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        {value !== fallback && <span style={{ fontSize: "0.5rem", color: "var(--color-genshin-bronze)", opacity: 0.5 }}>{fallback}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: 64, fontSize: "0.62rem", padding: "0.15rem 0.3rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, textAlign: "right" as const }}
        />
      </div>
    </div>
  );
}
