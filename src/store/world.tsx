// Simple placeholder for world store
export const useWorld = () => {
  return {
    seat: null,
    sit: (id: number) => console.log('Sitting in seat:', id),
  }
}