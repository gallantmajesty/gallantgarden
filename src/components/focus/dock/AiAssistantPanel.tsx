import { useState, useRef, useEffect } from "react";
import { supabase } from "../../../lib/insforge";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AiAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-proxy", {
        body: {
          messages: [
            {
              role: "system",
              content: "You are Jarvis, a helpful study assistant inside Focus Lily — a student productivity app. Answer concisely and clearly. Use plain text, no markdown fences. If the student asks about study techniques, focus methods, or academic topics, give practical advice."
            },
            ...updated.map(m => ({ role: m.role, content: m.content }))
          ],
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 2000,
        },
      });

      if (fnError) throw fnError;

      const reply = data?.content || "No response";
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-genshin-divider)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)" }}>
          JARVIS AI
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--color-genshin-bronze)", opacity: 0.6 }}>
          Powered by OpenAI
        </span>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", opacity: 0.6, lineHeight: 1.6 }}>
              Ask me anything about your studies, focus techniques, or just chat.
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