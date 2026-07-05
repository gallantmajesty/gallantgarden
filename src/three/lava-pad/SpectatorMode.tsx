// Lava Pad Spectator Mode — follow survivors, cycle targets, hide controls

import { useEffect, useRef } from 'react'
import { useLavaPadStore } from './store'

export function SpectatorMode() {
  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const players = useLavaPadStore((s) => s.players)
  const phase = useLavaPadStore((s) => s.phase)
  const updatePlayer = useLavaPadStore((s) => s.updatePlayer)
  const cycleSpectatorTarget = useLavaPadStore((s) => s.cycleSpectatorTarget)
  const spectatorTargetIndex = useLavaPadStore((s) => s.spectatorTargetIndex)

  const cycleTimer = useRef<number | null>(null)

  // Auto-toggle spectating when player is eliminated
  useEffect(() => {
    if (!localPlayerId || !players[localPlayerId]) return
    const player = players[localPlayerId]
    if (player.eliminated && !player.spectating) {
      const survivors = Object.values(players).filter(p => !p.eliminated && p.id !== localPlayerId)
      updatePlayer(localPlayerId, {
        spectating: true,
        spectateTargetId: survivors[0]?.id ?? null,
      })
    }
  }, [players, localPlayerId])

  // Track survivor changes and auto-switch
  useEffect(() => {
    if (!localPlayerId || !players[localPlayerId]) return
    const player = players[localPlayerId]
    if (player.spectating) {
      const survivors = Object.values(players).filter(p => !p.eliminated && p.id !== localPlayerId)
      if (survivors.length === 0) {
        updatePlayer(localPlayerId, { spectateTargetId: null })
        return
      }
      const currentTarget = survivors.find(s => s.id === player.spectateTargetId)
      if (!currentTarget) {
        const target = survivors[spectatorTargetIndex % survivors.length]
        updatePlayer(localPlayerId, { spectateTargetId: target.id })
      }
    }
  }, [players, localPlayerId, spectatorTargetIndex])

  // Auto-cycle spectator target every 5 seconds
  useEffect(() => {
    if (!localPlayerId || !players[localPlayerId]) return
    if (!players[localPlayerId]?.spectating) return
    const survivors = Object.values(players).filter(p => !p.eliminated && p.id !== localPlayerId)
    if (survivors.length <= 1) return

    cycleTimer.current = window.setInterval(() => {
      cycleSpectatorTarget()
    }, 5000)

    return () => {
      if (cycleTimer.current != null) window.clearInterval(cycleTimer.current)
    }
  }, [localPlayerId, players, phase])

  return null
}
