import { useState } from "react";
import { ALL_CHARACTERS } from "../../avatar/characters";
import { THEMES } from "../../lib/magnet/themes";
import { BANNERS, LOGOS } from "../../lib/banners";
import { setOverride, getOverride, clearSystem } from "../../lib/ownerOverrides";

export default function OwnerPricingTab() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  return (
    <div>
      <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "1rem" }}>PRICING & UNLOCKS</h3>

      {/* Characters */}
      <Section title="CHARACTERS" system="characters" onRefresh={refresh}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.4rem" }}>
          {ALL_CHARACTERS.map((ch) => {
            const price = getOverride("characters", ch.id, {} as { price?: number })?.price ?? ch.price ?? 0;
            const rarity = getOverride("characters", ch.id, {} as { rarity?: string })?.rarity ?? ch.rarity ?? "Common";
            return (
              <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)" }}>
                <span style={{ fontSize: "0.85rem" }}>{ch.icon ? "" : "🎮"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--color-genshin-gold-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{ch.name}</div>
                  <div style={{ fontSize: "0.5rem", color: "var(--color-genshin-bronze)" }}>{rarity}</div>
                </div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => { setOverride("characters", ch.id, { price: Number(e.target.value) }); refresh(); }}
                  style={{ width: 48, fontSize: "0.58rem", padding: "0.15rem 0.25rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, textAlign: "right" as const }}
                />
                <span style={{ fontSize: "0.45rem", color: "var(--color-genshin-bronze)" }}>{ch.currency === "gold" ? "🌟" : "🍃"}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Themes */}
      <Section title="MAGNET THEMES" system="themes" onRefresh={refresh}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.4rem" }}>
          {THEMES.map((th) => {
            const price = getOverride("themes", th.id, {} as { price?: number })?.price ?? th.leafPrice;
            const unlockLevel = getOverride("themes", th.id, {} as { unlockLevel?: number })?.unlockLevel ?? th.unlockLevel;
            return (
              <div key={th.id} style={{ padding: "0.4rem 0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--color-genshin-gold-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{th.name}</div>
                <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
                    <span style={{ fontSize: "0.45rem", color: "var(--color-genshin-bronze)" }}>🍃</span>
                    <input type="number" value={price} onChange={(e) => { setOverride("themes", th.id, { price: Number(e.target.value) }); refresh(); }}
                      style={{ width: 40, fontSize: "0.55rem", padding: "0.1rem 0.2rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.12)", borderRadius: 2, textAlign: "right" as const }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
                    <span style={{ fontSize: "0.45rem", color: "var(--color-genshin-bronze)" }}>Lv.</span>
                    <input type="number" value={unlockLevel} onChange={(e) => { setOverride("themes", th.id, { unlockLevel: Number(e.target.value) }); refresh(); }}
                      style={{ width: 32, fontSize: "0.55rem", padding: "0.1rem 0.2rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.12)", borderRadius: 2, textAlign: "right" as const }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Banners */}
      <Section title="BANNERS" system="banners" onRefresh={refresh}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.4rem" }}>
          {BANNERS.map((b) => {
            const price = getOverride("banners", b.id, {} as { price?: number })?.price ?? b.price;
            return (
              <div key={b.id} style={{ padding: "0.4rem 0.5rem", background: b.css, borderRadius: 2, border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: "0.6rem", fontWeight: 600, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>{b.name}</div>
                <input type="number" value={price} onChange={(e) => { setOverride("banners", b.id, { price: Number(e.target.value) }); refresh(); }}
                  style={{ width: 48, fontSize: "0.55rem", padding: "0.1rem 0.2rem", background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 2, textAlign: "right" as const, marginTop: "0.2rem" }} />
              </div>
            );
          })}
        </div>
      </Section>

      {/* Logos */}
      <Section title="LOGOS" system="logos" onRefresh={refresh}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.4rem" }}>
          {LOGOS.map((l) => {
            const price = getOverride("logos", l.id, {} as { price?: number })?.price ?? l.price;
            return (
              <div key={l.id} style={{ padding: "0.4rem 0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)", textAlign: "center" as const }}>
                <div style={{ width: 32, height: 32, margin: "0 auto 0.2rem", borderRadius: 2, background: l.css || "#333" }} />
                <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>{l.name}</div>
                <input type="number" value={price} onChange={(e) => { setOverride("logos", l.id, { price: Number(e.target.value) }); refresh(); }}
                  style={{ width: 44, fontSize: "0.55rem", padding: "0.1rem 0.2rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.12)", borderRadius: 2, textAlign: "right" as const, marginTop: "0.15rem" }} />
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, system, onRefresh, children }: { title: string; system: string; onRefresh: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{title}</h4>
        <button onClick={() => { clearSystem(system as never); onRefresh(); }} style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}>Reset</button>
      </div>
      {children}
    </div>
  );
}
