export function CafeDecor() {
  return (
    <group>
      {[
        [-8, 0, 7],
        [8, 0, 7],
        [-9, 0, -4],
        [9, 0, -4],
        [0, 0, 8],
      ].map((pos, i) => (
        <group key={`plant-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 0.8, 12]} />
            <meshStandardMaterial color="#CC6633" roughness={0.5} />
          </mesh>
          {[0, 0.4, 0.8, 1.2, 1.6].map((h) => (
            <mesh key={h} position={[Math.random() * 0.3 - 0.15, 0.8 + h, Math.random() * 0.3 - 0.15]}>
              <sphereGeometry args={[0.12 + Math.random() * 0.08, 8, 8]} />
              <meshStandardMaterial color={`hsl(${120 + Math.random() * 30}, 60%, ${20 + Math.random() * 20}%)`} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {[
        [-8, 4, 8.8],
        [-2, 3.5, 8.8],
        [4, 4.5, 8.8],
        [11.8, 3, -2],
        [11.8, 3, 4],
        [-11.8, 3, -2],
        [-11.8, 3, 4],
      ].map((pos, i) => (
        <group key={`poster-${i}`} position={pos as [number, number, number]}>
          <mesh>
            <planeGeometry args={[0.8, 1.1]} />
            <meshStandardMaterial
              color={
                ['#8B4513', '#DAA520', '#CD853F', '#A0522D', '#B8860B', '#8B7355', '#6B4226'][i]
              }
              roughness={0.6}
            />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.9, 0.05, 0.05]} />
            <meshStandardMaterial color="#DAA520" roughness={0.2} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.9, 0.05, 0.05]} />
            <meshStandardMaterial color="#DAA520" roughness={0.2} metalness={0.7} />
          </mesh>
        </group>
      ))}

      <group position={[-11.8, 1.5, 0]}>
        <mesh position={[0.2, 1.2, 0]} castShadow>
          <boxGeometry args={[0.2, 2.4, 3]} />
          <meshStandardMaterial color="#6B4226" roughness={0.5} />
        </mesh>
        <mesh position={[0.3, 0.1, 0]} castShadow>
          <boxGeometry args={[0.4, 0.2, 3.5]} />
          <meshStandardMaterial color="#808080" roughness={0.5} />
        </mesh>
        <mesh position={[0.1, 2.5, 0]} castShadow>
          <boxGeometry args={[0.5, 0.1, 3.5]} />
          <meshStandardMaterial color="#5C3A1E" roughness={0.4} />
        </mesh>
        <mesh position={[0.25, 0.8, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#FF6347" roughness={0.1} emissive="#FF6347" emissiveIntensity={1.5} />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1]} receiveShadow>
        <planeGeometry args={[5, 4]} />
        <meshStandardMaterial color="#8B2500" roughness={0.9} />
      </mesh>

      <mesh position={[0, 6, -8.8]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
        <meshStandardMaterial color="#DAA520" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0, 6, -8.75]}>
        <cylinderGeometry args={[0.45, 0.45, 0.05, 32]} />
        <meshStandardMaterial color="#FFFFF0" roughness={0.1} emissive="#FFFFF0" emissiveIntensity={0.15} />
      </mesh>
    </group>
  )
}