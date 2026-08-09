import { useState } from "react";

const RECENT_KEY = "fl.search.recent";
const MAX_RECENT = 8;

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface DdgResponse {
  AbstractText?: string;
  AbstractURL?: string;
  AbstractSource?: string;
  Heading?: string;
  RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Name?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string" && s.trim()) : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string): string[] {
  const next = [q, ...loadRecent().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Flatten the DDG Instant-Answer payload into plain result cards. */
function parseResults(d: DdgResponse): SearchResult[] {
  const out: SearchResult[] = [];
  if (d.AbstractText && d.AbstractURL) {
    out.push({ title: d.Heading || d.AbstractSource || "Result", url: d.AbstractURL, snippet: d.AbstractText });
  }
  const walk = (t: DdgResponse["RelatedTopics"]) => {
    for (const item of t ?? []) {
      if (item.Text && item.FirstURL) {
        out.push({ title: item.Text.split(" - ")[0], url: item.FirstURL, snippet: item.Text });
      } else if (item.Topics) {
        walk(item.Topics);
      }
    }
  };
  walk(d.RelatedTopics);
  return out.slice(0, 20);
}

function GoogleG({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function SearchPanel() {
  const [q, setQ] = useState("");
  const [live, setLive] = useState("");
  const [recent, setRecent] = useState(loadRecent);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const go = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecent(saveRecent(trimmed));
    setLive(trimmed);
    setQ(trimmed);
    setResults(null);
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&no_html=1&skip_disambig=1`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DdgResponse;
      const parsed = parseResults(data);
      setResults(parsed);
      if (parsed.length === 0) setError("No results — try the Google link below.");
    } catch {
      setError("Search failed to connect — try the Google link below.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.6rem", flex: 1, minHeight: 0 }}>
      {/* Search bar */}
      <div style={{ display: "flex", gap: "0.35rem" }}>
        <input
          className="genshin-input"
          style={{ flex: 1, minWidth: 0 }}
          type="text"
          placeholder="Search anything..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") go(q); }}
          autoComplete="off"
          autoFocus
        />
        <button
          className="genshin-btn"
          style={{ flexShrink: 0 }}
          onClick={() => go(q)}
          title="Search the web"
        >
          Search
        </button>
      </div>

      {/* Open in new tab */}
      {live && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <a
            className="genshin-btn genshin-btn-secondary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            href={`https://www.google.com/search?q=${encodeURIComponent(live)}`}
            target="_blank"
            rel="noreferrer"
          >
            <GoogleG /> Open in Google
          </a>
        </div>
      )}

      {/* Recent searches */}
      {!live && recent.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
          {recent.map((r) => (
            <button
              key={r}
              className="genshin-btn genshin-btn-secondary"
              style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem" }}
              onClick={() => go(r)}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Results area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          border: "1px solid var(--color-genshin-divider)",
          borderRadius: 6,
          background: "#fff",
          color: "#222",
          padding: "0.5rem",
        }}
      >
        {loading ? (
          <div style={{ fontSize: "0.72rem", color: "#777", textAlign: "center", padding: "1rem 0" }}>Searching…</div>
        ) : results && results.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {results.map((r, i) => (
              <a
                key={`${r.url}-${i}`}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1a0dab" }}>{r.title}</div>
                <div style={{ fontSize: "0.62rem", color: "#006621" }}>{r.url.replace(/^https?:\/\//, "").split("/")[0]}</div>
                <div style={{ fontSize: "0.68rem", color: "#444", marginTop: "0.15rem" }}>{r.snippet}</div>
              </a>
            ))}
          </div>
        ) : (
          <div
            style={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "var(--color-genshin-bronze)",
              fontSize: "0.72rem",
              textAlign: "center",
              padding: "1rem",
            }}
          >
            {error || "Search the web without leaving your focus session."}
          </div>
        )}
      </div>
    </div>
  );
}
