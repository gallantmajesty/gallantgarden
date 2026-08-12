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
    name: "Easy",
    color: "#34d399",
    soft: "rgba(52,211,153,0.12)",
    oneLine: "Free & flexible — start anywhere, no risk.",
    bullets: [
      `${EASY_RATE} leaves/min · no fullscreen · no wager`,
      "Leave the tab and the timer just pauses — come back and it resumes. Nothing is lost.",
      "With breaks: each completed segment banks its leaves immediately.",
      "Without breaks: everything is granted at the end.",
      "Quit early → keep already-banked splits, lose the rest.",
    ],
    best: "First timers, casual study, zero-risk focus.",
  },
  {
    key: "medium",
    name: "Medium",
    color: "#fbbf24",
    soft: "rgba(251,191,36,0.12)",
    oneLine: "Fullscreen discipline — higher rate, one payout.",
    bullets: [
      `${MEDIUM_RATE} leaves/min · fullscreen required · no wager`,
      "Breaks are allowed, but rewards are granted only at session end.",
      "Exiting fullscreen starts the 20s warning — return (press F) or it fails.",
      "Tab switching is fine — fullscreen is what's enforced.",
    ],
    best: "Serious blocks without risking leaves.",
  },
  {
    key: "hardcore",
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

/* ---- small inline SVGs ---- */
function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 8px ${color}`,
        flexShrink: 0,
      }}
    />
  );
}
function IconWarn({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
function IconLeaf({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20C4 11 9 4 20 4c0 11-7 16-16 16z" />
      <path d="M4 20c4-6 8-10 13-13" />
    </svg>
  );
}
function IconDevice({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}
function IconTarget({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
function IconBook({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function HelpGuide({ onClose }: HelpGuideProps) {
  const [view, setView] = useState<"overview" | "easy" | "medium" | "hardcore">("overview");

  return (
    <div className="fd-help-overlay" onClick={onClose}>
      <div className="fd-help-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fd-help-head">
          <div className="fd-help-title">
            <IconBook /> FOCUS MODE GUIDE
            <span className="fd-help-title-rule" />
          </div>
          <button className="fd-help-close" onClick={onClose} aria-label="Close guide">✕</button>
        </div>

        <div className="fd-help-body">
          <div className="fd-help-sub">
            Every session runs in one of three tiers — pick your commitment level.
          </div>

          {/* Tab bar */}
          <div className="fd-help-tabs">
            <button className={`fd-help-tab ${view === "overview" ? "active" : ""}`} onClick={() => setView("overview")}>
              Overview
            </button>
            {TIERS.map((t) => (
              <button
                key={t.key}
                className={`fd-help-tab ${view === t.key ? "active" : ""}`}
                onClick={() => setView(t.key as "easy" | "medium" | "hardcore")}
              >
                <Dot color={t.color} /> {t.name}
              </button>
            ))}
          </div>

          {/* Overview: comparison table */}
          {view === "overview" && (
            <>
              <div className="fd-help-card fd-help-note">
                <IconWarn />
                <span>
                  <b className="fd-help-note-ember">The {GRACE_SEC}-second warning</b> applies to Medium and
                  Hardcore: leave fullscreen and a <b>{GRACE_SEC}s</b> countdown starts — press{" "}
                  <b>F</b> (or the button) to re-enter, or the session fails. Easy has no warning: leaving
                  the tab simply pauses the timer.
                </span>
              </div>

              <div className="fd-help-card" style={{ padding: 0 }}>
                {TIERS.map((t, i) => (
                  <button
                    key={t.key}
                    className="fd-help-row"
                    onClick={() => setView(t.key as "easy" | "medium" | "hardcore")}
                  >
                    <span className="fd-help-row-icon" style={{ background: t.soft, border: `1px solid ${t.color}44` }}>
                      <Dot color={t.color} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="fd-help-row-name">
                        {t.name}
                        {t.key === "hardcore" && <span className="fd-help-badge">COMING SOON</span>}
                      </span>
                      <div className="fd-help-row-sub">{t.oneLine}</div>
                    </span>
                    <span className="fd-help-row-rate" style={{ color: t.color }}>
                      {t.key === "hardcore" ? `${hardcoreMultiplier(60)}×` : t.key === "medium" ? `${MEDIUM_RATE}` : `${EASY_RATE}`}
                    </span>
                  </button>
                ))}
              </div>

              <div className="fd-help-card-moss fd-help-note fd-help-note-moss">
                <IconLeaf />
                <span>
                  <b style={{ color: "#34d399" }}>Leaves</b> are your spendable currency — earn them from
                  focused study, spend them in the Shop. Focus time also grows your lifetime{" "}
                  <b style={{ color: "var(--fd-ivory)" }}>Rank XP</b>, which never drops when you spend.
                </span>
              </div>
            </>
          )}

          {/* Tier detail */}
          {view !== "overview" && (
            <>
              {TIERS.filter((t) => t.key === view).map((t) => (
                <div key={t.key} className="fd-help-detail">
                  <div className="fd-help-card" style={{ background: t.soft, borderColor: `${t.color}55` }}>
                    <div className="fd-help-tiername" style={{ color: t.color }}>
                      <Dot color={t.color} /> {t.name.toUpperCase()} MODE
                    </div>
                    <div className="fd-help-row-sub">{t.oneLine}</div>
                  </div>

                  <div className="fd-help-card">
                    <div className="fd-help-label">How it works</div>
                    <ul className="fd-help-list">
                      {t.bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>

                  {t.key === "hardcore" && (
                    <div className="fd-help-card">
                      <div className="fd-help-label">Multiplier & min wager</div>
                      {[60, 120, 180, 240].map((m) => (
                        <div key={m} className="fd-help-mult">
                          <span>{m >= 60 ? `${m / 60} h` : `${m} min`}</span>
                          <span>
                            <b>{hardcoreMultiplier(m)}×</b>{" "}
                            <span>· min {minWagerFor(m)} leaves</span>
                          </span>
                        </div>
                      ))}
                      <div className="fd-help-hint" style={{ textAlign: "left", marginTop: "0.5rem" }}>
                        Example rate: 1 h = {hardcoreRateFor(60).toFixed(1)} leaves/min · 4 h = {hardcoreRateFor(240).toFixed(1)} leaves/min.
                        Wagering above the minimum adds a risk bonus (1.5×→+0.5×, 3×→+1×, 5×→+2×).
                      </div>
                      <div className="fd-help-soon">
                        COMING SOON — WAGERED SESSIONS ARRIVE IN AN UPCOMING UPDATE
                      </div>
                    </div>
                  )}

                  <div className="fd-help-card fd-help-note">
                    <IconTarget />
                    <span>
                      <b>Best for:</b> {t.best}
                    </span>
                  </div>
                </div>
              ))}

              <div className="fd-help-card-moss fd-help-note fd-help-note-moss">
                <IconDevice />
                <span>
                  <b style={{ color: "#34d399" }}>Multi-device boost:</b> in Hardcore, connect up to{" "}
                  <b style={{ color: "var(--fd-ivory)" }}>{DEVICE_BOOST_MAX_DEVICES} devices</b> (via Hardcore
                  Connect) — each adds +{DEVICE_BOOST_MAX_DEVICES * 5}% max ({5}% each) to the multiplier.
                </span>
              </div>
            </>
          )}

          <div className="fd-help-foot">
            <button onClick={onClose} className="fd-btn fd-btn-primary">
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
