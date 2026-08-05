import { useState } from "react";
import { loadUpdates, saveUpdates, loadNews, saveNews, type UpdateEntry, type NewsEntry } from "../../lib/announcements";

let uid = 100;
const nextId = (prefix: string) => `${prefix}${uid++}`;

export default function OwnerAnnouncementsTab() {
  const [updates, setUpdates] = useState<UpdateEntry[]>(() => loadUpdates());
  const [news, setNews] = useState<NewsEntry[]>(() => loadNews());
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const patchUpdate = (id: string, p: Partial<UpdateEntry>) => {
    const next = updates.map((u) => (u.id === id ? { ...u, ...p } : u));
    setUpdates(next);
    saveUpdates(next);
    refresh();
  };

  const addUpdate = () => {
    const entry: UpdateEntry = {
      id: nextId("u"),
      version: `v1.${updates.length}`,
      title: "New update",
      date: new Date().toISOString().slice(0, 10),
      notes: [],
      active: true,
    };
    const next = [entry, ...updates];
    setUpdates(next);
    saveUpdates(next);
    refresh();
  };

  const removeUpdate = (id: string) => {
    const next = updates.filter((u) => u.id !== id);
    setUpdates(next);
    saveUpdates(next);
    refresh();
  };

  const patchNews = (id: string, p: Partial<NewsEntry>) => {
    const next = news.map((n) => (n.id === id ? { ...n, ...p } : n));
    setNews(next);
    saveNews(next);
    refresh();
  };

  const addNews = () => {
    const entry: NewsEntry = {
      id: nextId("n"),
      title: "New post",
      body: "",
      tag: "NEWS",
      date: new Date().toISOString().slice(0, 10),
      active: true,
    };
    const next = [entry, ...news];
    setNews(next);
    saveNews(next);
    refresh();
  };

  const removeNews = (id: string) => {
    const next = news.filter((n) => n.id !== id);
    setNews(next);
    saveNews(next);
    refresh();
  };

  return (
    <div>
      {/* ── UPDATES ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
        <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>UPDATE LOG</h3>
        <button onClick={addUpdate} style={{ fontSize: "0.62rem", color: "var(--color-genshin-gold)", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 2, padding: "0.25rem 0.6rem", cursor: "pointer" }}>+ New update</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.5rem" }}>
        {updates.map((u) => (
          <div key={u.id} style={{ background: "rgba(26,20,16,0.5)", border: "1px solid rgba(139,109,46,0.12)", borderRadius: 4, padding: "0.6rem 0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "70px 90px 1fr 24px", gap: "0.4rem", marginBottom: "0.4rem", alignItems: "center" }}>
              <input
                value={u.version}
                onChange={(e) => patchUpdate(u.id, { version: e.target.value })}
                style={{ fontSize: "0.62rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2 }}
                placeholder="v1.0"
              />
              <input
                value={u.date}
                onChange={(e) => patchUpdate(u.id, { date: e.target.value })}
                style={{ fontSize: "0.62rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2 }}
              />
              <input
                value={u.title}
                onChange={(e) => patchUpdate(u.id, { title: e.target.value })}
                style={{ fontSize: "0.62rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2 }}
                placeholder="Title"
              />
              <button onClick={() => removeUpdate(u.id)} style={{ fontSize: "0.6rem", color: "#e08a8a", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
              {u.notes.map((note, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "#0a0a14", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, padding: "0.15rem 0.4rem" }}>
                  <span style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)" }}>{note}</span>
                  <button
                    onClick={() => patchUpdate(u.id, { notes: u.notes.filter((_, j) => j !== i) })}
                    style={{ fontSize: "0.5rem", color: "#e08a8a", background: "transparent", border: "none", cursor: "pointer" }}
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => {
                  const input = prompt("Add note:");
                  if (input) patchUpdate(u.id, { notes: [...u.notes, input] });
                }}
                style={{ fontSize: "0.55rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "1px dashed rgba(139,109,46,0.3)", borderRadius: 2, padding: "0.15rem 0.4rem", cursor: "pointer" }}
              >+ note</button>
            </div>
            <label style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <input type="checkbox" checked={u.active} onChange={(e) => patchUpdate(u.id, { active: e.target.checked })} />
              Visible to players
            </label>
          </div>
        ))}
      </div>

      {/* ── NEWS ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
        <h3 style={{ color: "var(--color-genshin-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>NEWS POSTS</h3>
        <button onClick={addNews} style={{ fontSize: "0.62rem", color: "var(--color-genshin-gold)", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 2, padding: "0.25rem 0.6rem", cursor: "pointer" }}>+ New post</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {news.map((n) => (
          <div key={n.id} style={{ background: "rgba(26,20,16,0.5)", border: "1px solid rgba(139,109,46,0.12)", borderRadius: 4, padding: "0.6rem 0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "70px 90px 1fr 24px", gap: "0.4rem", marginBottom: "0.4rem", alignItems: "center" }}>
              <input
                value={n.tag}
                onChange={(e) => patchNews(n.id, { tag: e.target.value })}
                style={{ fontSize: "0.6rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2 }}
                placeholder="TAG"
              />
              <input
                value={n.date}
                onChange={(e) => patchNews(n.id, { date: e.target.value })}
                style={{ fontSize: "0.62rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2 }}
              />
              <input
                value={n.title}
                onChange={(e) => patchNews(n.id, { title: e.target.value })}
                style={{ fontSize: "0.62rem", padding: "0.2rem 0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2 }}
                placeholder="Title"
              />
              <button onClick={() => removeNews(n.id)} style={{ fontSize: "0.6rem", color: "#e08a8a", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <textarea
              value={n.body}
              onChange={(e) => patchNews(n.id, { body: e.target.value })}
              rows={3}
              style={{ width: "100%", fontSize: "0.62rem", padding: "0.35rem", background: "#0a0a14", color: "var(--color-genshin-gold)", border: "1px solid rgba(139,109,46,0.2)", borderRadius: 2, resize: "vertical" as const, fontFamily: "inherit", lineHeight: 1.5 }}
              placeholder="Post body…"
            />
            <label style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.3rem" }}>
              <input type="checkbox" checked={n.active} onChange={(e) => patchNews(n.id, { active: e.target.checked })} />
              Visible to players
            </label>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(26,20,16,0.6)", borderRadius: 2, fontSize: "0.58rem", color: "var(--color-genshin-bronze)", opacity: 0.9 }}>
        ℹ️ Saved locally + synced to DB (owner_content → "updates" / "news"). Players see these in the News modal from the Lobby inbox.
      </div>
    </div>
  );
}
