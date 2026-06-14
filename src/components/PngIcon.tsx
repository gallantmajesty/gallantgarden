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
