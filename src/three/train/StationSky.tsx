import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, ShaderMaterial, type DirectionalLight, type Group } from 'three'
import { sky, ambient, keyLight, fillLight, fog } from './env'
import { useSettings } from '../../store/settings'

// Atmosphere for the Train Station — the realm's lighting depth lives here.
// A graded dusk dome glimpsed above the open ends of the trainshed; a WARM low
// directional key raking down the platforms (long golden shadows); a COOL
// directional counter-fill from the open north end (the world outside), no
// shadows, so interiors read warm against a cool beyond — the warm/cool contrast
// that flat single-light setups lack. A cool hemisphere fill seats everything in
// the dusk, and a thin warm exponential fog softens the far platform ends.
// Brightness from Settings scales the lights so the HUD brightness slider works.

export function StationSky({
  shadows,
  fogOn,
  shadowMap,
}: {
  shadows: boolean
  fogOn: boolean
  shadowMap: number
}) {
  const sunRef = useRef<DirectionalLight>(null)
  const domeRef = useRef<Group>(null)
  const brightness = useSettings((s) => s.brightness)

  // Three-stop graded dome: warm ember horizon → cool band → deep indigo zenith.
  const domeMat = useMemo(() => {
    return new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new Color(sky.top) },
        bandColor: { value: new Color(sky.band) },
        horizonColor: { value: new Color(sky.horizon) },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main(){
          vWorld = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        varying vec3 vWorld;
        uniform vec3 topColor; uniform vec3 bandColor; uniform vec3 horizonColor;
        void main(){
          float h = clamp(normalize(vWorld).y * 1.1 + 0.18, 0.0, 1.0);
          // warm band hugs the horizon, cool band above it, indigo overhead
          vec3 lower = mix(horizonColor, bandColor, smoothstep(0.0, 0.35, h));
          vec3 col = mix(lower, topColor, smoothstep(0.28, 1.0, h));
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  }, [])

  // keep the dome centred on the camera so it never clips
  useFrame(({ camera }) => {
    if (domeRef.current) domeRef.current.position.copy(camera.position)
  })

  const b = brightness
  const [kx, ky, kz] = keyLight.dir

  return (
    <>
      {fogOn && <fogExp2 attach="fog" args={[fog.color.getHex(), fog.density]} />}

      <group ref={domeRef}>
        <mesh material={domeMat}>
          <sphereGeometry args={[420, 28, 18]} />
        </mesh>
      </group>

      {/* cool dusk hemisphere fill — warm ground bounce, cool sky */}
      <hemisphereLight args={[ambient.sky.getHex(), ambient.ground.getHex(), ambient.intensity * b]} />

      {/* WARM golden key, raking under the canopy from the south-west */}
      <directionalLight
        ref={sunRef}
        position={[kx * 80, ky * 80, kz * 80]}
        color={keyLight.color}
        intensity={keyLight.intensity * b}
        castShadow={shadows}
        shadow-mapSize-width={shadowMap || 1024}
        shadow-mapSize-height={shadowMap || 1024}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0004}
      />

      {/* COOL counter-fill from the open north end (the world beyond), no shadows */}
      <directionalLight position={fillLight.pos} color={fillLight.color} intensity={fillLight.intensity * b} />
    </>
  )
}
