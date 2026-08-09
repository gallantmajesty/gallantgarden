import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ACCESSORIES, type AccessoryId } from "../../avatar/config";
import { AccessoryModel } from "../../avatar/Accessories";
import { createNullSafeEvents } from "../../three/safeEvents";
import { useEventShop, useInventory, useBundles } from "../../hooks/focus/useEventShop";
import { ALL_CHARACTERS as CHAR_ROSTER } from "../../avatar/characters";
import OwnerDataTab from "./OwnerDataTab";
import OwnerRewardsTab from "./OwnerRewardsTab";
import OwnerAchievementsTab from "./OwnerAchievementsTab";
import OwnerTrainTab from "./OwnerTrainTab";
import OwnerPricingTab from "./OwnerPricingTab";
import OwnerUsersTab from "./OwnerUsersTab";
import OwnerLuckyWheelTab from "./OwnerLuckyWheelTab";
import OwnerAnnouncementsTab from "./OwnerAnnouncementsTab";
import OwnerReportsTab from "./OwnerReportsTab";
// Lazy — recharts is heavy and only the HQ dashboard needs it.
const OwnerAnalyticsTab = lazy(() => import("./OwnerAnalyticsTab"));
import type { Character } from "../../avatar/characters";
import { BANNERS, LOGOS } from "../../lib/banners";
import { RANKS } from "../../lib/ranks";
import { THEMES } from "../../lib/magnet/themes";
import type { FocusEvent, EventItem, SavedBundle } from "../../data/events";

const OWNER_PIN = import.meta.env.VITE_OWNER_PIN || "";

const LS = {
  daily: () => { try { return JSON.parse(localStorage.getItem("sf.xp.daily") || "{}"); } catch { return {}; } },
  score: () => { try { return JSON.parse(localStorage.getItem("sf.score.history") || "[]"); } catch { return []; } },
  magnet: () => { try { const raw = localStorage.getItem("sf.magnet.v1"); return raw ? JSON.parse(raw) : null; } catch { return null; } },
  shopInv: () => { try { return JSON.parse(localStorage.getItem("sf.shop.inventory") || "[]"); } catch { return []; } },
  avatar: () => { try { return JSON.parse(localStorage.getItem("sf.avatar.v2") || "null"); } catch { return null; } },
  char: () => { try { return JSON.parse(localStorage.getItem("sf.character.v1") || "null"); } catch { return null; } },
};

export function OwnerPanel() {
  const navigate = useNavigate();
  const { events, activeEvent, saveEvent, deleteEvent, toggleEventActive, balance, addLeaves } = useEventShop();
  const { items } = useInventory();
  const { bundles, saveBundle, deleteBundle } = useBundles();
  const [tab, setTab] = useState<"dashboard" | "events" | "items" | "bundles" | "shop" | "wallet" | "users" | "accessories" | "data" | "rewards" | "achievements" | "train" | "pricing" | "wheel" | "announcements" | "reports" | "analytics" | "settings">("dashboard");
  const [editing, setEditing] = useState<FocusEvent | null>(null);
  const [bundleEditing, setBundleEditing] = useState<SavedBundle | null>(null);

  // Live data reads — refreshed on tab click / mount
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!OWNER_PIN) console.warn("[OwnerPanel] VITE_OWNER_PIN not set in .env.local");
  }, []);

  const handleSave = (evt: FocusEvent) => { saveEvent(evt); setEditing(null); refresh(); };

  // ─── Analytics data reads (plain localStorage reads — stable) ─────
  const [streakDays, setStreakDays] = useState(0);
  useEffect(() => {
    let streak = 0;
    const scoreHistory = LS.score();
    if (scoreHistory.length > 0) {
      const dates = scoreHistory.map((r: any) => r.d || r.date).filter(Boolean).sort().reverse();
      const today = new Date().toISOString().slice(0, 10);
      let check = new Date(today);
      for (const ds of dates) {
        const expected = check.toISOString().slice(0, 10);
        if (ds === expected) { streak++; check.setDate(check.getDate() - 1); }
        else break;
      }
    }
    setStreakDays(streak);
  }, [tick]);

  const dailyRecord = LS.daily();
  const scoreHistory = LS.score();
  const shopInventory = LS.shopInv();
  const charConfig = LS.char();
  const userXp = (dailyRecord.totalFocusMin || 0) * 0.51;
  const todayFocusMin = dailyRecord.totalFocusMin || 0;
  const focusSessionsToday = dailyRecord.focusSessionCount || 0;
  const journeysToday = dailyRecord.journeyMinutes || 0;
  const lastRank = scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].rankId || "bronze-1" : "bronze-1";
  const currentRank = RANKS.find((r) => r.id === lastRank) || RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(currentRank) + 1];
  const rankSpan = nextRank ? nextRank.threshold - currentRank.threshold : currentRank.threshold;
  const rankProgress = Math.min(1, Math.max(0, (userXp - currentRank.threshold) / rankSpan));
  const characterEquipped = charConfig ? CHAR_ROSTER.find((c: Character) => c.id === charConfig.characterId) : null;

  const tabStyle = (active: boolean) => ({
    width: "100%",
    fontSize: "0.66rem", padding: "0.42rem 0.7rem", borderRadius: 2,
    background: active ? "rgba(201,168,76,0.15)" : "transparent",
    border: `1px solid ${active ? "rgba(201,168,76,0.45)" : "transparent"}`,
    borderLeft: `2px solid ${active ? "var(--color-genshin-gold)" : "transparent"}`,
    color: active ? "var(--color-genshin-gold)" : "var(--color-genshin-bronze)",
    cursor: "pointer", fontFamily: "var(--font-serif-heading)", letterSpacing: "0.05em", textTransform: "uppercase" as const,
    textAlign: "left" as const, display: "flex", gap: "0.45rem", alignItems: "center",
  });

  // ─── HQ nav groups ───────────────────────────────────────────────
  const NAV_GROUPS: { label: string; icon: string; tabs: { id: typeof tab; label: string; icon: string }[] }[] = [
    {
      label: "OVERVIEW", icon: "◈",
      tabs: [
        { id: "dashboard", label: "Dashboard", icon: "📊" },
        { id: "reports", label: "Reports & Analytics", icon: "📈" },
        { id: "analytics", label: "Owner Analytics", icon: "🥧" },
        { id: "data", label: "Data Manager", icon: "🗄️" },
      ],
    },
    {
      label: "PLAYERS", icon: "☀",
      tabs: [
        { id: "users", label: "Player HQ", icon: "👥" },
        { id: "wallet", label: "Wallet & Economy", icon: "💰" },
        { id: "shop", label: "Player Inventory", icon: "🎒" },
      ],
    },
    {
      label: "SHOP CONTENT", icon: "◆",
      tabs: [
        { id: "events", label: "Event Shop", icon: "🎪" },
        { id: "items", label: "Shop Items", icon: "🛍️" },
        { id: "bundles", label: "Bundles", icon: "📦" },
        { id: "accessories", label: "Accessories", icon: "🎀" },
        { id: "pricing", label: "Pricing & Unlocks", icon: "🏷️" },
      ],
    },
    {
      label: "LIVE SYSTEMS", icon: "◉",
      tabs: [
        { id: "wheel", label: "Lucky Wheel", icon: "🎡" },
        { id: "announcements", label: "News & Updates", icon: "📢" },
        { id: "rewards", label: "XP & Rewards", icon: "🍃" },
        { id: "achievements", label: "Achievements", icon: "🏆" },
        { id: "train", label: "Train Lines", icon: "🚂" },
      ],
    },
    {
      label: "SYSTEM", icon: "✧",
      tabs: [
        { id: "settings", label: "Settings", icon: "⚙️" },
      ],
    },
  ];

  const card = (label: string, value: string | number, sub?: string, accent?: string) => (
    <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1rem", textAlign: "center" as const }}>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: accent || "var(--color-genshin-gold)", fontFamily: "var(--font-mono-display)", letterSpacing: "0.04em" }}>{value}</div>
      <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", letterSpacing: "0.06em", marginTop: "0.2rem", textTransform: "uppercase" as const }}>{label}</div>
      {sub && <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", opacity: 0.7, marginTop: "0.15rem" }}>{sub}</div>}
    </div>
  );

  const row = (icon: string, label: string, value: React.ReactNode, color?: string) => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.65rem 1rem", background: "rgba(26,20,16,0.4)", border: "1px solid rgba(139,109,46,0.1)", borderRadius: 4 }}>
      <span style={{ fontSize: "1.25rem", width: 32, textAlign: "center" as const }}>{icon}</span>
      <span style={{ flex: 1, fontSize: "0.75rem", color: "var(--color-genshin-gold-light)" }}>{label}</span>
      <span style={{ fontSize: "0.75rem", color: color || "var(--color-genshin-gold)", fontFamily: "var(--font-mono-display)" }}>{value}</span>
    </div>
  );

  // ─── Dashboard summary values ──────────────────────────────────────
  const totalItemsInShop = events.reduce((a, e) => a + e.items.length, 0);
  const ownedCount = shopInventory.length;
  const equippedCount = items.filter((i) => i.equipped).length;
  const totalBundlesSaved = bundles.length;
  const activeEvents = events.filter((e) => e.active).length;

  const blankEvent: FocusEvent = { id: `evt-${Date.now()}`, name: "", description: "", icon: "📅", active: false, createdAt: new Date().toISOString(), items: [] };

  return (
  <div style={{ height: "100vh", overflowY: "hidden", background: "#0a0a14", fontFamily: "var(--font-serif-heading)", display: "flex", flexDirection: "column" }}>
      {/* ─── Top bar ────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.7rem 1.25rem", borderBottom: "1px solid var(--color-genshin-divider)", background: "rgba(26,20,16,0.9)", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1rem", color: "var(--color-genshin-gold)" }}>⟡</span>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--color-genshin-gold)" }}>STUDYFOREST HEADQUARTERS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "0.58rem", color: "var(--color-genshin-bronze)", opacity: 0.8, letterSpacing: "0.05em" }}>{NAV_GROUPS.find((g) => g.tabs.some((t) => t.id === tab))?.label ?? ""}</span>
          <button onClick={() => navigate(-1)} style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", padding: "0 0.6rem" }}>✕</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* ─── Sidebar nav ─────────────────────────────────────── */}
        <nav style={{ width: 210, flexShrink: 0, overflowY: "auto", borderRight: "1px solid var(--color-genshin-divider)", background: "rgba(20,16,10,0.6)", padding: "0.9rem 0.6rem" }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: "0.85rem" }}>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.12em", color: "var(--color-genshin-bronze)", opacity: 0.6, padding: "0 0.5rem 0.3rem", textTransform: "uppercase" as const }}>
                {group.icon} {group.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {group.tabs.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>
                    <span style={{ fontSize: "0.8rem", width: 18, textAlign: "center" as const }}>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ─── Content ─────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "1.25rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  DASHBOARD — your personal Google Analytics overview      */}
        {/* ══════════════════════════════════════════════════════════ */}
        {tab === "dashboard" && (
          <div>
            {/* Identity row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {card("CURRENT RANK", currentRank.name, `${Math.round(rankProgress * 100)}% to next`, currentRank.accent)}
              {card("TOTAL XP EARNED", Math.round(userXp).toLocaleString(), "leaves in session")}
              {card("STREAK", `${streakDays} days`, scoreHistory.length > 0 ? `since ${scoreHistory[0]?.d || scoreHistory[0]?.date || "start"}` : "no history yet")}
              {card("FOCUS TODAY", `${todayFocusMin} min`, `${focusSessionsToday} sessions`)}
              {card("TRAIN TODAY", `${journeysToday} min`, "journey time")}
              {card("ACTIVE EVENTS", activeEvents.toString(), "live now")}
              {card("CHARACTER", characterEquipped?.name || "—", characterEquipped?.rarity || "—")}
              {card("SHOP ITEMS OWNED", ownedCount, `${equippedCount} equipped`)}
            </div>

            {/* Rank banner preview */}
            <div style={{ background: currentRank.accent, height: 4, borderRadius: 2, marginBottom: "1.5rem", opacity: 0.7 }} />

            {/* Live tabs inside dashboard */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* ── Session stats ── */}
              <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1rem" }}>
                <h4 style={{ color: "var(--color-genshin-gold)", fontSize: "0.75rem", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>📊 SESSION STATS</h4>
                {row("⏱", "Total Focus Today", `${todayFocusMin} min`)}
                {row("🔥", "Focus Sessions", String(focusSessionsToday))}
                {row("🚂", "Train Minutes", `${journeysToday} min`)}
                {row("📝", "Daily Login Awarded", dailyRecord.loginAwarded ? "✅ Yes" : "⏳ Pending")}
                {row("🎯", "Modes Explored", Array.isArray(dailyRecord.modesUsed) ? `${dailyRecord.modesUsed.size || dailyRecord.modesUsed.length || 0}` : "0")}
                {row("🌳", "Blueprints Created", String(dailyRecord.blueprintsCreated || 0))}
                {row("📅", "Rank History Entries", String(scoreHistory.length))}
                <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: "rgba(26,20,16,0.6)", borderRadius: 2, fontSize: "0.65rem", color: "var(--color-genshin-bronze)" }}>
                  {scoreHistory.length > 0 ? (
                    <span>Last rank entry: <strong style={{ color: "var(--color-genshin-gold)" }}>{scoreHistory[scoreHistory.length - 1].rankId || lastRank}</strong></span>
                  ) : <span>No rank history yet — start studying!</span>}
                </div>
              </div>

              {/* ── Character & Profile ── */}
              <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1rem" }}>
                <h4 style={{ color: "var(--color-genshin-gold)", fontSize: "0.75rem", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>🎭 CHARACTER & PROFILE</h4>
                {characterEquipped ? (
                  <>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
                      <img src={characterEquipped.icon} alt={characterEquipped.name} style={{ width: 48, height: 48, borderRadius: 4, objectFit: "cover" as const, border: `2px solid ${characterEquipped.color || "#8a8a8a"}` }} />
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-genshin-gold)" }}>{characterEquipped.name}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--color-genshin-bronze)" }}>{characterEquipped.rarity} · {characterEquipped.gender}</div>
                        {(characterEquipped.price ?? 0) > 0 && <div style={{ fontSize: "0.65rem", color: "var(--color-genshin-gold)" }}>{characterEquipped.price} 🍃</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", marginBottom: "0.25rem" }}>{characterEquipped.description}</div>
                  </>
                ) : <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6 }}>No character selected</div>}
                <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: "rgba(26,20,16,0.6)", borderRadius: 2, fontSize: "0.65rem", color: "var(--color-genshin-bronze)" }}>
                  Character ID: <code style={{ color: "var(--color-genshin-gold)" }}>{charConfig?.characterId || "—"}</code>
                </div>
              </div>

              {/* ── Theme Inventory ── */}
              <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1rem" }}>
                <h4 style={{ color: "var(--color-genshin-gold)", fontSize: "0.75rem", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>🌍 THEME INVENTORY</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", fontSize: "0.65rem", color: "var(--color-genshin-bronze)" }}>
                  {THEMES.slice(0, 14).map((th) => (
                    <div key={th.id} style={{ padding: "0.3rem 0.5rem", background: "rgba(26,20,16,0.5)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ marginRight: 4 }}>{th.leafPrice === 0 ? "🆓" : "🔒"}</span>{th.name}
                      <span style={{ float: "right", opacity: 0.7 }}>Lv.{th.unlockLevel}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", marginTop: "0.5rem", opacity: 0.7, textAlign: "center" as const }}>{THEMES.length} themes total · {THEMES.filter((t) => t.leafPrice === 0).length} free</div>
              </div>

              {/* ── Banner & Logo ── */}
              <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1rem" }}>
                <h4 style={{ color: "var(--color-genshin-gold)", fontSize: "0.75rem", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>🖼 BANNERS & LOGOS</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", fontSize: "0.65rem", color: "var(--color-genshin-bronze)", maxHeight: 160, overflowY: "auto" }}>
                  {BANNERS.slice(0, 8).map((b) => (
                    <div key={b.id} style={{ padding: "0.3rem 0.5rem", background: "rgba(26,20,16,0.5)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)" }}>
                      {b.price === 0 ? "🆓" : "💰"} {b.name}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", marginTop: "0.4rem" }}>{BANNERS.length} banners · {LOGOS.length} logos in catalog</div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/*  EVENTS                                             */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "events" && !editing && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>EVENT SHOP MANAGEMENT</h3>
              <button onClick={() => { setEditing(blankEvent); }} className="genshin-btn" style={{ fontSize: "0.7rem", padding: "0.375rem 1rem" }}>+ New Event</button>
            </div>
            {activeEvent && (
              <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1.1rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{activeEvent.icon}</span>
                  <div><div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-genshin-gold)" }}>{activeEvent.name}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--color-genshin-bronze)" }}>{activeEvent.description}</div></div>
                  <span style={{ marginLeft: "auto", fontSize: "0.62rem", padding: "0.2rem 0.5rem", borderRadius: 2, background: "rgba(201,168,76,0.2)", color: "var(--color-genshin-gold)", border: "1px solid rgba(201,168,76,0.3)" }}>● LIVE</span>
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--color-genshin-bronze)", marginTop: "0.4rem" }}>{activeEvent.items.length} items · {activeEvent.items.reduce((a, b) => a + b.price, 0)} total leaves value</div>
              </div>
            )}
            <h4 style={{ color: "var(--color-genshin-gold)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>ALL EVENTS ({events.length})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {events.map((evt) => (
                <div key={evt.id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.65rem 0.9rem", background: "rgba(26,20,16,0.4)", border: `1px solid ${evt.active ? "rgba(201,168,76,0.3)" : "rgba(139,109,46,0.1)"}`, borderRadius: 4 }}>
                  <span style={{ fontSize: "1.2rem" }}>{evt.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: evt.active ? "var(--color-genshin-gold)" : "var(--color-genshin-gold-light)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{evt.name}</div>
                    <div style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)" }}>{evt.items.length} items · {evt.active ? "● Active" : "Inactive"}{evt.startDate && ` · ${evt.startDate}`}{evt.endDate && ` → ${evt.endDate}`}</div>
                  </div>
                  <button onClick={() => toggleEventActive(evt.id)} style={tabStyle(evt.active)}>{evt.active ? "Active" : "Inactive"}</button>
                  <button onClick={() => setEditing(evt)} style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => { if (confirm("Delete this event?")) deleteEvent(evt.id); }} style={{ fontSize: "0.62rem", color: "#c00", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ))}
              {events.length === 0 && <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6, textAlign: "center", padding: "2rem" }}>No events. Create one to get started.</div>}
            </div>
          </div>
        )}

        {tab === "events" && editing && (
          <EventEditor event={editing} onSave={handleSave} onCancel={() => setEditing(null)} bundles={bundles} />
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/*  ITEMS                                              */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "items" && (
          <div>
            <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "1rem" }}>ALL ITEMS IN SYSTEM ({events.reduce((a, e) => a + e.items.length, 0)})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {events.flatMap((evt) => evt.items.map((item) => (
                <div key={`${evt.id}:${item.id}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)" }}>
                  <span style={{ fontSize: "1rem", width: 28, textAlign: "center" }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: "0.72rem", color: "var(--color-genshin-gold-light)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
                  <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", textTransform: "uppercase" }}>{item.type}</span>
                  <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: 2, background: item.rarity === "legendary" ? "rgba(201,168,76,0.2)" : item.rarity === "epic" ? "rgba(168,85,247,0.15)" : item.rarity === "rare" ? "rgba(74,144,217,0.15)" : "rgba(139,109,46,0.1)", border: `1px solid ${item.rarity === "legendary" ? "rgba(201,168,76,0.3)" : "rgba(139,109,46,0.15)"}`, color: item.rarity === "legendary" ? "var(--color-genshin-gold)" : "var(--color-genshin-bronze)" }}>{item.rarity}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--color-genshin-gold)", fontFamily: "var(--font-mono-display)", minWidth: 50, textAlign: "right" }}>{item.price} 🍃</span>
                </div>
              )))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/*  BUNDLES                                             */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "bundles" && (bundleEditing ? (
          <BundleEditor bundle={bundleEditing} items={events.flatMap((e) => e.items)} onSave={(b) => { saveBundle(b); setBundleEditing(null); refresh(); }} onCancel={() => setBundleEditing(null)} />
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>BUNDLE LIBRARY</h3>
              <button onClick={() => setBundleEditing({ id: `bnd-${Date.now()}`, name: "", icon: "🎁", createdAt: new Date().toISOString(), items: [] })} className="genshin-btn" style={{ fontSize: "0.7rem", padding: "0.375rem 1rem" }}>+ New Bundle</button>
            </div>
            {bundles.length === 0 && <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6, textAlign: "center", padding: "2.5rem" }}>No saved bundles. Create one by selecting items from the shop, or import existing bundles.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {bundles.map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.65rem 0.9rem", background: "rgba(26,20,16,0.4)", border: "1px solid rgba(139,109,46,0.1)", borderRadius: 4 }}>
                  <span style={{ fontSize: "1.3rem" }}>{b.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-genshin-gold-light)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name || "Untitled Bundle"}</div>
                    <div style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)" }}>{b.items.length} items · created {new Date(b.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => setBundleEditing(b)} style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => { if (confirm("Delete bundle?")) deleteBundle(b.id); }} style={{ fontSize: "0.62rem", color: "#c00", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ════════════════════════════════════════════════════ */}
        {/*  SHOP CONTENT (characters, banners, logos, ranks)  */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "shop" && (
          <div>
            <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "1rem" }}>SHOP CONTENT — CHARACTERS · RANKS · BANNERS · LOGOS</h3>

            {/* Characters */}
            <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.72rem", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>CHARACTERS ({CHAR_ROSTER.length})</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {CHAR_ROSTER.map((ch: Character) => (
                <div key={ch.id} style={{ background: ch.bg || "rgba(26,20,16,0.4)", border: `1px solid ${ch.special ? "rgba(201,168,76,0.4)" : "rgba(139,109,46,0.15)"}`, borderRadius: 4, padding: "0.75rem", textAlign: "center" as const }}>
                  <div style={{ width: 56, height: 56, borderRadius: 4, background: ch.bg, margin: "0 auto 0.5rem", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {ch.icon ? (
                      <img src={ch.icon} alt={ch.name} style={{ width: "100%", height: "100%", objectFit: "cover" as const }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span style={{ fontSize: "2rem" }}>🎮</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: ch.special ? "var(--color-genshin-gold)" : "var(--color-genshin-gold-light)" }}>{ch.name}</div>
                  <div style={{ fontSize: "0.6rem", color: ch.rarity === "Legendary" ? "#c9a44a" : ch.rarity === "Epic" ? "#a855f7" : "var(--color-genshin-bronze)" }}>{ch.rarity}{ch.price ? ` · ${ch.price} 🍃` : " · FREE"}</div>
                </div>
              ))}
            </div>

            {/* Rank ladder */}
            <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.72rem", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>RANK LADDER ({RANKS.length} tiers)</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.4rem", marginBottom: "1.5rem" }}>
              {RANKS.map((r) => (
                <div key={r.id} style={{ background: "rgba(26,20,16,0.4)", border: currentRank.id === r.id ? `2px solid ${r.accent}` : "1px solid rgba(139,109,46,0.1)", borderRadius: 4, padding: "0.5rem", textAlign: "center" as const }}>
                  <img src={r.badge} alt={r.name} style={{ width: 36, height: 36, objectFit: "contain" as const, marginBottom: "0.25rem" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div style={{ fontSize: "0.65rem", color: r.accent, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>{(r.threshold / 1000).toFixed(1)}k XP</div>
                </div>
              ))}
            </div>

            {/* Banners */}
            <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.72rem", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>BANNERS ({BANNERS.length})</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "0.4rem", marginBottom: "1.5rem" }}>
              {BANNERS.map((b) => (
                <div key={b.id} style={{ background: b.css, backgroundImage: b.image ? `url('${b.image}')` : undefined, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.4rem", position: "relative" as const }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", background: "rgba(0,0,0,0.35)", padding: "0.1rem 0.25rem", borderRadius: 2, display: "inline-block" }}>{b.name}</div>
                  <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.8)", background: "rgba(0,0,0,0.35)", padding: "0.1rem 0.25rem", borderRadius: 2, display: "inline-block" }}>{b.price === 0 ? "FREE" : `${b.price} 🍃`}</div>
                </div>
              ))}
            </div>

            {/* Logos */}
            <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.72rem", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>LOGOS ({LOGOS.length})</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "0.4rem" }}>
              {LOGOS.map((l) => (
                <div key={l.id} style={{ background: "rgba(26,20,16,0.4)", border: "1px solid rgba(139,109,46,0.1)", borderRadius: 4, padding: "0.5rem", textAlign: "center" as const }}>
                  <div style={{ width: 40, height: 40, margin: "0 auto 0.3rem", borderRadius: 999, background: l.css || "#333", overflow: "hidden", backgroundImage: l.image ? `url('${l.image}')` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
                  <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>{l.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/*  WALLET                                              */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "wallet" && (
          <div>
            <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "1rem" }}>GLOBAL WALLET</h3>
            <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1.5rem", marginBottom: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", marginBottom: "0.3rem" }}>Admin balance (demo seed)</div>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--color-genshin-gold)", fontFamily: "var(--font-mono-display)", letterSpacing: "0.1em" }}>{balance.toLocaleString()} 🍃</div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
              {[100, 500, 1000, 5000, 10000].map((n) => (
                <button key={n} onClick={() => addLeaves(n)} className="genshin-btn" style={{ fontSize: "0.7rem", padding: "0.4rem 0.9rem" }}>+ {n.toLocaleString()} 🍃</button>
              ))}
            </div>
            <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.75rem", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>USER SHOP INVENTORY ({shopInventory.length} items)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 400, overflowY: "auto" }}>
              {shopInventory.map((it: { id?: string; itemId?: string; name?: string; type?: string; bannerId?: string; logoId?: string; themeId?: string; characterId?: string; purchasedAt?: number }) => (
                <div key={it.id || it.itemId} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)" }}>
                  <span style={{ fontSize: "1.1rem" }}>{it.type === "banner" ? "🖼" : it.type === "logo" ? "🔷" : it.type === "theme" ? "🌍" : it.type === "character" ? "🎭" : "📦"}</span>
                  <span style={{ flex: 1, fontSize: "0.72rem", color: "var(--color-genshin-gold-light)" }}>{it.name || it.itemId || it.id}</span>
                  <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", textTransform: "uppercase" }}>{it.type}</span>
                </div>
              ))}
              {shopInventory.length === 0 && <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6, textAlign: "center", padding: "1.5rem" }}>No items purchased yet. Shop inventory appears here when users buy items.</div>}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/*  USERS / AUTH                                        */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "users" && <OwnerUsersTab />}

        {tab === "wheel" && <OwnerLuckyWheelTab />}

        {tab === "announcements" && <OwnerAnnouncementsTab />}

        {tab === "reports" && <OwnerReportsTab />}

        {tab === "analytics" && (
          <Suspense fallback={<div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", padding: "2rem" }}>Loading analytics…</div>}>
            <OwnerAnalyticsTab />
          </Suspense>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/*  ACCESSORIES — 3D preview gallery                      */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "accessories" && (
          <div>
            <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "1rem" }}>ACCESSORY GALLERY ({ACCESSORIES.length})</h3>
            <div style={{ fontSize: "0.68rem", color: "var(--color-genshin-bronze)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Every desk accessory rendered from the shared 3D models in one live stage. Drag to orbit the whole collection, scroll to zoom. The <strong style={{ color: "var(--color-genshin-gold)" }}>Study Timer</strong> hand sweeps with the real pomodoro countdown.
            </div>
            <AccessoryStage />
            {/* quick-reference legend */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.4rem", marginTop: "1.25rem" }}>
              {ACCESSORIES.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.45rem 0.6rem", background: "rgba(26,20,16,0.4)", border: "1px solid rgba(139,109,46,0.1)", borderRadius: 2 }}>
                  <span style={{ fontSize: "1rem", width: 22, textAlign: "center" as const }}>{a.icon}</span>
                  <span style={{ flex: 1, fontSize: "0.68rem", color: "var(--color-genshin-gold-light)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                  <code style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", opacity: 0.85 }}>{a.id}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/*  DATA MANAGER                                        */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "data" && <OwnerDataTab />}

        {/* ════════════════════════════════════════════════════ */}
        {/*  REWARDS & XP                                        */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "rewards" && <OwnerRewardsTab />}

        {/* ════════════════════════════════════════════════════ */}
        {/*  ACHIEVEMENTS                                        */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "achievements" && <OwnerAchievementsTab />}

        {/* ════════════════════════════════════════════════════ */}
        {/*  TRAIN                                               */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "train" && <OwnerTrainTab />}

        {/* ════════════════════════════════════════════════════ */}
        {/*  PRICING                                             */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "pricing" && <OwnerPricingTab />}

        {/* ════════════════════════════════════════════════════ */}
        {/*  SETTINGS                                             */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "settings" && (
          <div>
            <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "1rem" }}>SYSTEM SETTINGS</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              {/* Theme list */}
              <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1rem" }}>
                <h4 style={{ color: "var(--color-genshin-gold)", fontSize: "0.75rem", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>🌍 THEMES ({THEMES.length})</h4>
                {THEMES.map((th) => (
                  <div key={th.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.5rem", marginBottom: "0.25rem", background: "rgba(26,20,16,0.3)", borderRadius: 2 }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--color-genshin-gold-light)" }}>{th.name}</span>
                    <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>[{th.category}] Lv.{th.unlockLevel} {th.leafPrice === 0 ? "FREE" : `${th.leafPrice} 🍃`}</span>
                  </div>
                ))}
              </div>

              {/* LocalStorage keys diagnostic */}
              <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1rem" }}>
                <h4 style={{ color: "var(--color-genshin-gold)", fontSize: "0.75rem", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>💾 LOCALSTORAGE KEYS</h4>
                {Object.keys(localStorage).filter((k) => k.startsWith("sf.") || k.startsWith("sg.")).map((k) => (
                  <div key={k} style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", padding: "0.2rem 0", borderBottom: "1px solid rgba(139,109,46,0.06)" }}>
                    <code style={{ color: "var(--color-genshin-gold)", fontSize: "0.58rem" }}>{k}</code>
                  </div>
                ))}
              </div>

              {/* Environment */}
              <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1rem" }}>
                <h4 style={{ color: "var(--color-genshin-gold)", fontSize: "0.75rem", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>⚙ ENVIRONMENT</h4>
                <div style={{ fontSize: "0.68rem", color: "var(--color-genshin-bronze)", lineHeight: 1.8 }}>
                  <div>PIN Set: <strong style={{ color: OWNER_PIN ? "#6fe0a0" : "#e55" }}>{OWNER_PIN ? "✅ Yes" : "❌ Not set"}</strong></div>
                  <div>Owner Route: <code style={{ color: "var(--color-genshin-gold)" }}>/owner</code></div>
                  <div>Backend: <code style={{ color: "var(--color-genshin-gold)" }}>InsForge BaaS</code></div>
                  <div>DB: <code style={{ color: "var(--color-genshin-gold)" }}>PostgreSQL (RLS)</code></div>
                  <div>Auth: <code style={{ color: "var(--color-genshin-gold)" }}>Supabase Auth + OAuth</code></div>
                  <div>Storage: <code style={{ color: "var(--color-genshin-gold)" }}>localStorage (client) + InsForge (cloud)</code></div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Event Editor ─────────────────────────────────────────────────────────────
function EventEditor({ event, onSave, onCancel, bundles }: {
  event: FocusEvent; onSave: (evt: FocusEvent) => void; onCancel: () => void; bundles: SavedBundle[];
}) {
  const [name, setName] = useState(event.name);
  const [desc, setDesc] = useState(event.description);
  const [icon, setIcon] = useState(event.icon);
  const [active, setActive] = useState(event.active);
  const [startDate, setStartDate] = useState(event.startDate || "");
  const [endDate, setEndDate] = useState(event.endDate || "");
  const [items, setItems] = useState<EventItem[]>(event.items);
  const [newItem, setNewItem] = useState<EventItem>({ id: "", name: "", description: "", type: "accessory", rarity: "common", price: 100, icon: "📦" });

  const addItem = () => {
    if (!newItem.name.trim()) return;
    setItems([...items, { ...newItem, id: `item-${Date.now()}` }]);
    setNewItem({ id: "", name: "", description: "", type: "accessory", rarity: "common", price: 100, icon: "📦" });
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const attachBundle = (bundle: SavedBundle) => {
    setItems((prev) => [...prev, ...bundle.items.map((i) => ({ ...i, id: `item-${Date.now()}-${i.id}` }))]);
  };

  const handleSave = () => {
    onSave({ ...event, name: name.trim() || "Untitled Event", description: desc.trim(), icon: icon || "📅", active, startDate: startDate || undefined, endDate: endDate || undefined, items });
  };

  return (
    <div style={{ background: "rgba(26,20,16,0.6)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1.5rem" }}>
      <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "1rem" }}>{event.id.startsWith("evt-") && !event.name ? "New Event" : "Edit Event"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "0.75rem" }}>
        <div><label style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", display: "block", marginBottom: "0.2rem" }}>NAME</label>
          <input className="genshin-input" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", fontSize: "0.78rem" }} /></div>
        <div><label style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", display: "block", marginBottom: "0.2rem" }}>ICON (emoji)</label>
          <input className="genshin-input" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: "100%", fontSize: "0.78rem" }} /></div>
        <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", display: "block", marginBottom: "0.2rem" }}>DESCRIPTION</label>
          <textarea className="genshin-input" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} style={{ width: "100%", fontSize: "0.78rem", resize: "vertical" }} /></div>
        <div><label style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", display: "block", marginBottom: "0.2rem" }}>START DATE</label>
          <input className="genshin-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", fontSize: "0.78rem" }} /></div>
        <div><label style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", display: "block", marginBottom: "0.2rem" }}>END DATE</label>
          <input className="genshin-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%", fontSize: "0.78rem" }} /></div>
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <label htmlFor="active" style={{ fontSize: "0.72rem", color: "var(--color-genshin-gold-light)", cursor: "pointer" }}>Active (visible to users)</label>
        </div>
      </div>

      {/* Items list */}
      <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.68rem", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>ITEMS ({items.length})</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: "0.75rem" }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)" }}>
            <span style={{ fontSize: "1.2rem", width: 30, textAlign: "center" }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: "0.72rem", color: "var(--color-genshin-gold-light)" }}>{item.name}</span>
            <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>{item.type}</span>
            <span style={{ fontSize: "0.65rem", color: "var(--color-genshin-gold)" }}>{item.price} 🍃</span>
            <button onClick={() => removeItem(idx)} style={{ fontSize: "0.68rem", color: "#c00", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
          </div>
        ))}
        {items.length === 0 && <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6 }}>No items in this event.</div>}
      </div>

      {/* Add item form */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "0.5rem", marginBottom: "0.5rem", padding: "0.65rem", background: "rgba(201,168,76,0.04)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.13)" }}>
        <input className="genshin-input" placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} style={{ fontSize: "0.72rem" }} />
        <select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value as EventItem["type"] })} style={{ padding: "0.3rem", borderRadius: 2, background: "rgba(26,20,16,0.6)", border: "1px solid rgba(139,109,46,0.2)", color: "var(--color-genshin-gold-light)", fontSize: "0.72rem" }}>
          <option value="accessory">Accessory</option>
          <option value="bundle">Bundle</option>
          <option value="companion">Companion</option>
          <option value="clock_skin">Clock Skin</option>
          <option value="frame">Frame</option>
          <option value="title">Title</option>
        </select>
        <select value={newItem.rarity} onChange={(e) => setNewItem({ ...newItem, rarity: e.target.value as EventItem["rarity"] })} style={{ padding: "0.3rem", borderRadius: 2, background: "rgba(26,20,16,0.6)", border: "1px solid rgba(139,109,46,0.2)", color: "var(--color-genshin-gold-light)", fontSize: "0.72rem" }}>
          <option value="common">Common</option>
          <option value="rare">Rare</option>
          <option value="epic">Epic</option>
          <option value="legendary">Legendary</option>
        </select>
        <input className="genshin-input" type="number" placeholder="Price" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) || 0 })} style={{ fontSize: "0.72rem", width: 65 }} />
        <input className="genshin-input" placeholder="🎁" value={newItem.icon} onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })} style={{ fontSize: "0.72rem", width: 55 }} />
      </div>
      <button onClick={addItem} className="genshin-btn genshin-btn-secondary" style={{ fontSize: "0.68rem", padding: "0.3rem 0.9rem", marginBottom: "1rem" }}>+ Add Item</button>

      {/* Attach saved bundles */}
      {bundles.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.68rem", color: "var(--color-genshin-bronze)", letterSpacing: "0.05em", marginBottom: "0.4rem", display: "block" }}>📎 ATTACH SAVED BUNDLE</label>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" as const }}>
            {bundles.map((b) => (
              <button key={b.id} onClick={() => attachBundle(b)} className="genshin-btn genshin-btn-secondary" style={{ fontSize: "0.68rem", padding: "0.35rem 0.75rem" }}>
                <span style={{ marginRight: 5 }}>{b.icon}</span> {b.name || "Untitled"} ({b.items.length})
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button onClick={handleSave} className="genshin-btn" style={{ fontSize: "0.78rem", padding: "0.5rem 1.5rem" }}>Save Event</button>
        <button onClick={onCancel} style={{ fontSize: "0.68rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", padding: "0.5rem" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Bundle Editor ────────────────────────────────────────────────────────────
function BundleEditor({ bundle, items, onSave, onCancel }: {
  bundle: SavedBundle; items: EventItem[]; onSave: (b: SavedBundle) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(bundle.name);
  const [icon, setIcon] = useState(bundle.icon);
  const [selectedIds, setSelectedIds] = useState<string[]>(bundle.items.map((i) => i.id));
  const available = items.filter((i) => !selectedIds.includes(i.id));
  const selected = items.filter((i) => selectedIds.includes(i.id));

  const handleSave = () => {
    const nextItems = selected.map((i) => ({ ...i, id: `${bundle.id}-${i.id}` }));
    onSave({ ...bundle, name: name.trim() || "Untitled Bundle", icon: icon || "🎁", items: nextItems });
  };

  return (
    <div style={{ background: "rgba(26,20,16,0.6)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "1.5rem" }}>
      <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "1rem" }}>{bundle.id.startsWith("bnd-") && !bundle.name ? "New Bundle" : "Edit Bundle"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "1rem" }}>
        <div><label style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", display: "block", marginBottom: "0.2rem" }}>BUNDLE NAME</label>
          <input className="genshin-input" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", fontSize: "0.78rem" }} /></div>
        <div><label style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", display: "block", marginBottom: "0.2rem" }}>ICON (emoji)</label>
          <input className="genshin-input" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: "100%", fontSize: "0.78rem" }} /></div>
      </div>

      <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.68rem", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>SELECTED ({selected.length})</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: "0.75rem" }}>
        {selected.map((item) => (
          <div key={item.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)" }}>
            <span style={{ fontSize: "1.2rem", width: 28, textAlign: "center" }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: "0.72rem", color: "var(--color-genshin-gold-light)" }}>{item.name}</span>
            <button onClick={() => setSelectedIds((prev) => prev.filter((x) => x !== item.id))} style={{ fontSize: "0.68rem", color: "#c00", background: "transparent", border: "none", cursor: "pointer" }}>Remove</button>
          </div>
        ))}
      </div>

      <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.68rem", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>AVAILABLE ITEMS</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: "1.25rem", maxHeight: 220, overflowY: "auto" }}>
        {available.map((item) => (
          <div key={item.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.5rem", background: "rgba(26,20,16,0.4)", borderRadius: 2, border: "1px solid rgba(139,109,46,0.1)" }}>
            <span style={{ fontSize: "1.2rem", width: 28, textAlign: "center" }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: "0.72rem", color: "var(--color-genshin-gold-light)" }}>{item.name}</span>
            <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>{item.type}</span>
            <button onClick={() => setSelectedIds((prev) => [...prev, item.id])} className="genshin-btn genshin-btn-secondary" style={{ fontSize: "0.62rem", padding: "0.25rem 0.5rem" }}>+ Add</button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button onClick={handleSave} className="genshin-btn" style={{ fontSize: "0.78rem", padding: "0.5rem 1.5rem" }}>Save Bundle</button>
        <button onClick={onCancel} style={{ fontSize: "0.68rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", padding: "0.5rem" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Accessory 3D stage ───────────────────────────────────────────────────────
// ONE shared Canvas for the whole gallery: every accessory sits on its own grid
// cell and gently auto-rotates in place. A single WebGL context avoids the
// browser's per-page context cap (~16) that 26 mini-canvases would blow past.
// Drag orbits the collection, scroll zooms; the Study Timer hand still sweeps
// live with the pomodoro countdown.
function AccessoryStage() {
  const COLS = 6;
  const CELL = 1.05; // world units between cell centres
  const rows = Math.ceil(ACCESSORIES.length / COLS);
  const gridW = (COLS - 1) * CELL;
  const gridD = (rows - 1) * CELL;

  return (
    <div style={{ height: "min(74vh, 600px)", background: "rgba(10,8,14,0.6)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, overflow: "hidden" }}>
      <Canvas
        events={createNullSafeEvents}
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.6, 5.6], fov: 45, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
      >
        <hemisphereLight args={["#ffe8c0", "#3a2a18", 0.8]} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} color="#ffecd0" />
        <directionalLight position={[-2, 3, -1]} intensity={0.4} color="#ffb870" />
        <ambientLight intensity={0.3} color="#ffe8d0" />

        {/* big dark stage floor under the whole grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <planeGeometry args={[gridW + 2.4, gridD + 2.4]} />
          <meshStandardMaterial color="#1c1410" roughness={0.95} metalness={0.05} />
        </mesh>

        {ACCESSORIES.map((a, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          return (
            <StageCell
              key={a.id}
              def={a}
              position={[col * CELL - gridW / 2, 0, row * CELL - gridD / 2]}
            />
          );
        })}

        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          autoRotate={false}
          rotateSpeed={0.7}
          minDistance={1.5}
          maxDistance={14}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 1.8}
          target={[0, 0.12, 0]}
        />
      </Canvas>
      <div style={{ padding: "0.5rem 0.75rem", borderTop: "1px solid rgba(139,109,46,0.1)", fontSize: "0.6rem", color: "var(--color-genshin-bronze)", opacity: 0.8 }}>
        Drag to rotate · scroll to zoom · every accessory auto-spins in place
      </div>
    </div>
  );
}

// One grid cell: the model on a small stage disc, gently auto-rotating.
function StageCell({ def, position }: { def: (typeof ACCESSORIES)[number]; position: [number, number, number] }) {
  const ref = useRef<any>(null);
  const id = def.id as string;
  const big = id === "trading_desktop_3side" || id === "trading_laptop" || id === "piano";
  const scale = id === "trading_desktop_3side" ? 0.5 : id === "trading_laptop" ? 0.62 : big ? 0.85 : 1;

  // gentle per-cell spin — batched into R3F's single render loop, frame-rate
  // independent (delta-based), and auto-cleaned when the stage unmounts.
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25;
  });

  return (
    <group position={position}>
      {/* small stage disc under each model */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <circleGeometry args={[0.42, 40]} />
        <meshStandardMaterial color="#241a12" roughness={0.9} metalness={0.05} />
      </mesh>
      <group ref={ref} scale={scale}>
        <AccessoryModel id={def.id as AccessoryId} />
      </group>
    </group>
  );
}
