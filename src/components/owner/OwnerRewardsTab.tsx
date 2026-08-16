import { useState } from "react";
import { XP_VALUES, POMO_REWARDS, DAILY_CAPS, STREAK_XP_TIERS } from "../../lib/xpEngine";
import { EASY_RATE, MEDIUM_RATE, HARDCORE_BASE_RATE, GRACE_SEC } from "../../store/hardcore";
import { getOverride, setOverride, clearSystem } from "../../lib/ownerOverrides";
import { getEffectiveRanks, RANKS } from "../../lib/ranks";

function numField(label: string, system: string, key: string, fallback: number, setTick: () => void) {
  const current = getOverride(system as never, key, fallback) as number;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid rgba(139,109,46,0.06)" }}>
      <span style={{ fontSize: "0.65rem", color: "var(--color-genshin-bronze)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", opacity: 0.5 }}>{fallback}</span>
        <input
          type="number"
          value={current}
          onChange={(e) => { setOverride(system as never, key, Number(e.target.value)); setTick(); }}
          style={{ width: 72, fontSize: "0.65rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, textAlign: "right" as const }}
        />
      </div>
    </div>
  );
}

export default function OwnerRewardsTab() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const effectiveRanks = getEffectiveRanks();

  return (
    <div>
      <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>REWARDS & XP CONFIG</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* XP Values */}
        <Section title="XP VALUES" onReset={() => { clearSystem("xp"); refresh(); }}>
          {numField("Focus per min", "xp", "focusMin", XP_VALUES.focusMin, refresh)}
          {numField("Tree", "xp", "tree", XP_VALUES.tree, refresh)}
          {numField("Note", "xp", "note", XP_VALUES.note, refresh)}
          {numField("Daily login", "xp", "dailyLogin", XP_VALUES.dailyLogin, refresh)}
          {numField("Journey per min", "xp", "journeyMin", XP_VALUES.journeyMin, refresh)}
          {numField("Daily task done", "xp", "dailyTaskComplete", XP_VALUES.dailyTaskComplete, refresh)}
          {numField("Perfect day", "xp", "perfectDay", XP_VALUES.perfectDay, refresh)}
          {numField("7-day streak", "xp", "streak7", XP_VALUES.streak7, refresh)}
          {numField("30-day streak", "xp", "streak30", XP_VALUES.streak30, refresh)}
          {numField("Weekly warrior", "xp", "weeklyWarrior", XP_VALUES.weeklyWarrior, refresh)}
          {numField("Rank up (gold)", "xp", "rankUp", XP_VALUES.rankUp, refresh)}
          {numField("Inactivity penalty — leaves/day", "xp", "inactivityPenaltyLeaves", XP_VALUES.inactivityPenaltyLeaves, refresh)}
          {numField("Inactivity penalty — XP/day", "xp", "inactivityPenaltyXp", XP_VALUES.inactivityPenaltyXp, refresh)}
        </Section>

        {/* Pomodoro Rewards */}
        <Section title="POMODORO REWARDS" onReset={() => { clearSystem("pomoRewards"); refresh(); }}>
          {numField("Base per min", "pomoRewards", "basePerMin", POMO_REWARDS.basePerMin, refresh)}
          {numField("No-tab bonus %", "pomoRewards", "noTabBonusPct", POMO_REWARDS.noTabBonusPct, refresh)}
          {numField("Subject bonus flat", "pomoRewards", "subjectBonusFlat", POMO_REWARDS.subjectBonusFlat, refresh)}
        </Section>

        {/* Daily Caps */}
        <Section title="DAILY CAPS" onReset={() => { clearSystem("dailyCaps"); refresh(); }}>
          {numField("Tier 1 max min", "dailyCaps", "tier1MaxMin", DAILY_CAPS.tier1MaxMin, refresh)}
          {numField("Tier 2 max min", "dailyCaps", "tier2MaxMin", DAILY_CAPS.tier2MaxMin, refresh)}
          {numField("Tier 3 rate", "dailyCaps", "tier3Rate", DAILY_CAPS.tier3Rate, refresh)}
          {numField("Active min cap", "dailyCaps", "activeMinCap", DAILY_CAPS.activeMinCap, refresh)}
        </Section>

        {/* Streak Tiers */}
        <Section title="STREAK TIERS" onReset={() => { clearSystem("streakTiers"); refresh(); }}>
          {STREAK_XP_TIERS.map((t, i) => {
            const current = getOverride("streakTiers", "tiers", STREAK_XP_TIERS)[i] ?? t;
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid rgba(139,109,46,0.06)" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--color-genshin-bronze)" }}>{t.minDays}d+ → {t.mult}×</span>
                <input
                  type="number"
                  step="0.05"
                  value={current.mult}
                  onChange={(e) => {
                    const tiers = [...STREAK_XP_TIERS];
                    tiers[i] = { ...tiers[i], mult: Number(e.target.value) };
                    setOverride("streakTiers", "tiers", tiers);
                    refresh();
                  }}
                  style={{ width: 56, fontSize: "0.65rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, textAlign: "right" as const }}
                />
              </div>
            );
          })}
        </Section>

        {/* Hardcore Rates */}
        <Section title="HARDCORE MODE" onReset={() => { clearSystem("hardcore"); refresh(); }}>
          {numField("Easy rate", "hardcore", "easyRate", EASY_RATE, refresh)}
          {numField("Medium rate", "hardcore", "mediumRate", MEDIUM_RATE, refresh)}
          {numField("Hardcore base", "hardcore", "baseRate", HARDCORE_BASE_RATE, refresh)}
        </Section>

        {/* Rank Thresholds */}
        <Section title="RANK THRESHOLDS" onReset={() => { clearSystem("ranks"); refresh(); }}>
          {effectiveRanks.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderBottom: "1px solid rgba(139,109,46,0.06)" }}>
              <span style={{ fontSize: "0.62rem", color: r.accent, fontWeight: 600, minWidth: 80 }}>{r.name}</span>
              <input
                type="number"
                value={r.threshold}
                onChange={(e) => {
                  const overrides = getOverride("ranks", "thresholds", {} as Record<string, number>);
                  overrides[r.id] = Number(e.target.value);
                  setOverride("ranks", "thresholds", overrides);
                  refresh();
                }}
                style={{ width: 80, fontSize: "0.65rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, textAlign: "right" as const }}
              />
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, onReset, children }: { title: string; onReset: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h4 style={{ color: "var(--color-genshin-gold)", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{title}</h4>
        <button onClick={onReset} style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}>Reset defaults</button>
      </div>
      {children}
    </div>
  );
}
