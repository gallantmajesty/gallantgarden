import { useEffect, useState } from "react";
import {
  useDeviceBoost,
  boostPct,
  generateBoostCode,
  copyBoostLink,
  type BoostDevice,
} from "../../lib/deviceBoost";
import { DEVICE_BOOST_MAX_DEVICES } from "../../store/hardcore";

/** Hardcore Connect ships together with Hardcore mode — Coming Soon for now.
 *  Set to false when the feature is ready to release. */
const HARDCODE_CONNECT_COMING_SOON = true;

interface DeviceConnectProps {
  /** Compact inline card used inside the WagerModal. */
  compact?: boolean;
  /** Auto-host a boost room on mount (for the Master planning a session). */
  autoHost?: boolean;
}

function deviceIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("iphone")) return "📱";
  if (l.includes("ipad")) return "🖥️";
  if (l.includes("android")) return "📱";
  if (l.includes("windows")) return "🖥️";
  if (l.includes("mac")) return "💻";
  if (l.includes("linux")) return "💻";
  return "📟";
}

function DeviceRow({ device }: { device: BoostDevice }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "0.74rem" }}>
      <span style={{ fontSize: "1rem" }}>{deviceIcon(device.label)}</span>
      <span style={{ flex: 1, color: "#e6e9f0" }}>{device.label}</span>
      <span style={{ color: "#34d399", fontWeight: 700 }}>+{boostPct(1).toFixed(0)}%</span>
    </div>
  );
}

/**
 * Hardcore Connect — two roles:
 *  • Master (hosting a hardcore session): shows the join code + live list of
 *    every device that connected, so you can see phones/tablets boosting you.
 *  • Connector (a second device, e.g. a phone): paste the code from the Master
 *    and tap CONNECT — each connected device adds +5% to the hardcore multiplier.
 */
export function DeviceConnect({ compact = false, autoHost = false }: DeviceConnectProps) {
  const boost = useDeviceBoost();
  const isHost = useDeviceBoost((s) => s.isHost);
  const isConnector = useDeviceBoost((s) => s.isConnector);
  const code = useDeviceBoost((s) => s.code);
  const deviceCount = useDeviceBoost((s) => s.deviceCount);
  const devices = useDeviceBoost((s) => s.devices);

  const [entry, setEntry] = useState("");
  const [copied, setCopied] = useState(false);

  // When the Master is planning a hardcore session (autoHost), generate a code
  // so the panel shows it + live device info. Never override a connector.
  useEffect(() => {
    if (HARDCODE_CONNECT_COMING_SOON || !autoHost || isConnector) return;
    if (!code || !isHost) {
      boost.host(generateBoostCode());
    }
  }, [autoHost, code, isHost, isConnector, boost]);

  const normalize = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const validCode = normalize(entry).length >= 4;

  const doConnect = () => {
    const c = normalize(entry);
    if (c.length < 4) return;
    boost.connect(c);
    setEntry("");
  };

  const doCopy = () => {
    if (!code) return;
    try {
      navigator.clipboard?.writeText(copyBoostLink(code)).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const containerStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: compact ? "0.7rem" : "1rem",
    fontSize: "0.74rem",
    color: "#c3cad6",
  } as React.CSSProperties;

  const titleStyle = {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#e6e9f0",
    textTransform: "uppercase",
    marginBottom: "0.5rem",
  } as React.CSSProperties;

  // ---- Coming Soon gate -----------------------------------------------------
  if (HARDCODE_CONNECT_COMING_SOON) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>🔗 Hardcore Connect</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
            color: "#fbbf24",
            fontWeight: 700,
            marginBottom: "0.4rem",
          }}
        >
          ✨ Coming Soon
        </div>
        <div style={{ fontSize: "0.7rem", color: "#9aa3b2", lineHeight: 1.6 }}>
          Connect a second device — like your phone — to boost your Hardcore session by{" "}
          <b style={{ color: "#34d399" }}>+{boostPct(1).toFixed(0)}%</b> per device. This unlocks together with Hardcore mode.
        </div>
      </div>
    );
  }

  // ---- Connector (second device pasting the code) ---------------------------
  if (isConnector) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>📱 Connected device</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ color: "#34d399", fontWeight: 700 }}>✓ Connected to boost</span>
          <span style={{ fontFamily: "var(--font-mono-display)", color: "#fbbf24", letterSpacing: "0.15em" }}>{code}</span>
          <span style={{ color: "#9aa3b2" }}>· boosting the Master</span>
        </div>
        <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => boost.disconnect()}
            className="fd-btn fd-btn-sm fd-btn-exit"
            style={{ cursor: "pointer" }}
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // ---- Master (hosting / or idle) -------------------------------------------
  return (
    <div style={containerStyle}>
      <div style={titleStyle}>🔗 Hardcore Connect</div>

      {isHost && code ? (
        <>
          <div style={{ fontSize: "0.7rem", color: "#9aa3b2" }}>
            Share this code — other devices paste it under "Hardcore Connect" to join your focus.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
            <div
              style={{
                flex: 1,
                fontFamily: "var(--font-mono-display)",
                fontSize: "1rem",
                letterSpacing: "0.2em",
                color: "#fbbf24",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "0.35rem 0.5rem",
                textAlign: "center",
              }}
            >
              {code}
            </div>
            <button onClick={doCopy} className="fd-btn fd-btn-sm" style={{ cursor: "pointer", flexShrink: 0 }}>
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>

          {/* Live device info */}
          <div style={{ marginTop: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem" }}>
              <span style={{ color: "#9aa3b2", fontSize: "0.68rem" }}>Connected devices</span>
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: "0.72rem" }}>
                {deviceCount} / {DEVICE_BOOST_MAX_DEVICES} (+{boostPct(deviceCount).toFixed(0)}%)
              </span>
            </div>
            {devices.length === 0 ? (
              <div style={{ fontSize: "0.68rem", color: "#6b7280", fontStyle: "italic" }}>
                Waiting for devices to connect…
              </div>
            ) : (
              <div style={{ maxHeight: compact ? 130 : 180, overflow: "auto" }}>
                {devices.map((d) => (
                  <DeviceRow key={d.key} device={d} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: "0.7rem", color: "#9aa3b2", marginBottom: "0.4rem" }}>
            {!isHost && !isConnector
              ? "Paste the code from the Master's screen to connect this device and boost their session."
              : "You're not hosting yet — start a Hardcore session to get a code."}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doConnect(); }}
              placeholder="Enter code (e.g. SD482)"
              maxLength={12}
              style={{
                flex: 1,
                minWidth: 140,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "#fff",
                padding: "0.45rem 0.6rem",
                fontFamily: "var(--font-mono-display)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontSize: "0.8rem",
                outline: "none",
              }}
            />
            <button
              onClick={doConnect}
              disabled={!validCode}
              className="fd-btn fd-btn-primary fd-btn-sm"
              style={{ cursor: validCode ? "pointer" : "not-allowed", opacity: validCode ? 1 : 0.4 }}
            >
              CONNECT
            </button>
          </div>
          <div style={{ fontSize: "0.62rem", color: "#6b7280", marginTop: "0.4rem" }}>
            Each connected device adds +{boostPct(1).toFixed(0)}% to the Master's hardcore multiplier (up to {DEVICE_BOOST_MAX_DEVICES}).
          </div>
        </>
      )}
    </div>
  );
}
