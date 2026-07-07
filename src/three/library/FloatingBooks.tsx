// Simple placeholder for FloatingBooks
export function FloatingBooks({ count = 10 }) {
  const books = Array.from({ length: count }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 15,
      Math.random() * 6 + 2,
      (Math.random() - 0.5) * 15,
    ],
    rotation: [
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI,
    ],
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
  }))

  return (
    <group>
      {books.map((book, i) => (
        <group key={i} position={book.position} rotation={book.rotation}>
          <boxGeometry args={[0.3, 0.1, 0.4]} />
          <meshStandardMaterial color={book.color} />
        </group>
      ))}
    </group>
  )
}