import { useState } from "react";
import {
  EASY_RATE,
  MEDIUM_RATE,
  hardcoreRateFor,
  hardcoreMultiplier,
  minWagerFor,
  GRACE_SEC,
  DEVICE_BOOST_MAX_DEVICES,
} from "../../store/hardcore";

interface HelpGuideProps {
  onClose: () => void;
}

const TIERS = [
  {
    key: "easy",
    emoji: "🟢",
    name: "Easy",
    color: "#34d399",
    soft: "rgba(52,211,153,0.12)",
    oneLine: "Free & flexible — start anywhere, no risk.",
    bullets: [
      `${EASY_RATE} leaves/min · no fullscreen · no wager`,
      "Keep the study tab open — switching tabs starts the 20s warning.",
      "With breaks: each completed segment banks its leaves immediately.",
      "Without breaks: everything is granted at the end.",
      "Quit early → keep already-banked splits, lose the rest.",
    ],
    best: "First timers, casual study, zero-risk focus.",
  },
  {
    key: "medium",
    emoji: "🟡",
    name: "Medium",
    color: "#fbbf24",
    soft: "rgba(251,191,36,0.12)",
    oneLine: "Fullscreen discipline — double the rate, one payout.",
    bullets: [
      `${MEDIUM_RATE} leaves/min (2× Easy) · fullscreen required · no wager`,
      "Breaks are allowed, but rewards are granted only at session end.",
      "Exiting fullscreen starts the 20s warning — return or it fails.",
      "Tab switching is fine — fullscreen is what's enforced.",
    ],
    best: "Serious blocks without risking leaves.",
  },
  {
    key: "hardcore",
    emoji: "🔴",
    name: "Hardcore",
    color: "#f87171",
    soft: "rgba(248,113,113,0.12)",
    oneLine: "High risk, high reward — a wager you can win big or lose.",
    bullets: [
      "Fullscreen enforced + a green-leaf wager held in escrow.",
      "Win → wager back + scaled earnings. Fail → wager is lost.",
      "Rewards + wager granted only on a win.",
      "Longer sessions = higher multiplier AND higher minimum wager.",
      "Wager above the minimum for a risk bonus (up to +2×).",
    ],
    best: "Focused grinders chasing the biggest payouts.",
  },
] as const;

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        padding: "0.5rem 0.9rem",
        borderRadius: 999,
        border: active ? "1px solid rgba(201,168,76,0.6)" : "1px solid rgba(255,255,255,0.12)",
        background: active ? "rgba(201,168,76,0.14)" : "transparent",
        color: active ? "#e8c86a" : "#9aa3b2",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function HelpGuide({ onClose }: HelpGuideProps) {
  const [view, setView] = useState<"overview" | "easy" | "medium" | "hardcore">("overview");

  return (
    <div className="fd-modal-body" style={{ padding: "1.1rem", maxWidth: 520 }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "0.9rem" }}>
        <div style={{ fontSize: "0.95rem", letterSpacing: "0.16em", color: "#e8c86a", fontWeight: 700 }}>
          📖 FOCUS MODE GUIDE
        </div>
        <div style={{ fontSize: "0.72rem", color: "#9aa3b2", marginTop: "0.25rem" }}>
          Every session runs in one of three tiers — pick your commitment level.
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "0.9rem" }}>
        <TabButton active={view === "overview"} onClick={() => setView("overview")}>Overview</TabButton>
        <TabButton active={view === "easy"} onClick={() => setView("easy")}>🟢 Easy</TabButton>
        <TabButton active={view === "medium"} onClick={() => setView("medium")}>🟡 Medium</TabButton>
        <TabButton active={view === "hardcore"} onClick={() => setView("hardcore")}>🔴 Hardcore</TabButton>
      </div>

      {/* Overview: comparison table */}
      {view === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div
            style={{
              padding: "0.7rem 0.9rem",
              borderRadius: 12,
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: "0.74rem",
              lineHeight: 1.6,
              color: "#c3cad6",
            }}
          >
            <b style={{ color: "#fbbf24" }}>⏱ The 20-second warning</b> applies to every tier: leave the enforced
            surface (the tab for Easy, fullscreen for Medium/Hardcore) and a <b style={{ color: "#fff" }}>{GRACE_SEC}s</b>{" "}
            countdown starts. Return in time and the session continues — miss it and it fails.
          </div>

          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {TIERS.map((t, i) => (
              <button
                key={t.key}
                onClick={() => setView(t.key as "easy" | "medium" | "hardcore")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.8rem",
                  width: "100%",
                  padding: "0.75rem 0.9rem",
                  border: "none",
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: t.soft,
                    border: `1px solid ${t.color}44`,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {t.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#e6e9f0" }}>{t.name}</div>
                  <div style={{ fontSize: "0.68rem", color: "#9aa3b2", marginTop: "0.1rem" }}>{t.oneLine}</div>
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: t.color, flexShrink: 0 }}>
                  {t.key === "hardcore" ? `${hardcoreMultiplier(60)}×` : t.key === "medium" ? `${MEDIUM_RATE}` : `${EASY_RATE}`}
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              padding: "0.7rem 0.9rem",
              borderRadius: 12,
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.2)",
              fontSize: "0.72rem",
              color: "#9fb8a8",
              lineHeight: 1.55,
            }}
          >
            🍃 <b style={{ color: "#34d399" }}>Leaves</b> are your spendable currency — earn them from focused study,
            spend them in the Shop. Focus time also grows your lifetime <b style={{ color: "#e6e9f0" }}>Rank XP</b>,
            which never drops when you spend.
          </div>
        </div>
      )}

      {/* Tier detail */}
      {view !== "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {TIERS.filter((t) => t.key === view).map((t) => (
            <div key={t.key}>
              <div
                style={{
                  padding: "0.8rem 0.95rem",
                  borderRadius: 12,
                  background: t.soft,
                  border: `1px solid ${t.color}44`,
                  marginBottom: "0.6rem",
                }}
              >
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: t.color }}>
                  {t.emoji} {t.name} MODE
                </div>
                <div style={{ fontSize: "0.72rem", color: "#c3cad6", marginTop: "0.2rem" }}>{t.oneLine}</div>
              </div>

              <div
                style={{
                  padding: "0.8rem 0.95rem",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: "0.6rem",
                }}
              >
                <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "#9aa3b2", marginBottom: "0.4rem" }}>
                  HOW IT WORKS
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.73rem", lineHeight: 1.7, color: "#c3cad6" }}>
                  {t.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>

              {t.key === "hardcore" && (
                <div
                  style={{
                    padding: "0.8rem 0.95rem",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    marginBottom: "0.6rem",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "#9aa3b2", marginBottom: "0.4rem" }}>
                    MULTIPLIER & MIN WAGER
                  </div>
                  {[60, 120, 180, 240].map((m) => (
                    <div key={m} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.72rem" }}>
                      <span style={{ color: "#9aa3b2" }}>{m >= 60 ? `${m / 60} h` : `${m} min`}</span>
                      <span>
                        <b style={{ color: "#fbbf24" }}>{hardcoreMultiplier(m)}×</b>{" "}
                        <span style={{ color: "#9aa3b2" }}>· min {minWagerFor(m)} 🍃</span>
                      </span>
                    </div>
                  ))}
                  <div style={{ fontSize: "0.62rem", color: "#6b7280", marginTop: "0.45rem" }}>
                    Example rate: 1 h = {hardcoreRateFor(60).toFixed(1)} leaves/min · 4 h = {hardcoreRateFor(240).toFixed(1)} leaves/min.
                    Wagering above the minimum adds a risk bonus (1.5×→+0.5×, 3×→+1×, 5×→+2×).
                  </div>
                </div>
              )}

              <div
                style={{
                  padding: "0.7rem 0.95rem",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: "0.72rem",
                  color: "#c3cad6",
                  lineHeight: 1.5,
                }}
              >
                🎯 <b style={{ color: "#e6e9f0" }}>Best for:</b> {t.best}
              </div>
            </div>
          ))}

          <div
            style={{
              padding: "0.7rem 0.95rem",
              borderRadius: 12,
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.2)",
              fontSize: "0.72rem",
              color: "#9fb8a8",
              lineHeight: 1.55,
            }}
          >
            📱 <b style={{ color: "#34d399" }}>Multi-device boost:</b> in Hardcore, connect up to{" "}
            <b style={{ color: "#fff" }}>{DEVICE_BOOST_MAX_DEVICES} devices</b> (via 🔗 Hardcore Connect) — each adds
            +{DEVICE_BOOST_MAX_DEVICES * 5}% max ({5}% each) to the multiplier.
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <button onClick={onClose} className="fd-btn" style={{ padding: "0.55rem 2rem" }}>
          GOT IT
        </button>
      </div>
    </div>
  );
}
