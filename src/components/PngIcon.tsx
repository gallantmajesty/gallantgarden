// Custom watercolour PNG icons (the Focus Lily icon set), sliced from the
// provided art sheet into /public/icons. Emoji-free, book-inspired, brown-green.
// Use this for feature / navigation icons; tiny inline line-icons still handle
// dense list controls (close, plus, trash, …).

import { useState } from 'react'

export type PngIconName =
| 'tasks'
| 'notes'
| 'analytics'
| 'focus-timer'
| 'calendar'
| 'achievements'
| 'streaks'
| 'goals'
| 'habits'
| 'study-rooms'
| 'realm'
| 'friends'
| 'messages'
| 'profile'
| 'settings'
| 'lotus'
| 'lava'
| 'games'
| 'game-controller'
| 'focus-lily-logo'
| 'shop'
| 'outfit'
| 'body'
| 'accessories'

/** Maps friendly icon names to actual filenames in /public/icons/ */
const ICON_FILE: Record<string, string> = {
  tasks: 'fantasy_taskmagnet',
  notes: 'fantasy_blueprints (1)',
  settings: 'Setting or customization logo',
  streaks: 'score_icon',
  realm: 'fantasy_realm (1)',
  games: 'fantasy_games',
  'study-rooms': 'door_realms',
  profile: 'big_character_icon',
  shop: 'custom_shop',
  outfit: 'custom_outfit',
  body: 'custom_body_fixed',
  accessories: 'custom_accessories',
}

export function PngIcon({
  name,
  size = 28,
  alt = '',
  className = '',
}: {
  name: PngIconName
  size?: number
  alt?: string
  className?: string
}) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <span
        className={`png-icon-fallback ${className}`.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: size / 2,
          background: 'linear-gradient(135deg, rgba(91,124,250,0.2), rgba(168,237,95,0.2))',
          color: 'var(--ink-soft, #888)',
          fontSize: Math.max(size * 0.4, 12),
          fontWeight: 700,
          userSelect: 'none',
        }}
        aria-label={alt}
        title={alt}
      >
        🎮
      </span>
    )
  }

  const file = ICON_FILE[name] ?? name

  return (
    <img
      className={`png-icon ${className}`.trim()}
      src={`/icons/${file}.png`}
      width={size}
      height={size}
      alt={alt}
      onError={() => setError(true)}
      aria-hidden={alt === '' ? true : undefined}
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  )
}

// The Focus Lily control-icon set (/public/icons/ui) — laurel-wreath UI glyphs
// for actions and navigation (add, remove, edit, save, search, settings, etc.),
// sliced from the provided sheet with the cream background knocked out so they
// sit on any surface. Use for interface controls in the light, parchment UIs.
export type UiIconName =
  | 'up' | 'down' | 'left' | 'right'
  | 'settings' | 'graphics' | 'user' | 'friends'
  | 'info' | 'help' | 'search' | 'home'
  | 'lock' | 'unlock' | 'login' | 'logout'
  | 'refresh' | 'download' | 'upload' | 'delete'
  | 'add' | 'remove' | 'edit' | 'save'
  | 'favorite' | 'bookmark' | 'like' | 'dislike'
  | 'notification' | 'message' | 'calendar' | 'clock'
  | 'filter' | 'sort' | 'menu' | 'share'
  | 'copy' | 'link' | 'info-circle' | 'warning'

export function UiIcon({
  name,
  size = 24,
  alt = '',
  className = '',
}: {
  name: UiIconName
  size?: number
  alt?: string
  className?: string
}) {
  return (
    <img
      className={`png-icon ${className}`.trim()}
      src={`/icons/ui/${name}.png`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      draggable={false}
      loading="lazy"
      decoding="async"
    />
  )
}
