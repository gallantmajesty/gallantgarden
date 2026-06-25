import { useMemo } from 'react'
import type { MagnetTheme, ParticleKind, SceneKind } from '../../lib/magnet/themes'

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

// A drawn, animated layer behind the particle field. Pure CSS/SVG, transform +
// opacity only, so it stays cheap. Colours come from the theme via CSS vars set
// on the backdrop (--mg-glow-a / --mg-glow-b / --mg-particle).
function Scene({ kind }: { kind: SceneKind }) {
  switch (kind) {
    case 'moon':
      return (
        <div className="mg-scene mg-scene-moon" aria-hidden>
          <span className="mg-moon" />
        </div>
      )
    case 'skyline':
      return (
        <div className="mg-scene mg-scene-skyline" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="mg-building"
              style={{
                ['--h' as string]: `${28 + ((i * 53) % 60)}%`,
                ['--w' as string]: `${5 + ((i * 17) % 5)}%`,
                ['--d' as string]: `${(i % 5) * 0.7}s`,
              }}
            />
          ))}
        </div>
      )
    case 'aurora':
      return (
        <div className="mg-scene mg-scene-aurora" aria-hidden>
          <span className="mg-aurora-band b1" />
          <span className="mg-aurora-band b2" />
          <span className="mg-aurora-band b3" />
        </div>
      )
    case 'mountains':
      return (
        <div className="mg-scene mg-scene-mountains" aria-hidden>
          <span className="mg-range r3" />
          <span className="mg-range r2" />
          <span className="mg-range r1" />
        </div>
      )
    case 'shooting-stars':
      return (
        <div className="mg-scene mg-scene-shoot" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="mg-shoot"
              style={{
                ['--top' as string]: `${8 + i * 18}%`,
                ['--d' as string]: `${i * 3.2}s`,
                ['--dur' as string]: `${5 + i}s`,
              }}
            />
          ))}
        </div>
      )
    case 'sun-grid':
      return (
        <div className="mg-scene mg-scene-sungrid" aria-hidden>
          <span className="mg-sun" />
          <span className="mg-grid" />
        </div>
      )
    case 'forest':
      return (
        <div className="mg-scene mg-scene-forest" aria-hidden>
          <span className="mg-treeline t3" />
          <span className="mg-treeline t2" />
          <span className="mg-treeline t1" />
        </div>
      )
    case 'rain-window':
      return (
        <div className="mg-scene mg-scene-window" aria-hidden>
          <span className="mg-window">
            <span className="mg-window-glow" />
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className="mg-drop"
                style={{
                  ['--x' as string]: `${10 + ((i * 13) % 80)}%`,
                  ['--d' as string]: `${(i % 5) * 0.9}s`,
                  ['--dur' as string]: `${3.5 + (i % 4)}s`,
                }}
              />
            ))}
          </span>
        </div>
      )
    case 'bookshelf':
      return (
        <div className="mg-scene mg-scene-shelf" aria-hidden>
          {Array.from({ length: 3 }).map((_, row) => (
            <span key={row} className="mg-shelf">
              {Array.from({ length: 22 }).map((_, i) => (
                <span
                  key={i}
                  className="mg-book"
                  style={{
                    ['--h' as string]: `${56 + ((i * 37 + row * 11) % 40)}%`,
                    ['--w' as string]: `${1.3 + ((i * 7) % 4) * 0.5}%`,
                    ['--hue' as string]: `${(i * 47 + row * 90) % 360}`,
                  }}
                />
              ))}
            </span>
          ))}
        </div>
      )
    case 'deep-sea':
      return (
        <div className="mg-scene mg-scene-sea" aria-hidden>
          <span className="mg-ray r1" />
          <span className="mg-ray r2" />
          <span className="mg-ray r3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="mg-kelp"
              style={{
                ['--x' as string]: `${6 + i * 17}%`,
                ['--h' as string]: `${30 + ((i * 23) % 34)}%`,
                ['--d' as string]: `${(i % 4) * 0.8}s`,
              }}
            />
          ))}
        </div>
      )
    default:
      return null
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
      <Scene kind={theme.scene} />
      {count > 0 && (
        <div className={`mg-particles ${fixed ? 'fixed' : ''}`}>
          {particles.map((p, i) => (
            <span
              key={i}
              className={cls}
              style={{
                left: `${p.left}%`,
                opacity: p.opacity,
                ['--mg-size' as string]: p.size,
                ['--mg-drift' as string]: `${p.drift}px`,
                ['--mg-top' as string]: `${(i * 37) % 100}%`,
                ['--mg-dur' as string]: `${p.duration}s`,
                ['--mg-delay' as string]: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
