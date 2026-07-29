export function CornerFiligree() {
  const baseStyle: React.CSSProperties = {
    position: "fixed",
    pointerEvents: "none",
    zIndex: 50,
  };

  return (
    <>
      <svg
        style={{ ...baseStyle, top: 0, left: 0 }}
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
      >
        <rect x="0" y="0" width="80" height="1" fill="url(#goldGradTL)" />
        <rect x="0" y="0" width="1" height="80" fill="url(#goldGradTL)" />
        <path d="M20 1 L1 1 L1 20" stroke="url(#goldGradTL)" strokeWidth="1.5" fill="none" />
        <path d="M12 1 L1 1 L1 12" stroke="url(#goldGradTL)" strokeWidth="0.5" fill="none" opacity="0.5" />
        <circle cx="1" cy="1" r="3" fill="url(#goldGradTL)" opacity="0.8" />
        <circle cx="1" cy="1" r="1.5" fill="#C9A84C" />
        <path d="M6 6 Q10 2 14 6 Q10 10 6 6Z" fill="url(#goldGradTL)" opacity="0.4" />
        <path d="M6 6 Q2 10 6 14 Q10 10 6 6Z" fill="url(#goldGradTL)" opacity="0.3" />
        <defs>
          <linearGradient id="goldGradTL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="1" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        style={{ ...baseStyle, top: 0, right: 0 }}
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
      >
        <rect x="0" y="0" width="80" height="1" fill="url(#goldGradTR)" />
        <rect x="79" y="0" width="1" height="80" fill="url(#goldGradTR)" />
        <path d="M60 1 L79 1 L79 20" stroke="url(#goldGradTR)" strokeWidth="1.5" fill="none" />
        <path d="M68 1 L79 1 L79 12" stroke="url(#goldGradTR)" strokeWidth="0.5" fill="none" opacity="0.5" />
        <circle cx="79" cy="1" r="3" fill="url(#goldGradTR)" opacity="0.8" />
        <circle cx="79" cy="1" r="1.5" fill="#C9A84C" />
        <path d="M74 6 Q70 2 66 6 Q70 10 74 6Z" fill="url(#goldGradTR)" opacity="0.4" />
        <path d="M74 6 Q78 2 74 14 Q70 10 74 6Z" fill="url(#goldGradTR)" opacity="0.3" />
        <defs>
          <linearGradient id="goldGradTR" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="1" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        style={{ ...baseStyle, bottom: 0, left: 0 }}
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
      >
        <rect x="0" y="79" width="80" height="1" fill="url(#goldGradBL)" />
        <rect x="0" y="0" width="1" height="80" fill="url(#goldGradBL)" />
        <path d="M20 79 L1 79 L1 60" stroke="url(#goldGradBL)" strokeWidth="1.5" fill="none" />
        <path d="M12 79 L1 79 L1 68" stroke="url(#goldGradBL)" strokeWidth="0.5" fill="none" opacity="0.5" />
        <circle cx="1" cy="79" r="3" fill="url(#goldGradBL)" opacity="0.8" />
        <circle cx="1" cy="79" r="1.5" fill="#C9A84C" />
        <path d="M6 74 Q10 78 14 74 Q10 70 6 74Z" fill="url(#goldGradBL)" opacity="0.4" />
        <path d="M6 74 Q2 70 6 66 Q10 70 6 74Z" fill="url(#goldGradBL)" opacity="0.3" />
        <defs>
          <linearGradient id="goldGradBL" x1="0" y1="1" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="1" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        style={{ ...baseStyle, bottom: 0, right: 0 }}
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
      >
        <rect x="0" y="79" width="80" height="1" fill="url(#goldGradBR)" />
        <rect x="79" y="0" width="1" height="80" fill="url(#goldGradBR)" />
        <path d="M60 79 L79 79 L79 60" stroke="url(#goldGradBR)" strokeWidth="1.5" fill="none" />
        <path d="M68 79 L79 79 L79 68" stroke="url(#goldGradBR)" strokeWidth="0.5" fill="none" opacity="0.5" />
        <circle cx="79" cy="79" r="3" fill="url(#goldGradBR)" opacity="0.8" />
        <circle cx="79" cy="79" r="1.5" fill="#C9A84C" />
        <path d="M74 74 Q70 70 66 74 Q70 78 74 74Z" fill="url(#goldGradBR)" opacity="0.4" />
        <path d="M74 74 Q78 78 74 66 Q70 70 74 74Z" fill="url(#goldGradBR)" opacity="0.3" />
        <defs>
          <linearGradient id="goldGradBR" x1="1" y1="1" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="1" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}
