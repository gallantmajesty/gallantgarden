import { useState, useRef } from "react";

const RECENT_KEY = "fl.youtube.recent";

export function YouTubePanel() {
  const [input, setInput] = useState("");
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  const [videoId, setVideoId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const addRecent = (q: string) => {
    const t = q.trim();
    if (!t) return;
    setRecent((prev) => {
      const next = [t, ...prev.filter((s) => s.toLowerCase() !== t.toLowerCase())].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const extractId = (url: string): string | null => {
    const v = url.match(/[?&]v=([^&]+)/);
    if (v) return v[1];
    const u = url.match(/youtu\.be\/([^?]+)/);
    if (u) return u[1];
    return url.trim().match(/^[a-zA-Z0-9_-]{11}$/)?.[0] ?? null;
  };

  const handleLoad = () => {
    const id = extractId(input);
    if (id) {
      setVideoId(id);
      addRecent(input.trim());
      setInput("");
    }
  };

  const clearRecent = () => { setRecent([]); localStorage.removeItem(RECENT_KEY); };

  const iframeSrc = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-genshin-divider)" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            className="genshin-input"
            style={{ flex: 1, fontSize: "0.75rem" }}
            placeholder="Paste YouTube URL or video ID..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            autoComplete="off"
          />
          <button onClick={handleLoad} className="genshin-btn" style={{ padding: "0.25rem 0.75rem", fontSize: "0.65rem" }}>Load</button>
        </div>

        {recent.length > 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-genshin-bronze)", fontFamily: "var(--font-serif-heading)" }}>RECENT</span>
              <button onClick={clearRecent} style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", opacity: 0.6 }}>Clear</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {recent.map((s) => (
                <button key={s} onClick={() => { const id = extractId(s); if (id) setVideoId(id); }} style={{ padding: "0.125rem 0.5rem", borderRadius: 2, fontSize: "0.65rem", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(139,109,46,0.15)", color: "var(--color-genshin-gold)", cursor: "pointer", fontFamily: "var(--font-serif-heading)" }}>
                  {s.length > 30 ? s.slice(0, 30) + "..." : s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div ref={wrapperRef} style={{ flex: 1, position: "relative", background: "#000", borderRadius: 2, overflow: "hidden", margin: "0.5rem" }}>
        {iframeSrc ? (
          <iframe src={iframeSrc} title="YouTube" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} allow="autoplay; encrypted-media" allowFullScreen />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", color: "var(--color-genshin-bronze)", opacity: 0.6, fontSize: "0.75rem", fontFamily: "var(--font-serif-heading)", padding: "1rem" }}>
            Paste a YouTube URL or video ID above to start watching.
          </div>
        )}
      </div>
    </div>
  );
}