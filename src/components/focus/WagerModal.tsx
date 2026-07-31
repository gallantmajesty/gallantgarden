import { useState } from "react";
import { useProfile } from "../../store/profile";
import { useHardcore, HARDCORE_RATE, HARDCORE_GRACE_SEC } from "../../store/hardcore";
import { usePomodoro, SESSION_OPTIONS } from "../../store/pomodoro";

interface WagerModalProps {
  onClose: () => void;
  /** Lock in a wager and start the hardcore session. */
  onStart: (wager: number, minutes: number) => void;
  /** Forfeit an active hardcore session (loses the wager). */
  onForfeit: () => void;
}

const WAGER_PRESETS = [10, 25, 50, 100, 250];

const C = {
  label: { fontSize: "0.7rem", color: "var(--color-genshin-bronze)", letterSpacing: "0.1em" },
  chip: (active: boolean): React.CSSProperties => ({
    fontSize: "0.75rem",
    fontFamily: "var(--font-mono-display)",
    background: active ? "rgba(180,150,60,0.2)" : "rgba(26,20,16,0.5)",
    border: active ? "1px solid rgba(180,150,60,0.5)" : "1px solid rgba(139,109,46,0.25)",
    color: active ? "var(--color-genshin-gold)" : "var(--color-genshin-bronze)",
    borderRadius: 2,
    padding: "4px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  }),
};

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WagerModal({ onClose, onStart, onForfeit }: WagerModalProps) {
  const balance = useProfile((s) => s.xp);
  const status = useHardcore((s) => s.status);
  const wager = useHardcore((s) => s.wager);
  const sessionMinutes = useHardcore((s) => s.sessionMinutes);
  const graceLeft = useHardcore((s) => s.graceLeft);
  const wonAmount = useHardcore((s) => s.wonAmount);
  const acknowledge = useHardcore((s) => s.acknowledge);
  const pomoMinutes = usePomodoro((s) => s.sessionMinutes);
  const remaining = usePomodoro((s) => s.remaining);

  const [minutes, setMinutes] = useState(pomoMinutes || 60);
  const [wagerStr, setWagerStr] = useState("");
  const [wagerVal, setWagerVal] = useState(25);

  const wagerNum = wagerStr.trim() ? parseInt(wagerStr, 10) : wagerVal;
  const validWager = Number.isFinite(wagerNum) && wagerNum >= 1 && wagerNum <= balance;
  const potentialWin = wagerNum >= 1 ? wagerNum + Math.round(minutes * HARDCORE_RATE) : 0;

  if (status === "active") {
    return (
      <div className="udm-body" style={{ padding: "1rem", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.85rem", letterSpacing: "0.15em", color: "var(--color-genshin-gold)", fontWeight: 700 }}>
            ⚔️ HARDCODE SESSION
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", marginTop: "0.25rem" }}>
            {sessionMinutes} min · fullscreen enforced
          </div>
        </div>

        <div className="genshin-card" style={{ padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--color-genshin-bronze)" }}>Leaves at risk</span>
            <span style={{ color: "var(--color-genshin-gold)", fontWeight: 700 }}>{wager} 🍃</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "0.35rem" }}>
            <span style={{ color: "var(--color-genshin-bronze)" }}>Time left</span>
            <span style={{ color: "var(--color-genshin-gold)", fontFamily: "var(--font-mono-display)" }}>{fmt(Math.max(0, remaining))}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "0.35rem" }}>
            <span style={{ color: "var(--color-genshin-bronze)" }}>If you win</span>
            <span style={{ color: "#8fd694", fontWeight: 700 }}>+{wager + Math.round(sessionMinutes * HARDCORE_RATE)} 🍃</span>
          </div>
        </div>

        {graceLeft > 0 && (
          <div
            style={{
              padding: "0.6rem",
              marginBottom: "0.75rem",
              border: "1px solid rgba(200,80,60,0.6)",
              background: "rgba(200,80,60,0.12)",
              textAlign: "center",
              fontSize: "0.8rem",
              color: "#ffb4a1",
            }}
          >
            ⚠️ RETURN TO FULLSCREEN IN <b>{graceLeft}s</b> — otherwise the session fails and your wager is lost.
          </div>
        )}

        <button
          onClick={() => { if (confirm("Forfeit this hardcore session? The wagered leaves will be lost.")) onForfeit(); }}
          className="genshin-btn genshin-btn-secondary"
          style={{ width: "100%", padding: "0.6rem", fontSize: "0.8rem", color: "rgba(220,120,100,1)" }}
        >
          FORFEIT SESSION — LOSE {wager} 🍃
        </button>
        <div style={{ textAlign: "center", marginTop: "0.6rem" }}>
          <button onClick={onClose} style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Back to focus domain
          </button>
        </div>
      </div>
    );
  }

  if (status === "won") {
    return (
      <div className="udm-body" style={{ padding: "1.5rem", textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>🏆</div>
        <div style={{ fontSize: "1rem", letterSpacing: "0.1em", color: "var(--color-genshin-gold)", fontWeight: 700 }}>
          SESSION COMPLETE — YOU WON
        </div>
        <div style={{ fontSize: "0.85rem", color: "#8fd694", marginTop: "0.6rem", fontWeight: 700 }}>
          +{wonAmount} leaves
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", marginTop: "0.4rem" }}>
          wager returned {wager} + hardcore earnings {Math.max(0, wonAmount - wager)} (10× rate)
        </div>
        <button
          onClick={() => { acknowledge(); onClose(); }}
          className="genshin-btn"
          style={{ marginTop: "1.2rem", padding: "0.6rem 2rem", fontSize: "0.85rem" }}
        >
          COLLECT
        </button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="udm-body" style={{ padding: "1.5rem", textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>💀</div>
        <div style={{ fontSize: "1rem", letterSpacing: "0.1em", color: "rgba(220,120,100,1)", fontWeight: 700 }}>
          SESSION FAILED
        </div>
        <div style={{ fontSize: "0.85rem", color: "rgba(220,140,120,1)", marginTop: "0.6rem" }}>
          -{wager} leaves lost
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", marginTop: "0.4rem" }}>
          You left fullscreen for more than {HARDCORE_GRACE_SEC}s (or ended the session early).
        </div>
        <button
          onClick={() => { acknowledge(); onClose(); }}
          className="genshin-btn genshin-btn-secondary"
          style={{ marginTop: "1.2rem", padding: "0.6rem 2rem", fontSize: "0.85rem" }}
        >
          ACKNOWLEDGE
        </button>
      </div>
    );
  }

  return (
    <div className="udm-body" style={{ padding: "1rem", maxWidth: 420 }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.85rem", letterSpacing: "0.15em", color: "var(--color-genshin-gold)", fontWeight: 700 }}>
          ⚔️ HARDCODE WAGER
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", marginTop: "0.25rem" }}>
          Balance: <b style={{ color: "var(--color-genshin-gold)" }}>{balance} 🍃</b>
        </div>
      </div>

      <div style={{ marginBottom: "0.9rem" }}>
        <div style={C.label}>SESSION DURATION</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "0.4rem" }}>
          {SESSION_OPTIONS.map((m) => (
            <button key={m} onClick={() => setMinutes(m)} style={C.chip(minutes === m)}>
              {m >= 60 ? `${m / 60}h` : `${m}m`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "0.9rem" }}>
        <div style={C.label}>WAGER (leaves at risk)</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "0.4rem", alignItems: "center" }}>
          {WAGER_PRESETS.map((w) => (
            <button key={w} onClick={() => { setWagerVal(w); setWagerStr(""); }} style={C.chip(!wagerStr.trim() && wagerVal === w)}>
              {w} 🍃
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={balance}
            placeholder="custom"
            value={wagerStr}
            onChange={(e) => setWagerStr(e.target.value)}
            style={{
              width: 70,
              padding: "4px 8px",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono-display)",
              background: "rgba(26,20,16,0.6)",
              border: "1px solid rgba(139,109,46,0.3)",
              color: "var(--color-genshin-gold)",
              borderRadius: 2,
              textAlign: "center",
              outline: "none",
            }}
          />
        </div>
      </div>

      <div className="genshin-card" style={{ padding: "0.6rem 0.9rem", marginBottom: "0.9rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
          <span style={{ color: "var(--color-genshin-bronze)" }}>Potential win</span>
          <span style={{ color: "#8fd694", fontWeight: 700 }}>+{validWager ? potentialWin : 0} 🍃</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginTop: "0.3rem", color: "var(--color-genshin-bronze)" }}>
          <span>Hardcore rate</span>
          <span>{HARDCORE_RATE} leaves/min (10× normal)</span>
        </div>
      </div>

      <div style={{ fontSize: "0.65rem", color: "var(--color-genshin-bronze)", lineHeight: 1.5, marginBottom: "0.9rem" }}>
        The session runs in fullscreen. Switching tabs is allowed and the timer keeps running — but leaving
        fullscreen for more than {HARDCORE_GRACE_SEC}s fails the session and you lose your wager. On success you
        get your wager back plus {HARDCORE_RATE} leaves/min.
      </div>

      <button
        disabled={!validWager}
        onClick={() => onStart(wagerNum, minutes)}
        className="genshin-btn"
        style={{
          width: "100%",
          padding: "0.65rem",
          fontSize: "0.85rem",
          letterSpacing: "0.1em",
          opacity: validWager ? 1 : 0.4,
          cursor: validWager ? "pointer" : "not-allowed",
        }}
      >
        {validWager ? `LOCK IN ${wagerNum} 🍃 & START` : "ENTER A VALID WAGER"}
      </button>
      {!validWager && wagerNum > balance && (
        <div style={{ textAlign: "center", fontSize: "0.65rem", color: "rgba(220,120,100,1)", marginTop: "0.4rem" }}>
          You only have {balance} leaves.
        </div>
      )}
    </div>
  );
}
