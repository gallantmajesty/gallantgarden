import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  DoubleSide,
  InstancedBufferAttribute,
  type InstancedMesh,
  Object3D,
  type ShaderMaterial,
  type ShaderMaterialParameters,
} from 'three'
import { HALL } from './layout'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/**
 * A handful of open books drifting through the hall, their pages slowly flapping.
 * Everything is on the GPU: ONE instanced draw, a vertex shader bends each page
 * around the spine and bobs the whole book, driven by a per-instance phase/speed
 * attribute and a single shared time uniform. No per-frame CPU work beyond
 * advancing that uniform, no real lights, no full-screen pass. Parchment reads
 * warm and slightly emissive so bloom catches the page edges.
 */
export function FloatingBooks({ count = 8 }: { count?: number }) {
  const ref = useRef<InstancedMesh>(null)
  // Material held by a ref so useFrame can advance its time uniform (mutating a
  // ref is allowed; mutating a useMemo result trips react-hooks/immutability).
  const matRef = useRef<ShaderMaterial>(null)

  const args = useMemo<[ShaderMaterialParameters]>(
    () => [
      {
        transparent: false,
        side: DoubleSide,
        toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          attribute float aPhase;
          attribute float aSpeed;
          uniform float uTime;
          varying vec2 vUv;
          varying float vEdge;
          void main(){
            vUv = uv;
            vec3 p = position;
            // page-flip: lift each half of the page around the spine (x = 0)
            float angle = 0.30 + sin(uTime * aSpeed + aPhase) * 0.34;
            float side = sign(p.x);
            float ax = abs(p.x);
            p.x = side * ax * cos(angle);
            p.z += ax * sin(angle);
            // how close to the spine (for a subtle crease shade in the fragment)
            vEdge = ax;
            vec4 mp = instanceMatrix * vec4(p, 1.0);
            // gentle full-book bob
            mp.y += sin(uTime * 0.6 + aPhase) * 0.18;
            gl_Position = projectionMatrix * modelViewMatrix * mp;
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          varying float vEdge;
          void main(){
            // warm parchment, a touch brighter toward the outer page edge so bloom
            // kisses the rim; a soft crease line down the spine
            vec3 parchment = vec3(0.96, 0.90, 0.74);
            vec3 edgeGlow  = vec3(1.0, 0.92, 0.72);
            float rim = smoothstep(0.3, 1.0, vEdge);
            float crease = smoothstep(0.06, 0.0, abs(vUv.x - 0.5));
            vec3 col = mix(parchment, edgeGlow, rim) * (1.0 - crease * 0.35);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      },
    ],
    [],
  )

  const instances = useMemo(() => {
    const rand = rng(70707)
    const dummy = new Object3D()
    const matrices: number[] = []
    const phase = new Float32Array(count)
    const speed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // scatter along the nave and around the centre tree, at reading height
      const a = rand() * Math.PI * 2
      const rad = 4 + rand() * (HALL.halfW - 3)
      dummy.position.set(Math.cos(a) * rad, 2.2 + rand() * 3.5, (rand() - 0.5) * (HALL.halfL * 1.4))
      dummy.rotation.set((rand() - 0.5) * 0.4, rand() * Math.PI * 2, (rand() - 0.5) * 0.3)
      dummy.scale.setScalar(0.7 + rand() * 0.5)
      dummy.updateMatrix()
      for (let k = 0; k < 16; k++) matrices.push(dummy.matrix.elements[k])
      phase[i] = rand() * Math.PI * 2
      speed[i] = 0.8 + rand() * 0.8
    }
    return { matrices, phase, speed }
  }, [count])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < count; i++) {
      mesh.instanceMatrix.array.set(instances.matrices.slice(i * 16, i * 16 + 16), i * 16)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.geometry.setAttribute('aPhase', new InstancedBufferAttribute(instances.phase, 1))
    mesh.geometry.setAttribute('aSpeed', new InstancedBufferAttribute(instances.speed, 1))
  }, [instances, count])

  useFrame((_, dtRaw) => {
    const m = matRef.current
    if (m) m.uniforms.uTime.value += Math.min(dtRaw, 0.05)
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      {/* an open book: a wide plane segmented across X so the spine bend is smooth */}
      <planeGeometry args={[0.9, 0.62, 10, 1]} />
      <shaderMaterial ref={matRef} args={args} attach="material" />
    </instancedMesh>
  )
}
