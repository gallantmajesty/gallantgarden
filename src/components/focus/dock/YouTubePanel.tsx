import { useState } from "react";

export function YouTubePanel() {
  const [videoId, setVideoId] = useState("");
  const [input, setInput] = useState("");

  const handleLoad = () => {
    const id = input.trim();
    if (!id) return;
    const extracted = id.includes("v=")
      ? id.split("v=")[1]?.split("&")[0]
      : id.includes("youtu.be/")
      ? id.split("youtu.be/")[1]?.split("?")[0]
      : id;
    if (extracted) {
      setVideoId(extracted);
      setInput("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-genshin-divider)", display: "flex", gap: "0.5rem" }}>
        <input
          className="genshin-input"
          style={{ flex: 1, fontSize: "0.75rem" }}
          placeholder="Paste YouTube URL or video ID..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoad()}
        />
        <button onClick={handleLoad} className="genshin-btn" style={{ padding: "0.25rem 0.75rem", fontSize: "0.65rem" }}>
          Load
        </button>
      </div>

      <div style={{ flex: 1, padding: "0.5rem", display: "flex", flexDirection: "column" }}>
        {videoId ? (
          <iframe
            style={{ width: "100%", borderRadius: 2, flex: 1, minHeight: 250, borderColor: "var(--color-genshin-divider)", borderWidth: 1, borderStyle: "solid" }}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1`}
            title="YouTube Study Player"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6, lineHeight: 1.6 }}>
              Paste a YouTube link above to start playing.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
