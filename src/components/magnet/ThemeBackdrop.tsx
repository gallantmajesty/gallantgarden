import { useMemo } from 'react'
import type { MagnetTheme, ParticleKind } from '../../lib/magnet/themes'

// A full-screen living background for a theme: gradient wash, two breathing
// glows, and an ambient particle field. Particle positions are deterministic
// (index-derived) so there's no Math.random and no layout jitter on re-render.

interface Particle {
  left: number
  delay: number
  duration: number
  size: number
  drift: number
  opacity: number
}

function buildParticles(count: number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < count; i++) {
    // cheap, well-spread pseudo-random from the index
    const a = (i * 9301 + 49297) % 233280
    const r = a / 233280
    const b = ((i + 7) * 4099 + 1) % 251
    const r2 = b / 251
    out.push({
      left: r * 100,
      delay: -(r2 * 12),
      duration: 7 + r2 * 9,
      size: 0.6 + r * 0.9,
      drift: (r - 0.5) * 80,
      opacity: 0.4 + r2 * 0.5,
    })
  }
  return out
}

function particleClass(kind: ParticleKind): string {
  switch (kind) {
    case 'snow':
      return 'mg-p-snow'
    case 'rain':
      return 'mg-p-rain'
    case 'stars':
      return 'mg-p-star'
    case 'fireflies':
      return 'mg-p-firefly'
    case 'embers':
      return 'mg-p-ember'
    case 'bubbles':
      return 'mg-p-bubble'
    case 'leaves':
      return 'mg-p-leaf'
    case 'sparkles':
      return 'mg-p-sparkle'
    case 'petals':
      return 'mg-p-petal'
    default:
      return ''
  }
}

export function ThemeBackdrop({
  theme,
  density,
  accent,
}: {
  theme: MagnetTheme
  density: number
  accent: string | null
}) {
  const v = theme.vars
  const count = theme.particle === 'none' ? 0 : Math.round(10 + density * 44)
  const particles = useMemo(() => buildParticles(count), [count])
  const cls = particleClass(theme.particle)
  // stars twinkle in place rather than falling
  const fixed = theme.particle === 'stars' || theme.particle === 'fireflies'

  return (
    <div
      className="mg-backdrop"
      style={
        {
          background: v.bg,
          '--mg-glow-a': v.glowA,
          '--mg-glow-b': v.glowB,
          '--mg-particle': theme.particleColor,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <div className="mg-glow mg-glow-a" />
      <div className="mg-glow mg-glow-b" />
      {accent && (
        <div
          className="mg-glow mg-glow-accent"
          style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)` }}
        />
      )}
      {count > 0 && (
        <div className={`mg-particles ${fixed ? 'fixed' : ''}`}>
          {particles.map((p, i) => (
            <span
              key={i}
              className={cls}
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                opacity: p.opacity,
                ['--mg-size' as string]: p.size,
                ['--mg-drift' as string]: `${p.drift}px`,
                ['--mg-top' as string]: `${(i * 37) % 100}%`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
