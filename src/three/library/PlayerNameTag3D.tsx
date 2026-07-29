import { Html } from '@react-three/drei'
import { PlayerNameTag } from '../../components/PlayerNameTag'
import { getTarget } from '../../multiplayer/net'

export function PlayerNameTag3D({
  name,
  rank,
  country,
  playerId,
  self,
  headY = 2.55,
  hidden = false,
  showAll = false,
  playerId_net,
  banner,
  logo,
  onInfoClick,
}: {
  name: string
  rank: string
  country: string | null
  playerId?: number | null
  self?: boolean
  headY?: number
  hidden?: boolean
  showAll?: boolean
  playerId_net?: string
  banner?: string
  logo?: string
  onInfoClick?: () => void
}) {
  if (hidden) return null

  let timerRemaining: number | undefined
  let timerTotal: number | undefined
  if (playerId_net && !self) {
    const target = getTarget(playerId_net)
    if (target && target.timerStartedAt > 0 && target.timerDurationMs > 0) {
      const elapsed = Date.now() - target.timerStartedAt
      const totalSec = Math.round(target.timerDurationMs / 1000)
      const remainSec = Math.max(0, Math.round((target.timerDurationMs - elapsed) / 1000))
      if (remainSec > 0 && remainSec < totalSec) {
        timerRemaining = remainSec
        timerTotal = totalSec
      }
    }
  }

  return (
    <Html
      position={[0, headY, 0]}
      center
      distanceFactor={10}
      zIndexRange={[30, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <PlayerNameTag
        name={name}
        rank={rank}
        country={country}
        playerId={playerId}
        self={self}
        showAll={showAll}
        timerRemaining={timerRemaining}
        timerTotal={timerTotal}
        banner={banner}
        logo={logo}
        onInfoClick={onInfoClick}
      />
    </Html>
  )
}
