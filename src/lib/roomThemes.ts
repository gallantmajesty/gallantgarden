// Per-room identity: accent colour, gradient and icon for the library's ten
// rooms. Presentation-only — the XP/rank/achievement systems never touch this.

export interface RoomTheme {
  accent: string
  accentSoft: string
  icon: string
}

export const ROOM_THEMES: Record<string, RoomTheme> = {
  'forest-hall':   { accent: '#7fb98a', accentSoft: 'rgba(127,185,138,0.22)', icon: '/icons/door_realms.png' },
  'scholar-grove': { accent: '#8fbc8f', accentSoft: 'rgba(143,188,143,0.22)', icon: '/icons/door_realms.png' },
  'silent-valley': { accent: '#9db8e8', accentSoft: 'rgba(157,184,232,0.22)', icon: '/icons/door_realms.png' },
  'mossy-archive': { accent: '#9bb27a', accentSoft: 'rgba(155,178,122,0.22)', icon: '/icons/door_realms.png' },
  'lantern-court': { accent: '#e8b96a', accentSoft: 'rgba(232,185,106,0.22)', icon: '/icons/door_realms.png' },
  'willow-study':  { accent: '#a8c686', accentSoft: 'rgba(168,198,134,0.22)', icon: '/icons/door_realms.png' },
  'amber-loft':    { accent: '#d99a4e', accentSoft: 'rgba(217,154,78,0.22)',  icon: '/icons/door_realms.png' },
  'fern-atrium':   { accent: '#6fbf73', accentSoft: 'rgba(111,191,115,0.22)', icon: '/icons/door_realms.png' },
  'oakwood-den':   { accent: '#b58a5c', accentSoft: 'rgba(181,138,92,0.22)',  icon: '/icons/door_realms.png' },
  'starlit-wing':  { accent: '#8b7bd8', accentSoft: 'rgba(139,123,216,0.22)', icon: '/icons/door_realms.png' },
}

export function roomTheme(roomId: string | null | undefined): RoomTheme {
  return ROOM_THEMES[roomId ?? ''] ?? ROOM_THEMES['forest-hall']
}
