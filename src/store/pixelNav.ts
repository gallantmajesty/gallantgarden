import { useWorld } from './world'
import { useSeatFlow } from './seatFlow'

export function usePixelNav() {
  const world = useWorld.getState()
  const flow = useSeatFlow.getState()
  return {
    navigate: (seatId: number) => world.sit(seatId),
    current: world.seat,
    seats: flow.seats,
  }
}
