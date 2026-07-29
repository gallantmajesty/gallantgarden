import { useState, useEffect, useRef, useCallback } from "react";
import { isSpotifyLoggedIn, loginWithSpotify, getSpotifyAccessToken, logoutSpotify, handleSpotifyCallback } from "../../../lib/music/spotifyAuth";
import { getPlayback, play, pause, next, previous, setVolume, seek } from "../../../lib/music/spotifyApi";
import type { SpotifyTrack, SpotifyPlayback } from "../../../lib/music/spotifyApi";

interface PlaylistItem {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  uri: string;
}

const SPOTIFY_SDK_URL = "https://sdk.scdn.co/spotify-player.js";

export function SpotifyPanel() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistItem | null>(null);
  const [nowPlaying, setNowPlaying] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    checkAuth();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const checkAuth = async () => {
    if (window.location.search.includes("code=")) {
      const success = await handleSpotifyCallback();
      if (success) {
        setLoggedIn(true);
        loadPlaylists();
      }
    } else if (isSpotifyLoggedIn()) {
      setLoggedIn(true);
      initPlayer();
      loadPlaylists();
      startPolling();
    }
  };

  const initPlayer = () => {
    if (typeof window === "undefined") return;
    if ((window as any).Spotify) {
      createPlayer();
    } else {
      const script = document.createElement("script");
      script.src = SPOTIFY_SDK_URL;
      script.onload = createPlayer;
      document.body.appendChild(script);
    }
  };

  const createPlayer = () => {
    const token = getSpotifyAccessToken();
    if (!token || playerRef.current) return;

    playerRef.current = new (window as any).Spotify.Player({
      name: "Focus Lily",
      getOAuthToken: (cb: (token: string) => void) => cb(token),
      volume: volume,
    });

    playerRef.current.addListener("ready", ({ device_id }: { device_id: string }) => {
      setDeviceId(device_id);
      transferToDevice(device_id);
    });

    playerRef.current.addListener("player_state_changed", (state: any) => {
      if (!state) return;
      setNowPlaying(state.track_window.current_track);
      setIsPlaying(!state.paused);
      setProgress(state.position);
      setDuration(state.duration);
    });

    playerRef.current.connect();
  };

  const transferToDevice = async (deviceId: string) => {
    try {
      await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getSpotifyAccessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ device_ids: [deviceId] }),
      });
    } catch (e) {
      console.error("Transfer failed:", e);
    }
  };

  const loadPlaylists = async () => {
    const token = getSpotifyAccessToken();
    if (!token) return;
    try {
      const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPlaylists(data.items || []);
    } catch (e) {
      console.error("Failed to load playlists:", e);
    }
  };

  const startPolling = () => {
    pollingRef.current = window.setInterval(async () => {
      const state = await getPlayback();
      if (state) {
        setNowPlaying(state.item);
        setIsPlaying(state.is_playing);
        setProgress(state.progress_ms);
        setDuration(state.item?.duration_ms || 0);
      }
    }, 2000);
  };

  const handlePlayPlaylist = async (playlist: PlaylistItem) => {
    setSelectedPlaylist(playlist);
    setLoading(true);
    try {
      const token = getSpotifyAccessToken();
      if (!token) return;

      if (deviceId) {
        await fetch("https://api.spotify.com/v1/me/player/play", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ context_uri: playlist.uri }),
        });
      } else {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ context_uri: playlist.uri }),
        });
      }
    } catch (e) {
      setError("Failed to start playback");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => isPlaying ? pause() : play();
  const handleNext = () => next();
  const handlePrev = () => previous();
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolumeState(v);
    setVolume(v * 100);
  };
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setProgress(v);
    seek(v);
  };
  const handleLogout = () => {
    logoutSpotify();
    setLoggedIn(false);
    setPlaylists([]);
    setSelectedPlaylist(null);
    setNowPlaying(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  if (!loggedIn) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1rem", textAlign: "center" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)" }}>
          SPOTIFY
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", opacity: 0.7, maxWidth: 200 }}>
          Connect your Spotify account to play music that continues across tabs.
        </div>
        <button onClick={loginWithSpotify} className="genshin-btn" style={{ padding: "0.5rem 1.5rem", fontSize: "0.75rem" }}>
          Connect Spotify
        </button>
      </div>
    );
  }

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-genshin-divider)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)" }}>
          SPOTIFY
        </span>
        <button onClick={handleLogout} style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-serif-heading)" }}>
          Disconnect
        </button>
      </div>

      {!selectedPlaylist ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {error && (
            <div style={{ padding: "0.5rem", marginBottom: "0.5rem", borderRadius: 2, fontSize: "0.7rem", background: "rgba(180,60,40,0.1)", border: "1px solid rgba(180,60,40,0.3)", color: "#e55" }}>
              {error}
            </div>
          )}
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-genshin-bronze)", marginBottom: "0.5rem", fontFamily: "var(--font-serif-heading)" }}>
            YOUR PLAYLISTS
          </div>
          {playlists.length === 0 ? (
            <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6, textAlign: "center", padding: "2rem" }}>
              No playlists found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handlePlayPlaylist(pl)}
                  disabled={loading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    borderRadius: 2,
                    background: "rgba(26,20,16,0.3)",
                    border: "1px solid rgba(139,109,46,0.1)",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(139,109,46,0.1)"}
                >
                  <img src={pl.images[0]?.url || ""} alt="" style={{ width: 40, height: 40, borderRadius: 2, objectFit: "cover" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-genshin-gold-light)", fontFamily: "var(--font-serif-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pl.name}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--color-genshin-bronze)", opacity: 0.7 }}>
                      {pl.tracks.total} tracks
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--color-genshin-gold)", opacity: 0.7 }}>▶</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-genshin-divider)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button onClick={() => setSelectedPlaylist(null)} style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-serif-heading)" }}>
              ← Back
            </button>
            <img src={selectedPlaylist.images[0]?.url || ""} alt="" style={{ width: 40, height: 40, borderRadius: 2, objectFit: "cover" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedPlaylist.name}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--color-genshin-bronze)" }}>
                {selectedPlaylist.tracks.total} tracks
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            {nowPlaying ? (
              <div style={{ textAlign: "center", maxWidth: "100%" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-genshin-gold-light)", fontFamily: "var(--font-serif-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {nowPlaying.name}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", opacity: 0.7, marginTop: 2 }}>
                  {nowPlaying.artists.map((a) => a.name).join(", ")}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6 }}>
                {loading ? "Loading..." : "Select a playlist to start"}
              </div>
            )}
          </div>

          <div style={{ padding: "0.75rem", borderTop: "1px solid var(--color-genshin-divider)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", width: 35, textAlign: "right" }}>{formatTime(progress)}</span>
              <input type="range" min="0" max={duration || 100} value={progress} onChange={handleSeek} style={{ flex: 1, accentColor: "var(--color-genshin-gold)" }} />
              <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", width: 35 }}>{formatTime(duration)}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
              <button onClick={handlePrev} style={{ fontSize: "1rem", color: "var(--color-genshin-gold)", background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>⏮</button>
              <button onClick={handlePlayPause} style={{ fontSize: "1.25rem", color: "var(--color-genshin-gold)", background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button onClick={handleNext} style={{ fontSize: "1rem", color: "var(--color-genshin-gold)", background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>⏭</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", width: 30 }}>🔊</span>
              <input type="range" min="0" max="1" step="0.1" value={volume} onChange={handleVolumeChange} style={{ flex: 1, accentColor: "var(--color-genshin-gold)" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}