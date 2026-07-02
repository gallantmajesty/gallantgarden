// FloorSystem — carpet runner + aisle runner + brass threshold at doorways.
// Forest green main carpet with diamond pattern, lighter aisle runner with
// higher wear, and brass strips along wall edges.

import { CARRIAGE } from '../interior'
import { useCarpetMaterial, useAisleRunnerMaterial } from '../materials/CarpetMaterial'
import { useBrassMaterial } from '../materials/BrassMaterial'

export function FloorSystem() {
  const { halfW, z0, z1, ceilY } = CARRIAGE
  const len = z1 - z0
  const midZ = (z0 + z1) / 2
  const carpetMat = useCarpetMaterial()
  const aisleMat = useAisleRunnerMaterial()
  const brassMat = useBrassMaterial()

  return (
    <group>
      {/* Main carpet — full floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, midZ]} receiveShadow>
        <planeGeometry args={[halfW * 2, len]} />
        <meshStandardMaterial {...carpetMat} />
      </mesh>

      {/* Aisle runner — center strip, slightly raised */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, midZ]}>
        <planeGeometry args={[1.4, len]} />
        <meshStandardMaterial {...aisleMat} />
      </mesh>

      {/* Carpet edge trim — slightly raised border along walls */}
      {[-1, 1].map((side) => (
        <group key={`edge-${side}`}>
          {/* Raised carpet edge strip */}
          <mesh position={[side * (halfW - 0.08), 0.018, midZ]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.12, len]} />
            <meshStandardMaterial color="#2A4238" roughness={0.92} metalness={0.0} />
          </mesh>
          {/* Brass edge strip along wall */}
          <mesh position={[side * (halfW - 0.02), 0.012, midZ]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.06, len]} />
            <meshStandardMaterial color={brassMat.color} roughness={0.3} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Brass thresholds at doorways */}
      {[-1, 1].map((side) =>
        [-1.5, 2.0].map((dz) => (
          <mesh key={`thresh-${side}-${dz}`} position={[side * halfW * 0.6, 0.15, dz]}>
            <boxGeometry args={[0.8, 0.06, 0.08]} />
            <meshStandardMaterial color={brassMat.color} roughness={0.3} metalness={0.9} />
          </mesh>
        ))
      )}

      {/* Subtle scuff marks near entrance — darker patches on carpet */}
      {[CARRIAGE.z0 + 1.5, CARRIAGE.z1 - 1.5].map((sz, i) => (
        <mesh key={`scuff-${i}`} rotation-x={-Math.PI / 2} position={[0, 0.012, sz]}>
          <planeGeometry args={[2.0, 1.5]} />
          <meshStandardMaterial color="#243E34" roughness={0.88} metalness={0.0} transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  )
}
