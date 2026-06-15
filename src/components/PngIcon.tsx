// Custom watercolour PNG icons (the Focus Lily icon set), sliced from the
// provided art sheet into /public/icons. Emoji-free, book-inspired, brown-green.
// Use this for feature / navigation icons; tiny inline line-icons still handle
// dense list controls (close, plus, trash, …).

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
  return (
    <img
      className={`png-icon ${className}`.trim()}
      src={`/icons/${name}.png`}
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
