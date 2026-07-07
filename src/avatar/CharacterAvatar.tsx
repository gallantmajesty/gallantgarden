// Simple placeholder for CharacterAvatar
export function CharacterAvatar({ config, locomotion, lod }) {
  return (
    <group>
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.3, 1.5, 4, 8]} />
        <meshStandardMaterial color={config.color} />
      </mesh>
    </group>
  )
}