import type { ScholarPresence } from "../../hooks/focus/types";

interface MultiplayerBarProps {
  scholars: ScholarPresence[];
  activeCount: number;
  totalCount: number;
}

export function MultiplayerBar({ scholars, activeCount, totalCount }: MultiplayerBarProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.5rem 1rem",
      fontSize: "0.75rem",
      borderTop: "1px solid var(--color-genshin-divider)",
      background: "rgba(26, 20, 16, 0.5)",
    }}>
      <span style={{ color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)" }}>
        LIBRARY REALM
      </span>
      <span style={{ color: "var(--color-genshin-bronze)" }}>
        {activeCount}/{totalCount} scholars studying
      </span>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {scholars.filter((s) => s.isStudying).slice(0, 6).map((s) => (
          <span
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.125rem 0.5rem",
              borderRadius: 4,
              background: "rgba(201, 168, 76, 0.1)",
              border: "1px solid rgba(201, 168, 76, 0.15)",
              color: "var(--color-genshin-gold-light)",
              fontFamily: "var(--font-serif-heading)",
              fontSize: "0.65rem",
            }}
            title={`${s.name} · ${s.rank} · ${Math.floor(s.focusMinutes / 60)}h ${s.focusMinutes % 60}m`}
          >
            {s.rankBadge} {s.name}
          </span>
        ))}
        {activeCount > 6 && (
          <span style={{ color: "var(--color-genshin-bronze)", fontSize: "0.65rem" }}>
            +{activeCount - 6} more
          </span>
        )}
      </div>
    </div>
  );
}
