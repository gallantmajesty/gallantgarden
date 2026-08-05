import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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

export default function OwnerUsersTab() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_list_users");
      if (rpcError) throw new Error(rpcError.message);
      setUsers((data as UserRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openUser = async (u: UserRow) => {
    setSelected(u);
    setDetail(null);
    setConfirmDelete(false);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_get_user", { p_user_id: u.id });
      if (rpcError) throw new Error(rpcError.message);
      setDetail(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user detail");
    }
  };

  const grant = async (amount: number, which: "xp" | "premium_xp" | "rank_xp") => {
    if (!selected || !amount) return;
    setBusy(which);
    try {
      const { error: rpcError } = await supabase.rpc("admin_grant_wallets", {
        p_user_id: selected.id,
        p_xp: which === "xp" ? amount : 0,
        p_premium_xp: which === "premium_xp" ? amount : 0,
        p_rank_xp: which === "rank_xp" ? amount : 0,
      });
      if (rpcError) throw new Error(rpcError.message);
      await loadUsers();
      await openUser(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grant failed");
    } finally {
      setBusy(null);
    }
  };

  const removeUser = async () => {
    if (!selected) return;
    setBusy("delete");
    try {
      const { error: rpcError } = await supabase.rpc("admin_delete_user", { p_user_id: selected.id });
      if (rpcError) throw new Error(rpcError.message);
      setSelected(null);
      setDetail(null);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  const filtered = (users ?? []).filter(
    (u) =>
      u.display_name.toLowerCase().includes(query.toLowerCase()) ||
      u.player_id.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>
          PLAYER HQ {users && `(${users.length})`}
        </h3>
        <button
          onClick={loadUsers}
          style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(160,60,60,0.15)", border: "1px solid rgba(160,60,60,0.3)", borderRadius: 2, fontSize: "0.62rem", color: "#e08a8a" }}>
          {error}
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or player id…"
        style={{ width: "100%", marginBottom: "0.75rem", padding: "0.45rem 0.6rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, fontSize: "0.7rem", outline: "none" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) 1fr", gap: "0.75rem", alignItems: "start" }}>
        {/* ── User list ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", opacity: 0.6, padding: "1.5rem", textAlign: "center" }}>
              {loading ? "Loading users…" : users === null ? "Run the admin migration to enable this tab." : "No users found."}
            </div>
          )}
          {filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => openUser(u)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.6rem",
                background: selected?.id === u.id ? "rgba(201,168,76,0.12)" : "rgba(26,20,16,0.5)",
                border: selected?.id === u.id ? "1px solid rgba(201,168,76,0.35)" : "1px solid rgba(139,109,46,0.12)",
                borderRadius: 2,
                cursor: "pointer",
                textAlign: "left" as const,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-genshin-gold-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.display_name || "—"}
                </div>
                <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", opacity: 0.7 }}>{u.player_id}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "0.62rem", color: "var(--color-genshin-gold)" }}>🍃 {fmt(u.xp)}</div>
                <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>{fmt(u.rank_xp)} rank XP</div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Selected user HQ ── */}
        <div>
          {!selected && (
            <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", opacity: 0.6, padding: "2rem", textAlign: "center", border: "1px dashed rgba(139,109,46,0.2)", borderRadius: 4 }}>
              Select a player to view their HQ: inspect data, grant leaves / gold / rank XP, edit inventory & achievements, or remove the account.
            </div>
          )}

          {selected && (
            <div style={{ background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "0.9rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-genshin-gold)" }}>{selected.display_name || "—"}</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)" }}>{selected.player_id}</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", opacity: 0.7 }}>
                    joined {new Date(selected.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy === "delete"}
                  style={{ fontSize: "0.6rem", color: "#e08a8a", background: "rgba(160,60,60,0.15)", border: "1px solid rgba(160,60,60,0.35)", borderRadius: 2, padding: "0.3rem 0.6rem", cursor: "pointer" }}
                >
                  {busy === "delete" ? "Deleting…" : "🗑 Remove account"}
                </button>
              </div>

              {confirmDelete && (
                <div style={{ marginBottom: "0.75rem", padding: "0.6rem 0.75rem", background: "rgba(160,60,60,0.12)", border: "1px solid rgba(160,60,60,0.4)", borderRadius: 2, fontSize: "0.65rem", color: "#e08a8a" }}>
                  <div style={{ marginBottom: "0.5rem" }}>Permanently delete this account (auth + profile + all data)? This cannot be undone.</div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={removeUser} disabled={busy === "delete"} style={{ fontSize: "0.62rem", color: "#fff", background: "rgba(160,60,60,0.7)", border: "none", borderRadius: 2, padding: "0.3rem 0.8rem", cursor: "pointer" }}>Yes, delete</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "1px solid rgba(139,109,46,0.3)", borderRadius: 2, padding: "0.3rem 0.8rem", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Wallets */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <WalletBox label="Green leaves" icon="🍃" value={selected.xp} accent="var(--color-genshin-gold)" onGrant={(n) => grant(n, "xp")} busy={busy === "xp"} />
                <WalletBox label="Golden leaves" icon="🌟" value={selected.premium_xp} accent="#c9a44a" onGrant={(n) => grant(n, "premium_xp")} busy={busy === "premium_xp"} />
                <WalletBox label="Rank XP" icon="📈" value={selected.rank_xp} accent="#8ab4f8" onGrant={(n) => grant(n, "rank_xp")} busy={busy === "rank_xp"} />
              </div>

              {/* Raw profile JSON */}
              <div style={{ fontSize: "0.68rem", color: "var(--color-genshin-gold)", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>PROFILE DATA</div>
              <pre style={{ margin: 0, marginBottom: "0.5rem", padding: "0.6rem", background: "#0a0a14", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, fontSize: "0.55rem", lineHeight: 1.5, color: "var(--color-genshin-bronze)", overflowX: "auto", maxHeight: 220, overflowY: "auto" }}>
                {detail ? JSON.stringify(detail, null, 2) : "Loading…"}
              </pre>

              <div style={{ fontSize: "0.58rem", color: "var(--color-genshin-bronze)", opacity: 0.7, marginBottom: "0.4rem" }}>
                💡 Tip: to grant shop items or achievements, edit the <code>inventory</code> / <code>achievements</code> JSON above via the Data Manager (it edits per-key data on this device) — server-side per-user JSON editing is read-only for now.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WalletBox({ label, icon, value, accent, onGrant, busy }: {
  label: string;
  icon: string;
  value: number;
  accent: string;
  onGrant: (n: number) => void;
  busy: boolean;
}) {
  const [amt, setAmt] = useState("1000");
  return (
    <div style={{ background: "rgba(26,20,16,0.6)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2, padding: "0.6rem" }}>
      <div style={{ fontSize: "0.58rem", color: "var(--color-genshin-bronze)" }}>{icon} {label}</div>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: accent, margin: "0.15rem 0 0.4rem" }}>{fmt(value)}</div>
      <div style={{ display: "flex", gap: "0.3rem" }}>
        <input
          type="number"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          style={{ flex: 1, width: 50, fontSize: "0.6rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, textAlign: "right" as const }}
        />
        <button
          onClick={() => onGrant(Number(amt))}
          disabled={busy || !amt}
          style={{ fontSize: "0.6rem", color: "#0a0a14", background: accent, border: "none", borderRadius: 2, padding: "0.2rem 0.55rem", cursor: "pointer", fontWeight: 600 }}
        >
          {busy ? "…" : "+ Grant"}
        </button>
      </div>
    </div>
  );
}
