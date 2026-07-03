import { useState, useRef, useEffect, useCallback, memo, KeyboardEvent, MouseEvent } from 'react'
import { PngIcon, type PngIconName } from '../PngIcon'

interface LobbyCardProps {
  icon: PngIconName
  title: string
  caption: string
  onClick?: () => void
  href?: string
  delay?: number
  soon?: boolean
  desktopOnly?: boolean
  isDesktop?: boolean
  children?: React.ReactNode
}

export const LobbyCard = memo(function LobbyCard({
  icon,
  title,
  caption,
  onClick,
  href,
  delay = 0,
  soon = false,
  desktopOnly = false,
  isDesktop = true,
  children
}: LobbyCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const root = document.documentElement
    const checkReduced = () =>
      mediaQuery.matches ||
      root.dataset.reduceMotion === 'true' ||
      root.dataset.animations === 'off'
    setReducedMotion(checkReduced())
    const handler = () => setReducedMotion(checkReduced())
    mediaQuery.addEventListener('change', handler)
    root.addEventListener('datasetchange', handler)
    return () => {
      mediaQuery.removeEventListener('change', handler)
      root.removeEventListener('datasetchange', handler)
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (reducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setGlowPos({ x, y })
  }, [reducedMotion])

  const handlePointerLeave = useCallback(() => {
    if (reducedMotion) return
    setGlowPos({ x: 50, y: 50 })
  }, [reducedMotion])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }, [onClick])

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    if (soon || desktopOnly && !isDesktop) {
      e.preventDefault()
      return
    }
    onClick?.()
  }, [onClick, soon, desktopOnly, isDesktop])

  const disabled = (soon || (desktopOnly && !isDesktop))

  const tiltStyle = reducedMotion ? {} : isHovered
    ? { transform: `perspective(800px) rotateX(${(50 - glowPos.y) * 0.12}deg) rotateY(${(glowPos.x - 50) * 0.12}deg) translateY(-10px) scale(1.04)` }
    : {}

  const glowStyle = {
    '--glow-x': `${glowPos.x}%`,
    '--glow-y': `${glowPos.y}%`
  }

  return (
    <button
      ref={cardRef}
      className={`lobby-card ${soon ? 'soon' : ''} ${desktopOnly && !isDesktop ? 'desktop-only' : ''} ${isHovered ? 'hovered' : ''} ${isFocused ? 'focused' : ''}`}
      style={{
        ...glowStyle,
        ...tiltStyle,
        animationDelay: `${delay}ms`,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      } as React.CSSProperties}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={soon ? `${title}, coming soon` : title}
      tabIndex={disabled ? -1 : 0}
    >
      <div className="lobby-card__inner">
        {children || (
          <>
            <div className="lobby-card__orb" aria-hidden="true">
              <PngIcon name={icon} size={72} alt={title} />
            </div>
            <div className="lobby-card__label">{title}</div>
            <div className="lobby-card__caption">{caption}</div>
          </>
        )}
        {soon && <span className="lobby-card__soon-tag">Soon</span>}
        {desktopOnly && !isDesktop && <span className="lobby-card__soon-tag">Desktop only</span>}
        <div className="lobby-card__border-glow" aria-hidden="true" />
      </div>
    </button>
  )
})

LobbyCard.displayName = 'LobbyCard'