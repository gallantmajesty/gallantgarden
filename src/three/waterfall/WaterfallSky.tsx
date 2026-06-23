import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, type Group, Object3D, type InstancedMesh, Color, ShaderMaterial } from 'three'
import { InstancedShape, type ShapeItem } from '../library/Instanced'
import { sky, sun, fog as fogEnv } from './env'
import { FALLS } from './layout'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/**
 * Bright daytime sky + lighting for the Waterfall Realm. A static gradient dome
 * (clear blue → warm horizon), one golden directional sun that casts the scene's
 * shadows, a hemisphere fill, drifting clouds and a few soft god-ray shafts over
 * the falls. No day/night cycle — this realm is daytime only.
 */
export function WaterfallSky({ shadows, fog, clouds, shadowMap }: { shadows: boolean; fog: boolean; clouds: number; shadowMap: number }) {
  const skyMat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: sky.top.clone() },
          horizon: { value: sky.horizon.clone() },
        },
        vertexShader: `
          varying vec3 vP;
          void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          uniform vec3 top; uniform vec3 horizon; varying vec3 vP;
          void main(){
            float h = clamp(normalize(vP).y * 1.1, 0.0, 1.0);
            vec3 col = mix(horizon, top, pow(h, 0.65));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  )

  const sm = shadowMap > 0 ? shadowMap : 1024

  return (
    <group>
      {fog && <fogExp2 attach="fog" args={[fogEnv.color.getHex(), 0.0019]} />}

      {/* the dome */}
      <mesh scale={[600, 600, 600]} frustumCulled={false}>
        <sphereGeometry args={[1, 32, 16]} />
        <primitive object={skyMat} attach="material" />
      </mesh>

      {/* golden sun disc */}
      <mesh position={sun.dir.clone().multiplyScalar(420).toArray()}>
        <sphereGeometry args={[20, 24, 24]} />
        <meshBasicMaterial color={'#fff4d0'} />
      </mesh>

      {/* key light — golden sun, the only shadow caster. Slightly eased back so
          highlights don't clip; the shadow side is carried by stronger sky fill. */}
      <directionalLight
        position={sun.dir.clone().multiplyScalar(120).toArray()}
        intensity={1.25}
        color={sun.color}
        castShadow={shadows}
        shadow-mapSize-width={sm}
        shadow-mapSize-height={sm}
        shadow-camera-near={1}
        shadow-camera-far={320}
        shadow-camera-left={-130}
        shadow-camera-right={130}
        shadow-camera-top={130}
        shadow-camera-bottom={-130}
        shadow-bias={-0.0004}
      />
      {/* cool sky fill + warm ground bounce — raised so shadowed cliff faces read
          as lit rock, not black slabs */}
      <hemisphereLight args={[sun.skyFill.getHex(), sun.groundFill.getHex(), 0.95]} />
      <ambientLight intensity={0.3} color={'#eaf4ff'} />

      {clouds > 0 && <Clouds count={clouds} />}
      <GodRays />
    </group>
  )
}

/** Soft drifting cloud puffs — one instanced draw for the whole sky. */
function Clouds({ count }: { count: number }) {
  const ref = useRef<Group>(null)
  const puffs = useMemo<ShapeItem[]>(() => {
    const rand = rng(8131)
    const out: ShapeItem[] = []
    for (let i = 0; i < count; i++) {
      const cx = -320 + rand() * 640
      const cy = 150 + rand() * 80
      const cz = -260 + rand() * 460
      const n = 4 + Math.floor(rand() * 3)
      for (let k = 0; k < n; k++) {
        const s = 10 + rand() * 14
        out.push({ pos: [cx + (rand() - 0.5) * 36, cy + (rand() - 0.5) * 8, cz + (rand() - 0.5) * 20], scale: [s, s * 0.5, s] })
      }
    }
    return out
  }, [count])

  useFrame((_, dt) => {
    if (ref.current) ref.current.position.x = (ref.current.position.x + dt * 1.2) % 600
  })

  return (
    <group ref={ref}>
      <InstancedShape items={puffs} color="#ffffff" roughness={1} transparent opacity={0.85} depthWrite={false}>
        <icosahedronGeometry args={[1, 1]} />
      </InstancedShape>
    </group>
  )
}

/** A few faint volumetric light shafts slanting down over the falls — additive
 *  cones that read as god-rays catching the mist. Cheap, no real volumetrics. */
function GodRays() {
  const ref = useRef<InstancedMesh>(null)
  const items = useMemo(() => {
    const rand = rng(404)
    return Array.from({ length: 3 }, (_, i) => ({
      x: FALLS.centerX + (rand() - 0.5) * 40,
      z: FALLS.poolZ + (rand() - 0.5) * 20 - 6,
      s: 0.7 + rand() * 0.6,
      h: 34 + rand() * 10,
      rot: (rand() - 0.5) * 0.3,
      phase: i,
    }))
  }, [])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const t = state.clock.elapsedTime
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.h / 2 + 2, it.z)
      dummy.rotation.set(0, 0, it.rot + Math.sin(t * 0.15 + it.phase) * 0.04)
      dummy.scale.set(it.s * (3 + Math.sin(t * 0.2 + it.phase) * 0.3), it.h, it.s * 3)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 3]} frustumCulled={false}>
      <coneGeometry args={[1, 1, 12, 1, true]} />
      <meshBasicMaterial color={new Color('#fff3cf')} transparent opacity={0.035} depthWrite={false} />
    </instancedMesh>
  )
}
