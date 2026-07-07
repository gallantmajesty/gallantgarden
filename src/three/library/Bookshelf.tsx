import { HALL } from './layout'

// Simple placeholder for Bookshelf
export function Bookshelves() {
  const shelves = [
    { pos: [-8, 1, -10], rot: 0 },
    { pos: [8, 1, -10], rot: 0 },
    { pos: [-8, 1, 10], rot: 0 },
    { pos: [8, 1, 10], rot: 0 },
    { pos: [-12, 1, 0], rot: Math.PI / 2 },
    { pos: [12, 1, 0], rot: Math.PI / 2 },
  ]

  return (
    <group>
      {shelves.map((shelf, i) => (
        <mesh key={i} position={shelf.pos} rotation={[0, shelf.rot, 0]}>
          <boxGeometry args={[2, 3, 0.3]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      ))}
    </group>
  )
}