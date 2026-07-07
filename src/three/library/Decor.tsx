// Simple placeholder for Decor
export function Decor() {
  return (
    <group>
      {/* Some decorative elements */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>
      <mesh position={[3, 1.5, 3]}>
        <coneGeometry args={[0.3, 1, 8]} />
        <meshStandardMaterial color="#4ecdc4" />
      </mesh>
      <mesh position={[-3, 1.5, -3]}>
        <cylinderGeometry args={[0.2, 0.2, 1, 8]} />
        <meshStandardMaterial color="#45b7d1" />
      </mesh>
    </group>
  )
}