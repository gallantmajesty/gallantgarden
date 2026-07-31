import { useState } from "react";
import { useNavigate } from "react-router-dom";

const OWNER_PIN = import.meta.env.VITE_OWNER_PIN || "";

export function OwnerPinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const navigate = useNavigate();

  const handlePin = () => {
    if (pinInput === OWNER_PIN) { onUnlock(); setPinError(""); }
    else setPinError("Wrong PIN");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a14", padding: "1rem" }}>
      <div style={{ background: "var(--color-genshin-card)", border: "1px solid var(--color-genshin-divider)", borderRadius: 4, padding: "2rem", maxWidth: 360, width: "100%" }}>
        <h2 style={{ color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)", marginBottom: "1rem", letterSpacing: "0.05em" }}>⟡ STUDYFOREST ADMIN</h2>
        <p style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", marginBottom: "1rem" }}>Enter your admin PIN:</p>
        <input className="genshin-input" style={{ width: "100%", marginBottom: "0.75rem", fontSize: "0.85rem", letterSpacing: "0.2em", textAlign: "center" }} type="password" placeholder="••••" value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePin()} />
        {pinError && <div style={{ fontSize: "0.7rem", color: "#e55", marginBottom: "0.5rem" }}>{pinError}</div>}
        <button onClick={handlePin} className="genshin-btn" style={{ width: "100%", fontSize: "0.8rem", padding: "0.5rem" }}>Unlock Panel</button>
        <button onClick={() => navigate(-1)} style={{ marginTop: "0.75rem", width: "100%", fontSize: "0.7rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}>← Back</button>
      </div>
    </div>
  );
}
