import type { ReactNode } from 'react'
import { accessoryById } from './config'

/* ============================================================
   AccessoryLogo — a hand-drawn badge for every desk accessory.

   Each logo is a warm walnut chip with a gold rim and the item
   drawn in two-tone storybook line art (cream + its own accent).
   Self-contained (no CSS dependencies), so it reads well on both
   the dark shop cards and the light Avatar Creator tiles.
   ============================================================ */

const CREAM = '#f6e7cf'
const GOLD = '#e3b95c'
const LEAF = '#7dbb6d'
const WOOD = '#b07a4d'
const INK = '#241a10'

const S = {
  stroke: CREAM,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
}

type Art = (accent: string) => ReactNode

/* ------------------------------------------------------------ laptop */

const laptopArt: Art = () => (
  <g>
    <rect x="10" y="9" width="28" height="19" rx="2" fill="#2e241a" {...S} />
    <rect x="13.5" y="12.5" width="21" height="12" rx="1.5" fill={LEAF} opacity="0.32" />
    <path d="M7 30 h34 l-3.5 7 H10.5 Z" fill="#3a2c1c" {...S} />
    <path d="M13 33 h22" stroke={CREAM} strokeWidth="1.2" opacity="0.55" strokeLinecap="round" />
    <path d="M19 35.6 h10" stroke={CREAM} strokeWidth="1.1" opacity="0.45" strokeLinecap="round" />
  </g>
)

/* -------------------------------------------------------- gaming laptop */

const gamingLaptopArt: Art = () => (
  <g>
    <rect x="10" y="9" width="28" height="19" rx="2" fill="#1e1c26" {...S} />
    <rect x="13" y="12" width="5.5" height="3" rx="1" fill="#ff5e8a" opacity="0.9" />
    <rect x="20" y="12" width="5.5" height="3" rx="1" fill={LEAF} opacity="0.9" />
    <rect x="27" y="12" width="8" height="3" rx="1" fill="#4db8ff" opacity="0.9" />
    <path d="M13 19 h22" stroke="#ff5e8a" strokeWidth="1.3" opacity="0.8" strokeLinecap="round" />
    <path d="M7 30 h34 l-3.5 7 H10.5 Z" fill="#14121c" {...S} />
    <circle cx="15" cy="34" r="0.9" fill="#ff5e8a" />
    <circle cx="19" cy="34" r="0.9" fill={LEAF} />
    <circle cx="23" cy="34" r="0.9" fill="#4db8ff" />
    <circle cx="27" cy="34" r="0.9" fill={GOLD} />
    <circle cx="31" cy="34" r="0.9" fill="#ff5e8a" />
  </g>
)

/* ---------------------------------------------------------------- phone */

const phoneArt: Art = () => (
  <g>
    <rect x="15" y="6" width="18" height="36" rx="4" fill="#3a2c1c" {...S} />
    <rect x="18" y="11" width="12" height="25" rx="2" fill="#27484a" opacity="0.85" />
    <path d="M20.5 8.5 h7" stroke={CREAM} strokeWidth="1.2" opacity="0.7" strokeLinecap="round" />
    <path d="M20 32.5 h8" stroke={CREAM} strokeWidth="1.2" strokeLinecap="round" />
  </g>
)

/* ----------------------------------------------------------------- book */

const bookArt: Art = () => (
  <g>
    <path d="M24 14 C 20 10.5, 14 10, 8 12 L8 34 C 14 32.5, 20 33, 24 36 Z" fill={CREAM} opacity="0.9" />
    <path d="M24 14 C 28 10.5, 34 10, 40 12 L40 34 C 34 32.5, 28 33, 24 36 Z" fill={CREAM} opacity="0.9" />
    <path d="M24 14 V36" stroke={WOOD} strokeWidth="2" strokeLinecap="round" />
    <path d="M26.5 14 v7.5 l3 -2 3 2 v-7.5 Z" fill={GOLD} />
    <path d="M9.5 12 h2.2 M36.3 12 h2.2" stroke={CREAM} strokeWidth="1.3" opacity="0.7" strokeLinecap="round" />
  </g>
)

/* ------------------------------------------------------------ book stack */

const bookStackArt: Art = () => (
  <g>
    <rect x="10" y="30" width="28" height="6.5" rx="1.6" fill="#6b4a2e" {...S} strokeWidth="1.6" />
    <rect x="12" y="23.5" width="26" height="6" rx="1.6" fill="#7a3b22" {...S} strokeWidth="1.6" />
    <rect x="14" y="17" width="24" height="6" rx="1.6" fill="#8c4a32" {...S} strokeWidth="1.6" />
    <path d="M18 20 h12" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M16 26.5 h10 M20.5 33 h10" stroke={CREAM} strokeWidth="1.1" opacity="0.5" strokeLinecap="round" />
  </g>
)

/* ---------------------------------------------------- do not disturb sign */

const dndArt: Art = () => (
  <g>
    <rect x="13" y="10" width="22" height="27" rx="3" fill="#3a1c1c" {...S} />
    <circle cx="24" cy="15" r="2.2" fill={INK} stroke={CREAM} strokeWidth="1.2" />
    <path d="M21 22 a4.5 4.5 0 1 0 4.5 4.5 a3.6 3.6 0 0 1 -4.5 -4.5 z" fill="#ffd97a" />
    <path d="M29.5 24.5 l-6 6" stroke="#ff6b6b" strokeWidth="2.6" strokeLinecap="round" />
  </g>
)

/* --------------------------------------------------------- trading laptop */

const tradingLaptopArt: Art = () => (
  <g>
    <rect x="10" y="9" width="28" height="19" rx="2" fill="#1e1c26" {...S} />
    <path d="M14 23 L19 19 L23 21 L28 15 L33 17" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="33" cy="17" r="1.6" fill={GOLD} />
    <path d="M7 30 h34 l-3.5 7 H10.5 Z" fill="#201a14" {...S} />
    <path d="M19 35.6 h10" stroke={CREAM} strokeWidth="1.1" opacity="0.45" strokeLinecap="round" />
  </g>
)

/* ------------------------------------------------------------------ mug */

const mugArt: Art = () => (
  <g>
    <path d="M12 16 H32 L30 25 C 30 30, 27 33, 22 33 C 17 33, 14 30, 14 25 Z" fill="#4a2e1c" {...S} />
    <path d="M32 19 h3.5 a3.5 3.5 0 0 1 0 7 H32" fill="none" {...S} />
    <path d="M12 16 h20" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
    <path d="M17 11 q-2 -2 0 -4 M22 12 q-2 -2 0 -4 M27 11 q-2 -2 0 -4" stroke={CREAM} strokeWidth="1.6" opacity="0.7" strokeLinecap="round" fill="none" />
  </g>
)

/* ------------------------------------------------------------ flower pot */

const flowerPotArt: Art = () => (
  <g>
    <path d="M15 26 h18 l-2.5 10 h-13 z" fill="#a05a34" {...S} />
    <path d="M14 25.5 h20" stroke={CREAM} strokeWidth="2" strokeLinecap="round" />
    <path d="M24 25 V13" stroke={LEAF} strokeWidth="2" strokeLinecap="round" />
    <path d="M24 22 q-6 -2 -6 -8 q6 0 6 8 z" fill={LEAF} opacity="0.85" />
    <path d="M21 12.5 c0 -4 3 -5 3 -5 s3 1 3 5 c0 2.5 -1.5 4 -3 4 s-3 -1.5 -3 -4 z" fill="#e85d75" />
  </g>
)

/* ------------------------------------------------------------- hourglass */

const hourglassArt: Art = () => (
  <g>
    <path d="M16 7 V41 M32 7 V41" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M16 7 H32 L24 20 Z" fill="none" {...S} />
    <path d="M16 41 H32 L24 28 Z" fill="none" {...S} />
    <path d="M24 20 V28" stroke="#ffd97a" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M21 28 H27 L24 35 Z" fill="#ffd97a" opacity="0.9" />
  </g>
)

/* ------------------------------------------------------- timer / fallback */

const timerArt: Art = () => (
  <g>
    <circle cx="24" cy="24" r="15" fill={INK} {...S} strokeWidth="1.8" />
    <path d="M24 9 V6.5" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M24 15 v9 l6 4" stroke={CREAM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="24" cy="24" r="1.8" fill={GOLD} />
    <path d="M14.5 19.5 a13 13 0 0 1 4 -7.5" stroke={GOLD} strokeWidth="1.3" opacity="0.7" strokeLinecap="round" fill="none" />
  </g>
)

const ART: Record<string, Art> = {
  laptop: laptopArt,
  gaming_laptop: gamingLaptopArt,
  phone: phoneArt,
  book: bookArt,
  book_stack: bookStackArt,
  do_not_disturb_poster: dndArt,
  trading_laptop: tradingLaptopArt,
  mug: mugArt,
  flower_pot: flowerPotArt,
  hourglass: hourglassArt,
  study_timer: timerArt,
}

interface AccessoryLogoProps {
  id: string
  size?: number
  className?: string
}

export function AccessoryLogo({ id, size = 64, className }: AccessoryLogoProps) {
  const def = accessoryById(id)
  const accent = def?.color ?? GOLD
  const art = ART[id] ?? timerArt
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true" role="img">
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="#241a10" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="none" stroke={GOLD} strokeOpacity="0.42" strokeWidth="1.3" />
      <circle cx="24" cy="24" r="17.5" fill={accent} opacity="0.13" />
      <circle cx="24" cy="24" r="12.5" fill={accent} opacity="0.09" />
      {art(accent)}
    </svg>
  )
}
