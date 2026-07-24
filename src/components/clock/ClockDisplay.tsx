import { useEffect, useRef, useState } from 'react'
import { useClockStore, CLOCK_THEMES, type ClockType } from '../../store/clock'
import './ClockDisplay.css'

interface ClockDisplayProps {
  size?: 'small' | 'medium' | 'large' | 'fullscreen'
  showDate?: boolean
  className?: string
  type?: ClockType
  phase?: string
  remaining?: number
  totalElapsed?: number
  sessionMinutes?: number
  segmentProgress?: number
  settings?: any
}

export function ClockDisplay({
  size = 'medium',
  showDate = true,
  className = '',
  type,
  phase,
  remaining = 0,
  totalElapsed = 0,
  sessionMinutes = 25,
  segmentProgress = 0,
  settings: externalSettings
}: ClockDisplayProps) {
  const activeClock = type || useClockStore(s => s.activeClock)
  const clockColor = useClockStore(s => s.clockColor)
  const showSeconds = useClockStore(s => s.showSeconds)
  const animationSpeed = useClockStore(s => s.animationSpeed)
  const particleDensity = useClockStore(s => s.particleDensity)
  const storeSettings = { color: clockColor, showSeconds, animationSpeed, particleDensity }
  const settings = externalSettings || storeSettings
  const theme = CLOCK_THEMES.find(t => t.id === activeClock)!
  const [currentTime, setCurrentTime] = useState(new Date())
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hours = currentTime.getHours()
  const minutes = currentTime.getMinutes()
  const seconds = currentTime.getSeconds()
  const milliseconds = currentTime.getMilliseconds()

  const smoothSeconds = seconds + milliseconds / 1000
  const smoothMinutes = minutes + smoothSeconds / 60
  const smoothHours = (hours % 12) + smoothMinutes / 60

  const renderClock = () => {
    switch (activeClock) {
      case 'analog':
        return <AnalogClock smoothHours={smoothHours} smoothMinutes={smoothMinutes} smoothSeconds={smoothSeconds} settings={settings} />
      case 'digital':
        return <DigitalClock hours={hours} minutes={minutes} seconds={seconds} settings={settings} />
      case 'sand':
        return <SandClock hours={hours} minutes={minutes} seconds={seconds} smoothSeconds={smoothSeconds} settings={settings} />
      case 'magical-rune':
        return <MagicalRuneClock smoothHours={smoothHours} smoothMinutes={smoothMinutes} smoothSeconds={smoothSeconds} settings={settings} />
      case 'crystal':
        return <CrystalClock smoothHours={smoothHours} smoothMinutes={smoothMinutes} smoothSeconds={smoothSeconds} settings={settings} canvasRef={canvasRef} />
      case 'moon-phase':
        return <MoonPhaseClock hours={hours} minutes={minutes} seconds={seconds} settings={settings} />
      case 'steampunk':
        return <SteampunkClock smoothHours={smoothHours} smoothMinutes={smoothMinutes} smoothSeconds={smoothSeconds} settings={settings} />
      case 'ethereal':
        return <EtherealClock smoothHours={smoothHours} smoothMinutes={smoothMinutes} smoothSeconds={smoothSeconds} settings={settings} />
      default:
        return <AnalogClock smoothHours={smoothHours} smoothMinutes={smoothMinutes} smoothSeconds={smoothSeconds} settings={settings} />
    }
  }

  const sizeClass = `clock-${size}`
  const dateStr = currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className={`clock-display ${sizeClass} ${theme.category} ${className}`}>
      <div className="clock-face" role="img" aria-label={`${theme.name} showing ${hours}:${minutes.toString().padStart(2, '0')}`}>
        {renderClock()}
        {size === 'fullscreen' && <div className="clock-glow" />}
      </div>
      {showDate && <div className="clock-date">{dateStr}</div>}
      {size === 'fullscreen' && (
        <div className="clock-theme-badge">{theme.previewIcon} {theme.name}</div>
      )}
    </div>
  )
}

// ─── ANALOG CLOCK ───
function AnalogClock({ smoothHours, smoothMinutes, smoothSeconds, settings }: {
  smoothHours: number; smoothMinutes: number; smoothSeconds: number; settings: any
}) {
  const color = settings.color || '#f0e6d2'
  const secondAngle = smoothSeconds * 6
  const minuteAngle = smoothMinutes * 6
  const hourAngle = smoothHours * 30

  return (
    <svg className="analog-clock" viewBox="0 0 200 200">
      <defs>
        <radialGradient id="analogFace" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0d0d1a" />
        </radialGradient>
        <radialGradient id="handGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={adjustColor(color, -40)} />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="url(#analogFace)" stroke={color} strokeWidth="2" opacity="0.8" />
      
      {/* Tick marks */}
      {[...Array(60)].map((_, i) => (
        <line
          key={i}
          x1="100" y1={i % 5 === 0 ? 10 : 15}
          x2="100" y2={i % 5 === 0 ? 0 : 5}
          stroke={color}
          strokeWidth={i % 5 === 0 ? 2 : 1}
          opacity={i % 5 === 0 ? 0.8 : 0.4}
          transform={`rotate(${i * 6} 100 100)`}
        />
      ))}
      
      {/* Numbers */}
      {[...Array(12)].map((_, i) => (
        <text
          key={i}
          x="100" y="35"
          textAnchor="middle"
          fill={color}
          fontSize="16"
          fontFamily="Georgia, serif"
          fontWeight="bold"
          transform={`rotate(${(i + 1) * 30} 100 100)`}
        >{(i + 1).toString()}</text>
      ))}

      {/* Hour hand */}
      <line
        x1="100" y1="100"
        x2="100" y2="45"
        stroke="url(#handGradient)"
        strokeWidth="5"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} 100 100)`}
        style={{ transformOrigin: '100px 100px', transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      
      {/* Minute hand */}
      <line
        x1="100" y1="100"
        x2="100" y2="25"
        stroke="url(#handGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle} 100 100)`}
        style={{ transformOrigin: '100px 100px', transition: 'transform 0.1s linear' }}
      />
      
      {/* Second hand */}
      {settings.showSeconds && (
        <line
          x1="100" y1="115"
          x2="100" y2="20"
          stroke="#e0556b"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${secondAngle} 100 100)`}
          style={{ transformOrigin: '100px 100px', transition: 'transform 0.1s linear' }}
        />
      )}
      
      {/* Center dot */}
      <circle cx="100" cy="100" r="6" fill={color} />
      <circle cx="100" cy="100" r="3" fill="#fff" />
    </svg>
  )
}

// ─── DIGITAL CLOCK ───
function DigitalClock({ hours, minutes, seconds, settings }: {
  hours: number; minutes: number; seconds: number; settings: any
}) {
  const color = settings.color || '#00ffc8'
  const format24 = settings.hourFormat !== 12
  const displayHours = format24 ? hours : hours % 12 || 12
  const ampm = format24 ? '' : hours >= 12 ? ' PM' : ' AM'

  return (
    <div className="digital-clock" style={{ '--clock-color': color }}>
      <div className="digital-time">
        <span className="digital-hours">{displayHours.toString().padStart(2, '0')}</span>
        <span className="digital-colon">:</span>
        <span className="digital-minutes">{minutes.toString().padStart(2, '0')}</span>
        {settings.showSeconds && (
          <>
            <span className="digital-colon">:</span>
            <span className="digital-seconds">{seconds.toString().padStart(2, '0')}</span>
          </>
        )}
      </div>
      {!format24 && <span className="digital-ampm">{ampm}</span>}
    </div>
  )
}

// ─── SAND CLOCK (HOURGLASS) ───
function SandClock({ hours, minutes, seconds, smoothSeconds, settings }: {
  hours: number; minutes: number; seconds: number; smoothSeconds: number; settings: any
}) {
  const color = settings.color || '#f4d03f'
  const progress = (minutes + seconds / 60) / 60 // 0-1 per hour

  return (
    <div className="sand-clock" style={{ '--sand-color': color }}>
      <div className="hourglass">
        <div className="bulb top">
          <div className="sand-top" style={{ height: `${100 - progress * 100}%` }} />
          <div className="sand-flowing" style={{ opacity: progress > 0 && progress < 1 ? 1 : 0 }} />
        </div>
        <div className="neck">
          <div className="sand-stream" style={{ height: `${smoothSeconds % 1 * 100}%` }} />
        </div>
        <div className="bulb bottom">
          <div className="sand-bottom" style={{ height: `${progress * 100}%` }} />
        </div>
      </div>
      <div className="sand-time">
        <span>{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}</span>
        {settings.showSeconds && <span className="sand-seconds">:{seconds.toString().padStart(2, '0')}</span>}
      </div>
    </div>
  )
}

// ─── MAGICAL RUNE CLOCK (GENSHIN STYLE) ───
const ELEMENTS = [
  { name: 'Pyro', color: '#ff6b35', symbol: '🔥', angle: 0 },
  { name: 'Hydro', color: '#00b4d8', symbol: '💧', angle: 90 },
  { name: 'Anemo', color: '#7dd3fc', symbol: '💨', angle: 180 },
  { name: 'Electro', color: '#d946ef', symbol: '⚡', angle: 270 },
]

function MagicalRuneClock({ smoothHours, smoothMinutes, smoothSeconds, settings }: {
  smoothHours: number; smoothMinutes: number; smoothSeconds: number; settings: any
}) {
  const color = settings.color || '#ff6b35'
  const activeElement = Math.floor((smoothHours * 30) / 90) % 4
  const element = ELEMENTS[activeElement]

  return (
    <div className="magical-rune-clock" style={{ '--rune-color': element.color }}>
      <div className="rune-circle">
        <svg viewBox="0 0 200 200" className="rune-svg">
          <defs>
            <radialGradient id="runeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={element.color} stopOpacity="0.3" />
              <stop offset="70%" stopColor={element.color} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#runeGlow)" />
          
          {/* Outer hour marks */}
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="100" y1="15"
              x2="100" y2={i % 3 === 0 ? 0 : 5}
              stroke={element.color}
              strokeWidth={i % 3 === 0 ? 3 : 1.5}
              opacity={i % 3 === 0 ? 0.9 : 0.5}
              transform={`rotate(${i * 30} 100 100)`}
            />
          ))}
          
          {/* Elemental symbols at cardinal points */}
          {ELEMENTS.map((el, idx) => (
            <text
              key={el.name}
              x="100" y={idx === 0 ? 25 : idx === 1 ? 175 : 100}
              x={idx === 2 ? 175 : idx === 3 ? 25 : 100}
              textAnchor="middle"
              dominantBaseline={idx === 1 ? 'middle' : 'central'}
              fill={el.color}
              fontSize="24"
              transform={`rotate(${el.angle} 100 100)`}
            >{el.symbol}</text>
          ))}
        </svg>
        
        {/* Rotating inner rune */}
        <div 
          className="rune-inner"
          style={{ 
            transform: `rotate(${smoothMinutes * 6}deg)`,
            transition: 'transform 10s linear',
          }}
        >
          <svg viewBox="0 0 100 100" width="80" height="80">
            <path
              d="M50 10 L65 45 L100 50 L65 55 L50 90 L35 55 L0 50 L35 45 Z"
              fill="none"
              stroke={element.color}
              strokeWidth="2"
              opacity="0.8"
              filter="drop-shadow(0 0 8px currentColor)"
            />
            <circle cx="50" cy="50" r="20" fill="none" stroke={element.color} strokeWidth="1.5" opacity="0.6" />
          </svg>
        </div>
      </div>
      
      <div className="rune-time">
        <span className="rune-element" style={{ color: element.color }}>{element.symbol} {element.name}</span>
        <div className="rune-digital">
          {Math.floor(smoothHours).toString().padStart(2, '0')}:{Math.floor(smoothMinutes).toString().padStart(2, '0')}
          {settings.showSeconds && `:${Math.floor(smoothSeconds).toString().padStart(2, '0')}`}
        </div>
      </div>
    </div>
  )
}

// ─── CRYSTAL CLOCK ───
function CrystalClock({ smoothHours, smoothMinutes, smoothSeconds, settings, canvasRef }: {
  smoothHours: number; smoothMinutes: number; smoothSeconds: number; settings: any; canvasRef: React.RefObject<HTMLCanvasElement>
}) {
  const color = settings.color || '#00ffff'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = 200 * dpr
    canvas.height = 200 * dpr
    canvas.style.width = '200px'
    canvas.style.height = '200px'
    ctx.scale(dpr, dpr)
    
    let animationId: number
    const particles: Array<{x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number}> = []
    
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.2)'
      ctx.fillRect(0, 0, 200, 200)
      
      // Crystal shape - rotating octahedron projection
      const time = Date.now() * 0.0005 * (settings.animationSpeed || 1)
      const faces = [
        { points: [[100, 20], [170, 100], [100, 180], [30, 100]], rotation: time },
        { points: [[100, 20], [100, 180], [170, 100]], rotation: time + 1 },
        { points: [[100, 20], [30, 100], [100, 180]], rotation: time + 2 },
      ]
      
      faces.forEach((face, fi) => {
        const centerX = 100, centerY = 100
        const rotated = face.points.map(([x, y]) => {
          const dx = x - centerX, dy = y - centerY
          const cos = Math.cos(face.rotation), sin = Math.sin(face.rotation)
          return [centerX + dx * cos - dy * sin, centerY + dx * sin + dy * cos]
        })
        
        ctx.beginPath()
        rotated.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
        ctx.closePath()
        
        const gradient = ctx.createLinearGradient(0, 0, 200, 200)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, adjustColor(color, -60))
        ctx.fillStyle = gradient
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 2 + fi)
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.6
        ctx.stroke()
        ctx.globalAlpha = 1
      })
      
      // Time particles
      if (Math.random() < 0.3 * (settings.particleDensity || 1)) {
        const angle = (smoothMinutes * 6 + Math.random() * 30) * Math.PI / 180
        particles.push({
          x: 100 + Math.cos(angle) * (60 + Math.random() * 20),
          y: 100 + Math.sin(angle) * (60 + Math.random() * 20),
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5 - 0.2,
          life: 1,
          maxLife: 1 + Math.random() * 2,
          size: 2 + Math.random() * 3,
          hue: 180 + Math.random() * 60,
        })
      }
      
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        p.life -= 1/60
        p.vy += 0.005
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life * 0.8})`
        ctx.fill()
        
        if (p.life <= 0) particles.splice(i, 1)
      })
      
      // Center glow pulse
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.003)
      ctx.beginPath()
      ctx.arc(100, 100, 15 + pulse * 10, 0, Math.PI * 2)
      const g = ctx.createRadialGradient(100, 100, 0, 100, 100, 30)
      g.addColorStop(0, `${color}80`)
      g.addColorStop(1, `${color}00`)
      ctx.fillStyle = g
      ctx.fill()
      
      // Time text
      ctx.fillStyle = color
      ctx.font = 'bold 24px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        `${Math.floor(smoothHours).toString().padStart(2, '0')}:${Math.floor(smoothMinutes).toString().padStart(2, '0')}:${Math.floor(smoothSeconds).toString().padStart(2, '0')}`,
        100, 190
      )
      
      animationId = requestAnimationFrame(animate)
    }
    
    animate()
    return () => cancelAnimationFrame(animationId)
  }, [settings.animationSpeed, settings.particleDensity, color, smoothHours, smoothMinutes, smoothSeconds])

  return <canvas ref={canvasRef} className="crystal-clock-canvas" />
}

// ─── MOON PHASE CLOCK ───
function MoonPhaseClock({ hours, minutes, seconds, settings }: {
  hours: number; minutes: number; seconds: number; settings: any
}) {
  const color = settings.color || '#c9b896'
  const totalMinutes = hours * 60 + minutes
  const moonPhase = (totalMinutes % (24 * 60)) / (24 * 60) // 0-1 over day

  return (
    <div className="moon-phase-clock" style={{ '--moon-color': color }}>
      <div className="moon-container">
        <div className="moon-bg">
          <div 
            className="moon"
            style={{ 
              '--phase': moonPhase,
              background: `radial-gradient(circle at ${moonPhase < 0.5 ? '20%' : '80%'} 50%, var(--moon-color) 0%, #1a1a2e 70%)`
            }}
          />
          <div className="moon-glow" />
        </div>
        <div className="stars">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="star" style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 73) % 100}%`,
              animationDelay: `${(i * 137) % 100 / 100 * 3}s`,
            }} />
          ))}
        </div>
      </div>
      <div className="moon-time">
        {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
        {settings.showSeconds && `:${seconds.toString().padStart(2, '0')}`}
      </div>
      <div className="moon-phase-name">
        {moonPhase < 0.03 || moonPhase > 0.97 ? '🌑 New Moon' :
         moonPhase < 0.22 ? '🌒 Waxing Crescent' :
         moonPhase < 0.28 ? '🌓 First Quarter' :
         moonPhase < 0.47 ? '🌔 Waxing Gibbous' :
         moonPhase < 0.53 ? '🌕 Full Moon' :
         moonPhase < 0.72 ? '🌖 Waning Gibbous' :
         moonPhase < 0.78 ? '🌗 Last Quarter' :
         '🌘 Waning Crescent'}
      </div>
    </div>
  )
}

// ─── STEAMPUNK CLOCK ───
function SteampunkClock({ smoothHours, smoothMinutes, smoothSeconds, settings }: {
  smoothHours: number; smoothMinutes: number; smoothSeconds: number; settings: any
}) {
  const color = settings.color || '#b8860b'

  return (
    <div className="steampunk-clock" style={{ '--gear-color': color }}>
      <svg viewBox="0 0 200 200" className="gear-system">
        <defs>
          <radialGradient id="brassGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a2000" />
            <stop offset="100%" stopColor="#0d0800" />
          </radialGradient>
        </defs>
        <rect width="200" height="200" fill="url(#brassGlow)" rx="10" />
        
        {/* Large hour gear */}
        <Gear cx="100" cy="100" r="70" teeth={12} rotation={smoothHours * 30} color={color} />
        
        {/* Medium minute gear */}
        <Gear cx="100" cy="100" r="45" teeth={24} rotation={smoothMinutes * 6} color={color} />
        
        {/* Small second gear */}
        {settings.showSeconds && (
          <Gear cx="100" cy="100" r="25" teeth={60} rotation={smoothSeconds * 6} color="#ff6b35" />
        )}
        
        {/* Center axle */}
        <circle cx="100" cy="100" r="8" fill={color} />
        <circle cx="100" cy="100" r="4" fill="#ffd700" />
      </svg>
      
      <div className="steampunk-time">
        <span className="steampunk-hours">{Math.floor(smoothHours).toString().padStart(2, '0')}</span>
        <span className="steampunk-sep">:</span>
        <span className="steampunk-minutes">{Math.floor(smoothMinutes).toString().padStart(2, '0')}</span>
        {settings.showSeconds && (
          <>
            <span className="steampunk-sep">:</span>
            <span className="steampunk-seconds">{Math.floor(smoothSeconds).toString().padStart(2, '0')}</span>
          </>
        )}
      </div>
    </div>
  )
}

function Gear({ cx, cy, r, teeth, rotation, color }: {
  cx: number; cy: number; r: number; teeth: number; rotation: number; color: string
}) {
  const points = []
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i / (teeth * 2)) * Math.PI * 2
    const radius = i % 2 === 0 ? r : r * 0.7
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`)
  }
  
  return (
    <g transform={`rotate(${rotation} ${cx} ${cy})`}>
      <polygon points={points.join(' ')} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
      <polygon points={points.map(p => p.replace(/,.*$/, '')).join(' ')} fill="none" stroke={color} strokeWidth="0.5" opacity="0.5" />
    </g>
  )
}

// ─── ETHEREAL CLOCK ───
function EtherealClock({ smoothHours, smoothMinutes, smoothSeconds, settings }: {
  smoothHours: number; smoothMinutes: number; smoothSeconds: number; settings: any
}) {
  const color = settings.color || '#ffd700'

  return (
    <div className="ethereal-clock" style={{ '--ethereal-color': color }}>
      <div className="ethereal-rings">
        {/* Hours ring */}
        <div 
          className="ethereal-ring hours"
          style={{ 
            transform: `rotate(${smoothHours * 30 - 90}deg)`,
            borderColor: color,
          }}
        >
          <div className="ring-marker" />
        </div>
        
        {/* Minutes ring */}
        <div 
          className="ethereal-ring minutes"
          style={{ 
            transform: `rotate(${smoothMinutes * 6 - 90}deg)`,
            borderColor: color,
          }}
        >
          <div className="ring-marker" />
        </div>
        
        {/* Seconds ring */}
        {settings.showSeconds && (
          <div 
            className="ethereal-ring seconds"
            style={{ 
              transform: `rotate(${smoothSeconds * 6 - 90}deg)`,
              borderColor: '#ff6b35',
            }}
          >
            <div className="ring-marker" />
          </div>
        )}
        
        {/* Center core */}
        <div className="ethereal-core">
          <div className="core-pulse" />
        </div>
      </div>
      
      <div className="ethereal-time">
        {Math.floor(smoothHours).toString().padStart(2, '0')}:{Math.floor(smoothMinutes).toString().padStart(2, '0')}
        {settings.showSeconds && `:${Math.floor(smoothSeconds).toString().padStart(2, '0')}`}
      </div>
    </div>
  )
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0xFF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
