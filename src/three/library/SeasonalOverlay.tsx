// Simple placeholder for SeasonalOverlay
export function SeasonalOverlay({ enabled = true, particleMultiplier = 1 }) {
  if (!enabled) return null

  return (
    <group>
      {/* Seasonal decorations */}
      <mesh position={[0, 8, 0]}>
        <ringGeometry args={[5, 6, 8]} />
        <meshStandardMaterial color="#ff6b6b" transparent opacity={0.3} />
      </mesh>
      
      {/* Floating particles */}
      {Array.from({ length: 20 * particleMultiplier }, (_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 20, Math.random() * 10, (Math.random() - 0.5) * 20]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}