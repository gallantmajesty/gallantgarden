import { useState, useRef, useCallback } from "react";

const LS_PREFIXES = ["sf.", "sg.", "lavapad-"] as const;

const KNOWN_GROUPS: Record<string, string[]> = {
  "XP & Streaks": ["sf.xp.daily", "sf.score.history"],
  Achievements: ["sf.achievements.v1"],
  Avatar: ["sf.avatar.v2", "sf.character.v1"],
  Shop: ["sf.shop.inventory"],
  Pomodoro: ["sg.pomo.focusMode", "sg.pomo.presets", "sg.pomo.history", "sg.pomo.breakDurations", "sg.pomo.activeSession", "sg.pomo.tabata"],
  Settings: ["sg.settings.v2"],
  Themes: ["sg.webtheme.v1", "sg.music.v1", "sg.music.source", "sg.desk.v1"],
  Profiles: ["sg.profilelayout.v1"],
  Hardcore: ["sf.hardcore.v1"],
  Train: ["sf.trainx.v1"],
  Magnets: ["sf.magnet.v1"],
  EventShop: ["sg.events.all", "sg.bundles.all", "sg.events.purchases", "sg.wallet.balance", "sg.inventory.items"],
  Blueprints: ["sf.blueprint.v1"],
  Social: ["sg.spotify.auth", "sg.focus.side-dock", "sg.focus.locker", "sg.focus.astronomical-log"],
  Realm: ["sf.realm.custom.v1"],
  Owner: ["sf.owner.overrides.v1"],
  LavaPad: ["lavapad-player-progress", "lavapad-cosmetics"],
};

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function pretty(val: unknown): string {
  if (typeof val === "string") {
    try {
      return JSON.stringify(JSON.parse(val), null, 2);
    } catch {
      return val;
    }
  }
  return JSON.stringify(val, null, 2);
}

function isLocalStorageKey(key: string): boolean {
  try {
    localStorage.getItem(key);
    return true;
  } catch {
    return false;
  }
}

export default function OwnerDataTab() {
  const [allKeys, setAllKeys] = useState<string[]>(() => scanKeys());
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function scanKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && LS_PREFIXES.some((p) => k.startsWith(p))) keys.push(k);
    }
    return keys.sort();
  }

  function rescan() {
    setAllKeys(scanKeys());
    setEditing({});
    setExpanded(new Set());
  }

  const filtered = filter
    ? allKeys.filter((k) => k.toLowerCase().includes(filter.toLowerCase()))
    : allKeys;

  const grouped = Object.entries(KNOWN_GROUPS).map(([label, keys]) => ({
    label,
    keys: keys.filter((k) => allKeys.includes(k)),
  }));
  const knownSet = new Set(Object.values(KNOWN_GROUPS).flat());
  const unknownKeys = allKeys.filter((k) => !knownSet.has(k));

  function getValue(key: string): string {
    return localStorage.getItem(key) ?? "";
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startEdit(key: string) {
    setEditing((prev) => ({ ...prev, [key]: getValue(key) }));
  }

  function cancelEdit(key: string) {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function saveEdit(key: string) {
    const val = editing[key];
    if (val === undefined) return;
    try {
      JSON.parse(val); // validate JSON
    } catch {
      if (!confirm("Value is not valid JSON. Save as raw string?")) return;
    }
    localStorage.setItem(key, val);
    cancelEdit(key);
    rescan();
  }

  function deleteKey(key: string) {
    localStorage.removeItem(key);
    setConfirmDelete(null);
    rescan();
  }

  function resetKey(key: string) {
    localStorage.removeItem(key);
    cancelEdit(key);
    rescan();
  }

  function exportAll() {
    const data: Record<string, string> = {};
    for (const k of allKeys) data[k] = getValue(k);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studyforest-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        let count = 0;
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === "string" && LS_PREFIXES.some((p) => k.startsWith(p))) {
            localStorage.setItem(k, v);
            count++;
          }
        }
        alert(`Imported ${count} keys`);
        rescan();
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function clearAll() {
    if (!confirm("Delete ALL sf.* and sg.* keys? This cannot be undone.")) return;
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && LS_PREFIXES.some((p) => k.startsWith(p))) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
    rescan();
  }

  const renderKey = (key: string) => {
    const val = getValue(key);
    const isEditing = key in editing;
    const isExpanded = expanded.has(key);
    let parsed: unknown;
    try {
      parsed = JSON.parse(val);
    } catch {
      parsed = val;
    }
    const isObject = typeof parsed === "object" && parsed !== null;
    const preview = isObject ? `{${Object.keys(parsed).length} keys}` : String(parsed).slice(0, 60);

    return (
      <div key={key} style={{ border: "1px solid rgba(139,109,46,0.12)", borderRadius: 4, background: "rgba(26,20,16,0.4)", marginBottom: 4 }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 0.7rem", cursor: "pointer" }}
          onClick={() => !isEditing && toggleExpand(key)}
        >
          <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", width: 12, textAlign: "center" }}>{isExpanded ? "▼" : "▶"}</span>
          <code style={{ flex: 1, fontSize: "0.65rem", color: "var(--color-genshin-gold)", fontFamily: "var(--font-mono-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{key}</code>
          {!isEditing && <span style={{ fontSize: "0.58rem", color: "var(--color-genshin-bronze)", opacity: 0.7, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{preview}</span>}
          {!isEditing && (
            <div style={{ display: "flex", gap: "0.25rem" }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => startEdit(key)} style={btnSm}>Edit</button>
              {confirmDelete === key ? (
                <button onClick={() => deleteKey(key)} style={{ ...btnSm, color: "#e55" }}>Confirm?</button>
              ) : (
                <button onClick={() => setConfirmDelete(key)} style={{ ...btnSm, color: "#c00" }}>Del</button>
              )}
              <button onClick={() => resetKey(key)} style={{ ...btnSm, color: "var(--color-genshin-bronze)" }}>Reset</button>
            </div>
          )}
        </div>
        {isEditing && (
          <div style={{ padding: "0.5rem 0.7rem", borderTop: "1px solid rgba(139,109,46,0.08)" }}>
            <textarea
              value={editing[key]}
              onChange={(e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }))}
              style={{ width: "100%", minHeight: 120, fontFamily: "var(--font-mono-display)", fontSize: "0.62rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, padding: "0.5rem", resize: "vertical" as const }}
              spellCheck={false}
            />
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
              <button onClick={() => saveEdit(key)} className="genshin-btn" style={btnSm}>Save</button>
              <button onClick={() => cancelEdit(key)} style={{ ...btnSm, color: "var(--color-genshin-bronze)" }}>Cancel</button>
            </div>
          </div>
        )}
        {isExpanded && !isEditing && isObject && (
          <pre style={{ padding: "0.5rem 0.7rem", borderTop: "1px solid rgba(139,109,46,0.08)", margin: 0, fontSize: "0.58rem", color: "var(--color-genshin-gold-light)", fontFamily: "var(--font-mono-display)", whiteSpace: "pre-wrap" as const, maxHeight: 400, overflowY: "auto" as const }}>
            {pretty(parsed)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div>
      <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>DATA MANAGER ({allKeys.length} keys)</h3>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" as const, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Filter keys..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="genshin-input"
          style={{ flex: 1, minWidth: 180, fontSize: "0.72rem", padding: "0.35rem 0.6rem" }}
        />
        <button onClick={rescan} className="genshin-btn" style={btnSm}>Rescan</button>
        <button onClick={exportAll} className="genshin-btn" style={btnSm}>Export All</button>
        <button onClick={() => fileRef.current?.click()} className="genshin-btn" style={btnSm}>Import</button>
        <button onClick={clearAll} style={{ ...btnSm, color: "#c00", background: "transparent", border: "1px solid rgba(200,0,0,0.3)" }}>Clear All</button>
        <input ref={fileRef} type="file" accept=".json" onChange={importFile} style={{ display: "none" }} />
      </div>

      {grouped.map(({ label, keys }) =>
        keys.length > 0 ? (
          <div key={label} style={{ marginBottom: "1.25rem" }}>
            <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.68rem", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>{label.toUpperCase()} ({keys.length})</h4>
            {keys.map(renderKey)}
          </div>
        ) : null
      )}

      {unknownKeys.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <h4 style={{ color: "var(--color-genshin-bronze)", fontSize: "0.68rem", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>OTHER KEYS ({unknownKeys.length})</h4>
          {unknownKeys.filter((k) => (filter ? k.toLowerCase().includes(filter.toLowerCase()) : true)).map(renderKey)}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6, textAlign: "center", padding: "2rem" }}>
          {filter ? "No keys match filter" : "No localStorage keys found with sf./sg./lavapad- prefix"}
        </div>
      )}
    </div>
  );
}

const btnSm: React.CSSProperties = { fontSize: "0.62rem", padding: "0.25rem 0.5rem", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(139,109,46,0.2)", color: "var(--color-genshin-gold)", borderRadius: 2, cursor: "pointer" };
