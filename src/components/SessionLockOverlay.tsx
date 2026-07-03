import { claimSession } from '../lib/session'
import './SessionLockOverlay.css'

interface Props {
  visible: boolean
  /** Human label of the device that currently holds the session (PC/mobile). */
  where?: string
}

export function SessionLockOverlay({ visible, where }: Props) {
  if (!visible) return null

  const handleResume = async () => {
    await claimSession()
  }

  return (
    <div className="session-lock-overlay">
      {/* top-left leaves */}
      <svg className="sl-leaves sl-leaves-tl" viewBox="0 0 200 200" fill="none">
        <g className="sl-leaf-sway-1">
          <path d="M10 190 Q30 140 50 160 Q40 120 70 130 Q55 90 90 100" stroke="rgba(107,191,79,0.18)" strokeWidth="2" fill="none" />
          <ellipse cx="50" cy="155" rx="12" ry="6" fill="rgba(107,191,79,0.1)" transform="rotate(-30 50 155)" />
          <ellipse cx="70" cy="125" rx="14" ry="6" fill="rgba(107,191,79,0.08)" transform="rotate(-20 70 125)" />
          <ellipse cx="35" cy="145" rx="10" ry="5" fill="rgba(107,191,79,0.12)" transform="rotate(-45 35 145)" />
          <circle cx="85" cy="108" r="3" fill="rgba(212,175,55,0.15)" />
          <circle cx="90" cy="100" r="2" fill="rgba(212,175,55,0.12)" />
          <circle cx="82" cy="102" r="2" fill="rgba(212,175,55,0.1)" />
          <circle cx="86" cy="96" r="2" fill="rgba(212,175,55,0.08)" />
        </g>
        <g className="sl-leaf-sway-2">
          <path d="M0 150 Q20 110 40 130 Q30 80 60 90" stroke="rgba(107,191,79,0.12)" strokeWidth="1.5" fill="none" />
          <ellipse cx="40" cy="125" rx="10" ry="5" fill="rgba(107,191,79,0.08)" transform="rotate(-40 40 125)" />
          <ellipse cx="55" cy="92" rx="11" ry="5" fill="rgba(107,191,79,0.07)" transform="rotate(-25 55 92)" />
        </g>
      </svg>

      {/* top-right leaves */}
      <svg className="sl-leaves sl-leaves-tr" viewBox="0 0 200 200" fill="none">
        <g className="sl-leaf-sway-2">
          <path d="M190 190 Q170 140 150 160 Q160 120 130 130 Q145 90 110 100" stroke="rgba(107,191,79,0.18)" strokeWidth="2" fill="none" />
          <ellipse cx="150" cy="155" rx="12" ry="6" fill="rgba(107,191,79,0.1)" transform="rotate(30 150 155)" />
          <ellipse cx="130" cy="125" rx="14" ry="6" fill="rgba(107,191,79,0.08)" transform="rotate(20 130 125)" />
          <ellipse cx="165" cy="145" rx="10" ry="5" fill="rgba(107,191,79,0.12)" transform="rotate(45 165 145)" />
          <circle cx="115" cy="108" r="3" fill="rgba(212,175,55,0.15)" />
          <circle cx="110" cy="100" r="2" fill="rgba(212,175,55,0.12)" />
          <circle cx="118" cy="102" r="2" fill="rgba(212,175,55,0.1)" />
          <circle cx="114" cy="96" r="2" fill="rgba(212,175,55,0.08)" />
        </g>
        <g className="sl-leaf-sway-1">
          <path d="M200 150 Q180 110 160 130 Q170 80 140 90" stroke="rgba(107,191,79,0.12)" strokeWidth="1.5" fill="none" />
          <ellipse cx="160" cy="125" rx="10" ry="5" fill="rgba(107,191,79,0.08)" transform="rotate(40 160 125)" />
          <ellipse cx="145" cy="92" rx="11" ry="5" fill="rgba(107,191,79,0.07)" transform="rotate(25 145 92)" />
        </g>
      </svg>

      {/* bottom-left leaves */}
      <svg className="sl-leaves sl-leaves-bl" viewBox="0 0 200 200" fill="none">
        <g className="sl-leaf-sway-2">
          <path d="M10 10 Q30 60 50 40 Q40 80 70 70 Q55 110 90 100" stroke="rgba(107,191,79,0.18)" strokeWidth="2" fill="none" />
          <ellipse cx="50" cy="45" rx="12" ry="6" fill="rgba(107,191,79,0.1)" transform="rotate(30 50 45)" />
          <ellipse cx="70" cy="75" rx="14" ry="6" fill="rgba(107,191,79,0.08)" transform="rotate(20 70 75)" />
          <ellipse cx="35" cy="55" rx="10" ry="5" fill="rgba(107,191,79,0.12)" transform="rotate(45 35 55)" />
          <circle cx="85" cy="92" r="3" fill="rgba(212,175,55,0.15)" />
          <circle cx="90" cy="100" r="2" fill="rgba(212,175,55,0.12)" />
          <circle cx="82" cy="98" r="2" fill="rgba(212,175,55,0.1)" />
          <circle cx="86" cy="104" r="2" fill="rgba(212,175,55,0.08)" />
        </g>
        <g className="sl-leaf-sway-1">
          <path d="M0 50 Q20 90 40 70 Q30 120 60 110" stroke="rgba(107,191,79,0.12)" strokeWidth="1.5" fill="none" />
          <ellipse cx="40" cy="75" rx="10" ry="5" fill="rgba(107,191,79,0.08)" transform="rotate(40 40 75)" />
          <ellipse cx="55" cy="108" rx="11" ry="5" fill="rgba(107,191,79,0.07)" transform="rotate(25 55 108)" />
        </g>
      </svg>

      {/* bottom-right leaves */}
      <svg className="sl-leaves sl-leaves-br" viewBox="0 0 200 200" fill="none">
        <g className="sl-leaf-sway-1">
          <path d="M190 10 Q170 60 150 40 Q160 80 130 70 Q145 110 110 100" stroke="rgba(107,191,79,0.18)" strokeWidth="2" fill="none" />
          <ellipse cx="150" cy="45" rx="12" ry="6" fill="rgba(107,191,79,0.1)" transform="rotate(-30 150 45)" />
          <ellipse cx="130" cy="75" rx="14" ry="6" fill="rgba(107,191,79,0.08)" transform="rotate(-20 130 75)" />
          <ellipse cx="165" cy="55" rx="10" ry="5" fill="rgba(107,191,79,0.12)" transform="rotate(-45 165 55)" />
          <circle cx="115" cy="92" r="3" fill="rgba(212,175,55,0.15)" />
          <circle cx="110" cy="100" r="2" fill="rgba(212,175,55,0.12)" />
          <circle cx="118" cy="98" r="2" fill="rgba(212,175,55,0.1)" />
          <circle cx="114" cy="104" r="2" fill="rgba(212,175,55,0.08)" />
        </g>
        <g className="sl-leaf-sway-2">
          <path d="M200 50 Q180 90 160 70 Q170 120 140 110" stroke="rgba(107,191,79,0.12)" strokeWidth="1.5" fill="none" />
          <ellipse cx="160" cy="75" rx="10" ry="5" fill="rgba(107,191,79,0.08)" transform="rotate(-40 160 75)" />
          <ellipse cx="145" cy="108" rx="11" ry="5" fill="rgba(107,191,79,0.07)" transform="rotate(-25 145 108)" />
        </g>
      </svg>

      {/* left edge leaves */}
      <svg className="sl-leaves sl-leaves-left" viewBox="0 0 80 400" fill="none">
        <g className="sl-leaf-sway-1">
          <path d="M5 350 Q25 300 15 260 Q35 240 20 200 Q40 180 25 140 Q45 120 30 80 Q50 60 35 20" stroke="rgba(107,191,79,0.12)" strokeWidth="1.5" fill="none" />
          <ellipse cx="20" cy="260" rx="10" ry="5" fill="rgba(107,191,79,0.08)" transform="rotate(15 20 260)" />
          <ellipse cx="25" cy="200" rx="12" ry="5" fill="rgba(107,191,79,0.06)" transform="rotate(-10 25 200)" />
          <ellipse cx="30" cy="140" rx="10" ry="4" fill="rgba(107,191,79,0.07)" transform="rotate(20 30 140)" />
          <ellipse cx="35" cy="80" rx="9" ry="4" fill="rgba(107,191,79,0.06)" transform="rotate(-15 35 80)" />
          <circle cx="38" cy="65" r="2" fill="rgba(212,175,55,0.1)" />
          <circle cx="32" cy="125" r="1.8" fill="rgba(212,175,55,0.08)" />
          <circle cx="28" cy="190" r="2" fill="rgba(212,175,55,0.09)" />
        </g>
      </svg>

      {/* right edge leaves */}
      <svg className="sl-leaves sl-leaves-right" viewBox="0 0 80 400" fill="none">
        <g className="sl-leaf-sway-2">
          <path d="M75 350 Q55 300 65 260 Q45 240 60 200 Q40 180 55 140 Q35 120 50 80 Q30 60 45 20" stroke="rgba(107,191,79,0.12)" strokeWidth="1.5" fill="none" />
          <ellipse cx="60" cy="260" rx="10" ry="5" fill="rgba(107,191,79,0.08)" transform="rotate(-15 60 260)" />
          <ellipse cx="55" cy="200" rx="12" ry="5" fill="rgba(107,191,79,0.06)" transform="rotate(10 55 200)" />
          <ellipse cx="50" cy="140" rx="10" ry="4" fill="rgba(107,191,79,0.07)" transform="rotate(-20 50 140)" />
          <ellipse cx="45" cy="80" rx="9" ry="4" fill="rgba(107,191,79,0.06)" transform="rotate(15 45 80)" />
          <circle cx="42" cy="65" r="2" fill="rgba(212,175,55,0.1)" />
          <circle cx="48" cy="125" r="1.8" fill="rgba(212,175,55,0.08)" />
          <circle cx="52" cy="190" r="2" fill="rgba(212,175,55,0.09)" />
        </g>
      </svg>

      {/* floating particles */}
      <div className="sl-particles">
        <span className="sl-particle sl-p1" />
        <span className="sl-particle sl-p2" />
        <span className="sl-particle sl-p3" />
        <span className="sl-particle sl-p4" />
        <span className="sl-particle sl-p5" />
        <span className="sl-particle sl-p6" />
      </div>

      <div className="session-lock-card sf-panel">
        <div className="session-lock-glow" />

        {/* lock icon at top center */}
        <div className="session-lock-icon">
          <svg width="80" height="80" viewBox="0 0 88 88" fill="none">
            <circle cx="44" cy="44" r="42" fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="1" />
            <circle cx="44" cy="44" r="38" fill="url(#slockBg)" stroke="url(#slockRim)" strokeWidth="2.5" />
            <circle cx="44" cy="44" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <path d="M32 38V30c0-6.6 5.4-12 12-12s12 5.4 12 12v8" stroke="url(#slockShackle)" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M34 38V31c0-5.5 4.5-10 10-10s10 4.5 10 10v7" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <rect x="28" y="38" width="32" height="26" rx="4" fill="url(#slockBody)" />
            <rect x="28" y="38" width="32" height="13" rx="4" fill="rgba(255,255,255,0.06)" />
            <circle cx="44" cy="48" r="4" fill="url(#slockKeyhole)" />
            <path d="M44 52 L44 60" stroke="url(#slockKeyhole)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="32" cy="42" r="1.5" fill="rgba(212,175,55,0.3)" />
            <circle cx="56" cy="42" r="1.5" fill="rgba(212,175,55,0.3)" />
            <circle cx="32" cy="58" r="1.5" fill="rgba(212,175,55,0.2)" />
            <circle cx="56" cy="58" r="1.5" fill="rgba(212,175,55,0.2)" />
            <circle cx="20" cy="24" r="1" fill="rgba(212,175,55,0.3)" className="sl-sparkle-1" />
            <circle cx="68" cy="20" r="0.8" fill="rgba(212,175,55,0.25)" className="sl-sparkle-2" />
            <circle cx="72" cy="52" r="0.9" fill="rgba(212,175,55,0.2)" className="sl-sparkle-3" />
            <defs>
              <radialGradient id="slockBg" cx="44" cy="40" r="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f6e8c8"/>
                <stop offset="100%" stopColor="#d4b896"/>
              </radialGradient>
              <linearGradient id="slockRim" x1="10" y1="10" x2="78" y2="78">
                <stop offset="0%" stopColor="rgba(212,175,55,0.6)"/>
                <stop offset="50%" stopColor="rgba(169,112,63,0.4)"/>
                <stop offset="100%" stopColor="rgba(212,175,55,0.6)"/>
              </linearGradient>
              <linearGradient id="slockShackle" x1="32" y1="18" x2="56" y2="38">
                <stop offset="0%" stopColor="#b8860b"/>
                <stop offset="50%" stopColor="#a9703f"/>
                <stop offset="100%" stopColor="#8b6914"/>
              </linearGradient>
              <linearGradient id="slockBody" x1="28" y1="38" x2="60" y2="64">
                <stop offset="0%" stopColor="#c9a96e"/>
                <stop offset="50%" stopColor="#a9703f"/>
                <stop offset="100%" stopColor="#8b5e2a"/>
              </linearGradient>
              <radialGradient id="slockKeyhole" cx="44" cy="50" r="10" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3a2a17"/>
                <stop offset="100%" stopColor="#1a1208"/>
              </radialGradient>
            </defs>
          </svg>
        </div>

        <h2>Active elsewhere</h2>
        <p>
          Your account is already open on{' '}
          <strong>{where ?? 'another device'}</strong>. An account can only be
          used in one place at a time.
        </p>
        <button className="session-lock-btn sf-btn" onClick={handleResume}>
          Use Focus Lily here
        </button>

        {/* castle illustration inside the card */}
        <svg className="session-lock-castle" viewBox="0 0 400 120" fill="none" preserveAspectRatio="xMidYMax meet">
          {/* ground */}
          <ellipse cx="200" cy="118" rx="195" ry="8" fill="rgba(122,74,38,0.08)" />
          {/* left tower */}
          <rect x="55" y="42" width="32" height="78" rx="1" fill="rgba(169,112,63,0.12)" />
          <polygon points="55,42 71,22 87,42" fill="rgba(169,112,63,0.14)" />
          <rect x="53" y="39" width="6" height="6" rx="1" fill="rgba(169,112,63,0.1)" />
          <rect x="65" y="39" width="6" height="6" rx="1" fill="rgba(169,112,63,0.1)" />
          <rect x="77" y="39" width="6" height="6" rx="1" fill="rgba(169,112,63,0.1)" />
          <rect x="63" y="52" width="5" height="8" rx="2.5" fill="rgba(212,175,55,0.15)" />
          <rect x="73" y="70" width="5" height="8" rx="2.5" fill="rgba(212,175,55,0.12)" />
          {/* center tower */}
          <rect x="172" y="30" width="56" height="90" rx="1" fill="rgba(169,112,63,0.14)" />
          <polygon points="172,30 200,6 228,30" fill="rgba(169,112,63,0.16)" />
          <rect x="196" y="0" width="8" height="10" rx="1" fill="rgba(169,112,63,0.12)" />
          <polygon points="194,0 200,-8 206,0" fill="rgba(169,112,63,0.14)" />
          <rect x="170" y="27" width="6" height="6" rx="1" fill="rgba(169,112,63,0.12)" />
          <rect x="184" y="27" width="6" height="6" rx="1" fill="rgba(169,112,63,0.12)" />
          <rect x="198" y="27" width="6" height="6" rx="1" fill="rgba(169,112,63,0.12)" />
          <rect x="212" y="27" width="6" height="6" rx="1" fill="rgba(169,112,63,0.12)" />
          <rect x="226" y="27" width="6" height="6" rx="1" fill="rgba(169,112,63,0.12)" />
          <rect x="188" y="40" width="6" height="10" rx="3" fill="rgba(212,175,55,0.18)" />
          <rect x="206" y="40" width="6" height="10" rx="3" fill="rgba(212,175,55,0.14)" />
          <rect x="188" y="62" width="6" height="10" rx="3" fill="rgba(212,175,55,0.12)" />
          <rect x="206" y="62" width="6" height="10" rx="3" fill="rgba(212,175,55,0.16)" />
          {/* right tower */}
          <rect x="312" y="50" width="30" height="70" rx="1" fill="rgba(169,112,63,0.12)" />
          <polygon points="312,50 327,32 342,50" fill="rgba(169,112,63,0.14)" />
          <rect x="310" y="47" width="6" height="6" rx="1" fill="rgba(169,112,63,0.1)" />
          <rect x="322" y="47" width="6" height="6" rx="1" fill="rgba(169,112,63,0.1)" />
          <rect x="334" y="47" width="6" height="6" rx="1" fill="rgba(169,112,63,0.1)" />
          <rect x="320" y="58" width="5" height="8" rx="2.5" fill="rgba(212,175,55,0.14)" />
          <rect x="330" y="76" width="5" height="8" rx="2.5" fill="rgba(212,175,55,0.11)" />
          {/* wall */}
          <rect x="87" y="70" width="225" height="50" rx="1" fill="rgba(169,112,63,0.08)" />
          {/* gate */}
          <path d="M188 120 L188 100 Q200 90 212 100 L212 120 Z" fill="rgba(26,18,8,0.2)" />
          {/* wall windows */}
          <rect x="110" y="82" width="5" height="8" rx="2.5" fill="rgba(212,175,55,0.12)" />
          <rect x="140" y="82" width="5" height="8" rx="2.5" fill="rgba(212,175,55,0.1)" />
          <rect x="260" y="82" width="5" height="8" rx="2.5" fill="rgba(212,175,55,0.12)" />
          <rect x="288" y="82" width="5" height="8" rx="2.5" fill="rgba(212,175,55,0.1)" />
          {/* floating sparkles */}
          <circle cx="40" cy="30" r="1.5" fill="rgba(212,175,55,0.18)" className="sl-castle-sparkle-1" />
          <circle cx="360" cy="25" r="1.2" fill="rgba(212,175,55,0.15)" className="sl-castle-sparkle-2" />
          <circle cx="200" cy="15" r="1" fill="rgba(212,175,55,0.12)" className="sl-castle-sparkle-3" />
          <circle cx="130" cy="20" r="0.8" fill="rgba(212,175,55,0.1)" className="sl-castle-sparkle-1" />
          <circle cx="270" cy="18" r="1" fill="rgba(212,175,55,0.13)" className="sl-castle-sparkle-2" />
        </svg>
      </div>
    </div>
  )
}
