import { Billboard, Float, Text } from '@react-three/drei'

interface CrystalMarkerProps {
  title: string
  color: string
  focused?: boolean
  dimmed?: boolean
  onClick?: () => void
}

/**
 * A glowing floating gem + name label that hovers above a tree as a magical
 * location marker. The emissive gem blooms via the scene's post-processing.
 */
export function CrystalMarker({ title, color, focused, dimmed, onClick }: CrystalMarkerProps) {
  const opacity = dimmed ? 0.45 : 1
  const intensity = focused ? 2.6 : 1.5

  return (
    <group position={[0, 5.4, 0]}>
      <Float speed={2} rotationIntensity={1.2} floatIntensity={0.8}>
        {/* gem — two stacked cones form a diamond */}
        <group onClick={onClick} scale={focused ? 1.3 : 1}>
          <mesh position={[0, 0.18, 0]}>
            <coneGeometry args={[0.32, 0.42, 6]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={intensity}
              roughness={0.15}
              metalness={0.3}
              transparent
              opacity={opacity}
            />
          </mesh>
          <mesh position={[0, -0.16, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.32, 0.52, 6]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={intensity}
              roughness={0.15}
              metalness={0.3}
              transparent
              opacity={opacity}
            />
          </mesh>
          {/* soft glow halo */}
          <mesh>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.12 * opacity} />
          </mesh>
        </group>
      </Float>

      {/* name label */}
      <Billboard position={[0, 1.05, 0]}>
        <Text
          fontSize={0.62}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.045}
          outlineColor="#2a1a40"
          outlineOpacity={opacity}
          fillOpacity={opacity}
          maxWidth={6}
        >
          {title}
        </Text>
      </Billboard>
    </group>
  )
}
