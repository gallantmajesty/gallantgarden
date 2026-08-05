import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { rankForLifetime, rankIndex } from "../../lib/ranks";

interface UserRow {
  id: string;
  player_id: string;
  display_name: string;
  xp: number;
  premium_xp: number;
  rank_xp: number;
  created_at: string;
}

const fmt = (n: number) => (n ?? 0).toLocaleString();

export default function OwnerReportsTab() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [reportUser, setReportUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_list_users");
      if (rpcError) throw new Error(rpcError.message);
      setUsers((data as UserRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openReport = async (u: UserRow) => {
    setReportUser(u);
    setDetail(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_get_user", { p_user_id: u.id });
      if (rpcError) throw new Error(rpcError.message);
      setDetail(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load detail");
    }
  };

  const totals = users?.reduce(
    (a, u) => ({ xp: a.xp + u.xp, gold: a.gold + u.premium_xp, rankXp: a.rankXp + u.rank_xp }),
    { xp: 0, gold: 0, rankXp: 0 },
  );
  const top5 = [...(users ?? [])].sort((a, b) => b.rank_xp - a.rank_xp).slice(0, 5);
  const newest = [...(users ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  // Per-user report
  const inventory = Array.isArray(detail?.inventory) ? (detail?.inventory as unknown[]) : [];
  const achievements = (detail?.achievements as Record<string, unknown>) ?? {};
  const achCount = Object.values(achievements).filter((v) => v === true || (typeof v === "object" && v !== null)).length;
  const totalXp = (reportUser?.xp ?? 0) + (reportUser?.premium_xp ?? 0);
  const rank = rankForLifetime(reportUser?.rank_xp ?? 0, reportUser?.xp ?? 0, reportUser?.premium_xp ?? 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>REPORTS & ANALYTICS</h3>
        <button onClick={load} style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(160,60,60,0.15)", border: "1px solid rgba(160,60,60,0.3)", borderRadius: 2, fontSize: "0.62rem", color: "#e08a8a" }}>
          {error}
        </div>
      )}

      {/* Global stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <StatBox label="Total players" value={fmt(users?.length ?? 0)} />
        <StatBox label="Total leaves in game" value={`🍃 ${fmt(totals?.xp ?? 0)}`} />
        <StatBox label="Total gold in game" value={`🌟 ${fmt(totals?.gold ?? 0)}`} />
        <StatBox label="Total rank XP" value={`📈 ${fmt(totals?.rankXp ?? 0)}`} />
        <StatBox label="Avg rank XP / player" value={fmt(users?.length ? (totals?.rankXp ?? 0) / users.length : 0)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: "0.75rem", alignItems: "start" }}>
        {/* Player picker */}
        <div>
          <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.72rem", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>TOP 5 BY RANK XP</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: "1rem" }}>
            {top5.map((u, i) => (
              <button
                key={u.id}
                onClick={() => openReport(u)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.45rem 0.6rem",
                  background: reportUser?.id === u.id ? "rgba(201,168,76,0.12)" : "rgba(26,20,16,0.5)",
                  border: reportUser?.id === u.id ? "1px solid rgba(201,168,76,0.35)" : "1px solid rgba(139,109,46,0.12)",
                  borderRadius: 2, cursor: "pointer", textAlign: "left" as const,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--color-genshin-gold)", width: 14 }}>#{i + 1}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--color-genshin-gold-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.display_name || "—"}
                  </span>
                </div>
                <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>{fmt(u.rank_xp)}</span>
              </button>
            ))}
          </div>

          <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.72rem", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>NEWEST SIGNUPS</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {newest.map((u) => (
              <button
                key={u.id}
                onClick={() => openReport(u)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.45rem 0.6rem",
                  background: "rgba(26,20,16,0.5)", border: "1px solid rgba(139,109,46,0.12)", borderRadius: 2, cursor: "pointer", textAlign: "left" as const,
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "var(--color-genshin-gold-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.display_name || "—"}
                </span>
                <span style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>{new Date(u.created_at).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Report */}
        <div>
          {!reportUser && (
            <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", opacity: 0.6, padding: "2rem", textAlign: "center", border: "1px dashed rgba(139,109,46,0.2)", borderRadius: 4 }}>
              Select a player to generate their personal report.
            </div>
          )}

          {reportUser && (
            <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-genshin-gold)" }}>{reportUser.display_name || "—"}</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>{reportUser.player_id} · joined {new Date(reportUser.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: rank.accent }}>{rank.name}</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>rank {rankIndex(rank.id) + 1} / 19</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <StatBox label="Green leaves" value={`🍃 ${fmt(reportUser.xp)}`} />
                <StatBox label="Golden leaves" value={`🌟 ${fmt(reportUser.premium_xp)}`} />
                <StatBox label="Rank XP" value={`📈 ${fmt(reportUser.rank_xp)}`} />
                <StatBox label="Lifetime total" value={fmt(totalXp)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <div style={{ background: "rgba(26,20,16,0.6)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, padding: "0.5rem" }}>
                  <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", marginBottom: "0.25rem" }}>INVENTORY</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-genshin-gold)" }}>{inventory.length} items</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", opacity: 0.8 }}>
                    by type: <code>{inventory.length ? JSON.stringify((inventory as { type?: string }[]).reduce<Record<string, number>>((a, i) => { a[i.type ?? "other"] = (a[i.type ?? "other"] ?? 0) + 1; return a; }, {})) : "empty"}</code>
                  </div>
                </div>
                <div style={{ background: "rgba(26,20,16,0.6)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, padding: "0.5rem" }}>
                  <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", marginBottom: "0.25rem" }}>ACHIEVEMENTS</div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-genshin-gold)" }}>{achCount} unlocked</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", opacity: 0.8 }}>claimed tiers across all categories</div>
                </div>
              </div>

              <div style={{ fontSize: "0.62rem", color: "var(--color-genshin-gold)", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>PROFILE JSON</div>
              <pre style={{ margin: 0, padding: "0.6rem", background: "#0a0a14", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, fontSize: "0.55rem", lineHeight: 1.5, color: "var(--color-genshin-bronze)", overflowX: "auto", maxHeight: 200, overflowY: "auto" }}>
                {detail ? JSON.stringify(detail, null, 2) : "Loading…"}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "rgba(26,20,16,0.6)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, padding: "0.6rem" }}>
      <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", marginBottom: "0.15rem" }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-genshin-gold)" }}>{value}</div>
    </div>
  );
}
