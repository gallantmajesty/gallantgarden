// Lava Pad Networking — sync player states over existing multiplayer channel

import { useEffect } from 'react'
import { useLavaPadStore } from './store'
import { useRealmNet, getTarget } from '../../multiplayer/net'

const SYNC_INTERVAL = 100 // ms between sync broadcasts

export function LavaPadNetworking({ onReady }: { onReady?: () => void }) {
  const channel = useRealmNet((s) => s.channel)
  const roster = useRealmNet((s) => s.roster)
  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const players = useLavaPadStore((s) => s.players)
  const addPlayer = useLavaPadStore((s) => s.addPlayer)
  const removePlayer = useLavaPadStore((s) => s.removePlayer)

  // Signal ready once the store is initialized
  useEffect(() => {
    onReady?.()
  }, [])

  // Sync roster → local players
  useEffect(() => {
    for (const [id, entry] of Object.entries(roster)) {
      if (!players[id]) {
        addPlayer(id, entry.name)
      }
    }
    for (const id of Object.keys(players)) {
      if (id === localPlayerId) continue
      if (!roster[id]) {
        removePlayer(id)
      }
    }
  }, [roster])

  // Read remote player transforms from multiplayer targets
  useEffect(() => {
    if (!channel) return
    const interval = setInterval(() => {
      for (const id of Object.keys(roster)) {
        if (id === localPlayerId) continue
        const target = getTarget(id)
        if (!target) continue

        // For now, use basic position to determine platform proximity
        // In a full implementation, we'd include LavaPad-specific state
        // in the multiplayer payload
        const player = players[id]
        if (!player) continue

        // Update basic state from target transforms
        // The actual game state sync would be done via custom channel events
      }
    }, SYNC_INTERVAL)
    return () => clearInterval(interval)
  }, [channel, roster, localPlayerId])

  return null
}
