import { useState } from "react";
import { ALL_CHARACTERS } from "../../avatar/characters";
import { THEMES } from "../../lib/magnet/themes";
import { BANNERS, LOGOS, logoFilter } from "../../lib/banners";
import { setOverride, getOverride, clearSystem } from "../../lib/ownerOverrides";

export default function OwnerPricingTab() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const effPrice = (sys: "characters" | "themes" | "banners" | "logos", id: string, fallback: number) =>
    getOverride(sys, id, {} as { price?: number })?.price ?? fallback;
  const effUnlock = (id: string, fallback: number) =>
    getOverride("themes", id, {} as { unlockLevel?: number })?.unlockLevel ?? fallback;
  const effRarity = (id: string, fallback: string) =>
    getOverride("characters", id, {} as { rarity?: string })?.rarity ?? fallback;

  return (
    <div>
      <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "1rem" }}>PRICING & UNLOCKS</h3>

      {/* LIVE PREVIEW — exactly what players see in their shop */}
      <div style={{ marginBottom: "1.5rem", padding: "0.75rem", background: "linear-gradient(160deg,#141226,#1d1830)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <span style={{ fontSize: "0.62rem", color: "#c9a44a", letterSpacing: "0.08em", fontWeight: 700 }}>LIVE PREVIEW — player shop</span>
          <span style={{ fontSize: "0.55rem", color: "#8d815f" }}>prices update instantly for everyone</span>
        </div>

        {/* Characters */}
        <div style={{ fontSize: "0.6rem", color: "#8d815f", marginBottom: "0.3rem" }}>CHARACTERS</div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {ALL_CHARACTERS.map((ch) => {
            const vis = getOverride("characters", ch.id, {} as { visible?: boolean })?.visible ?? ch.visible ?? true;
            return (
              <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.6rem", color: "#d9cba4", background: "rgba(201,168,76,0.08)", border: `1px solid ${vis ? "rgba(201,168,76,0.2)" : "rgba(200,60,60,0.35)"}`, borderRadius: 999, padding: "0.2rem 0.6rem 0.2rem 0.2rem", opacity: vis ? 1 : 0.55 }}>
                {ch.icon ? (
                  <img src={ch.icon} alt={ch.name} style={{ width: 18, height: 18, borderRadius: 999, objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "0.8rem" }}>🎮</span>
                )}
                {ch.name}{vis ? "" : " 🚫"} — <b style={{ color: "#f2e6c9" }}>{effPrice("characters", ch.id, ch.price ?? 0) === 0 ? "FREE" : `${effPrice("characters", ch.id, ch.price ?? 0)} ${(getOverride("characters", ch.id, {} as { currency?: "green" | "gold" })?.currency ?? ch.currency ?? "green") === "gold" ? "🌟" : "🍃"}`}</b>
              </div>
            );
          })}
        </div>

        {/* Themes */}
        <div style={{ fontSize: "0.6rem", color: "#8d815f", marginBottom: "0.3rem" }}>THEMES</div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {THEMES.slice(0, 12).map((th) => (
            <div key={th.id} style={{ fontSize: "0.6rem", color: "#d9cba4", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 999, padding: "0.25rem 0.6rem" }}>
              {th.name} — <b style={{ color: "#f2e6c9" }}>{effPrice("themes", th.id, th.leafPrice) === 0 ? "FREE" : `${effPrice("themes", th.id, th.leafPrice)} 🍃`}</b> <span style={{ color: "#8d815f" }}>Lv.{effUnlock(th.id, th.unlockLevel)}</span>
            </div>
          ))}
        </div>

        {/* Banners */}
        <div style={{ fontSize: "0.6rem", color: "#8d815f", marginBottom: "0.3rem" }}>BANNERS</div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {BANNERS.slice(0, 12).map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.6rem", color: "#d9cba4", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 999, padding: "0.2rem 0.6rem 0.2rem 0.2rem" }}>
              <div style={{ width: 26, height: 16, borderRadius: 2, overflow: "hidden", flexShrink: 0, background: b.css, backgroundImage: b.image ? `url('${b.image}')` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
              {b.name} — <b style={{ color: "#f2e6c9" }}>{effPrice("banners", b.id, b.price) === 0 ? "FREE" : `${effPrice("banners", b.id, b.price)} ${b.currency === "gold" ? "🌟" : "🍃"}`}</b>
            </div>
          ))}
        </div>

        {/* Logos */}
        <div style={{ fontSize: "0.6rem", color: "#8d815f", marginBottom: "0.3rem" }}>LOGOS</div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {LOGOS.slice(0, 12).map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.6rem", color: "#d9cba4", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 999, padding: "0.2rem 0.6rem 0.2rem 0.2rem" }}>
              {l.image ? (
                <img src={l.image} alt={l.name} style={{ width: 18, height: 18, borderRadius: 999, objectFit: "cover", background: l.css }} />
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: 999, background: l.css || "#333" }} />
              )}
              {l.name} — <b style={{ color: "#f2e6c9" }}>{effPrice("logos", l.id, l.price) === 0 ? "FREE" : `${effPrice("logos", l.id, l.price)} ${l.currency === "gold" ? "🌟" : "🍃"}`}</b>
            </div>
          ))}
        </div>
      </div>

      {/* Characters */}
      <Section title="CHARACTERS" system="characters" onRefresh={refresh}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "0.4rem" }}>
          {ALL_CHARACTERS.map((ch) => {
            const ov = getOverride("characters", ch.id, {} as { price?: number; rarity?: string; currency?: "green" | "gold"; visible?: boolean });
            const price = ov?.price ?? ch.price ?? 0;
            const rarity = ov?.rarity ?? ch.rarity ?? "Common";
            const currency = ov?.currency ?? ch.currency ?? "green";
            const visible = ov?.visible ?? ch.visible ?? true;
            return (
              <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: `1px solid ${visible ? "rgba(139,109,46,0.1)" : "rgba(200,60,60,0.25)"}`, opacity: visible ? 1 : 0.72 }}>
                <button
                  onClick={() => { setOverride("characters", ch.id, { visible: !visible }); refresh(); }}
                  title={visible ? "Visible in shop — click to hide" : "Hidden from shop — click to show"}
                  style={{ width: 26, height: 26, flexShrink: 0, fontSize: "0.8rem", background: visible ? "rgba(120,200,120,0.15)" : "rgba(200,60,60,0.15)", color: visible ? "#7ae08a" : "#e06a6a", border: `1px solid ${visible ? "rgba(120,200,120,0.35)" : "rgba(200,60,60,0.35)"}`, borderRadius: 3, cursor: "pointer", lineHeight: 1 }}
                >{visible ? "👁" : "🚫"}</button>
                {ch.icon ? (
                  <img src={ch.icon} alt={ch.name} style={{ width: 24, height: 24, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <span style={{ fontSize: "0.85rem" }}>🎮</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--color-genshin-gold-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{ch.name}</div>
                  <select value={rarity} onChange={(e) => { setOverride("characters", ch.id, { rarity: e.target.value }); refresh(); }}
                    style={{ width: "100%", fontSize: "0.52rem", padding: "0.05rem 0.15rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, marginTop: "0.15rem" }}>
                    {["Common", "Rare", "Epic", "Legendary"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
                    <select value={currency} onChange={(e) => { setOverride("characters", ch.id, { currency: e.target.value as "green" | "gold" }); refresh(); }}
                      style={{ fontSize: "0.5rem", padding: "0.05rem 0.1rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2 }}>
                      <option value="green">🍃</option>
                      <option value="gold">🌟</option>
                    </select>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => { setOverride("characters", ch.id, { price: Number(e.target.value) }); refresh(); }}
                      style={{ width: 48, fontSize: "0.58rem", padding: "0.15rem 0.25rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, textAlign: "right" as const }}
                    />
                  </div>
                </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.2rem" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0, background: th.vars.accent, border: "1px solid rgba(255,255,255,0.2)" }} />
                  <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--color-genshin-gold-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{th.name}</div>
                </div>
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
            const ov = getOverride("banners", b.id, {} as { price?: number; currency?: "green" | "gold"; visible?: boolean });
            const price = ov?.price ?? b.price;
            const currency = ov?.currency ?? b.currency ?? "green";
            const visible = ov?.visible ?? b.visible ?? true;
            return (
              <div key={b.id} style={{ position: "relative", overflow: "hidden", aspectRatio: "21/9", borderRadius: 3, border: `1px solid ${visible ? "rgba(255,255,255,0.15)" : "rgba(200,60,60,0.4)"}`, background: b.css, backgroundImage: b.image ? `url('${b.image}')` : undefined, backgroundSize: "cover", backgroundPosition: "center", opacity: visible ? 1 : 0.65 }}>
                <button
                  onClick={() => { setOverride("banners", b.id, { visible: !visible }); refresh(); }}
                  title={visible ? "Visible in shop — click to hide" : "Hidden from shop — click to show"}
                  style={{ position: "absolute", top: 4, left: 4, zIndex: 2, width: 22, height: 22, fontSize: "0.7rem", background: "rgba(0,0,0,0.6)", color: visible ? "#7ae08a" : "#e06a6a", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 3, cursor: "pointer", lineHeight: 1 }}
                >{visible ? "👁" : "🚫"}</button>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.3rem", padding: "0.25rem 0.35rem", background: "rgba(0,0,0,0.6)" }}>
                  <div style={{ fontSize: "0.56rem", fontWeight: 600, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{b.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <select value={currency} onChange={(e) => { setOverride("banners", b.id, { currency: e.target.value as "green" | "gold" }); refresh(); }}
                      style={{ fontSize: "0.5rem", padding: "0.05rem", background: "rgba(0,0,0,0.6)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 2 }}>
                      <option value="green">🍃</option>
                      <option value="gold">🌟</option>
                    </select>
                    <input type="number" value={price} onChange={(e) => { setOverride("banners", b.id, { price: Number(e.target.value) }); refresh(); }}
                      style={{ width: 44, fontSize: "0.55rem", padding: "0.1rem 0.2rem", background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 2, textAlign: "right" as const }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Logos */}
      <Section title="LOGOS" system="logos" onRefresh={refresh}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.4rem" }}>
          {LOGOS.map((l) => {
            const ov = getOverride("logos", l.id, {} as { price?: number; currency?: "green" | "gold"; visible?: boolean });
            const price = ov?.price ?? l.price;
            const currency = ov?.currency ?? l.currency ?? "green";
            const visible = ov?.visible ?? l.visible ?? true;
            return (
              <div key={l.id} style={{ padding: "0.4rem 0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: `1px solid ${visible ? "rgba(139,109,46,0.1)" : "rgba(200,60,60,0.25)"}`, textAlign: "center" as const, opacity: visible ? 1 : 0.72 }}>
                <button
                  onClick={() => { setOverride("logos", l.id, { visible: !visible }); refresh(); }}
                  title={visible ? "Visible in shop — click to hide" : "Hidden from shop — click to show"}
                  style={{ width: 22, height: 22, fontSize: "0.7rem", background: visible ? "rgba(120,200,120,0.15)" : "rgba(200,60,60,0.15)", color: visible ? "#7ae08a" : "#e06a6a", border: `1px solid ${visible ? "rgba(120,200,120,0.35)" : "rgba(200,60,60,0.35)"}`, borderRadius: 3, cursor: "pointer", lineHeight: 1, margin: "0 auto 0.2rem", display: "block" }}
                >{visible ? "👁" : "🚫"}</button>
                {l.image ? (
                  <img src={l.image} alt={l.name} style={{ width: 36, height: 36, margin: "0 auto 0.2rem", borderRadius: 999, objectFit: "cover", display: "block", background: l.css }} />
                ) : (
                  <div style={{ width: 36, height: 36, margin: "0 auto 0.2rem", borderRadius: 999, background: l.css || "#333" }} />
                )}
                <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>{l.name}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2rem", marginTop: "0.15rem" }}>
                  <select value={currency} onChange={(e) => { setOverride("logos", l.id, { currency: e.target.value as "green" | "gold" }); refresh(); }}
                    style={{ fontSize: "0.5rem", padding: "0.05rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.12)", borderRadius: 2 }}>
                    <option value="green">🍃</option>
                    <option value="gold">🌟</option>
                  </select>
                  <input type="number" value={price} onChange={(e) => { setOverride("logos", l.id, { price: Number(e.target.value) }); refresh(); }}
                    style={{ width: 44, fontSize: "0.55rem", padding: "0.1rem 0.2rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.12)", borderRadius: 2, textAlign: "right" as const }} />
                </div>
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
