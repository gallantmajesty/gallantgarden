// Simple placeholder for KnowledgeTree
export function KnowledgeTree() {
  return (
    <group position={[0, 0, 0]}>
      {/* Tree trunk */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.5, 0.8, 4, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Tree crown */}
      <mesh position={[0, 5, 0]}>
        <coneGeometry args={[3, 4, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      
      {/* Some floating books around the tree */}
      <mesh position={[2, 4, 2]}>
        <boxGeometry args={[0.3, 0.1, 0.4]} />
        <meshStandardMaterial color="#4169E1" />
      </mesh>
      <mesh position={[-2, 4, -2]}>
        <boxGeometry args={[0.3, 0.1, 0.4]} />
        <meshStandardMaterial color="#DC143C" />
      </mesh>
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.4]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
    </group>
  )
}