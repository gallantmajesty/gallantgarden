// 💀 LavaPad Game Over Screen — Full-screen overlay with rewards
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLavaPadStore } from './store'
import { usePlayerStore } from './playerStore'
import { Trophy, Coins, Star, ArrowLeft, Play } from 'lucide-react'

interface GameOverScreenProps {
  onPlayAgain: () => void
  onBackToLobby: () => void
}

export function GameOverScreen({ onPlayAgain, onBackToLobby }: GameOverScreenProps) {
  const results = useLavaPadStore((s) => s.results)
  const players = useLavaPadStore((s) => s.players)
  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const sessionCoins = usePlayerStore((s) => s.sessionCoins)
  const sessionXP = usePlayerStore((s) => s.sessionXP)
  const bestTime = usePlayerStore((s) => s.bestTime)

  const survivalTime = results?.survivalTime ?? 0
  const isNewBest = survivalTime >= bestTime && survivalTime > 0

  const [animateIn, setAnimateIn] = useState(false)
  useEffect(() => { setTimeout(() => setAnimateIn(true), 100) }, [])

  if (!results || !localPlayerId) return null

  return (
    <motion.div
      className="gameover-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Lava background effect */}
      <div className="gameover-lava-bg" />

      <div className={`gameover-content ${animateIn ? 'animate-in' : ''}`}>
        {/* Title */}
        <motion.h1
          className="gameover-title"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          GAME OVER
        </motion.h1>

        <motion.p
          className="gameover-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          You Survived!
        </motion.p>

        {/* Survival Time */}
        <motion.div
          className="survival-time"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          <span className="time-value">{survivalTime.toFixed(0)}s</span>
          {isNewBest && (
            <span className="new-best-badge">New Best!</span>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="gameover-stats"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="stat-card">
            <Trophy size={20} className="stat-icon" />
            <span className="stat-label">Best Score</span>
            <span className="stat-value">{bestTime.toFixed(0)}s</span>
          </div>

          <div className="stat-card coins">
            <Coins size={20} className="stat-icon" />
            <span className="stat-label">Coins Earned</span>
            <span className="stat-value">+{sessionCoins}</span>
          </div>

          <div className="stat-card xp">
            <Star size={20} className="stat-icon" />
            <span className="stat-label">XP Earned</span>
            <span className="stat-value">+{sessionXP}</span>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="gameover-actions"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <button className="btn-play-again" onClick={onPlayAgain}>
            <Play size={20} />
            <span>Play Again</span>
          </button>

          <button className="btn-back-to-lobby" onClick={onBackToLobby}>
            <ArrowLeft size={20} />
            <span>Back to Lobby</span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
