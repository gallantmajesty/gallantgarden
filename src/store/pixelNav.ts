import { useWorld } from '../../store/world'

export function usePixelNav() {
  const world = useWorld.getState()
  return {
    navigate: (seatId: number) => world.sit(seatId),
    current: world.seat,
    seats: world.seats,
  }
}
