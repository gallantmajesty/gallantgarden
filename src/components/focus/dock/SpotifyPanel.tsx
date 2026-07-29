export function SpotifyPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--color-genshin-divider)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span
          style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)" }}
        >
          SPOTIFY STUDY DOCK
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)" }}>
          — Connect your account
        </span>
      </div>

      <div style={{ flex: 1, padding: "0.5rem", display: "flex", flexDirection: "column" }}>
        <iframe
          style={{ width: "100%", borderRadius: 2, flex: 1, minHeight: 250, borderColor: "var(--color-genshin-divider)", borderWidth: 1, borderStyle: "solid" }}
          src="https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ"
          title="Spotify Study Player"
          allow="encrypted-media"
          allowFullScreen
        />
      </div>
    </div>
  );
}
