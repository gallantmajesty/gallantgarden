// Simple placeholder for StudyTable
export function StudyTables() {
  const tables = [
    { pos: [-5, 0.5, -5], rot: 0 },
    { pos: [5, 0.5, -5], rot: 0 },
    { pos: [0, 0.5, 5], rot: Math.PI / 4 },
  ]

  return (
    <group>
      {tables.map((table, i) => (
        <group key={i} position={table.pos} rotation={[0, table.rot, 0]}>
          {/* Table top */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[3, 0.1, 2]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          {/* Table legs */}
          <mesh position={[-1.4, 0.25, -0.9]}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="#4a4a4a" />
          </mesh>
          <mesh position={[1.4, 0.25, -0.9]}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="#4a4a4a" />
          </mesh>
          <mesh position={[-1.4, 0.25, 0.9]}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="#4a4a4a" />
          </mesh>
          <mesh position={[1.4, 0.25, 0.9]}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="#4a4a4a" />
          </mesh>
        </group>
      ))}
    </group>
  )
}