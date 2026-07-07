import { Sparkles } from '@react-three/drei'

// Simple placeholder for Fireflies
export function Fireflies({ count = 20 }) {
  const fireflies = Array.from({ length: count }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 20,
      Math.random() * 8 + 1,
      (Math.random() - 0.5) * 20,
    ],
    color: `hsl(${Math.random() * 60 + 40}, 100%, 70%)`,
  }))

  return (
    <group>
      {fireflies.map((firefly, i) => (
        <group key={i} position={firefly.position}>
          <Sparkles count={1} scale={[1, 1, 1]} size={0.5} speed={0.1} color={firefly.color} opacity={0.8} />
        </group>
      ))}
    </group>
  )
}