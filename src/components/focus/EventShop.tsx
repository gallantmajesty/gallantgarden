import { useEventShop } from "../../hooks/focus/useEventShop";
import type { FocusEvent } from "../../data/events";
import { RARITY_CONFIG } from "../../data/events";

export function EventShop() {
  const { events, activeEvent, balance, purchases, buyItem, hasPurchased } = useEventShop();

  if (!activeEvent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", padding: "1.5rem", textAlign: "center" }}>
        <span style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📭</span>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>NO ACTIVE EVENT</div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", opacity: 0.7, maxWidth: 200 }}>Check back later for limited-time events and exclusive rewards.</div>
        <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--color-genshin-gold)", fontFamily: "var(--font-mono-display)" }}>{balance.toLocaleString()} 🍃</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Event header */}
      <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--color-genshin-divider)", background: "rgba(201,168,76,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "1.25rem" }}>{activeEvent.icon}</span>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)" }}>{activeEvent.name.toUpperCase()}</span>
          <span style={{ marginLeft: "auto", fontSize: "0.6rem", padding: "0.125rem 0.5rem", borderRadius: 2, background: "rgba(201,168,76,0.2)", color: "var(--color-genshin-gold)", border: "1px solid rgba(201,168,76,0.3)", letterSpacing: "0.05em" }}>● LIVE</span>
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--color-genshin-bronze)", marginBottom: "0.375rem" }}>{activeEvent.description}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--color-genshin-gold)", fontFamily: "var(--font-mono-display)", letterSpacing: "0.05em" }}>{balance.toLocaleString()} 🍃</span>
          <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>|</span>
          <span style={{ fontSize: "0.65rem", color: "var(--color-genshin-bronze)" }}>{activeEvent.items.length} items</span>
        </div>
      </div>

      {/* Items grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {activeEvent.items.map((item) => {
            const owned = hasPurchased(activeEvent.id, item.id);
            const canAfford = balance >= item.price;
            const rarity = RARITY_CONFIG[item.rarity];

            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.625rem 0.5rem",
                  borderRadius: 4,
                  background: owned ? "rgba(201,168,76,0.08)" : "rgba(26,20,16,0.4)",
                  border: `1px solid ${owned ? "rgba(201,168,76,0.3)" : rarity.bg.replace("0.1", "0.15").replace("0.2", "0.2")}`,
                  position: "relative",
                  opacity: owned ? 0.7 : 1,
                }}
              >
                {/* Rarity glow */}
                {!owned && <div style={{ position: "absolute", inset: 0, borderRadius: 4, boxShadow: `inset 0 0 12px ${rarity.bg}`, pointerEvents: "none" }} />}

                <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
                <div style={{ fontSize: "0.65rem", fontWeight: 600, color: owned ? "var(--color-genshin-gold)" : "var(--color-genshin-gold-light)", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", fontFamily: "var(--font-serif-heading)" }}>
                  {item.name}
                </div>
                <div style={{ fontSize: "0.55rem", color: rarity.color, letterSpacing: "0.05em", textTransform: "uppercase" }}>{rarity.label}</div>

                {owned ? (
                  <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-gold)", padding: "0.125rem 0.5rem", borderRadius: 2, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", letterSpacing: "0.05em" }}>OWNED ✓</span>
                ) : (
                  <button
                    onClick={() => buyItem(activeEvent, item)}
                    disabled={!canAfford}
                    style={{
                      fontSize: "0.6rem",
                      padding: "0.2rem 0.5rem",
                      borderRadius: 2,
                      background: canAfford ? "rgba(201,168,76,0.12)" : "rgba(139,109,46,0.08)",
                      border: `1px solid ${canAfford ? "var(--color-genshin-gold)" : "rgba(139,109,46,0.2)"}`,
                      color: canAfford ? "var(--color-genshin-gold)" : "var(--color-genshin-bronze)",
                      cursor: canAfford ? "pointer" : "not-allowed",
                      fontFamily: "var(--font-serif-heading)",
                      letterSpacing: "0.05em",
                      opacity: canAfford ? 1 : 0.5,
                      transition: "all 0.2s",
                    }}
                  >
                    {item.price} 🍃
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
