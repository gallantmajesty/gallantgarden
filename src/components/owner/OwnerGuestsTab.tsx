import { useState, useEffect, useCallback } from "react";

/**
 * Guest Account Manager.
 *
 * Guests are purely local: an active session (`sf.guest`), a base id
 * (`sf.guestId`), a per-guest profile (`sf.guest.profile.v1.<id>`) and, once
 * Task Magnet runs, per-guest magnet state (`sf.magnet.v1.<id>`). Nothing is
 * ever written to the cloud for guests, so "removing a guest account" means
 * deleting those local keys — this tab lists every guest found on this device
 * and lets the owner choose what to purge (nothing is removed without an
 * explicit click + confirm).
 */

interface GuestKey {
  key: string;
  bytes: number;
  kind: "profile" | "magnet" | "session" | "id";
}

interface GuestEntry {
  id: string;
  displayName: string;
  playerId: string;
  xp: number;
  premiumXp: number;
  rankXp: number;
  onboarded: boolean;
  active: boolean;
  keys: GuestKey[];
}

const PROFILE_PREFIX = "sf.guest.profile.v1.";
const MAGNET_PREFIX = "sf.magnet.v1.";

function isGuestId(id: string): boolean {
  return id.startsWith("guest_");
}

function bytesOf(raw: string): number {
  try {
    return new Blob([raw]).size;
  } catch {
    return raw ? raw.length : 0;
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

interface GuestProfile {
  playerId?: number | null;
  displayName?: string;
  xp?: number;
  premiumXp?: number;
  rankXp?: number;
  onboarded?: boolean;
  data?: { completed?: boolean };
}

function scanAllKeys(): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    const raw = localStorage.getItem(k);
    if (raw != null) out.push([k, raw]);
  }
  return out;
}

function buildEntries(activeGuestId: string | null): GuestEntry[] {
  const byId = new Map<string, GuestEntry>();

  const ensure = (id: string): GuestEntry => {
    let e = byId.get(id);
    if (!e) {
      e = { id, displayName: "", playerId: "", xp: 0, premiumXp: 0, rankXp: 0, onboarded: false, active: false, keys: [] };
      byId.set(id, e);
    }
    return e;
  };

  for (const [key, raw] of scanAllKeys()) {
    if (key === "sf.guest") {
      const session = readJson<{ id?: string; isGuest?: boolean }>(key);
      const sid = session?.id ?? "unknown";
      if (!session?.isGuest || !sid) continue;
      const e = ensure(sid);
      e.active = true;
      e.keys.push({ key, bytes: bytesOf(raw), kind: "session" });
      continue;
    }
    if (key === "sf.guestId") {
      const base = raw.replace(/^"|"$/g, "");
      if (!isGuestId(base)) continue;
      // The session key belongs to networkId (base:deviceToken); just track the
      // base id key itself as a session-kind key on the first matching guest.
      const owner = Array.from(byId.values()).find((g) => g.id.startsWith(base)) ?? base;
      if (typeof owner === "string") {
        ensure(owner).keys.push({ key, bytes: bytesOf(raw), kind: "id" });
      } else {
        owner.keys.push({ key, bytes: bytesOf(raw), kind: "id" });
      }
      continue;
    }
    if (key.startsWith(PROFILE_PREFIX)) {
      const id = key.slice(PROFILE_PREFIX.length);
      if (!isGuestId(id)) continue;
      const prof = readJson<GuestProfile>(key);
      const e = ensure(id);
      e.displayName = prof?.displayName || e.displayName;
      e.playerId = String(prof?.playerId ?? "") || e.playerId;
      e.xp = prof?.xp ?? e.xp;
      e.premiumXp = prof?.premiumXp ?? e.premiumXp;
      e.rankXp = prof?.rankXp ?? e.rankXp;
      e.onboarded = (prof?.onboarded ?? !!prof?.data?.completed) || e.onboarded;
      e.keys.push({ key, bytes: bytesOf(raw), kind: "profile" });
      continue;
    }
    if (key.startsWith(MAGNET_PREFIX)) {
      const id = key.slice(MAGNET_PREFIX.length);
      if (!isGuestId(id)) continue;
      const e = ensure(id);
      e.keys.push({ key, bytes: bytesOf(raw), kind: "magnet" });
    }
  }

  const list = Array.from(byId.values());
  const active = list.find((g) => g.active);
  if (activeGuestId && active) {
    active.id = activeGuestId;
  }
  return list;
}

const fmtBytes = (n: number) =>
  n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;

export default function OwnerGuestsTab() {
  const [entries, setEntries] = useState<GuestEntry[]>(() =>
    buildEntries(readJson<{ id?: string }>("sf.guest")?.id ?? null),
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [removed, setRemoved] = useState<string>("");

  const rescan = useCallback(() => {
    setExpanded(null);
    setConfirmAll(false);
    setEntries(buildEntries(readJson<{ id?: string }>("sf.guest")?.id ?? null));
  }, []);

  useEffect(() => {
    const flash = removed ? setTimeout(() => setRemoved(""), 4000) : null;
    return () => {
      if (flash) clearTimeout(flash);
    };
  }, [removed]);

  const forgetGuest = (id: string) => {
    const guest = entries.find((g) => g.id === id);
    if (!guest) return;
    if (!confirm(`Delete this guest account?\n\n${guest.id}\n\nThis removes its profile, magnet data and session from this device. The owner (you) keeps choosing what gets removed — nothing is deleted silently.`)) {
      return;
    }
    let count = 0;
    for (const k of guest.keys) {
      localStorage.removeItem(k.key);
      count++;
    }
    if (guest.active) {
      localStorage.removeItem("sf.guest");
      localStorage.removeItem("sf.guestId");
    }
    setRemoved(`Removed guest ${guest.id} (${count} key${count === 1 ? "" : "s"}).`);
    rescan();
  };

  const clearActiveSession = () => {
    const active = entries.find((g) => g.active);
    if (!active) return;
    if (!confirm(`Sign out this device's active guest session?\n\n${active.id}\n\nThe profile data stays on this device — the device just stops restoring it automatically.`)) {
      return;
    }
    localStorage.removeItem("sf.guest");
    localStorage.removeItem("sf.guestId");
    setRemoved("Active guest session cleared — the device will ask for a real login next reload.");
    rescan();
  };

  const removeAll = () => {
    if (!confirm("Delete ALL guest data on this device?\n\nThis removes every guest profile, magnet state and the active guest session. Real (signed-in) accounts are untouched.")) {
      return;
    }
    let count = 0;
    localStorage.removeItem("sf.guest");
    localStorage.removeItem("sf.guestId");
    for (const [key] of scanAllKeys()) {
      if (key.startsWith(PROFILE_PREFIX) || key.startsWith(MAGNET_PREFIX)) {
        const id = key.slice(key.startsWith(PROFILE_PREFIX) ? PROFILE_PREFIX.length : MAGNET_PREFIX.length);
        if (isGuestId(id)) {
          localStorage.removeItem(key);
          count++;
        }
      }
    }
    setRemoved(`Removed all guest data (${count} key${count === 1 ? "" : "s"}) — signed-in accounts are untouched.`);
    rescan();
  };

  const totalBytes = entries.reduce((a, g) => a + g.keys.reduce((x, k) => x + k.bytes, 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>
          GUEST ACCOUNTS {entries.length > 0 && `(${entries.length})`}
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.58rem", color: "var(--color-genshin-bronze)", opacity: 0.7 }}>
            {fmtBytes(totalBytes)} on this device
          </span>
          <button
            onClick={rescan}
            style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            ↻ Rescan
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(26,20,16,0.5)", border: "1px solid var(--color-genshin-divider)", borderRadius: 2, fontSize: "0.62rem", color: "var(--color-genshin-bronze)", lineHeight: 1.6 }}>
        Guests exist <strong style={{ color: "var(--color-genshin-gold)" }}>only on this device</strong> (localStorage) — they never touch the cloud, so this manager only sees guests on this browser. Select what to remove below; nothing is deleted without your confirm.
      </div>

      {removed && (
        <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 2, fontSize: "0.62rem", color: "var(--color-genshin-gold)" }}>
          ✓ {removed}
        </div>
      )}

      {entries.length === 0 && (
        <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", opacity: 0.6, padding: "2rem", textAlign: "center", border: "1px dashed rgba(139,109,46,0.2)", borderRadius: 4 }}>
          No guest accounts found on this device.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entries.map((g) => (
          <div key={g.id} style={{ background: g.active ? "rgba(201,168,76,0.07)" : "rgba(26,20,16,0.5)", border: g.active ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(139,109,46,0.12)", borderRadius: 4, padding: "0.65rem 0.8rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.05rem" }}>{g.active ? "👻" : "💾"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.74rem", fontWeight: 600, color: g.active ? "var(--color-genshin-gold)" : "var(--color-genshin-gold-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.displayName || "Explorer"}
                  {g.active && <span style={{ marginLeft: "0.4rem", fontSize: "0.55rem", padding: "0.1rem 0.35rem", borderRadius: 2, background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.3)", letterSpacing: "0.05em" }}>ACTIVE</span>}
                </div>
                <div style={{ fontSize: "0.54rem", color: "var(--color-genshin-bronze)", opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.id} · {g.playerId ? `PID ${g.playerId}` : "no player id"} · {g.onboarded ? "onboarded" : "not onboarded"} · {g.keys.length} key{g.keys.length === 1 ? "" : "s"}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "0.62rem", color: "var(--color-genshin-gold)" }}>🍃 {g.xp.toLocaleString()}</div>
                <div style={{ fontSize: "0.52rem", color: "var(--color-genshin-bronze)" }}>{fmtBytes(g.keys.reduce((a, k) => a + k.bytes, 0))}</div>
              </div>
              <button
                onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "1px solid rgba(139,109,46,0.25)", borderRadius: 2, padding: "0.2rem 0.45rem", cursor: "pointer" }}
              >
                {expanded === g.id ? "Hide" : "Keys"}
              </button>
              <button
                onClick={() => forgetGuest(g.id)}
                style={{ fontSize: "0.6rem", color: "#e08a8a", background: "rgba(160,60,60,0.12)", border: "1px solid rgba(160,60,60,0.35)", borderRadius: 2, padding: "0.2rem 0.5rem", cursor: "pointer" }}
              >
                🗑 Delete
              </button>
            </div>

            {expanded === g.id && (
              <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.6rem", background: "#0a0a14", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 2 }}>
                <div style={{ fontSize: "0.56rem", color: "var(--color-genshin-bronze)", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>STORAGE KEYS FOR THIS GUEST</div>
                {g.keys.map((k) => (
                  <div key={k.key} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", padding: "0.25rem 0", borderBottom: "1px solid rgba(139,109,46,0.07)", fontSize: "0.56rem" }}>
                    <code style={{ color: "var(--color-genshin-gold)", fontSize: "0.55rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.key}</code>
                    <span style={{ color: "var(--color-genshin-bronze)", flexShrink: 0 }}>
                      {k.kind} · {fmtBytes(k.bytes)}
                      <button
                        onClick={() => { localStorage.removeItem(k.key); setRemoved(`Removed key ${k.key}.`); rescan(); }}
                        style={{ marginLeft: "0.5rem", fontSize: "0.55rem", color: "#e08a8a", background: "transparent", border: "none", cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {entries.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
          {entries.some((g) => g.active) && (
            <button
              onClick={clearActiveSession}
              style={{ fontSize: "0.62rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "1px solid rgba(139,109,46,0.3)", borderRadius: 2, padding: "0.35rem 0.7rem", cursor: "pointer" }}
            >
              Sign out active guest session
            </button>
          )}
          {!confirmAll ? (
            <button
              onClick={() => setConfirmAll(true)}
              style={{ fontSize: "0.62rem", color: "#e08a8a", background: "rgba(160,60,60,0.15)", border: "1px solid rgba(160,60,60,0.4)", borderRadius: 2, padding: "0.35rem 0.7rem", cursor: "pointer" }}
            >
              🗑 Delete ALL guest data on this device…
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.7rem", background: "rgba(160,60,60,0.12)", border: "1px solid rgba(160,60,60,0.4)", borderRadius: 2, fontSize: "0.62rem", color: "#e08a8a" }}>
              <span>Really delete every guest profile here?</span>
              <button onClick={removeAll} style={{ fontSize: "0.6rem", color: "#fff", background: "rgba(160,60,60,0.8)", border: "none", borderRadius: 2, padding: "0.25rem 0.6rem", cursor: "pointer" }}>Yes, delete all</button>
              <button onClick={() => setConfirmAll(false)} style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "1px solid rgba(139,109,46,0.3)", borderRadius: 2, padding: "0.25rem 0.6rem", cursor: "pointer" }}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}