import { useState } from "react";

export function AiAssistantPanel() {
  const [query, setQuery] = useState("");
  const [activeService, setActiveService] = useState<"chatgpt" | "claude" | "perplexity" | "notebooklm">("chatgpt");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const serviceConfigs = {
    chatgpt: { label: "ChatGPT", color: "#10A37F" },
    claude: { label: "Claude", color: "#D97706" },
    perplexity: { label: "Perplexity", color: "#1E90FF" },
    notebooklm: { label: "NotebookLM", color: "#7C3AED" },
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setResponse(
        `[${serviceConfigs[activeService].label}]\n\nGreat question! Here's a summary for "${query}":\n\n• This is a demo integration panel.\n• In production, connect to the real API.\n• Use your study materials for context.\n\nTip: Try asking about your locker tasks or study notes.`
      );
      setLoading(false);
    }, 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 4, padding: "0.75rem", borderBottom: "1px solid var(--color-genshin-divider)" }}>
        {(Object.entries(serviceConfigs) as [typeof activeService, typeof serviceConfigs["chatgpt"]][]).map(
          ([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveService(key)}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: 2,
                fontSize: "0.75rem",
                fontWeight: 500,
                transition: "all 0.2s",
                background: activeService === key ? `${cfg.color}22` : "transparent",
                border: `1px solid ${activeService === key ? cfg.color : "rgba(139,109,46,0.2)"}`,
                color: activeService === key ? cfg.color : "var(--color-genshin-bronze)",
                cursor: "pointer",
                fontFamily: "var(--font-serif-heading)",
              }}
            >
              {cfg.label}
            </button>
          )
        )}
      </div>

      <div className="genshin-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
        {response && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: 2,
              marginBottom: "0.75rem",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              background: "rgba(26, 20, 16, 0.3)",
              color: "var(--color-genshin-gold-light)",
              fontFamily: "var(--font-serif-heading)",
            }}
          >
            {response}
          </div>
        )}
      </div>

      <div style={{ padding: "0.75rem", borderTop: "1px solid var(--color-genshin-divider)" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            className="genshin-input"
            style={{ flex: 1, fontSize: "0.875rem" }}
            placeholder="Ask a study question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuery()}
          />
          <button
            onClick={handleQuery}
            disabled={loading}
            className="genshin-btn"
            style={{ padding: "0.5rem 1rem", fontSize: "0.75rem" }}
          >
            {loading ? "..." : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
