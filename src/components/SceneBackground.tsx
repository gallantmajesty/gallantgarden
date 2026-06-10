import './SceneBackground.css'

/**
 * A layered storybook scene (sky, sun, clouds, distant castle, rolling hills).
 * Pure CSS/SVG so it stays buttery smooth — the heavy 3D world comes later.
 */
export function SceneBackground() {
  return (
    <div className="scene" aria-hidden>
      <div className="scene-sky" />
      <div className="scene-sun" />

      {/* drifting clouds */}
      <div className="cloud cloud-a" />
      <div className="cloud cloud-b" />
      <div className="cloud cloud-c" />

      {/* far castle silhouette */}
      <svg className="scene-castle" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet">
        <g fill="#6f8fae" opacity="0.55">
          <rect x="150" y="70" width="100" height="120" />
          <rect x="120" y="95" width="40" height="95" />
          <rect x="240" y="95" width="40" height="95" />
          <polygon points="135,95 160,55 185,95" />
          <polygon points="215,95 240,55 265,95" />
          <polygon points="175,70 200,30 225,70" />
          <rect x="195" y="100" width="10" height="40" fill="#3c5066" />
        </g>
      </svg>

      {/* rolling hills */}
      <svg className="scene-hills back" viewBox="0 0 1440 220" preserveAspectRatio="none">
        <path d="M0,160 C300,90 600,200 900,140 C1140,95 1320,170 1440,130 L1440,220 L0,220 Z" />
      </svg>
      <svg className="scene-hills front" viewBox="0 0 1440 220" preserveAspectRatio="none">
        <path d="M0,190 C260,150 520,210 840,170 C1120,135 1300,205 1440,175 L1440,220 L0,220 Z" />
      </svg>

      <div className="scene-vignette" />
    </div>
  )
}
