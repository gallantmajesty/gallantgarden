import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, type Points } from 'three'
import { useScenePreset } from '../../store/quality'

import { CAFE_PALETTE } from './materials'

function HangingLantern({ position, scale = 1, realLight = false }: { position: [number, number, number]; scale?: number; realLight?: boolean }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.12, 20]} />
        <meshStandardMaterial color="#1f1711" roughness={0.55} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.52, 0.43, 0.82, 24]} />
        <meshStandardMaterial color="#d6b66d" emissive="#e0a53e" emissiveIntensity={1.9} transparent opacity={0.88} roughness={0.64} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.46, 0, Math.sin(a) * 0.46]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.025, 0.84, 0.03]} />
            <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.66} roughness={0.32} />
          </mesh>
        )
      })}
      <mesh position={[0, -0.48, 0]}>
        <cylinderGeometry args={[0.32, 0.26, 0.1, 20]} />
        <meshStandardMaterial color="#21170f" roughness={0.54} />
      </mesh>
      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.75, 8]} />
        <meshStandardMaterial color="#a98a4d" roughness={0.5} />
      </mesh>
      {realLight && <pointLight color="#ffd58a" intensity={8} distance={8} decay={2} />}
    </group>
  )
}

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

function RainCurtain({ count }: { count: number }) {
  const points = useRef<Points>(null)
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const random = seeded(4417 + count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -21.6 - random() * 4.8
      positions[i * 3 + 1] = random() * 13
      positions[i * 3 + 2] = -30 + random() * 60
      speeds[i] = 5 + random() * 5
    }
    return { positions, speeds }
  }, [count])
  useFrame((_, deltaRaw) => {
    const geometry = points.current?.geometry
    const attribute = geometry?.getAttribute('position') as BufferAttribute | undefined
    if (!attribute) return
    const delta = Math.min(deltaRaw, 0.05)
    for (let i = 0; i < count; i++) {
      const y = attribute.getY(i) - data.speeds[i] * delta
      attribute.setY(i, y < -0.2 ? 12.8 : y)
      attribute.setX(i, attribute.getX(i) - delta * 0.45)
      if (attribute.getX(i) < -26.5) attribute.setX(i, -21.6)
    }
    attribute.needsUpdate = true
  })
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#b7d2d3" size={0.055} transparent opacity={0.55} depthWrite={false} blending={AdditiveBlending} />
    </points>
  )
}
function StreetLantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.5, 16]} />
        <meshStandardMaterial color="#d6b66d" emissive="#e0a53e" emissiveIntensity={1.6} transparent opacity={0.86} roughness={0.64} />
      </mesh>
      <mesh position={[0, -0.28, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
        <meshStandardMaterial color="#a98a4d" roughness={0.5} />
      </mesh>
      <pointLight color="#ffcf8a" intensity={2.4} distance={5} decay={2} />
    </group>
  )
}

function ExteriorStreet() {
  const lanternSpots = useMemo<[number, number, number][]>(
    () => Array.from({ length: 12 }, (_, i) => [-25.2, 3.4 + (i % 6) * 1.6, -24 + i * 4.2] as [number, number, number]),
    [],
  )
  return (
    <group>
      {/* far building wall — quiet, dark, lets the café read as the bright focus */}
      <mesh position={[-27, 4.5, 0]}>
        <boxGeometry args={[4, 9, 60]} />
        <meshStandardMaterial color="#141f24" roughness={0.97} />
      </mesh>
      {/* wooden awning beam running along the street front */}
      <mesh position={[-24.4, 6.2, 0]}>
        <boxGeometry args={[0.7, 0.4, 56]} />
        <meshStandardMaterial color="#3a2a18" roughness={0.8} />
      </mesh>
      {/* warm under-awning glow strip — soft so it blooms without blowing out */}
      <mesh position={[-24.6, 6.0, 0]}>
        <boxGeometry args={[0.18, 0.08, 56]} />
        <meshStandardMaterial color="#e9c778" emissive="#e9c778" emissiveIntensity={0.5} roughness={0.6} />
      </mesh>
      {/* a few carved vertical shop-sign boards, warm-lit — not random blank colors */}
      {[-16, 4, 22].map((z, i) => (
        <group key={i} position={[-24.9, 3.4, z]}>
          <mesh>
            <boxGeometry args={[0.22, 3.4, 1.1]} />
            <meshStandardMaterial color="#2a1d10" roughness={0.7} />
          </mesh>
          <mesh position={[0.13, 0, 0]}>
            <boxGeometry args={[0.04, 3.0, 0.9]} />
            <meshStandardMaterial color="#e9b85a" emissive="#e9b85a" emissiveIntensity={0.55} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {lanternSpots.map((p, i) => (
        <StreetLantern key={i} position={p} />
      ))}
      {/* damp street ground — faint warm reflection */}
      <mesh position={[-23.2, 0.06, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.12, 60]} />
        <meshPhysicalMaterial color="#28302f" roughness={0.16} clearcoat={0.6} clearcoatRoughness={0.18} />
      </mesh>
    </group>
  )
}

export function ChineseCafeAtmosphere() {
  const preset = useScenePreset()
  const lanterns: [number, number, number][] = [
    [-15, 8.2, -11], [-8, 8.4, -11], [-1, 8.2, -11], [7, 8.4, -11], [15, 8.2, -11],
    [-15, 8.1, 4], [-7, 8.4, 4], [7, 8.4, 4], [15, 8.1, 4],
    [-15, 8.2, 18], [-7, 8.4, 18], [7, 8.4, 18], [15, 8.2, 18],
  ]
  return (
    <group>
      <hemisphereLight args={['#8fa9bd', '#5e3922', 0.75]} />
      <ambientLight color="#b9a27c" intensity={0.48} />
      <directionalLight
        position={[-18, 16, 12]}
        color="#91aeca"
        intensity={2.2}
        castShadow={preset.shadows}
        shadow-mapSize-width={preset.shadowMap}
        shadow-mapSize-height={preset.shadowMap}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.00025}
      />
      {lanterns.map((position, i) => <HangingLantern key={position.join(':')} position={position} scale={i % 3 === 0 ? 1.15 : 0.92} realLight={i === 1 || i === 7 || i === 11} />)}
      <pointLight position={[0, 6.5, 16.8]} color="#efbd6b" intensity={13} distance={13} decay={2} />
      <pointLight position={[10.5, 5.5, 19]} color="#f2c980" intensity={10} distance={11} decay={2} />
      {preset.particles && <RainCurtain count={Math.max(260, Math.round(preset.rainDrops * 0.35))} />}
      {/* tea steam removed: the floating white particles read as visual noise from the booths */}
      <ExteriorStreet />
      <fog attach="fog" args={['#172528', 32, Math.min(95, preset.far)]} />
    </group>
  )
}
