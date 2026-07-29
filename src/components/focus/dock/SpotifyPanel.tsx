import { useState } from "react";

function extractSpotifyEmbed(url: string): string | null {
  const id = url.trim();
  if (!id) return null;
  if (id.startsWith("https://open.spotify.com/")) return `https://open.spotify.com/embed${id.slice("https://open.spotify.com".length)}`;
  if (id.startsWith("spotify:")) {
    const parts = id.split(":");
    if (parts.length >= 3) return `https://open.spotify.com/embed/${parts[1]}/${parts[2]}`;
  }
  return null;
}

export function SpotifyPanel() {
  const [embedUrl, setEmbedUrl] = useState("https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleLoad = () => {
    const url = extractSpotifyEmbed(input);
    if (url) {
      setEmbedUrl(url);
      setInput("");
      setError(false);
    } else if (input.trim()) {
      setError(true);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-genshin-divider)", display: "flex", gap: "0.5rem" }}>
        <input
          className="genshin-input"
          style={{ flex: 1, fontSize: "0.75rem" }}
          placeholder="Paste Spotify track, playlist, or album URL..."
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && handleLoad()}
        />
        <button onClick={handleLoad} className="genshin-btn" style={{ padding: "0.25rem 0.75rem", fontSize: "0.65rem" }}>
          Load
        </button>
      </div>

      {error && (
        <div style={{ padding: "0.375rem 0.75rem", fontSize: "0.65rem", color: "#e55", background: "rgba(180,60,40,0.08)", borderBottom: "1px solid var(--color-genshin-divider)" }}>
          Invalid Spotify URL. Paste a link from open.spotify.com.
        </div>
      )}

      <div style={{ flex: 1, padding: "0.5rem", display: "flex", flexDirection: "column" }}>
        <iframe
          key={embedUrl}
          style={{ width: "100%", borderRadius: 2, flex: 1, minHeight: 250, borderColor: "var(--color-genshin-divider)", borderWidth: 1, borderStyle: "solid" }}
          src={embedUrl}
          title="Spotify Study Player"
          allow="encrypted-media"
          allowFullScreen
        />
      </div>
    </div>
  );
}
