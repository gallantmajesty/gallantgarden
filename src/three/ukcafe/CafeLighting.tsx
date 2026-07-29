export function CafeLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#FFE4B5" />

      <directionalLight
        position={[0, 8, -10]}
        intensity={0.6}
        color="#FFD700"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={12}
        shadow-camera-bottom={-2}
      />

      <directionalLight position={[0, 5, 10]} intensity={0.2} color="#FFECD2" />

      {[
        [-6, 4],
        [0, 4],
        [6, 4],
        [-6, -2],
        [6, -2],
      ].map(([x, z], i) => (
        <group key={`pendant-${i}`}>
          <mesh position={[x, 6, z]}>
            <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
            <meshStandardMaterial color="#2F2F2F" roughness={0.5} />
          </mesh>
          <mesh position={[x, 5.2, z]} castShadow>
            <cylinderGeometry args={[0.4, 0.55, 0.5, 16]} />
            <meshStandardMaterial color="#DAA520" roughness={0.2} metalness={0.7} />
          </mesh>
          <pointLight
            position={[x, 5.3, z]}
            intensity={3}
            color="#FFE4B5"
            distance={6}
            castShadow
          />
        </group>
      ))}

      {[-2, 2].map((x, i) => (
        <group key={`counter-lamp-${i}`}>
          <mesh position={[x, 2.5, -7]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#FFD700" roughness={0.2} emissive="#FFE4B5" emissiveIntensity={0.5} />
          </mesh>
          <pointLight position={[x, 2.5, -7.5]} intensity={2} color="#FFE4B5" distance={4} />
        </group>
      ))}

      {[-9, 9].map((x) =>
        [-4, 4].map((z) => (
          <group key={`sconce-${x}-${z}`}>
            <mesh position={[x, 4.5, z + 8.8]}>
              <cylinderGeometry args={[0.1, 0.15, 0.3, 8]} />
              <meshStandardMaterial color="#DAA520" roughness={0.2} metalness={0.6} />
            </mesh>
            <pointLight position={[x - 0.3, 4.5, z + 8.5]} intensity={1.5} color="#FFE4B5" distance={5} />
          </group>
        ))
      )}

      <group position={[-11.8, 1, 0]}>
        <pointLight position={[0.3, 0.5, 0]} intensity={4} color="#FF6347" distance={8} castShadow />
      </group>
    </>
  )
}