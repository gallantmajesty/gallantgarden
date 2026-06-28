import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, type ShaderMaterial, type ShaderMaterialParameters } from 'three'
import { HALL } from './layout'
import { env } from './env'

/**
 * A subtle aurora drifting across the ceiling — one large horizontal plane with a
 * cheap procedural-curtain shader, additive and depth-write-off so it only ever
 * *adds* a soft glow (never occludes). It fades in after dark (driven by
 * env.dayFactor) so by day the hall ceiling is plain and by night it shimmers
 * with green/violet light. One draw call, no real lights, no full-screen pass.
 */
export function Aurora() {
  const { halfW, halfL, wallH } = HALL

  // Material is held by a ref so useFrame can drive its uniforms (mutating a ref
  // is allowed; mutating a useMemo result trips react-hooks/immutability). The
  // shader args are memoised once so the element never rebuilds.
  const matRef = useRef<ShaderMaterial>(null)
  const args = useMemo<[ShaderMaterialParameters]>(
    () => [
      {
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uStrength: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          uniform float uTime; uniform float uStrength;
          varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1))) * 43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            f = f*f*(3.0-2.0*f);
            float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
            return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
          }
          void main(){
            vec2 uv = vUv;
            float band = 0.5 + 0.5 * sin((uv.x*3.0 + noise(uv*3.0 + uTime*0.05)*2.0) * 3.14159);
            float n = noise(vec2(uv.x*4.0 + uTime*0.06, uv.y*2.0 + uTime*0.02));
            float curtain = smoothstep(0.25, 0.9, n) * band;
            // soft falloff toward the plane edges so it has no hard border
            float edge = smoothstep(0.0,0.3,uv.y) * smoothstep(1.0,0.65,uv.y)
                       * smoothstep(0.0,0.15,uv.x) * smoothstep(1.0,0.85,uv.x);
            vec3 col = mix(vec3(0.10,0.80,0.55), vec3(0.45,0.30,0.95), n);
            float a = curtain * edge * uStrength;
            gl_FragColor = vec4(col * a, a);
          }
        `,
      },
    ],
    [],
  )

  useFrame((_, dtRaw) => {
    const m = matRef.current
    if (!m) return
    m.uniforms.uTime.value += Math.min(dtRaw, 0.05)
    // invisible by day, gently present at night
    m.uniforms.uStrength.value = Math.max(0, 1 - env.dayFactor) * 0.6
  })

  return (
    <mesh position={[0, wallH - 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[halfW * 2 - 1, halfL * 2 - 1]} />
      <shaderMaterial ref={matRef} args={args} attach="material" />
    </mesh>
  )
}
