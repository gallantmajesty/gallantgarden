import { useMemo } from "react";
import { loadUpdates, loadNews, markAnnouncementsRead } from "../../lib/announcements";

export function NewsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const updates = useMemo(() => loadUpdates().filter((u) => u.active), [open]);
  const news = useMemo(() => loadNews().filter((n) => n.active), [open]);

  if (!open) return null;
  markAnnouncementsRead();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,5,10,0.8)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 720, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", background: "linear-gradient(160deg,#141226,#1d1830)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 12, padding: "1.25rem", boxShadow: "0 0 60px rgba(201,168,76,0.15)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem", color: "#f2e6c9", letterSpacing: "0.04em" }}>📢 News & Updates</h2>
          <button onClick={onClose} style={{ fontSize: "0.9rem", color: "#b8a77a", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
        </div>

        {/* News posts */}
        {news.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
            {news.map((n) => (
              <div key={n.id} style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.65rem", color: "#c9a44a", letterSpacing: "0.08em", fontWeight: 700 }}>{n.tag}</span>
                  <span style={{ fontSize: "0.6rem", color: "#8d815f" }}>{new Date(n.date).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f2e6c9", marginBottom: "0.3rem" }}>{n.title}</div>
                <div style={{ fontSize: "0.78rem", color: "#d9cba4", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{n.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* Update log */}
        {updates.length > 0 && (
          <div>
            <div style={{ fontSize: "0.7rem", color: "#b8a77a", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>UPDATE LOG</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {updates.map((u) => (
                <div key={u.id} style={{ background: "rgba(26,24,44,0.5)", border: "1px solid rgba(139,109,46,0.15)", borderRadius: 8, padding: "0.6rem 0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#c9a44a" }}>{u.version}</span>
                    <span style={{ fontSize: "0.6rem", color: "#8d815f" }}>{new Date(u.date).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f2e6c9", marginBottom: "0.2rem" }}>{u.title}</div>
                  <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.75rem", color: "#d9cba4", lineHeight: 1.6 }}>
                    {u.notes.map((note, i) => <li key={i}>{note}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {news.length === 0 && updates.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem 0", fontSize: "0.75rem", color: "#8d815f" }}>No announcements yet.</div>
        )}
      </div>
    </div>
  );
}
