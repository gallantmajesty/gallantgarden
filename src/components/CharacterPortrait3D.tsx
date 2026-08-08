import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CharacterAvatar } from '../avatar/CharacterAvatar'
import { createNullSafeEvents } from '../three/safeEvents'
import type { AvatarConfig } from '../avatar/config'

// A self-contained 3D character portrait for the profile's left panel. Renders
// the real rigged character (same CharacterAvatar used in the Realm / avatar
// editor) on a dark pedestal with warm lighting, a soft contact shadow, and a
// slow auto-rotate so it reads as a living "character card" rather than a flat
// icon. Transparent background so the panel's navy frame shows through.
export function CharacterPortrait3D({
  config,
  size = 280,
}: {
  config: AvatarConfig
  size?: number
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        margin: '12px auto 8px',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <Canvas
        events={createNullSafeEvents}
        shadows={false}
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.05, 3.4], fov: 36, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        {/* warm character lighting */}
        <hemisphereLight args={['#ffe8c0', '#1a1208', 0.75]} />
        <directionalLight position={[3, 5, 2]} intensity={1.1} color="#ffecd0" />
        <directionalLight position={[-2, 3, -1]} intensity={0.4} color="#ffb870" />
        <ambientLight intensity={0.3} color="#ffe8d0" />

        <group position={[0, -0.9, 0]}>
          <CharacterAvatar config={config} hideAccessories />
          {/* glowing gold ring pedestal */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.55, 0.72, 48]} />
            <meshBasicMaterial color="#d4a843" transparent opacity={0.5} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[0.56, 48]} />
            <meshBasicMaterial color="#0b1022" transparent opacity={0.55} />
          </mesh>
        </group>

        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.1}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={0.5}
          maxPolarAngle={Math.PI / 1.95}
          target={[0, 0.05, 0]}
        />
      </Canvas>
    </div>
  )
}
