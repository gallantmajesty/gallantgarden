// Simple placeholder for Aurora
export function Aurora() {
  return (
    <group position={[0, 15, -10]}>
      <mesh>
        <planeGeometry args={[30, 10]} />
        <meshStandardMaterial 
          color="#00ffff" 
          transparent 
          opacity={0.3}
          side={2} // BackSide
        />
      </mesh>
    </group>
  )
}