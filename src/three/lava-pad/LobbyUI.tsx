// 🏔️ LavaPad Lobby UI — Hero section, entry gate to the game
// Single-page: no navigation, state-driven transitions
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayerStore } from './playerStore'
import { useCosmeticStore } from './cosmeticStore'
import { DEFAULT_CHARACTERS } from './cosmeticStore'
import { Flame, Coins, Trophy, Play, User } from 'lucide-react'

interface LobbyUIProps {
  onPlay: () => void
  visible: boolean
}

export function LavaPadLobby({ onPlay, visible }: LobbyUIProps) {
  if (!visible) return null

  const coins = usePlayerStore((s) => s.coins)
  const xp = usePlayerStore((s) => s.xp)
  const level = usePlayerStore((s) => s.level)
  const bestTime = usePlayerStore((s) => s.bestTime)
  const gamesPlayed = usePlayerStore((s) => s.gamesPlayed)
  const selectedCharacter = useCosmeticStore((s) => s.selectedCharacter)
  const character = DEFAULT_CHARACTERS.find((c) => c.id === selectedCharacter)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="lavapad-lobby"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Left: Identity */}
          <div className="lobby-left">
            <div className="character-preview">
              <div
                className="character-avatar"
                style={{ backgroundColor: character?.previewColor ?? '#ff6a20' }}
              >
                <User size={48} />
              </div>
              <span className="character-name">{character?.name ?? 'Hero'}</span>
            </div>
          </div>

          {/* Center: Action */}
          <div className="lobby-center">
            <div className="game-title">
              <h1>LAVA PAD</h1>
              <p className="tagline">Focus. Survive. Rise.</p>
            </div>

            <button className="play-button" onClick={onPlay}>
              <Play className="play-icon" size={28} />
              <span>PLAY</span>
            </button>

            <div className="lobby-stats">
              <div className="stat-card">
                <Trophy size={16} />
                <span>{bestTime.toFixed(1)}s</span>
                <small>Best</small>
              </div>
              <div className="stat-card">
                <Flame size={16} />
                <span>{level}</span>
                <small>Level</small>
              </div>
              <div className="stat-card">
                <span>{gamesPlayed}</span>
                <small>Games</small>
              </div>
            </div>
          </div>

          {/* Right: Status */}
          <div className="lobby-right">
            <div className="currency-hud">
              <div className="currency-item">
                <Coins size={18} className="coin-icon" />
                <span>{coins}</span>
              </div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${(xp / 100) * 100}%` }} />
                <span className="xp-text">XP</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
