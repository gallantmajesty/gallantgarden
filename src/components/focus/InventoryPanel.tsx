import { useInventory } from "../../hooks/focus/useEventShop";
import { RARITY_CONFIG, ITEM_TYPE_LABELS } from "../../data/events";

export function InventoryPanel() {
  const { items, equipped, unequipped, equip, unequip } = useInventory();

  if (items.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", padding: "1.5rem", textAlign: "center" }}>
        <span style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🎒</span>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>EMPTY INVENTORY</div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", opacity: 0.7, maxWidth: 200 }}>Complete focus sessions and spend leaves in the Event Shop to collect items.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Equipped section */}
      {equipped.length > 0 && (
        <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-genshin-divider)", background: "rgba(201,168,76,0.06)" }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)", marginBottom: "0.375rem", textTransform: "uppercase" }}>EQUIPPED ({equipped.length})</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {equipped.map((item) => {
              const rarity = RARITY_CONFIG[item.rarity];
              return (
                <div key={item.rewardId} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.25rem 0.5rem", borderRadius: 2, background: "rgba(201,168,76,0.1)", border: `1px solid ${rarity.color}40` }}>
                  <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                  <span style={{ fontSize: "0.65rem", color: "var(--color-genshin-gold-light)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>{item.name}</span>
                  <button onClick={() => unequip(item.rewardId)} style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", padding: 0, opacity: 0.6 }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((item) => {
            const rarity = RARITY_CONFIG[item.rarity];
            const isEquipped = item.equipped;
            return (
              <div
                key={item.rewardId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  borderRadius: 3,
                  background: isEquipped ? "rgba(201,168,76,0.08)" : "rgba(26,20,16,0.3)",
                  border: `1px solid ${isEquipped ? "rgba(201,168,76,0.3)" : "rgba(139,109,46,0.1)"}`,
                }}
              >
                <span style={{ fontSize: "1.25rem", width: 32, textAlign: "center" }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 500, color: isEquipped ? "var(--color-genshin-gold)" : "var(--color-genshin-gold-light)", fontFamily: "var(--font-serif-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                  <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.125rem" }}>
                    <span style={{ fontSize: "0.55rem", color: rarity.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{rarity.label}</span>
                    <span style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", opacity: 0.6 }}>{ITEM_TYPE_LABELS[item.type]}</span>
                  </div>
                </div>
                {isEquipped ? (
                  <button onClick={() => unequip(item.rewardId)} className="genshin-btn genshin-btn-secondary" style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem" }}>Unequip</button>
                ) : (
                  <button onClick={() => equip(item.rewardId)} className="genshin-btn" style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem" }}>Equip</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
