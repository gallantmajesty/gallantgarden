import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'

interface CountryGlobeProps {
  countryCode: string | null
}

const EARTH_TEXTURE_URL = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

async function getCountryLatLon(code: string): Promise<{ lat: number; lon: number } | null> {
  try {
    // Sanitize country code to only allow alphanumeric characters (ISO 3166-1 alpha-2)
    const safeCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (!safeCode || safeCode.length > 3) return null
    const res = await fetch(`https://restcountries.com/v3.1/alpha/${safeCode}?fields=latlng`)
    if (!res.ok) return null
    const data = await res.json()
    if (Array.isArray(data) && data[0]?.latlng) {
      const [lat, lon] = data[0].latlng
      return { lat, lon }
    }
  } catch (e) {
    console.warn(e)
  }
  return null
}

function CameraController({ countryCode }: { countryCode: string | null }) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3(0, 0, 3))
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const prevCountryRef = useRef<string | null>(null)

  useEffect(() => {
    if (countryCode === prevCountryRef.current) return
    prevCountryRef.current = countryCode

    if (!countryCode) {
      targetPos.current.set(0, 0, 3)
      targetLookAt.current.set(0, 0, 0)
      return
    }
    let cancelled = false
    void getCountryLatLon(countryCode).then((ll) => {
      if (cancelled || !ll) return
      const countryPos = latLonToVector3(ll.lat, ll.lon, 1)
      const cameraOffset = countryPos.clone().multiplyScalar(2.2)
      targetPos.current.copy(cameraOffset)
      targetLookAt.current.copy(countryPos)
    })
    return () => { cancelled = true }
  }, [countryCode])

  useFrame((_, delta) => {
    const speed = 2 * delta
    camera.position.lerp(targetPos.current, speed)
    const currentLookAt = new THREE.Vector3()
    camera.getWorldDirection(currentLookAt)
    currentLookAt.add(camera.position)
    currentLookAt.lerp(targetLookAt.current, speed)
    camera.lookAt(currentLookAt)
  })

  return null
}

function GlobeMesh({ countryCode }: { countryCode: string | null }) {
  const meshRef = useRef<THREE.Group>(null)
  const targetRotation = useRef(new THREE.Euler(0, 0, 0))
  const markerPosRef = useRef<THREE.Vector3 | null>(null)
  const markerVisibleRef = useRef(false)
  const markerGroupRef = useRef<THREE.Group>(null)
  const prevCountryRef = useRef<string | null>(null)

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    return loader.load(EARTH_TEXTURE_URL)
  }, [])

  useEffect(() => {
    if (countryCode === prevCountryRef.current) return
    prevCountryRef.current = countryCode

    if (!countryCode) {
      markerVisibleRef.current = false
      if (markerGroupRef.current) markerGroupRef.current.visible = false
      targetRotation.current.set(0, 0, 0)
      return
    }
    let cancelled = false
    void getCountryLatLon(countryCode).then((ll) => {
      if (cancelled || !ll) return
      const pos = latLonToVector3(ll.lat, ll.lon, 1)
      const targetDir = new THREE.Vector3(0, 0, -1)
      const currentDir = pos.clone().normalize()
      const quaternion = new THREE.Quaternion().setFromUnitVectors(currentDir, targetDir)
      const euler = new THREE.Euler().setFromQuaternion(quaternion)
      targetRotation.current.copy(euler)
      markerPosRef.current = pos
      markerVisibleRef.current = true
      if (markerGroupRef.current) {
        markerGroupRef.current.position.copy(pos)
        markerGroupRef.current.visible = true
      }
    })
    return () => { cancelled = true }
  }, [countryCode])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const speed = 2 * delta
    meshRef.current.rotation.x += (targetRotation.current.x - meshRef.current.rotation.x) * speed
    meshRef.current.rotation.y += (targetRotation.current.y - meshRef.current.rotation.y) * speed
    meshRef.current.rotation.z += (targetRotation.current.z - meshRef.current.rotation.z) * speed
  })

  return (
    <group ref={meshRef}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      <group ref={markerGroupRef} visible={false}>
        <Marker />
      </group>
    </group>
  )
}

function Marker() {
  const ref = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ref.current || !ringRef.current) return
    const t = state.clock.elapsedTime
    const scale = 1 + Math.sin(t * 3) * 0.3
    ref.current.scale.setScalar(scale)
    ringRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.5)
    ringRef.current.rotation.z = t * 0.5
  })

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color="#ff5722" />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.035, 0.045, 32]} />
        <meshBasicMaterial color="#ff5722" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function CountryGlobe({ countryCode }: CountryGlobeProps) {
  return (
    <div className="globe-container" style={{ width: '100%', height: '300px', background: 'transparent' }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <GlobeMesh countryCode={countryCode} />
        <CameraController countryCode={countryCode} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={!countryCode}
          autoRotateSpeed={0.5}
          dampingFactor={0.1}
          enableDamping
        />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  )
}
