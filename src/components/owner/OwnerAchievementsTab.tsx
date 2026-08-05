import { useState } from "react";
import { ACHIEVEMENTS, effectiveLeaves, effectiveComingSoon } from "../../lib/achievements";
import { setOverride, getOverride, clearSystem } from "../../lib/ownerOverrides";

export default function OwnerAchievementsTab() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const grouped = Object.entries(
    ACHIEVEMENTS.reduce((acc, ach) => {
      (acc[ach.category] ??= []).push(ach);
      return acc;
    }, {} as Record<string, typeof ACHIEVEMENTS>)
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>ACHIEVEMENTS ({ACHIEVEMENTS.length})</h3>
        <button onClick={() => { clearSystem("achievements"); refresh(); }} style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}>Reset all</button>
      </div>

      {grouped.map(([cat, achs]) => (
        <div key={cat} style={{ marginBottom: "1.25rem" }}>
          <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.68rem", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>{cat.toUpperCase()}</h4>
          {achs.map((ach) => {
            const isComingSoon = effectiveComingSoon(ach.id, !!ach.comingSoon);
            return (
              <div key={ach.id} style={{ background: "rgba(26,20,16,0.4)", border: `1px solid ${isComingSoon ? "rgba(200,0,0,0.15)" : "rgba(139,109,46,0.1)"}`, borderRadius: 4, padding: "0.6rem 0.75rem", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "1rem" }}>🏅</span>
                  <span style={{ flex: 1, fontSize: "0.72rem", fontWeight: 600, color: "var(--color-genshin-gold-light)" }}>{ach.title}</span>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}>
                    <span style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>Coming soon</span>
                    <input
                      type="checkbox"
                      checked={isComingSoon}
                      onChange={(e) => {
                        setOverride("achievements", ach.id, { comingSoon: e.target.checked });
                        refresh();
                      }}
                      style={{ accentColor: "var(--color-genshin-gold)" }}
                    />
                  </label>
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", marginBottom: "0.3rem" }}>{ach.detail} · metric: {ach.metric}</div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const }}>
                  {ach.tiers.map((tier, ti) => {
                    const leaves = effectiveLeaves(ach.id, ti, tier.leaves);
                    return (
                      <div key={tier.key} style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.4rem", background: "rgba(26,20,16,0.6)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.08)" }}>
                        <span style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>{tier.name}</span>
                        <input
                          type="number"
                          value={leaves}
                          onChange={(e) => {
                            setOverride("achievements", `${ach.id}:${ti}`, { leaves: Number(e.target.value) });
                            refresh();
                          }}
                          style={{ width: 44, fontSize: "0.58rem", padding: "0.15rem 0.25rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, textAlign: "right" as const }}
                        />
                        <span style={{ fontSize: "0.5rem", color: "var(--color-genshin-bronze)" }}>🍃</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
