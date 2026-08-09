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

/* ------------------------------------------------- tri-monitor trading desk */

const triMonitorArt: Art = () => (
  <g>
    <polygon points="5,13 13,11 13,23 5,25" fill="#14141f" stroke={CREAM} strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="16" y="9" width="16" height="13" rx="1.5" fill="#14141f" {...S} strokeWidth="1.6" />
    <polygon points="43,13 35,11 35,23 43,25" fill="#14141f" stroke={CREAM} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M19 17 L22 15 L24 16 L27 13" stroke={LEAF} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 25 v4 M24 22 v4 M39 25 v4" stroke={CREAM} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5 29 h8 M20 29 h8 M35 29 h8" stroke={CREAM} strokeWidth="1.4" strokeLinecap="round" />
  </g>
)

/* ---------------------------------------------------------------- piano */

const pianoArt: Art = () => (
  <g>
    <path d="M9 32 C 9 18, 17 12, 28 12 H40 V32 Z" fill={INK} {...S} strokeWidth="1.8" />
    <path d="M12 16 h24" stroke={GOLD} strokeWidth="1.2" opacity="0.8" strokeLinecap="round" />
    <rect x="11" y="28" width="27" height="4.5" rx="1.2" fill={CREAM} opacity="0.92" />
    <rect x="15.5" y="25.5" width="2" height="3" fill={INK} />
    <rect x="20.5" y="25.5" width="2" height="3" fill={INK} />
    <rect x="25.5" y="25.5" width="2" height="3" fill={INK} />
    <rect x="30.5" y="25.5" width="2" height="3" fill={INK} />
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

/* --------------------------------------------------------- chair balloon */

const balloonArt: Art = () => (
  <g>
    <path d="M24 5 C 15 5, 9 12, 9 18 C 9 24, 14 27, 24 31 C 34 27, 39 24, 39 18 C 39 12, 33 5, 24 5 Z" fill="#e85d75" {...S} strokeWidth="1.8" />
    <path d="M24 5 V31" stroke={CREAM} strokeWidth="1.2" opacity="0.85" strokeLinecap="round" />
    <path d="M16.5 7 C 15.5 14, 15.5 22, 17 28.5" stroke={CREAM} strokeWidth="1.1" opacity="0.6" fill="none" strokeLinecap="round" />
    <path d="M31.5 7 C 32.5 14, 32.5 22, 31 28.5" stroke={CREAM} strokeWidth="1.1" opacity="0.6" fill="none" strokeLinecap="round" />
    <path d="M21.5 32 L19 36 M26.5 32 L29 36" stroke={CREAM} strokeWidth="1.2" strokeLinecap="round" />
    <path d="M21 36 h6 l1 4 h-8 z" fill="#7a4a24" stroke={CREAM} strokeWidth="1.4" strokeLinejoin="round" />
  </g>
)

/* ------------------------------------------------------------- bento box */

const bentoArt: Art = () => (
  <g>
    <rect x="9" y="13" width="30" height="22" rx="3" fill="#3a2416" {...S} />
    <path d="M22 13 V35" stroke={CREAM} strokeWidth="1.2" opacity="0.5" />
    <path d="M12.5 22 a6 6 0 0 1 12 0 z" fill={CREAM} opacity="0.9" />
    <circle cx="29" cy="19" r="3" fill="#d9777f" />
    <circle cx="35" cy="19" r="2.6" fill={LEAF} />
    <circle cx="32" cy="26.5" r="2.8" fill={GOLD} />
    <path d="M9 13 h30" stroke={GOLD} strokeWidth="1.6" opacity="0.8" strokeLinecap="round" />
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

/* ---------------------------------------------------------- water bottle */

const bottleArt: Art = () => (
  <g>
    <rect x="18" y="7" width="12" height="5" rx="1.5" fill="#27484a" {...S} strokeWidth="1.6" />
    <path d="M17 13 H31 V21 C 31 25.5, 30 33, 24 33 C 18 33, 17 25.5, 17 21 Z" fill="#1e3a44" {...S} />
    <path d="M17.5 22 c2 -1.8 4 1.8 6.5 0 s4.5 1.8 6.5 0" stroke="#8ecdf0" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <path d="M22 15 h4" stroke={CREAM} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
  </g>
)

/* ------------------------------------------------------------ headphones */

const headphonesArt: Art = () => (
  <g>
    <path d="M12 26 V20 a12 12 0 0 1 24 0 v6" fill="none" {...S} strokeWidth="2.4" />
    <rect x="8" y="24" width="7" height="13" rx="3.2" fill="#2a2a35" {...S} strokeWidth="1.8" />
    <rect x="33" y="24" width="7" height="13" rx="3.2" fill="#2a2a35" {...S} strokeWidth="1.8" />
    <rect x="9.5" y="26.5" width="4" height="8" rx="2" fill={GOLD} opacity="0.55" />
    <rect x="34.5" y="26.5" width="4" height="8" rx="2" fill={GOLD} opacity="0.55" />
    <path d="M40 21 q2 3 0 6 M43.5 18 q4 6 0 12" stroke={LEAF} strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </g>
)

/* ------------------------------------------------------------- desk lamp */

const lampArt: Art = () => (
  <g>
    <ellipse cx="24" cy="37" rx="10" ry="2.6" fill="#3a2c1c" {...S} strokeWidth="1.6" />
    <path d="M24 37 V22" stroke={CREAM} strokeWidth="2" strokeLinecap="round" />
    <path d="M24 22 L31 14" stroke={CREAM} strokeWidth="2" strokeLinecap="round" />
    <circle cx="31.5" cy="14" r="1.4" fill={GOLD} />
    <path d="M28.5 11.5 h10 l-1.5 4.5 h-7 z" fill={GOLD} opacity="0.9" stroke={CREAM} strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M30.5 16.5 v5 M33.5 16 v6" stroke="#ffd97a" strokeWidth="1.6" strokeLinecap="round" />
  </g>
)

/* ---------------------------------------------------------------- plant */

const plantArt: Art = () => (
  <g>
    <path d="M15 26 h18 l-2.5 10 h-13 z" fill="#a05a34" {...S} />
    <path d="M14 25.5 h20" stroke={CREAM} strokeWidth="2" strokeLinecap="round" />
    <path d="M24 25 V16" stroke={LEAF} strokeWidth="2" strokeLinecap="round" />
    <path d="M24 21 C 19 19, 15 15, 14 10 C 19 11, 23 15, 24 21 Z" fill={LEAF} opacity="0.9" />
    <path d="M24 17 C 29 15, 33 12, 34.5 7 C 29.5 8, 25.5 12, 24 17 Z" fill={LEAF} opacity="0.75" />
    <path d="M24 16 C 22 11, 22 7, 24 4 C 26 7, 26 11, 24 16 Z" fill="#5ea45a" />
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
  trading_desktop_3side: triMonitorArt,
  piano: pianoArt,
  mug: mugArt,
  flower_pot: flowerPotArt,
  chair_balloon: balloonArt,
  bento_box: bentoArt,
  hourglass: hourglassArt,
  water_bottle: bottleArt,
  headphones: headphonesArt,
  desk_lamp: lampArt,
  plant: plantArt,
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
