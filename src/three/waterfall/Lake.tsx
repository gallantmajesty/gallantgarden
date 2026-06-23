import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { Color, DoubleSide, RepeatWrapping, type ShaderMaterial as TShaderMaterial, ShaderMaterial } from 'three'
import { LAKE, WATER_LEVEL } from './layout'
import { sun, water } from './env'
import { makeWaterNormalTexture } from './textures'

/**
 * The turquoise lake. Two fidelity tiers:
 *   • default — a custom depth-tinted ripple/fresnel water shader (clear, you can
 *     see the silt bed through it), cheap enough for every device.
 *   • High (reflections=true) — a drei MeshReflectorMaterial for true mirror
 *     reflections of the cliffs, sky and Focus Lily.
 * A soft animated foam ring rides the shoreline either way.
 */
export function Lake({ reflections = false }: { reflections?: boolean }) {
  const radius = LAKE.r + 6

  return (
    <group position={[LAKE.cx, WATER_LEVEL, LAKE.cz]}>
      {reflections ? <ReflectiveSurface radius={radius} /> : <StylizedSurface radius={radius} />}
      <FoamRing radius={LAKE.r} />
    </group>
  )
}

function ReflectiveSurface({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <circleGeometry args={[radius, 72]} />
      <MeshReflectorMaterial
        resolution={768}
        mirror={0.55}
        mixBlur={6}
        mixStrength={2.0}
        blur={[300, 80]}
        depthScale={1.1}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.2}
        color={new Color('#1f9aa0')}
        metalness={0.2}
        roughness={0.6}
        transparent
        opacity={0.92}
      />
    </mesh>
  )
}

function StylizedSurface({ radius }: { radius: number }) {
  const matRef = useRef<TShaderMaterial>(null)
  const mat = useMemo(() => {
    const nrm = makeWaterNormalTexture(10)
    nrm.wrapS = nrm.wrapT = RepeatWrapping
    return new ShaderMaterial({
      transparent: true,
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uNrm: { value: nrm },
        uShallow: { value: water.shallow.clone() },
        uDeep: { value: water.deep.clone() },
        uSun: { value: sun.dir.clone() },
      },
      vertexShader: `
        varying vec2 vUv; varying vec3 vWorld;
        void main(){
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position,1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime; uniform sampler2D uNrm; uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uSun;
        varying vec2 vUv; varying vec3 vWorld;
        void main(){
          // two scrolling ripple samples → a wobbly normal (kept subtle)
          vec3 n1 = texture2D(uNrm, vUv*3.0 + vec2(uTime*0.018, uTime*0.013)).rgb*2.0-1.0;
          vec3 n2 = texture2D(uNrm, vUv*6.0 - vec2(uTime*0.015, uTime*0.021)).rgb*2.0-1.0;
          vec3 nrm = normalize(vec3(0.0,1.0,0.0) + (n1+n2)*0.18);
          vec3 view = normalize(cameraPosition - vWorld);
          // stronger, sharper fresnel → more reflection at grazing angles
          float fres = pow(1.0 - max(dot(view, nrm), 0.0), 4.0);

          // depth coloration: lighter turquoise in the shallows (rim), darker teal
          // toward the deep centre. Smoothstep gives a soft, glacial-lake gradient.
          float d = smoothstep(0.0, 1.0, clamp(length(vUv-0.5)*2.0, 0.0, 1.0));
          vec3 base = mix(uShallow, uDeep, d);

          // sky-blue reflection blended in by fresnel (grazing = more sky)
          vec3 skyRef = vec3(0.74, 0.88, 0.98);
          vec3 col = mix(base, skyRef, fres*0.55);

          // tight, controlled sun glint (won't blow out)
          vec3 hv = normalize(uSun + view);
          float spec = pow(max(dot(nrm, hv), 0.0), 120.0);
          col += spec*0.5;

          float a = 0.8 + fres*0.18;
          gl_FragColor = vec4(col, a);
        }
      `,
    })
  }, [])

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <circleGeometry args={[radius, 72]} />
      <primitive object={mat} ref={matRef} attach="material" />
    </mesh>
  )
}

/** A gentle foam band where the water meets the shore (animated alpha pulse). */
function FoamRing({ radius }: { radius: number }) {
  const ref = useRef<TShaderMaterial>(null)
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: { uTime: { value: 0 }, uColor: { value: new Color('#f4ffff') } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `
          uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
          void main(){
            float band = smoothstep(0.0,0.5,vUv.x)*smoothstep(1.0,0.5,vUv.x);
            float ripple = 0.5 + 0.5*sin(vUv.y*120.0 + uTime*2.0);
            float a = band * (0.35 + ripple*0.4);
            gl_FragColor = vec4(uColor, a);
          }
        `,
      }),
    [],
  )
  useFrame((state) => {
    if (ref.current) ref.current.uniforms.uTime.value = state.clock.elapsedTime
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
      <ringGeometry args={[radius - 2.2, radius + 1.2, 96, 1]} />
      <primitive object={mat} ref={ref} attach="material" />
    </mesh>
  )
}
