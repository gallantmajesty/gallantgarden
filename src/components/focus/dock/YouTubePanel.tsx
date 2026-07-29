import { useState } from "react";

const PRESET_STREAMS = [
  { label: "Genshin OST", videoId: "jBtfmX5Tv1A" },
  { label: "Lofi Hip Hop", videoId: "jfKfPfyJRdk" },
  { label: "Ambient Study", videoId: "DWcJFNfaw9c" },
  { label: "Classical Focus", videoId: "jgpJVI3tDbY" },
];

export function YouTubePanel() {
  const [videoId, setVideoId] = useState(PRESET_STREAMS[0].videoId);
  const [customId, setCustomId] = useState("");
  const [isPiP, setIsPiP] = useState(false);

  const handleSetCustom = () => {
    const id = customId.trim();
    if (id) {
      const extracted = id.includes("v=") ? id.split("v=")[1]?.split("&")[0] : id.includes("youtu.be/") ? id.split("youtu.be/")[1]?.split("?")[0] : id;
      if (extracted) {
        setVideoId(extracted);
        setCustomId("");
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0.75rem", borderBottom: "1px solid var(--color-genshin-divider)" }}>
        {PRESET_STREAMS.map((stream) => (
          <button
            key={stream.videoId}
            onClick={() => setVideoId(stream.videoId)}
            style={{
              padding: "0.25rem 0.5rem",
              borderRadius: 2,
              fontSize: "0.75rem",
              transition: "all 0.2s",
              background: videoId === stream.videoId ? "rgba(201, 168, 76, 0.15)" : "transparent",
              border: `1px solid ${videoId === stream.videoId ? "var(--color-genshin-gold)" : "rgba(139,109,46,0.2)"}`,
              color: videoId === stream.videoId ? "var(--color-genshin-gold)" : "var(--color-genshin-bronze)",
              cursor: "pointer",
              fontFamily: "var(--font-serif-heading)",
            }}
          >
            {stream.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "0.5rem", borderBottom: "1px solid var(--color-genshin-divider)", display: "flex", gap: "0.5rem" }}>
        <input
          className="genshin-input"
          style={{ flex: 1, fontSize: "0.75rem" }}
          placeholder="Paste YouTube URL or video ID..."
          value={customId}
          onChange={(e) => setCustomId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSetCustom()}
        />
        <button onClick={handleSetCustom} className="genshin-btn" style={{ padding: "0.25rem 0.75rem", fontSize: "0.65rem" }}>
          Load
        </button>
        <button
          onClick={() => setIsPiP(!isPiP)}
          className="genshin-btn genshin-btn-secondary"
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.65rem" }}
        >
          {isPiP ? "Full" : "PiP"}
        </button>
      </div>

      <div style={{ flex: 1, padding: "0.5rem", display: "flex", flexDirection: "column" }}>
        <iframe
          style={{ width: "100%", borderRadius: 2, flex: 1, minHeight: isPiP ? 120 : 250, borderColor: "var(--color-genshin-divider)", borderWidth: 1, borderStyle: "solid" }}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1`}
          title="YouTube Study Player"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    </div>
  );
}
