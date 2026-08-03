import { useState } from "react";
import { useProfile } from "../../store/profile";
import {
  useHardcore,
  hardcoreRateFor,
  hardcoreMultiplier,
  minWagerFor,
  wagerBonusMultiplier,
  effectiveMultiplier,
  deviceBoostMultiplier,
  GRACE_SEC,
  type FocusMode,
} from "../../store/hardcore";
import { usePomodoro, SESSION_OPTIONS } from "../../store/pomodoro";
import { useDeviceBoost } from "../../lib/deviceBoost";
import { DeviceConnect } from "./DeviceConnect";

interface WagerModalProps {
  onClose: () => void;
  /** Lock in a wager and start the hardcore session. */
  onStart: (mode: FocusMode, wager: number, minutes: number) => void;
  /** Forfeit an active hardcore session (loses the wager). */
  onForfeit: () => void;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function card(label: string, value: React.ReactNode, accent = "#e6e9f0"): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    padding: "0.55rem 0.75rem",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: "0.78rem",
  };
}

export function WagerModal({ onClose, onStart, onForfeit }: WagerModalProps) {
  const balance = useProfile((s) => s.xp);
  const status = useHardcore((s) => s.status);
  const wager = useHardcore((s) => s.wager);
  const sessionMinutes = useHardcore((s) => s.sessionMinutes);
  const graceLeft = useHardcore((s) => s.graceLeft);
  const wonAmount = useHardcore((s) => s.wonAmount);
  const lastMultiplier = useHardcore((s) => s.lastMultiplier);
  const devices = useHardcore((s) => s.devices);
  const acknowledge = useHardcore((s) => s.acknowledge);
  const pomoMinutes = usePomodoro((s) => s.sessionMinutes);
  const remaining = usePomodoro((s) => s.remaining);

  const boost = useDeviceBoost();
  const [minutes, setMinutes] = useState(pomoMinutes || 60);
  const [wagerStr, setWagerStr] = useState("");
  const [wagerVal, setWagerVal] = useState(() => minWagerFor(pomoMinutes || 60));

  const wagerNum = wagerStr.trim() ? parseInt(wagerStr, 10) : wagerVal;
  const minWager = minWagerFor(minutes);
  const riskMult = wagerBonusMultiplier(wagerNum, minutes);
  const deviceMult = deviceBoostMultiplier(boost.deviceCount);
  const effMult = effectiveMultiplier(minutes, wagerNum, boost.deviceCount);
  const rate = hardcoreRateFor(minutes);
  const validWager = Number.isFinite(wagerNum) && wagerNum >= minWager && wagerNum <= balance;
  const potentialWin = validWager ? wagerNum + Math.round(minutes * rate * (effMult / hardcoreMultiplier(minutes))) : 0;

  if (status === "active") {
    const activeMult = effectiveMultiplier(sessionMinutes, wager, devices);
    const activeEarnings = Math.round(sessionMinutes * hardcoreRateFor(sessionMinutes) * (activeMult / hardcoreMultiplier(sessionMinutes)));
    return (
      <div className="fd-modal-body" style={{ padding: "1rem", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.85rem", letterSpacing: "0.15em", color: "#f87171", fontWeight: 700 }}>
            🔴 HARDCORE SESSION
          </div>
          <div style={{ fontSize: "0.7rem", color: "#9aa3b2", marginTop: "0.25rem" }}>
            {sessionMinutes} min · <b style={{ color: "#fbbf24" }}>{activeMult}×</b> · fullscreen enforced
            {devices > 0 && <span> · 📱 +{devices} devices</span>}
          </div>
        </div>

        <div className="fd-card" style={{ marginBottom: "0.75rem" }}>
          <div style={card("Leaves at risk", <b style={{ color: "#f87171" }}>{wager} 🍃</b>)} />
          <div style={{ ...card("Time left", <b style={{ color: "#fbbf24", fontFamily: "var(--font-mono-display)" }}>{fmt(Math.max(0, remaining))}</b>), marginTop: "0.35rem" }} />
          <div style={{ ...card("If you win", <b style={{ color: "#34d399" }}>+{wager + activeEarnings} 🍃</b>), marginTop: "0.35rem" }} />
        </div>

        {graceLeft > 0 && (
          <div
            style={{
              padding: "0.6rem 0.75rem",
              marginBottom: "0.75rem",
              border: "1px solid rgba(248,113,113,0.5)",
              background: "rgba(248,113,113,0.1)",
              textAlign: "center",
              fontSize: "0.8rem",
              color: "#fda4af",
              borderRadius: 10,
            }}
          >
            ⚠️ RETURN TO FULLSCREEN IN <b>{graceLeft}s</b> — otherwise the session fails and your wager is lost.
          </div>
        )}

        <button
          onClick={() => { if (confirm("Forfeit this hardcore session? The wagered leaves will be lost.")) onForfeit(); }}
          className="fd-btn fd-btn-danger"
          style={{ width: "100%" }}
        >
          FORFEIT SESSION — LOSE {wager} 🍃
        </button>
        <div style={{ textAlign: "center", marginTop: "0.6rem" }}>
          <button onClick={onClose} className="fd-link">Back to focus domain</button>
        </div>
      </div>
    );
  }

  if (status === "won") {
    return (
      <div className="fd-modal-body" style={{ padding: "1.5rem", textAlign: "center", maxWidth: 460 }}>
        <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>🏆</div>
        <div style={{ fontSize: "1rem", letterSpacing: "0.1em", color: "#34d399", fontWeight: 700 }}>
          SESSION COMPLETE — YOU WON
        </div>
        <div style={{ fontSize: "0.9rem", color: "#34d399", marginTop: "0.6rem", fontWeight: 700 }}>
          +{wonAmount} leaves
        </div>
        <div style={{ fontSize: "0.7rem", color: "#9aa3b2", marginTop: "0.4rem" }}>
          wager returned {wager} + hardcore earnings {Math.max(0, wonAmount - wager)} ({lastMultiplier || hardcoreMultiplier(sessionMinutes)}× rate)
        </div>
        <button
          onClick={() => { acknowledge(); onClose(); }}
          className="fd-btn"
          style={{ marginTop: "1.2rem", width: "100%" }}
        >
          COLLECT
        </button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="fd-modal-body" style={{ padding: "1.5rem", textAlign: "center", maxWidth: 460 }}>
        <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>💀</div>
        <div style={{ fontSize: "1rem", letterSpacing: "0.1em", color: "#f87171", fontWeight: 700 }}>
          SESSION FAILED
        </div>
        <div style={{ fontSize: "0.85rem", color: "#fda4af", marginTop: "0.6rem" }}>
          -{wager} leaves lost
        </div>
        <div style={{ fontSize: "0.7rem", color: "#9aa3b2", marginTop: "0.4rem" }}>
          You left fullscreen for more than {GRACE_SEC}s (or ended the session early).
        </div>
        <button
          onClick={() => { acknowledge(); onClose(); }}
          className="fd-btn fd-btn-danger"
          style={{ marginTop: "1.2rem", width: "100%" }}
        >
          ACKNOWLEDGE
        </button>
      </div>
    );
  }

  return (
    <div className="fd-modal-body" style={{ padding: "1rem", maxWidth: 460 }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.9rem", letterSpacing: "0.15em", color: "#f87171", fontWeight: 700 }}>
          🔴 HARDCORE WAGER
        </div>
        <div style={{ fontSize: "0.7rem", color: "#9aa3b2", marginTop: "0.25rem" }}>
          Balance: <b style={{ color: "#fbbf24" }}>{balance.toLocaleString()} 🍃</b>
        </div>
      </div>

      {/* Duration */}
      <div style={{ marginBottom: "0.9rem" }}>
        <div className="fd-label">SESSION DURATION</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "0.4rem" }}>
          {SESSION_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => { setMinutes(m); setWagerVal(minWagerFor(m)); setWagerStr(""); }}
              className={`fd-chip ${minutes === m ? "active" : ""}`}
            >
              {m >= 60 ? `${m / 60}h` : `${m}m`}
            </button>
          ))}
        </div>
        <div style={{ fontSize: "0.62rem", color: "#9aa3b2", marginTop: "0.35rem" }}>
          Longer session → higher multiplier <b style={{ color: "#fbbf24" }}>{hardcoreMultiplier(minutes)}×</b> and higher minimum wager
          <b style={{ color: "#fbbf24" }}> {minWager} 🍃</b>.
        </div>
      </div>

      {/* Wager */}
      <div style={{ marginBottom: "0.9rem" }}>
        <div className="fd-label">WAGER (min {minWager} 🍃 · risk bonus {riskMult > 0 ? `+${riskMult}×` : "no bonus yet"})</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "0.4rem", alignItems: "center" }}>
          {[minWager, Math.max(minWager, Math.round(minWager * 2)), Math.max(minWager, Math.round(minWager * 3)), Math.max(minWager, Math.round(minWager * 5))].map((w) => (
            <button
              key={w}
              onClick={() => { setWagerVal(w); setWagerStr(""); }}
              className={`fd-chip ${!wagerStr.trim() && wagerVal === w ? "active" : ""}`}
              disabled={w > balance}
            >
              {w} 🍃
            </button>
          ))}
          <input
            type="number"
            min={minWager}
            max={balance}
            placeholder="custom"
            value={wagerStr}
            onChange={(e) => setWagerStr(e.target.value)}
            className="fd-input"
            style={{ width: 70, textAlign: "center" }}
          />
        </div>
        <div style={{ fontSize: "0.62rem", color: "#9aa3b2", marginTop: "0.35rem" }}>
          Wagering <b>1.5×</b> the minimum adds <b>+0.5×</b> · <b>3×</b> adds <b>+1×</b> · <b>5×</b> adds <b>+2×</b>. The more you risk, the more you win.
        </div>
      </div>

      {/* Device boost */}
      <div style={{ marginBottom: "0.9rem" }}>
        <div className="fd-label">📱 MULTI-DEVICE BOOST (more devices = more reward)</div>
        <div style={{ marginTop: "0.4rem" }}>
          <DeviceConnect compact autoHost />
        </div>
      </div>

      {/* Summary */}
      <div className="fd-card" style={{ marginBottom: "0.9rem" }}>
        <div style={card("Base multiplier", <b style={{ color: "#fbbf24" }}>{hardcoreMultiplier(minutes)}×</b>)} />
        <div style={{ ...card("Risk bonus", <b style={{ color: riskMult > 0 ? "#34d399" : "#9aa3b2" }}>{riskMult > 0 ? `+${riskMult}×` : "—"}</b>), marginTop: "0.3rem" }} />
        <div style={{ ...card("Device boost", <b style={{ color: deviceMult > 0 ? "#34d399" : "#9aa3b2" }}>{deviceMult > 0 ? `+${deviceMult}×` : "—"}</b>), marginTop: "0.3rem" }} />
        <div style={{ ...card("Effective multiplier", <b style={{ color: "#fbbf24" }}>{effMult}×</b>), marginTop: "0.3rem" }} />
        <div style={{ ...card("Hardcore rate", <b style={{ color: "#fbbf24" }}>{(rate * effMult / hardcoreMultiplier(minutes)).toFixed(2)} leaves/min</b>), marginTop: "0.3rem" }} />
        <div style={{ ...card("Potential win", <b style={{ color: "#34d399" }}>+{validWager ? potentialWin.toLocaleString() : 0} 🍃</b>), marginTop: "0.3rem" }} />
      </div>

      <div style={{ fontSize: "0.65rem", color: "#9aa3b2", lineHeight: 1.5, marginBottom: "0.9rem" }}>
        Runs in fullscreen. Switching tabs is allowed and the timer keeps running — but leaving fullscreen for more than {GRACE_SEC}s fails the session and you lose your wager. On success you get your wager back plus scaled earnings.
      </div>

      <button
        disabled={!validWager}
        onClick={() => { onStart("hardcore", wagerNum, minutes); }}
        className="fd-btn fd-btn-danger"
        style={{ width: "100%", opacity: validWager ? 1 : 0.4, cursor: validWager ? "pointer" : "not-allowed" }}
      >
        {validWager ? `LOCK IN ${wagerNum} 🍃 & START (${effMult}×)` : wagerNum < minWager ? `MINIMUM WAGER IS ${minWager} 🍃` : "ENTER A VALID WAGER"}
      </button>
      {!validWager && wagerNum > balance && (
        <div style={{ textAlign: "center", fontSize: "0.65rem", color: "#fda4af", marginTop: "0.4rem" }}>
          You only have {balance.toLocaleString()} leaves.
        </div>
      )}
    </div>
  );
}
