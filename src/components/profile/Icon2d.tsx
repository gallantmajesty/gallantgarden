// Tiny 2D line-art icon set for the achievements panel — no emoji, no assets.
// Stroke-based SVGs (currentColor) so they inherit the gold theme.

import type { ReactNode } from 'react'

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ICONS: Record<string, ReactNode> = {
  // library
  door: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h12v18" {...S} />
      <path d="M10 21v-5a2 2 0 0 1 4 0v5" {...S} />
      <circle cx="15" cy="9" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  book: (
    <>
      <path d="M12 6v14" {...S} />
      <path d="M12 6C10 4 7 3.5 4 5v14c3-1.5 6-1 8 0" {...S} />
      <path d="M12 6c2-2 5-2.5 8-1v14c-3-1.5-6-1-8 0" {...S} />
    </>
  ),
  books: (
    <>
      <path d="M4 19h16" {...S} />
      <path d="M6 14.5h12" {...S} />
      <path d="M8 10h8" {...S} />
      <path d="M10 5.5h4" {...S} />
    </>
  ),
  chair: (
    <>
      <path d="M6 3h12v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" {...S} />
      <path d="M5 11h14v4H5z" {...S} />
      <path d="M8 15v6M16 15v6" {...S} />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="m15.8 8.2-2.2 5-5 2.2 2.2-5z" fill="currentColor" stroke="none" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" {...S} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" {...S} />
      <circle cx="12" cy="15.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  columns: (
    <>
      <path d="M4 21h16" {...S} />
      <path d="M6 18h12" {...S} />
      <path d="M7 18V9h10v9" {...S} />
      <path d="m9 9 3-4 3 4" {...S} />
    </>
  ),

  // login
  sprout: (
    <>
      <path d="M12 21v-6" {...S} />
      <path d="M12 15c-3.5 0-6-2-6-6 3.5 0 6 2 6 6z" {...S} />
      <path d="M12 15c0-4 2.5-6 6-6 0 4-2.5 6-6 6z" {...S} />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" {...S} />
      <path d="M8 3v4M16 3v4M3 10h18" {...S} />
      <path d="m9 16 2 2 4-4" {...S} />
    </>
  ),

  // activity / timer
  hourglass: (
    <>
      <path d="M7 3h10M7 21h10" {...S} />
      <path d="M8 3c0 5 4 6 4 9s-4 4-4 9h8c0-5-4-6-4-9s4-4 4-9" {...S} />
    </>
  ),
  group: (
    <>
      <circle cx="9" cy="8" r="3.2" {...S} />
      <path d="M3.5 20c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5" {...S} />
      <circle cx="17" cy="9.5" r="2.4" {...S} />
      <path d="M15.5 14.5c2.4.3 5 1.9 5 5.5" {...S} />
    </>
  ),
  runner: (
    <>
      <circle cx="13" cy="4" r="2" {...S} />
      <path d="M12 8l-3 3 2 6-2.5 4" {...S} />
      <path d="M12 8l3 1 2.5 3.5" {...S} />
      <path d="M8 11h4" {...S} />
    </>
  ),
  moon: <path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a7 7 0 0 0 10 10z" {...S} />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" {...S} />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" {...S} />
    </>
  ),
  link: (
    <>
      <path d="M9.5 15H7a4 4 0 0 1 0-8h3" {...S} />
      <path d="M14.5 9H17a4 4 0 0 1 0 8h-3" {...S} />
      <path d="M9 12h6" {...S} />
    </>
  ),
  flame: (
    <path d="M12 3c1.5 3.5-2.5 5-2.5 8a4.5 4.5 0 0 0 9 .5c1-2 .5-4.5-1.5-6.5-.5 1.5-1 2.5-2 3C15 5 14 3.5 12 3z" {...S} />
  ),

  // friends
  heart: (
    <path d="M12 20.5S4 15.5 3.5 10C3.2 6.5 5.5 4 8 4c1.8 0 3 1 4 2.5C13 5 14.2 4 16 4c2.5 0 4.8 2.5 4.5 6-.5 5.5-8.5 10.5-8.5 10.5z" {...S} />
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" {...S} />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" {...S} />
      <circle cx="17" cy="10" r="2.5" {...S} />
      <path d="M15.5 15.5c2.3.3 5 1.8 5 4" {...S} />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" {...S} />
      <path d="m3.5 7 8.5 6 8.5-6" {...S} />
    </>
  ),

  // followers
  star: (
    <path d="M12 3.5l2.5 5.4 5.9.7-4.4 4.1 1.2 5.9L12 16.9l-5.2 2.7 1.2-5.9L3.6 9.6l5.9-.7z" {...S} />
  ),
  sparkle: (
    <>
      <path d="M12 3.5l2.3 4.9 5.4.7-4 3.8 1 5.4-4.7-2.5-4.7 2.5 1-5.4-4-3.8 5.4-.7z" {...S} />
      <path d="M18.5 4v3M17 5.5h3" {...S} />
    </>
  ),

  // host / rank
  crown: (
    <>
      <path d="M4 17l-1-9 5.5 4L12 6l3.5 6L21 8l-1 9z" {...S} />
      <path d="M4.5 20h15" {...S} />
    </>
  ),
  rosette: (
    <>
      <circle cx="12" cy="12" r="5" {...S} />
      <path d="M12 3l1.7 2.2 2.7-.8-.2 2.8 2.6 1-1.7 2.2 1.7 2.2-2.6 1 .2 2.8-2.7-.8L12 21l-1.7-2.2-2.7.8.2-2.8-2.6-1 1.7-2.2L5.2 13l2.6-1-.2-2.8 2.7.8z" {...S} />
    </>
  ),
  'arrow-up': (
    <>
      <path d="M3 17l6-6 4 4 7-7" {...S} />
      <path d="M15 8h5v5" {...S} />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="9" r="5" {...S} />
      <path d="m9 13-2.5 8 5.5-3 5.5 3-2.5-8" {...S} />
    </>
  ),
  trophy: (
    <>
      <path d="M8 3.5h8v6.5a4 4 0 0 1-8 0z" {...S} />
      <path d="M8 5.5H5V7a3 3 0 0 0 3 3" {...S} />
      <path d="M16 5.5h3V7a3 3 0 0 1-3 3" {...S} />
      <path d="M12 14v4M9 21h6" {...S} />
    </>
  ),

  // realm
  globe: (
    <>
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="M3 12h18" {...S} />
      <path d="M12 3c3.5 3.5 3.5 14 0 18M12 3c-3.5 3.5-3.5 14 0 18" {...S} />
    </>
  ),
  cup: (
    <>
      <path d="M6 11h12v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z" {...S} />
      <path d="M17 12h1.5a2.5 2.5 0 0 1 0 5H17" {...S} />
      <path d="M8.5 3.5c-.8.8-.8 1.7 0 2.5M13 3.5c-.8.8-.8 1.7 0 2.5" {...S} />
    </>
  ),

  // category extras
  key: (
    <>
      <circle cx="8" cy="8" r="4" {...S} />
      <path d="m11 11 9 9" {...S} />
      <path d="m15 15 2-2M17.5 17.5 19 16" {...S} />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="M12 7v5l3.5 2" {...S} />
    </>
  ),
}

export function Icon2d({
  name,
  size = 18,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {ICONS[name] ?? ICONS.star}
    </svg>
  )
}
