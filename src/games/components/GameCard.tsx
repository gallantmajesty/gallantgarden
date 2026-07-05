import { useNavigate } from 'react-router-dom'
import { PngIcon } from '../../components/PngIcon'

interface GameCardProps {
  game: {
    key: string
    name: string
    description: string
    multiplayer: string
    availableDuringBreaks: string
    playLabel: string
    route: string
    iconName: 'lava' | 'games'
  }
}

export function GameCard({ game }: GameCardProps) {
  const navigate = useNavigate()

  return (
    <button
      className="game-card water-glass"
      onClick={() => navigate(game.route)}
    >
      <div className="game-card-artwork">
        <PngIcon name={game.iconName} size={96} alt={game.name} />
      </div>
      <div className="game-card-content">
        <div className="game-card-badges">
          <span className="game-badge multiplayer">{game.multiplayer}</span>
          <span className="game-badge breaks">{game.availableDuringBreaks}</span>
        </div>
        <h2 className="game-card-title">{game.name}</h2>
        <p className="game-card-desc">{game.description}</p>
        <button className="sf-btn game-card-play" onClick={(e) => { e.stopPropagation(); navigate(game.route); }}>
          <span className="game-play-icon">▶</span>
          {game.playLabel}
        </button>
      </div>
    </button>
  )
}

export function GameBadge({ children, variant = 'multiplayer' }: { children: React.ReactNode; variant?: 'multiplayer' | 'breaks' | 'soon' }) {
  const className = `game-badge ${variant}`
  return <span className={className}>{children}</span>
}