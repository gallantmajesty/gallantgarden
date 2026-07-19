import { Html } from '@react-three/drei'
import { PlayerNameTag } from '../../components/PlayerNameTag'

// Anchors the magical name plate above a player's head in world space.
// Scale follows distance so far players shrink naturally, and the whole thing
// sits slightly above the chibi rig's head.
export function PlayerNameTag3D({
  name,
  rank,
  country,
  playerId,
  self,
  headY = 2.55,
  hidden = false,
}: {
  name: string
  rank: string
  country: string | null
  playerId?: number | null
  self?: boolean
  headY?: number
  hidden?: boolean
}) {
  if (hidden) return null
  return (
    <Html
      position={[0, headY, 0]}
      center
      distanceFactor={10}
      zIndexRange={[30, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <PlayerNameTag name={name} rank={rank} country={country} playerId={playerId} self={self} />
    </Html>
  )
}
