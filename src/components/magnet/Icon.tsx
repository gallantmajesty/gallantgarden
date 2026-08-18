// A crisp, emoji-free icon set for Task Magnet — line icons that inherit
// currentColor and stroke width, matching the storybook Glyph style elsewhere.

const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8 M5 10v10h5v-6h4v6h5V10',
  check: 'M4 12l5 5L20 6',
  checkCircle: 'M12 2a10 10 0 100 20 10 10 0 000-20z M8 12l3 3 5-5',
  plus: 'M12 5v14 M5 12h14',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  edit: 'M4 20h4L20 8l-4-4L4 16z',
  star: 'M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9z',
  spark: 'M12 2v6 M12 16v6 M2 12h6 M16 12h6 M5 5l4 4 M15 15l4 4 M19 5l-4 4 M9 15l-4 4',
  fire: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  book: 'M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3z M18 20a3 3 0 00-3-3H4',
  heart: 'M12 21C6 16 3 12.5 3 8.8 3 6.1 5 4 7.6 4c1.7 0 3 .9 4.4 2.6C13.3 4.9 14.7 4 16.4 4 19 4 21 6.1 21 8.8 21 12.5 18 16 12 21z',
  rocket: 'M5 15c-1 1-1 4-1 4s3 0 4-1 M14 4c3 0 6 3 6 6 0 4-5 8-9 10-2-2-4-4-6-6 2-4 6-9 9-10z M14.5 9.5h.01',
  palette: 'M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-1-1-2 1-2 2-2h1a3 3 0 003-3c0-4-3-7-8-7z M7.5 12.5h.01 M9.5 8.5h.01 M14.5 8.5h.01',
  people: 'M8 11a3 3 0 100-6 3 3 0 000 6z M2 20a6 6 0 0112 0 M17 11a3 3 0 100-6 M16 14a6 6 0 016 6',
  gear: 'M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2',
  target: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 7a5 5 0 100 10 5 5 0 000-10z M12 11a1 1 0 100 2 1 1 0 000-2z',
  calendar: 'M4 5h16v16H4z M4 9h16 M8 3v4 M16 3v4',
  clock: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 7v5l3 3',
  brain: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z',
  chart: 'M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-8',
  trophy: 'M7 4h10v4a5 5 0 01-10 0z M7 6H4v1a3 3 0 003 3 M17 6h3v1a3 3 0 01-3 3 M9 14h6 M10 14l-.5 4h5l-.5-4 M8 21h8',
  journal: 'M5 3h12a2 2 0 012 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 012-2z M9 7h6 M9 11h6',
  pin: 'M12 2l2 6 5 2-4 4 1 6-4-3-4 3 1-6-4-4 5-2z',
  leaf: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14z M5 19l6-6',
  bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10z',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  moon: 'M21 13a8 8 0 11-9-9 6 6 0 009 9z',
  sun: 'M12 7a5 5 0 100 10 5 5 0 000-10z M12 1v3 M12 20v3 M4 12H1 M23 12h-3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  close: 'M6 6l12 12 M18 6L6 18',
  vault: 'M4 5h16v14H4z M8 9a4 4 0 100 6 M16 9v6 M16 12h-2',
  globe: 'M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2c3 3 3 17 0 20 M12 2c-3 3-3 17 0 20',
  play: 'M7 5l12 7-12 7z',
  pause: 'M8 5v14 M16 5v14',
  skip: 'M6 5l9 7-9 7z M18 5v14',
  note: 'M5 3h11l3 3v15H5z M9 8h6 M9 12h6 M9 16h4',
  grid: 'M4 4h16v16H4z M4 10h16 M4 15h16 M10 4v16 M15 4v16',
  grip: 'M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 018 0v3',
  link: 'M9 15l6-6 M10 7l1-1a4 4 0 016 6l-1 1 M14 17l-1 1a4 4 0 01-6-6l1-1',
  download: 'M12 3v12 M7 11l5 5 5-5 M5 21h14',
  upload: 'M12 21V9 M7 13l5-5 5 5 M5 3h14',
  store: 'M3 9l1.5-5h15L21 9 M3 9h18v11H3z M3 9l1 3h16l1-3 M9 20v-5h6v5',
  bag: 'M6 8l1-4h10l1 4 M6 8h12v13H6z M9 11V8 M15 11V8',
  restore: 'M7 5l-4 4 4 4 M3 9h9a6 6 0 016 6v3',
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      className="mg-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name] ?? PATHS.sparkle} />
    </svg>
  )
}
