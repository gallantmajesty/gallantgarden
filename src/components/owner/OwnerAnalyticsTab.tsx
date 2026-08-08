import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  fetchOwnerAnalyticsUsers,
  fetchOwnerAnalyticsDaily,
  type AnalyticsUser,
  type AnalyticsDailyPoint,
} from "../../lib/analytics";
import { getCountry } from "../../lib/countries";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";

// ─── Palette (genshin HQ) ────────────────────────────────────────────────────
const GOLD = "#c9a44a";
const BRONZE = "#b78f5a";
const INK = "var(--color-genshin-gold-light)";
const DIVIDER = "rgba(139,109,46,0.12)";
const PALETTE = ["#c9a44a", "#a855f7", "#4a90d9", "#6fe0a0", "#e08a8a", "#d97b3d", "#7ab8c9", "#8a7a3a", "#d9c26a", "#b06ab8"];

const fmt = (n: number) => (n ?? 0).toLocaleString();

/** Normalize any stored country value (code or name) to a Country or null. */
function resolveCountry(raw: string | null): { code: string; name: string; emoji: string } | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  const byCode = getCountry(code);
  if (byCode) return byCode;
  const byName = getCountry(code); // name lookup fallback (some legacy rows)
  if (byName && byName.name.toUpperCase() === code) return byName;
  return null;
}

const countryLabel = (raw: string | null) => resolveCountry(raw)?.name ?? (raw || "Unknown");

function bucketAge(age: number | null): string {
  if (age == null) return "Unknown";
  if (age < 10) return "Under 10";
  if (age <= 12) return "10–12";
  if (age <= 14) return "13–14";
  if (age <= 16) return "15–16";
  if (age <= 18) return "17–18";
  return "18+";
}

// ─── Small building blocks ───────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid ${DIVIDER}`, borderRadius: 4, padding: "1rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: accent || GOLD, fontFamily: "var(--font-mono-display)", letterSpacing: "0.04em" }}>{value}</div>
      <div style={{ fontSize: "0.58rem", color: BRONZE, letterSpacing: "0.06em", marginTop: "0.2rem", textTransform: "uppercase" }}>{label}</div>
      {sub && <div style={{ fontSize: "0.58rem", color: BRONZE, opacity: 0.7, marginTop: "0.15rem" }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(26,20,16,0.5)", border: `1px solid ${DIVIDER}`, borderRadius: 4, padding: "1rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", color: GOLD, marginBottom: "0.15rem" }}>{title}</div>
      {subtitle && <div style={{ fontSize: "0.6rem", color: BRONZE, marginBottom: "0.6rem" }}>{subtitle}</div>}
      {children}
    </div>
  );
}

const tooltipStyle = {
  background: "#17120c",
  border: `1px solid ${DIVIDER}`,
  borderRadius: 4,
  fontSize: "0.65rem",
  color: "#e8d9a8",
};

// ─── Main tab ────────────────────────────────────────────────────────────────
export default function OwnerAnalyticsTab() {
  const [users, setUsers] = useState<AnalyticsUser[] | null>(null);
  const [daily, setDaily] = useState<AnalyticsDailyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"rank_xp" | "created_at" | "ads_viewed">("rank_xp");
  const [sortAsc, setSortAsc] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailUser, setDetailUser] = useState<AnalyticsUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [u, d] = await Promise.all([fetchOwnerAnalyticsUsers(), fetchOwnerAnalyticsDaily(30)]);
      setUsers(u);
      setDaily(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (u: AnalyticsUser) => {
    setDetailUser(u);
    setDetail(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_get_user", { p_user_id: u.id });
      if (rpcError) throw new Error(rpcError.message);
      setDetail(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load player detail");
    }
  };

  // ─── Derived chart data ──────────────────────────────────────────────────
  const data = useMemo(() => users ?? [], [users]);

  const countries = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of data) {
      const c = resolveCountry(u.country);
      const key = c ? c.name : "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const rows = [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const top = rows.slice(0, 12);
    const rest = rows.slice(12).reduce((a, r) => a + r.count, 0);
    return rest > 0 ? [...top, { name: `Other (${rows.length - 12})`, count: rest }] : top;
  }, [data]);

  const ages = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of data) {
      const b = bucketAge(u.age);
      map.set(b, (map.get(b) ?? 0) + 1);
    }
    const order = ["Under 10", "10–12", "13–14", "15–16", "17–18", "18+", "Unknown"];
    return order.filter((k) => map.has(k)).map((name) => ({ name, count: map.get(name)! }));
  }, [data]);

  const goals = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of data) {
      for (const g of u.study_goals ?? []) {
        if (!g) continue;
        map.set(g, (map.get(g) ?? 0) + 1);
      }
    }
    const rows = [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const top = rows.slice(0, 8);
    const rest = rows.slice(8).reduce((a, r) => a + r.count, 0);
    return rest > 0 ? [...top, { name: `Other (${rows.length - 8})`, count: rest }] : top;
  }, [data]);

  const referrals = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of data) {
      const r = u.referral?.trim();
      if (!r) continue;
      const key = r.toLowerCase() === "other" && u.referral_other ? `Other: ${u.referral_other}` : r;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const rows = [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const top = rows.slice(0, 8);
    const rest = rows.slice(8).reduce((a, r) => a + r.count, 0);
    return rest > 0 ? [...top, { name: `Other (${rows.length - 8})`, count: rest }] : top;
  }, [data]);

  const paySplit = useMemo(() => {
    const paid = data.filter((u) => u.paid).length;
    return [
      { name: "Paid", count: paid },
      { name: "Free", count: data.length - paid },
    ];
  }, [data]);

  const totals = useMemo(
    () => data.reduce(
      (a, u) => ({
        xp: a.xp + (u.xp ?? 0) + (u.premium_xp ?? 0),
        ads: a.ads + (u.ads_viewed ?? 0),
        lastSeen: u.last_seen_at ? Math.max(a.lastSeen, Date.parse(u.last_seen_at)) : a.lastSeen,
      }),
      { xp: 0, ads: 0, lastSeen: 0 },
    ),
    [data],
  );

  const recentCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    return data.filter((u) => u.last_seen_at && Date.parse(u.last_seen_at) >= cutoff).length;
  }, [data]);

  const lastPoint = daily[daily.length - 1];
  const active7d = daily.slice(-7).reduce((a, p) => a + (p.active_users ?? 0), 0);

  // ─── Per-user table ─────────────────────────────────────────────────────
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = data.filter((u) => {
      if (!needle) return true;
      return (
        (u.display_name ?? "").toLowerCase().includes(needle) ||
        (u.player_id ?? "").toLowerCase().includes(needle) ||
        (u.country ?? "").toLowerCase().includes(needle)
      );
    });
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
  }, [data, query, sortKey, sortAsc]);

  const setSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortArrow = (key: typeof sortKey) => (sortKey === key ? (sortAsc ? " ↑" : " ↓") : "");

  const detailInventory = Array.isArray(detail?.inventory) ? (detail?.inventory as unknown[]) : [];
  const detailAch = (detail?.achievements as Record<string, unknown>) ?? {};
  const detailAchCount = Object.values(detailAch).filter((v) => v === true || (typeof v === "object" && v !== null)).length;

  if (users === null && !error) {
    return <div style={{ color: BRONZE, fontSize: "0.7rem", padding: "2rem" }}>Loading analytics…</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ color: GOLD, fontSize: "0.85rem", letterSpacing: "0.05em" }}>OWNER ANALYTICS</h3>
        <button onClick={load} style={{ fontSize: "0.62rem", color: BRONZE, background: "transparent", border: "none", cursor: "pointer" }}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(160,60,60,0.15)", border: "1px solid rgba(160,60,60,0.3)", borderRadius: 2, fontSize: "0.62rem", color: "#e08a8a" }}>
          {error}
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <StatCard label="Total users" value={fmt(data.length)} sub={`${fmt(recentCount)} active (7d)`} />
        <StatCard label="Active today" value={fmt(lastPoint?.active_users ?? 0)} sub={daily.length ? `of ${fmt(active7d)} user-days (7d)` : "no activity yet"} />
        <StatCard label="Paid users" value={fmt(paySplit[0].count)} sub={`${data.length ? Math.round((paySplit[0].count / data.length) * 100) : 0}% of users`} accent="#6fe0a0" />
        <StatCard label="Ads viewed" value={fmt(totals.ads)} sub="lifetime (0 until ads ship)" />
        <StatCard label="Total XP minted" value={`🍃 ${fmt(totals.xp)}`} />
      </div>

      {/* Charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <ChartCard title="🌍 PLAYERS BY COUNTRY" subtitle="Where your users are — top 12 + other">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={countries} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={DIVIDER} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: INK }} interval={0} angle={-30} textAnchor="end" height={52} />
              <YAxis tick={{ fontSize: 9, fill: INK }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(201,168,76,0.06)" }} />
              <Bar dataKey="count" name="Users" fill={GOLD} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🎂 AGE GROUPS" subtitle="Bucket of onboarding age">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ages} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={DIVIDER} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: INK }} interval={0} angle={-25} textAnchor="end" height={52} />
              <YAxis tick={{ fontSize: 9, fill: INK }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(201,168,76,0.06)" }} />
              <Bar dataKey="count" name="Users" fill="#a855f7" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🎯 STUDY GOALS" subtitle="Top goals picked during onboarding">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={goals} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={DIVIDER} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: INK }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 9, fill: INK }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(201,168,76,0.06)" }} />
              <Bar dataKey="count" name="Users" fill="#4a90d9" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📣 REFERRAL SOURCE" subtitle="How users found the game">
          {referrals.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={referrals} dataKey="count" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {referrals.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ fontSize: "0.65rem", color: BRONZE, opacity: 0.6, textAlign: "center", padding: "3rem 0" }}>
              No referral data yet — users haven't finished onboarding.
            </div>
          )}
          {referrals.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem 0.7rem", justifyContent: "center", marginTop: "0.4rem" }}>
              {referrals.map((r, i) => (
                <span key={r.name} style={{ fontSize: "0.58rem", color: BRONZE }}>
                  <span style={{ color: PALETTE[i % PALETTE.length] }}>●</span> {r.name} ({r.count})
                </span>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="💰 PAID VS FREE" subtitle="premium_xp > 0 = bought golden leaves">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paySplit} dataKey="count" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  <Cell fill="#6fe0a0" />
                  <Cell fill="#5a5448" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ fontSize: "0.65rem", color: BRONZE, opacity: 0.6, textAlign: "center", padding: "3rem 0" }}>No users yet.</div>
          )}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "0.4rem" }}>
            <span style={{ fontSize: "0.58rem", color: BRONZE }}><span style={{ color: "#6fe0a0" }}>●</span> Paid {fmt(paySplit[0].count)}</span>
            <span style={{ fontSize: "0.58rem", color: BRONZE }}><span style={{ color: "#5a5448" }}>●</span> Free {fmt(paySplit[1].count)}</span>
          </div>
        </ChartCard>

        <ChartCard title="📈 DAILY ACTIVE USERS — LAST 30 DAYS" subtitle="Ledger starts today; earlier days read 0 until activity accumulates">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={daily} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={DIVIDER} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: INK }} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tick={{ fontSize: 9, fill: INK }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="active_users" name="Active users" stroke={GOLD} fill={GOLD} fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Per-user roster */}
      <ChartCard title="👥 USER ROSTER" subtitle="Search by name / player id / country — click a row for the deep-dive report">
        <input
          className="genshin-input"
          placeholder="Search users…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", fontSize: "0.72rem", marginBottom: "0.6rem" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 420, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 60px 70px 70px 80px 90px", gap: "0.4rem", padding: "0.35rem 0.6rem", fontSize: "0.55rem", color: BRONZE, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: `1px solid ${DIVIDER}` }}>
            <button onClick={() => setSort("rank_xp")} style={headBtn}>Player{sortArrow("rank_xp")}</button>
            <button onClick={() => setSort("rank_xp")} style={headBtn}>Rank XP{sortArrow("rank_xp")}</button>
            <span>Age</span>
            <span>Country</span>
            <span>Paid</span>
            <span>Ads</span>
            <button onClick={() => setSort("created_at")} style={headBtn}>Joined{sortArrow("created_at")}</button>
          </div>
          {rows.map((u) => (
            <button
              key={u.id}
              onClick={() => openDetail(u)}
              style={{
                display: "grid", gridTemplateColumns: "1fr 90px 60px 70px 70px 80px 90px", gap: "0.4rem", alignItems: "center",
                padding: "0.4rem 0.6rem", textAlign: "left" as const, cursor: "pointer", borderRadius: 2,
                background: detailUser?.id === u.id ? "rgba(201,168,76,0.12)" : "rgba(26,20,16,0.4)",
                border: detailUser?.id === u.id ? "1px solid rgba(201,168,76,0.35)" : `1px solid ${DIVIDER}`,
              }}
            >
              <span style={{ fontSize: "0.68rem", color: "var(--color-genshin-gold-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.display_name || "—"}
              </span>
              <span style={{ fontSize: "0.62rem", color: GOLD, fontFamily: "var(--font-mono-display)" }}>{fmt(u.rank_xp ?? 0)}</span>
              <span style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)" }}>{u.age ?? "—"}</span>
              <span style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {resolveCountry(u.country)?.emoji ?? ""} {countryLabel(u.country)}
              </span>
              <span style={{ fontSize: "0.62rem", color: u.paid ? "#6fe0a0" : "var(--color-genshin-bronze)" }}>{u.paid ? "✅" : "—"}</span>
              <span style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)" }}>{fmt(u.ads_viewed ?? 0)}</span>
              <span style={{ fontSize: "0.58rem", color: "var(--color-genshin-bronze)" }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
              </span>
            </button>
          ))}
          {rows.length === 0 && (
            <div style={{ fontSize: "0.65rem", color: BRONZE, opacity: 0.6, textAlign: "center", padding: "2rem" }}>
              {data.length === 0 ? "No users yet." : "No users match your search."}
            </div>
          )}
        </div>
      </ChartCard>

      {/* Deep-dive report */}
      {detailUser && (
        <div style={{ background: "rgba(26,20,16,0.6)", border: `1px solid ${DIVIDER}`, borderRadius: 4, padding: "1rem", marginTop: "1rem" }}>
          <h4 style={{ color: GOLD, fontSize: "0.75rem", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>
            🔍 {detailUser.display_name || detailUser.player_id || "Player"} — deep dive
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.4rem", fontSize: "0.68rem", color: "var(--color-genshin-bronze)" }}>
            <div>ID: <code style={{ color: GOLD }}>{detailUser.id}</code></div>
            <div>Player ID: <code style={{ color: GOLD }}>{detailUser.player_id || "—"}</code></div>
            <div>Country: {countryLabel(detailUser.country)}</div>
            <div>Age: {detailUser.age ?? "—"}</div>
            <div>Goals: {(detailUser.study_goals ?? []).join(", ") || "—"}</div>
            <div>Referral: {detailUser.referral || "—"}{detailUser.referral_other ? ` (${detailUser.referral_other})` : ""}</div>
            <div>Paid: {detailUser.paid ? "✅" : "—"}</div>
            <div>Ads viewed: {fmt(detailUser.ads_viewed ?? 0)}</div>
            <div>XP: {fmt(detailUser.xp ?? 0)}</div>
            <div>Premium XP: {fmt(detailUser.premium_xp ?? 0)}</div>
            <div>Rank XP: {fmt(detailUser.rank_xp ?? 0)}</div>
            <div>Joined: {detailUser.created_at ? new Date(detailUser.created_at).toLocaleString() : "—"}</div>
            <div>Last seen: {detailUser.last_seen_at ? new Date(detailUser.last_seen_at).toLocaleString() : "never"}</div>
            {detail && (
              <>
                <div>Inventory: {detailInventory.length} items</div>
                <div>Achievements: {detailAchCount} unlocked</div>
              </>
            )}
          </div>
          {detail ? (
            <pre style={{ marginTop: "0.6rem", maxHeight: 220, overflow: "auto", fontSize: "0.58rem", color: "var(--color-genshin-bronze)", background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: 2 }}>
              {JSON.stringify(detail, null, 2)}
            </pre>
          ) : (
            <div style={{ fontSize: "0.6rem", color: BRONZE, opacity: 0.6, marginTop: "0.5rem" }}>Loading deep-dive report…</div>
          )}
        </div>
      )}
    </div>
  );
}

const headBtn: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  fontSize: "0.55rem", color: BRONZE, letterSpacing: "0.05em", textTransform: "uppercase",
  textAlign: "left",
};
