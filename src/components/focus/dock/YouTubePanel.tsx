import { useState, useRef, useEffect } from "react";

const RECENT_SEARCHES_KEY = "fl.youtube.recent";

export function YouTubePanel() {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [currentSearch, setCurrentSearch] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => {
      if (iframeRef.current) {
        playerRef.current = new (window as any).YT.Player(iframeRef.current, {
          events: {
            onStateChange: (e: any) => {
              setIsPlaying(e.data === (window as any).YT.PlayerState.PLAYING);
            },
          },
        });
      }
    };
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  const addToHistory = (search: string) => {
    const trimmed = search.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    setQuery(q);
    setCurrentSearch(q);
    addToHistory(q);
    setShowHistory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const embedUrl = currentSearch
    ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(currentSearch)}&autoplay=1&controls=1&modestbranding=1&rel=0`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-genshin-divider)" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              className="genshin-input"
              style={{ width: "100%", fontSize: "0.75rem", paddingRight: "2rem" }}
              placeholder="Search YouTube..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setShowHistory(false); }}
                style={{
                  position: "absolute",
                  right: "0.375rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: "var(--color-genshin-bronze)",
                  opacity: 0.6,
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="genshin-btn" style={{ padding: "0.25rem 0.75rem", fontSize: "0.65rem" }}>
            Search
          </button>
        </form>

        {recentSearches.length > 0 && (
          <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-genshin-bronze)", fontFamily: "var(--font-serif-heading)" }}>
              RECENT
            </span>
            <button
              onClick={clearHistory}
              style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", opacity: 0.6 }}
            >
              Clear
            </button>
          </div>
        )}

        {recentSearches.length > 0 && showHistory && (
          <div style={{ marginTop: "0.375rem", display: "flex", flexWrap: "wrap", gap: 4 }}>
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                style={{
                  padding: "0.125rem 0.5rem",
                  borderRadius: 2,
                  fontSize: "0.65rem",
                  background: "rgba(201,168,76,0.08)",
                  border: "1px solid rgba(139,109,46,0.15)",
                  color: "var(--color-genshin-gold)",
                  cursor: "pointer",
                  fontFamily: "var(--font-serif-heading)",
                  whiteSpace: "nowrap",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {recentSearches.length > 0 && !showHistory && (
          <button
            onClick={() => setShowHistory(true)}
            style={{ marginTop: "0.25rem", fontSize: "0.6rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", opacity: 0.6 }}
          >
            Show recent searches
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: "0.5rem", display: "flex", flexDirection: "column" }}>
        {embedUrl ? (
          <iframe
            ref={iframeRef}
            style={{ width: "100%", borderRadius: 2, flex: 1, minHeight: 250, borderColor: "var(--color-genshin-divider)", borderWidth: 1, borderStyle: "solid" }}
            src={embedUrl}
            title="YouTube Search Player"
            allow="autoplay; encrypted-media; clipboard-write"
            allowFullScreen
          />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6, lineHeight: 1.6 }}>
              Search for music, study playlists, or ambient sounds.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}