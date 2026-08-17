import { useMemo } from 'react'
import type { MagnetTheme, ParticleKind, SceneKind } from '../../lib/magnet/themes'

// A full-screen living background for a theme: gradient wash, breathing glows,
// a detailed illustrated scene (SVG silhouettes, so every world actually looks
// like its name — a forest is a forest, a library has shelves of books) and a
// dense continuous particle field. Nothing here is a Math.random — positions
// are index-derived so re-renders never jitter.

interface Particle {
  left: number
  delay: number
  duration: number
  size: number
  drift: number
  opacity: number
}

// Deterministic pseudo-random from the index (well-spread so particles never
// cluster). `span` widens the delay spread so the field is ALWAYS mid-animation
// — no "half sky then nothing".
function buildParticles(count: number, span: number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < count; i++) {
    const a = (i * 9301 + 49297) % 233280
    const r = a / 233280
    const b = ((i + 7) * 4099 + 1) % 251
    const r2 = b / 251
    out.push({
      left: r * 100,
      delay: -(r2 * span),
      duration: 5 + r2 * 9,
      size: 0.6 + r * 0.9,
      drift: (r - 0.5) * 100,
      opacity: 0.45 + r2 * 0.5,
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

/* ------------------------------------------------------------------ */
/* Dense seamless streams (rain / snow / embers)                       */
/* A scrolling repeating-gradient field renders at every pixel — rain  */
/* is genuinely continuous, never "half done, then nothing".           */
/* ------------------------------------------------------------------ */
function Stream({ kind }: { kind: ParticleKind }) {
  if (kind === 'rain') return <span className="mg-stream mg-stream-rain" aria-hidden />
  if (kind === 'snow') return <span className="mg-stream mg-stream-snow" aria-hidden />
  if (kind === 'embers') return <span className="mg-stream mg-stream-ember" aria-hidden />
  return null
}

/* ------------------------------------------------------------------ */
/* Pine silhouette helper (used by forest scenes)                      */
/* ------------------------------------------------------------------ */
function Pine({
  cx,
  base,
  twin,
  fill,
  opacity,
}: {
  cx: number
  base: number
  twin: number
  fill: string
  opacity: number
}) {
  const w = twin * 42
  const h = twin * 120
  return (
    <g transform={`translate(${cx} ${base}) scale(${twin})`} fill={fill} opacity={opacity}>
      <polygon points={`0,0 -34,-40 34,-40`} />
      <polygon points={`0,-34 -42,-78 42,-78`} />
      <polygon points={`0,-72 -34,-118 34,-118`} />
      <rect x={-4} y={-4} width={8} height={8} fill={fill} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Illustrated scenes — detailed SVG art per world                     */
/* ------------------------------------------------------------------ */
function Scene({ kind }: { kind: SceneKind }) {
  const bg = {
    far: 'var(--mg-glow-b)',
    mid: 'var(--mg-glow-a)',
    near: 'var(--mg-panel-soft)',
    ink: 'var(--mg-text-soft)',
  }

  switch (kind) {
    /* ---------------- forest: layered pines + fireflies near ground ---------------- */
    case 'forest':
      return (
        <svg className="mg-scene mg-scene-forest" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <defs>
            <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bg.far} stopOpacity="0" />
              <stop offset="60%" stopColor={bg.mid} stopOpacity="0.25" />
              <stop offset="100%" stopColor={bg.near} stopOpacity="0.05" />
            </linearGradient>
            <radialGradient id="sunburst" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor={bg.mid} stopOpacity="0.5" />
              <stop offset="100%" stopColor={bg.mid} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#sunburst)" />
          <g>
            <Pine cx={120} base={820} twin={1} fill={bg.far} opacity={0.5} />
            <Pine cx={300} base={836} twin={1.25} fill={bg.far} opacity={0.5} />
            <Pine cx={620} base={828} twin={1.1} fill={bg.far} opacity={0.5} />
            <Pine cx={900} base={840} twin={1.3} fill={bg.far} opacity={0.5} />
            <Pine cx={1180} base={820} twin={1} fill={bg.far} opacity={0.5} />
            <Pine cx={1360} base={830} twin={1.15} fill={bg.far} opacity={0.5} />
          </g>
          <g>
            <Pine cx={60} base={840} twin={1.5} fill={bg.mid} opacity={0.75} />
            <Pine cx={220} base={844} twin={1.6} fill={bg.mid} opacity={0.75} />
            <Pine cx={450} base={838} twin={1.4} fill={bg.mid} opacity={0.75} />
            <Pine cx={720} base={848} twin={1.7} fill={bg.mid} opacity={0.75} />
            <Pine cx={1040} base={840} twin={1.5} fill={bg.mid} opacity={0.75} />
            <Pine cx={1280} base={846} twin={1.6} fill={bg.mid} opacity={0.75} />
          </g>
          <rect y={700} width="1440" height="200" fill="url(#fog)" />
          <g>
            <Pine cx={130} base={880} twin={1.9} fill={bg.near} opacity={0.9} />
            <Pine cx={340} base={890} twin={2.1} fill={bg.near} opacity={0.9} />
            <Pine cx={600} base={880} twin={1.8} fill={bg.near} opacity={0.9} />
            <Pine cx={830} base={892} twin={2.2} fill={bg.near} opacity={0.9} />
            <Pine cx={1120} base={882} twin={1.9} fill={bg.near} opacity={0.9} />
            <Pine cx={1380} base={890} twin={2.1} fill={bg.near} opacity={0.9} />
          </g>
          <rect y={876} width="1440" height="24" fill={bg.near} opacity={0.5} />
        </svg>
      )

    /* ---------------- cozy bedroom: bed, window, fairy lights ---------------- */
    case 'bedroom': {
      const lights = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 60 + i * 70, y: 120 + Math.sin(i * 1.3) * 34, d: i * 0.6 }))
      return (
        <svg className="mg-scene mg-scene-bedroom" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <defs>
            <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bg.mid} stopOpacity="0.55" />
              <stop offset="100%" stopColor={bg.near} stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#wall)" />
          {/* window with midnight sky */}
          <g>
            <rect x={1010} y={150} width={220} height={300} rx={8} fill={bg.far} opacity={0.55} />
            <rect x={1010} y={150} width={220} height={300} rx={8} fill="none" stroke="var(--mg-panel-soft)" strokeWidth={16} />
            <line x1={1120} y1={150} x2={1120} y2={450} stroke="var(--mg-panel-soft)" strokeWidth={6} />
            <line x1={1010} y1={300} x2={1230} y2={300} stroke="var(--mg-panel-soft)" strokeWidth={6} />
            <circle cx={1190} cy={210} r={34} fill="var(--mg-particle)" opacity={0.9} />
            <g fill="#fff" opacity={0.85}>
              <circle cx={1050} cy={190} r={2} />
              <circle cx={1080} cy={250} r={1.6} />
              <circle cx={1160} cy={180} r={2.2} />
              <circle cx={1200} cy={260} r={1.8} />
            </g>
          </g>
          {/* fairy light string */}
          <path d="M 0 40 Q 360 120 720 60 T 1440 80" fill="none" stroke={bg.near} strokeWidth={2} opacity={0.6} />
          {lights.map((l, i) => (
            <g key={i}>
              <circle cx={l.x} cy={l.y} r={4} fill="var(--mg-particle)" className="mg-fairy" style={{ ['--fd' as string]: `${l.d}s` }}>
                <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2.4 + (i % 3)}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={l.x} cy={l.y} r={9} fill="var(--mg-particle)" opacity={0.16} />
            </g>
          ))}
          {/* bed */}
          <g>
            <rect x={160} y={560} width={640} height={60} rx={10} fill={bg.near} opacity={0.75} />
            <rect x={132} y={540} width={90} height={80} rx={8} fill={bg.near} opacity={0.85} />
            <rect x={180} y={500} width={590} height={90} rx={16} fill="var(--mg-panel-soft)" opacity={0.8} />
            <rect x={210} y={470} width={120} height={44} rx={12} fill={bg.mid} opacity={0.7} />
            <rect x={360} y={474} width={120} height={42} rx={12} fill={bg.mid} opacity={0.66} />
            <rect x={180} y={596} width={590} height={46} rx={10} fill={bg.near} opacity={0.9} />
          </g>
          {/* bedside table + lamp */}
          <g>
            <rect x={830} y={640} width={110} height={110} rx={8} fill={bg.near} opacity={0.85} />
            <rect x={866} y={520} width={34} height={120} rx={6} fill={bg.near} opacity={0.7} />
            <path d="M 860 520 h 48 v 8 c -24 0 -44 14 -48 26 z" fill="var(--mg-accent2)" opacity={0.9} />
            <ellipse cx={884} cy={514} rx={34} ry={26} fill="var(--mg-accent2)" opacity={0.32} className="mg-lamp-pulse" />
          </g>
          {/* rug */}
          <ellipse cx={520} cy={836} rx={380} ry={52} fill={bg.mid} opacity={0.4} />
        </svg>
      )
    }

    /* ---------------- wizard library: towering shelves of books ---------------- */
    case 'bookshelf': {
      const shells = ['#c08a5a', '#5a7fb0', '#7fae5f', '#a3657f', '#d0a34e', '#6f6aa8', '#c27053', '#4e9a8a']
      return (
        <svg className="mg-scene mg-scene-shelf" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <defs>
            <linearGradient id="shelfglow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bg.mid} stopOpacity="0.4" />
              <stop offset="100%" stopColor={bg.mid} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect y={640} width="1440" height="260" fill="url(#shelfglow)" />
          {/* left tower of shelves */}
          <g>
            <rect x={40} y={180} width={420} height={640} rx={10} fill={bg.near} opacity={0.9} />
            {[0, 1, 2, 3].map((row) => (
              <g key={row}>
                {Array.from({ length: 26 }).map((_, i) => {
                  const h = 46 + ((i * 37 + row * 53) % 60)
                  const w = 9 + ((i * 7) % 6)
                  const top = 210 + row * 150
                  return (
                    <rect
                      key={i}
                      x={70 + i * 15}
                      y={top + (150 - h)}
                      width={w}
                      height={h}
                      rx={2}
                      fill={shells[(i * 2 + row) % shells.length]}
                      opacity={0.85}
                    >
                    </rect>
                  )
                })}
                <rect x={56} y={230 + row * 150} width={388} height={12} rx={4} fill={bg.ink} opacity={0.35} />
              </g>
            ))}
            <rect x={46} y={180} width={408} height={8} rx={4} fill={bg.ink} opacity={0.4} />
            <rect x={46} y={806} width={408} height={14} rx={6} fill={bg.ink} opacity={0.45} />
          </g>
          {/* right tower of shelves */}
          <g>
            <rect x={970} y={240} width={440} height={580} rx={10} fill={bg.near} opacity={0.9} />
            {[0, 1, 2].map((row) => (
              <g key={row}>
                {Array.from({ length: 28 }).map((_, i) => {
                  const h = 52 + ((i * 29 + row * 61) % 66)
                  const w = 10 + ((i * 9) % 6)
                  const top = 270 + row * 170
                  return (
                    <rect
                      key={i}
                      x={1000 + i * 14}
                      y={top + (170 - h)}
                      width={w}
                      height={h}
                      rx={2}
                      fill={shells[(i * 3 + row + 4) % shells.length]}
                      opacity={0.85}
                    />
                  )
                })}
                <rect x={986} y={290 + row * 170} width={408} height={12} rx={4} fill={bg.ink} opacity={0.35} />
              </g>
            ))}
            <rect x={976} y={240} width={428} height={8} rx={4} fill={bg.ink} opacity={0.4} />
          </g>
          {/* study desk + candle */}
          <g>
            <rect x={520} y={700} width={360} height={20} rx={8} fill={bg.near} opacity={0.9} />
            <rect x={576} y={720} width={26} height={110} rx={6} fill={bg.near} opacity={0.7} />
            <rect x={798} y={720} width={26} height={110} rx={6} fill={bg.near} opacity={0.7} />
            <rect x={700} y={620} width={16} height={80} rx={4} fill={bg.ink} opacity={0.5} />
            <ellipse cx={708} cy={618} rx={12} ry={8} fill="var(--mg-accent2)" opacity={0.95} />
            <ellipse cx={708} cy={606} rx={7} ry={4} fill="#fff" opacity={0.9} />
            <ellipse cx={708} cy={580} rx={46} ry={40} fill="var(--mg-accent)" opacity={0.22} className="mg-lamp-pulse" />
          </g>
        </svg>
      )
    }

    /* ---------------- rain-window: warm cabin, rain on glass ---------------- */
    case 'rain-window':
      return (
        <svg className="mg-scene mg-scene-window" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <rect width="1440" height="900" fill={bg.far} opacity="0.4" />
          {/* outside world through the glass */}
          <g>
            <circle cx={1180} cy={180} r={46} fill="var(--mg-particle)" opacity={0.55} />
            {/* distant hills + pines */}
            <path d="M0 560 Q 240 430 460 520 T 920 500 T 1320 530 L1440 520 V900 H0 Z" fill={bg.mid} opacity={0.4} />
            <Pine cx={240} base={700} twin={1.2} fill={bg.far} opacity={0.35} />
            <Pine cx={560} base={710} twin={1.1} fill={bg.far} opacity={0.35} />
            <Pine cx={1120} base={700} twin={1.2} fill={bg.far} opacity={0.35} />
          </g>
          {/* window frame covering most of the screen */}
          <g>
            <rect x={180} y={90} width={1080} height={660} rx={14} fill="none" stroke={bg.near} strokeWidth={26} />
            <line x1={720} y1={90} x2={720} y2={750} stroke={bg.near} strokeWidth={14} />
            <line x1={180} y1={420} x2={1260} y2={420} stroke={bg.near} strokeWidth={14} />
          </g>
          {/* warm interior glow lower-left */}
          <ellipse cx={330} cy={810} rx={300} ry={140} fill="var(--mg-accent2)" opacity={0.18} className="mg-lamp-pulse" />
        </svg>
      )

    /* ---------------- ocean depths: rays, kelp, fish, coral ---------------- */
    case 'deep-sea':
      return (
        <svg className="mg-scene mg-scene-sea" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <defs>
            <linearGradient id="swim" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={bg.mid} stopOpacity="0" />
              <stop offset="50%" stopColor={bg.mid} stopOpacity="0.2" />
              <stop offset="100%" stopColor={bg.mid} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* light rays from the surface */}
          <g opacity={0.5}>
            <polygon points="200,0 340,0 560,900 140,900" fill="url(#swim)" className="mg-ray mg-ray-a" />
            <polygon points="640,0 760,0 1020,900 600,900" fill="url(#swim)" className="mg-ray mg-ray-b" />
            <polygon points="1090,0 1200,0 1410,900 1030,900" fill="url(#swim)" className="mg-ray mg-ray-c" />
          </g>
          {/* kelp */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = 90 + i * 260
            return (
              <path
                key={i}
                d={`M ${x} 900 q 16 -120 0 -240 q -16 -120 0 -240`}
                fill="none"
                stroke={bg.mid}
                strokeWidth={10}
                opacity={0.6}
                className="mg-kelp-move"
                style={{ ['--kd' as string]: `${i * 0.7}s` }}
              />
            )
          })}
          {/* swaying fish */}
          <g className="mg-fish" opacity={0.7}>
            <path d="M 200 660 q 36 22 72 0 q -36 22 -72 0" fill={bg.mid} />
            <circle cx={196} cy={662} r={4} fill={bg.ink} />
          </g>
          <g className="mg-fish mg-fish-r" opacity={0.55}>
            <path d="M 1180 420 q 26 16 52 0 q -26 16 -52 0" fill={bg.mid} />
            <circle cx={1176} cy={422} r={3} fill={bg.ink} />
          </g>
          {/* coral bed */}
          <g>
            <path d="M 60 900 v -60 a 28 28 0 0 1 28 28 v -34 a 26 26 0 0 1 26 26 v -20 a 22 22 0 0 1 22 20 v 40 h -76 z" fill={bg.mid} opacity={0.5} />
            <path d="M 1240 900 v -70 a 30 30 0 0 1 30 30 v -28 a 24 24 0 0 1 24 24 v 44 h -54 z" fill={bg.mid} opacity={0.5} />
          </g>
        </svg>
      )

    /* ---------------- aurora + frozen ridge ---------------- */
    case 'aurora':
      return (
        <svg className="mg-scene mg-scene-aurora" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <defs>
            <linearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bg.near} stopOpacity="0.7" />
              <stop offset="100%" stopColor={bg.near} stopOpacity="0.25" />
            </linearGradient>
          </defs>
          {/* aurora ribbons */}
          <g className="mg-aurora-sway">
            <path d="M 0 120 C 300 40 520 220 760 130 S 1200 60 1440 150 L1440 0 H0 Z" fill="var(--mg-glow-a)" opacity="0.4" />
            <path d="M 120 220 C 360 140 620 300 900 220 S 1300 150 1440 240 L1440 40 H0 Z" fill="var(--mg-glow-b)" opacity="0.35" />
            <path d="M -40 330 C 260 240 540 380 840 320 S 1300 260 1460 340 L1460 160 H0 Z" fill="var(--mg-accent)" opacity="0.2" />
          </g>
          {/* stars */}
          <g fill="#fff" opacity={0.8}>
            {[720, 900, 1050, 1180, 600, 480, 1300, 200, 80].map((x, i) => (
              <circle key={i} cx={x} cy={40 + ((i * 53) % 140)} r={1.8} />
            ))}
          </g>
          {/* snowy ridge */}
          <path d="M0 640 L120 540 L260 610 L420 480 L560 600 L760 520 L900 620 L1080 500 L1240 610 L1380 560 L1440 600 V900 H0 Z" fill="url(#ridge)" />
        </svg>
      )

    /* ---------------- city skyline (noir / cyberpunk) ---------------- */
    case 'skyline':
      return (
        <svg className="mg-scene mg-scene-skyline" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <g fill={bg.near} opacity={0.9}>
            {Array.from({ length: 16 }).map((_, i) => (
              <rect
                key={i}
                x={i * 92}
                y={320 + ((i * 97) % 360)}
                width={74}
                height={900 - (320 + ((i * 97) % 360))}
                  >
              </rect>
            ))}
          </g>
          <g>
            {Array.from({ length: 16 }).map((_, i) => {
              const x = i * 92 + 6
              const y = 324 + ((i * 97) % 360)
              const h = 900 - y
              return Array.from({ length: Math.floor(h / 46) }).map((_, r) => (
                <rect
                  key={`${i}-${r}`}
                  x={x + 6}
                  y={y + 14 + r * 46}
                  width={8}
                  height={10}
                  fill="var(--mg-particle)"
                  opacity={0.35 + ((i * 3 + r * 5) % 4) * 0.15}
                  className="mg-win-flicker"
                  style={{ ['--wd' as string]: `${(i * 7 + r) % 4 * 0.6}s` }}
                />
              ))
            })}
          </g>
          <rect y={840} width="1440" height="60" fill={bg.near} opacity={0.95} />
        </svg>
      )

    /* ---------------- layered mountains (ink-wash / dragon's keep) ---------------- */
    case 'mountains':
      return (
        <svg className="mg-scene mg-scene-mountains" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <circle cx={1120} cy={210} r={62} fill="var(--mg-particle)" opacity={0.55} />
          <g fill={bg.far} opacity={0.45}>
            <path d="M0 620 L180 430 L360 600 L560 420 L760 610 L940 460 L1140 620 L1320 500 L1440 600 V900 H0 Z" />
          </g>
          <g fill={bg.mid} opacity={0.6}>
            <path d="M0 700 L200 520 L420 690 L640 500 L860 700 L1060 540 L1280 700 L1440 580 V900 H0 Z" />
          </g>
          <g fill={bg.near} opacity={0.8}>
            <path d="M0 780 L160 620 L360 780 L560 600 L760 790 L980 640 L1180 790 L1360 660 L1440 760 V900 H0 Z" />
          </g>
          <rect y={840} width="1440" height="60" fill={bg.near} opacity={0.5} />
        </svg>
      )

    /* ---------------- shooting stars + dome ---------------- */
    case 'shooting-stars':
      return (
        <svg className="mg-scene mg-scene-shoot" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <g fill="#fff" opacity={0.85}>
            {[120, 300, 520, 780, 980, 1210, 1360, 220, 640, 880, 1100, 380].map((x, i) => (
              <circle key={i} cx={x} cy={30 + ((i * 71) % 260)} r={1.6 + (i % 3) * 0.6} />
            ))}
          </g>
          {Array.from({ length: 4 }).map((_, i) => (
            <line
              key={i}
              x1={80 + i * 120}
              y1={90 + i * 40}
              x2={260 + i * 150}
              y2={30 + i * 46}
              stroke="var(--mg-particle)"
              strokeWidth={2}
              className="mg-shoot-line"
              style={{ ['--sd' as string]: `${i * 2.6}s` }}
            />
          ))}
          {/* low dome silhouette */}
          <path d="M0 820 Q 720 640 1440 820 V900 H0 Z" fill={bg.near} opacity={0.6} />
        </svg>
      )

    /* ---------------- synthwave sun + grid ---------------- */
    case 'sun-grid':
      return (
        <svg className="mg-scene mg-scene-sungrid" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <circle cx={720} cy={380} r={170} fill="var(--mg-accent2)" opacity={0.12} />
          <circle cx={720} cy={380} r={120} fill="var(--mg-accent)" opacity={0.25} />
          <path
            d="M720 460 V250 m 0 0 l0 210 M 720 290 l 34 0 m-34 0 l -34 0 M 720 340 l 42 0 m-42 0 l-42 0 M 720 390 l 40 0 m -40 0 l -40 0"
            stroke="var(--mg-accent2)"
            strokeWidth={2}
            opacity={0.5}
          />
          <path d="M0 640 H1440" stroke="var(--mg-accent)" strokeWidth={2} opacity={0.5} />
          <g stroke="var(--mg-accent2)" strokeWidth={1.5} opacity={0.5}>
            <path d="M0 820 L1440 820 M0 760 L1440 760 M0 700 L1440 700 M0 640 L1440 640" />
            <path d="M0 640 L720 900 M180 640 L720 900 M360 640 L720 900 M540 640 L720 900 M720 640 V900 M900 640 L720 900 M1080 640 L720 900 M1260 640 L720 900 M1440 640 L720 900" />
          </g>
        </svg>
      )

    /* ---------------- moon: craters + clouds + ridge ---------------- */
    case 'moon':
      return (
        <svg className="mg-scene mg-scene-moon" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <circle cx={1120} cy={190} r={96} fill="var(--mg-particle)" opacity={0.95} />
          <g fill={bg.far} opacity={0.5}>
            <circle cx={1080} cy={160} r={18} />
            <circle cx={1160} cy={200} r={14} />
            <circle cx={1090} cy={224} r={12} />
          </g>
          <g fill={bg.mid} opacity={0.5}>
            <ellipse cx={300} cy={180} rx={180} ry={34} className="mg-cld" style={{ ['--cd' as string]: '0s' }} />
            <ellipse cx={760} cy={120} rx={200} ry={40} className="mg-cld" style={{ ['--cd' as string]: '-9s' }} />
            <ellipse cx={140} cy={90} rx={150} ry={30} className="mg-cld" style={{ ['--cd' as string]: '-18s' }} />
          </g>
          <path d="M0 700 L180 560 L360 700 L560 540 L760 710 L980 560 L1180 720 L1340 600 L1440 680 V900 H0 Z" fill={bg.near} opacity={0.65} />
        </svg>
      )

    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* ThemeBackdrop                                                       */
/* ------------------------------------------------------------------ */
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

  // Nested <svg>s each bake a <title/> — strip stray empties by keying
  // unique classes; nothing user-facing reads titles anyway.

  // particle counts per kind — far denser than the old ~30 so rain/snow/embers
  // remain continuous across the whole screen.
  const countBy: Record<string, { base: number; per: number; span: number }> = {
    rain: { base: 40, per: 70, span: 8 },
    snow: { base: 50, per: 90, span: 9 },
    embers: { base: 34, per: 70, span: 9 },
    leaves: { base: 26, per: 50, span: 10 },
    bubbles: { base: 22, per: 40, span: 9 },
    sparkles: { base: 40, per: 80, span: 6 },
    stars: { base: 50, per: 90, span: 7 },
    fireflies: { base: 30, per: 60, span: 8 },
    petals: { base: 22, per: 44, span: 9 },
    none: { base: 0, per: 0, span: 0 },
  }
  const cfg = countBy[theme.particle] ?? countBy.none
  const count = Math.round(cfg.base + density * cfg.per)
  const particles = useMemo(() => buildParticles(count, cfg.span), [count, cfg.span])
  const cls = particleClass(theme.particle)
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
          '--mg-accent': v.accent,
          '--mg-accent2': v.accent2,
          '--mg-panel-soft': v.panelSoft,
          '--mg-text-soft': v.textSoft,
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
      <Stream kind={theme.particle} />
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