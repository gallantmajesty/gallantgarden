// 💰 Coin + XP System for LavaPad
// Powers: rewards, progression, and unlocks

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CoinXPReward {
  baseRate: number      // coins per second survived
  bonusRiskyJump: number // bonus for near-miss jumps
  bonusCleanLanding: number // bonus for perfect landing
  bonusLongSurvival: number // bonus for every 30s survived
  bonusPlacement: Record<number, number> // placement => coin bonus
}

export const REWARD_RATES: CoinXPReward = {
  baseRate: 0.5,
  bonusRiskyJump: 5,
  bonusCleanLanding: 3,
  bonusLongSurvival: 10,
  bonusPlacement: {
    1: 50,   // 1st place
    2: 30,   // 2nd place
    3: 15,   // 3rd place
  },
}

export interface XPConfig {
  xpPerSecond: number
  xpPerCoin: number
  levels: { level: number; xpRequired: number }[]
}

export const XP_CONFIG: XPConfig = {
  xpPerSecond: 0.3,
  xpPerCoin: 0.1,
  levels: [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 100 },
    { level: 3, xpRequired: 250 },
    { level: 4, xpRequired: 500 },
    { level: 5, xpRequired: 900 },
    { level: 6, xpRequired: 1500 },
    { level: 7, xpRequired: 2300 },
    { level: 8, xpRequired: 3300 },
    { level: 9, xpRequired: 4600 },
    { level: 10, xpRequired: 6200 },
  ],
}

export function getLevelForXP(xp: number): number {
  let level = 1
  for (const lvl of XP_CONFIG.levels) {
    if (xp >= lvl.xpRequired) level = lvl.level
    else break
  }
  return level
}

export function getXPNeededForNextLevel(xp: number): number {
  const currentLevel = getLevelForXP(xp)
  const next = XP_CONFIG.levels.find(l => l.level === currentLevel + 1)
  return next ? next.xpRequired : XP_CONFIG.levels[XP_CONFIG.levels.length - 1].xpRequired
}

export function getLevelProgress(xp: number): number {
  const currentLevel = getLevelForXP(xp)
  const currentLevelConfig = XP_CONFIG.levels.find(l => l.level === currentLevel)
  const nextLevelConfig = XP_CONFIG.levels.find(l => l.level === currentLevel + 1)

  if (!currentLevelConfig) return 0
  if (!nextLevelConfig) return 1

  const prevXP = currentLevelConfig.xpRequired
  const nextXP = nextLevelConfig.xpRequired
  const levelXP = nextXP - prevXP
  const progressInLevel = xp - prevXP

  return Math.min(1, Math.max(0, progressInLevel / levelXP))
}

// ─── ZUSTAND STORE ──────────────────────────────────────────────────────────

interface PlayerProgressStore {
  coins: number
  totalCoinsEarned: number
  xp: number
  level: number
  bestTime: number
  gamesPlayed: number
  totalSurvivalTime: number
  riskyJumps: number
  cleanLandings: number
  wonGames: number
  top3Finishes: number

  // Session rewards (reset every match)
  sessionCoins: number
  sessionXP: number

  // Actions
  addCoins: (amount: number) => void
  addXP: (amount: number) => void
  recordGame: (survivalTime: number, placement: number, earnedCoins: number) => void
  resetSession: () => void
  calculateRewards: (survivalTime: number, placement: number) => { coins: number; xp: number }
}

export const usePlayerStore = create<PlayerProgressStore>()(
  persist(
    (set, get) => ({
      coins: 0,
      totalCoinsEarned: 0,
      xp: 0,
      level: 1,
      bestTime: 0,
      gamesPlayed: 0,
      totalSurvivalTime: 0,
      riskyJumps: 0,
      cleanLandings: 0,
      wonGames: 0,
      top3Finishes: 0,
      sessionCoins: 0,
      sessionXP: 0,

      addCoins: (amount) =>
        set((s) => ({
          coins: s.coins + amount,
          totalCoinsEarned: s.totalCoinsEarned + Math.max(0, amount),
          sessionCoins: s.sessionCoins + amount,
        })),

      addXP: (amount) =>
        set((s) => {
          const newXP = s.xp + amount
          const newLevel = getLevelForXP(newXP)
          return {
            xp: newXP,
            level: newLevel,
            sessionXP: s.sessionXP + amount,
          }
        }),

      recordGame: (survivalTime, placement, earnedCoins) =>
        set((s) => {
          const isNewBest = survivalTime > s.bestTime
          const isTop3 = placement <= 3
          const didWin = placement === 1

          return {
            bestTime: isNewBest ? survivalTime : s.bestTime,
            gamesPlayed: s.gamesPlayed + 1,
            totalSurvivalTime: s.totalSurvivalTime + survivalTime,
            wonGames: s.wonGames + (didWin ? 1 : 0),
            top3Finishes: s.top3Finishes + (isTop3 ? 1 : 0),
          }
        }),

      resetSession: () =>
        set({ sessionCoins: 0, sessionXP: 0 }),

      calculateRewards: (survivalTime, placement) => {
        let coins = survivalTime * REWARD_RATES.baseRate
        const longSurvivalBonus = Math.floor(survivalTime / 30) * REWARD_RATES.bonusLongSurvival
        const placementBonus = REWARD_RATES.bonusPlacement[placement] || 0

        coins += longSurvivalBonus + placementBonus

        let xp = survivalTime * XP_CONFIG.xpPerSecond + coins * XP_CONFIG.xpPerCoin

        return { coins: Math.round(coins), xp: Math.round(xp) }
      },
    }),
    {
      name: 'lavapad-player-progress',
      version: 1,
    }
  )
)
