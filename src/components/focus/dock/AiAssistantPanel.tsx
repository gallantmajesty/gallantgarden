import { useState, useRef, useEffect } from "react";
import { jarvisChat, loadAIConfig, saveAIConfig } from "../../../lib/ai/jarvis";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AiAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(!loadAIConfig());
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSetup = () => {
    if (!apiKey.trim()) return;
    saveAIConfig({ provider, apiKey: apiKey.trim(), model });
    setShowSetup(false);
    setError(null);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!loadAIConfig()) {
      setShowSetup(true);
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const reply = await jarvisChat(updated);
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch (e: any) {
      if (e?.message === "NO_API_KEY") {
        setShowSetup(true);
      } else {
        setError(e?.message ?? "Request failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (showSetup) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1rem", gap: "0.75rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)" }}>
          SETUP AI ASSISTANT
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--color-genshin-bronze)", lineHeight: 1.5 }}>
          Add your own API key to chat with AI. Your key stays in this browser only.
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {(["openai", "anthropic"] as const).map((p) => (
            <button
              key={p}
              onClick={() => { setProvider(p); setModel(p === "openai" ? "gpt-4o-mini" : "claude-sonnet-4-20250514"); }}
              style={{
                flex: 1,
                padding: "0.375rem",
                borderRadius: 2,
                fontSize: "0.7rem",
                fontWeight: 500,
                transition: "all 0.2s",
                background: provider === p ? "rgba(201, 168, 76, 0.15)" : "transparent",
                border: `1px solid ${provider === p ? "var(--color-genshin-gold)" : "rgba(139,109,46,0.2)"}`,
                color: provider === p ? "var(--color-genshin-gold)" : "var(--color-genshin-bronze)",
                cursor: "pointer",
                fontFamily: "var(--font-serif-heading)",
              }}
            >
              {p === "openai" ? "OpenAI" : "Anthropic"}
            </button>
          ))}
        </div>

        <input
          className="genshin-input"
          style={{ fontSize: "0.75rem" }}
          type="password"
          placeholder="Paste your API key..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSetup()}
        />

        <div style={{ display: "flex", gap: 4 }}>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              flex: 1,
              padding: "0.375rem 0.5rem",
              borderRadius: 2,
              fontSize: "0.7rem",
              background: "rgba(26, 20, 16, 0.6)",
              border: "1px solid rgba(139,109,46,0.2)",
              color: "var(--color-genshin-gold-light)",
              fontFamily: "var(--font-serif-heading)",
            }}
          >
            {provider === "openai" ? (
              <>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </>
            ) : (
              <>
                <option value="claude-sonnet-4-20250514">Claude Sonnet</option>
                <option value="claude-3-5-haiku-20241022">Claude Haiku</option>
              </>
            )}
          </select>
        </div>

        <button onClick={handleSetup} className="genshin-btn" style={{ fontSize: "0.75rem" }}>
          Save & Start Chatting
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-genshin-divider)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)" }}>
          JARVIS AI
        </span>
        <button
          onClick={() => setShowSetup(true)}
          style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-serif-heading)" }}
        >
          Settings
        </button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6, lineHeight: 1.6 }}>
              Ask me anything about your studies.
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: 2,
              fontSize: "0.8rem",
              lineHeight: 1.5,
              maxWidth: "85%",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              background: msg.role === "user" ? "rgba(201, 168, 76, 0.12)" : "rgba(26, 20, 16, 0.4)",
              border: `1px solid ${msg.role === "user" ? "rgba(201,168,76,0.2)" : "rgba(139,109,46,0.1)"}`,
              color: "var(--color-genshin-gold-light)",
              fontFamily: "var(--font-serif-heading)",
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div style={{ padding: "0.5rem 0.75rem", borderRadius: 2, fontSize: "0.75rem", alignSelf: "flex-start", background: "rgba(26, 20, 16, 0.4)", border: "1px solid rgba(139,109,46,0.1)", color: "var(--color-genshin-bronze)", fontFamily: "var(--font-serif-heading)" }}>
            Thinking...
          </div>
        )}

        {error && (
          <div style={{ padding: "0.5rem 0.75rem", borderRadius: 2, fontSize: "0.7rem", background: "rgba(180, 60, 40, 0.12)", border: "1px solid rgba(180, 60, 40, 0.3)", color: "#e55", fontFamily: "var(--font-serif-heading)" }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ padding: "0.5rem 0.75rem", borderTop: "1px solid var(--color-genshin-divider)", display: "flex", gap: "0.5rem" }}>
        <input
          className="genshin-input"
          style={{ flex: 1, fontSize: "0.8rem" }}
          placeholder="Ask a study question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="genshin-btn"
          style={{ padding: "0.375rem 0.75rem", fontSize: "0.7rem", opacity: loading || !input.trim() ? 0.5 : 1 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
