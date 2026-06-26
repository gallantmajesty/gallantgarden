// Re-export the shared instancing workhorses so every Train Station module pulls
// them from one realm-local path. These are the SAME battle-tested components the
// Library realm uses (src/three/library/Instanced.tsx) — one draw call for many
// copies of a shape, with per-instance position/rotation/scale/colour. Do not
// fork them; if the train needs a new instancing helper, add it here on top.
//
// Usage:
//   <InstancedShape items={posList} roughness={0.7} color="#5a3a24" castShadow>
//     <boxGeometry args={[1, 1, 1]} />
//   </InstancedShape>
// Memoise `items` in the caller (the matrices are written in a layout effect keyed
// on the array identity).

export { InstancedBoxes, InstancedShape } from '../../library/Instanced'
export type { BoxItem, ShapeItem } from '../../library/Instanced'
