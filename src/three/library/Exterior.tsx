// Simple placeholder for Exterior
export function Exterior({ count = 50, mountains = 10, clouds = 20 }) {
  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -1, -20]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      
      {/* Mountains */}
      {Array.from({ length: mountains }, (_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 40, 0, -30]}>
          <coneGeometry args={[Math.random() * 3 + 2, Math.random() * 5 + 3, 4]} />
          <meshStandardMaterial color="#8B7355" />
        </mesh>
      ))}
      
      {/* Clouds */}
      {Array.from({ length: clouds }, (_, i) => (
        <group key={i} position={[(Math.random() - 0.5) * 60, Math.random() * 10 + 5, -40]}>
          <mesh>
            <sphereGeometry args={[2, 8, 6]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
      
      {/* Trees */}
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[(Math.random() - 0.5) * 30, 0, -25]}>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 2, 4]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 2, 0]}>
            <coneGeometry args={[1, 2, 4]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}
    </group>
  )
}