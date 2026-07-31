import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OwnerPanel } from "./OwnerPanel";

const OWNER_PIN = import.meta.env.VITE_OWNER_PIN || "";

export function OwnerPage() {
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const navigate = useNavigate();

  const handlePin = () => {
    if (pinInput === OWNER_PIN) { setAuthed(true); setPinError(""); }
    else setPinError("Wrong PIN");
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a14", padding: "1rem" }}>
        <div style={{ background: "#1a1420", border: "1px solid rgba(139,109,46,0.25)", borderRadius: 4, padding: "2rem", maxWidth: 360, width: "100%" }}>
          <h2 style={{ color: "#c9a84c", fontFamily: "serif", marginBottom: "1rem", letterSpacing: "0.05em", fontSize: "1.2rem" }}>⟡ STUDYFOREST ADMIN</h2>
          <p style={{ fontSize: "0.75rem", color: "#8B6D2E", marginBottom: "1rem" }}>Enter your admin PIN:</p>
          <input style={{ width: "100%", marginBottom: "0.75rem", fontSize: "0.85rem", letterSpacing: "0.2em", textAlign: "center", padding: "0.5rem", background: "#0a0a14", border: "1px solid rgba(139,109,46,0.3)", borderRadius: 2, color: "#c9a84c", outline: "none" }} type="password" placeholder="••••" value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePin()} />
          {pinError && <div style={{ fontSize: "0.7rem", color: "#e55", marginBottom: "0.5rem" }}>{pinError}</div>}
          <button onClick={handlePin} style={{ width: "100%", fontSize: "0.8rem", padding: "0.5rem", background: "rgba(201,168,76,0.15)", border: "1px solid #c9a84c", color: "#c9a84c", borderRadius: 2, cursor: "pointer", fontFamily: "serif" }}>Unlock</button>
          <button onClick={() => navigate(-1)} style={{ marginTop: "0.75rem", width: "100%", fontSize: "0.7rem", color: "#8B6D2E", background: "transparent", border: "none", cursor: "pointer" }}>← Back</button>
        </div>
      </div>
    );
  }

  return <OwnerPanel />;
}
