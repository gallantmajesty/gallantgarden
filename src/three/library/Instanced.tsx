import { useLayoutEffect, useRef, type ReactNode, type Ref } from 'react'
import { Color, type InstancedMesh, type MeshStandardMaterial, Object3D, type Side, type Texture } from 'three'

export interface BoxItem {
  pos: [number, number, number]
  /** full size on each axis (the base geometry is a unit cube) */
  size?: [number, number, number]
  rotY?: number
  color?: string
}

/**
 * One draw call for many boxes. Used for bookshelf books, balcony balusters and
 * other repeated geometry so the library stays cheap to render. Per-instance
 * colour is supported via `setColorAt`; memoise `items` in the caller.
 */
export function InstancedBoxes({
  items,
  color = '#ffffff',
  roughness = 0.9,
  metalness = 0,
  emissive,
  emissiveIntensity = 0,
  castShadow = false,
  receiveShadow = false,
}: {
  items: BoxItem[]
  color?: string
  roughness?: number
  metalness?: number
  emissive?: string
  emissiveIntensity?: number
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const col = new Color()
    items.forEach((it, i) => {
      dummy.position.set(it.pos[0], it.pos[1], it.pos[2])
      dummy.rotation.set(0, it.rotY ?? 0, 0)
      const s = it.size ?? [1, 1, 1]
      dummy.scale.set(s[0], s[1], s[2])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      if (it.color) {
        col.set(it.color)
        mesh.setColorAt(i, col)
      }
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, items.length)]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
      />
    </instancedMesh>
  )
}

/** One transform for an instance of an arbitrary shape. */
export interface ShapeItem {
  pos: [number, number, number]
  /** full Euler rotation (X, Y, Z). */
  rot?: [number, number, number]
  /** pre-composed orientation as a quaternion [x, y, z, w]. Takes precedence over
   *  `rot` — used when an instance's world rotation is a composition of a parent
   *  group rotation and a local rotation that can't be expressed as one Euler. */
  quat?: [number, number, number, number]
  /** uniform scale, or per-axis scale. */
  scale?: number | [number, number, number]
  /** per-instance diffuse tint (multiplies the base material colour). If you set
   *  it on ANY item in a batch, set it on every item — unset instances would
   *  otherwise render black. */
  color?: string
}

/**
 * One draw call for many copies of a NON-box shape — pillars, mountains,
 * sconces, arches, … Pass the geometry as the single child (e.g.
 * `<InstancedShape items={...}><cylinderGeometry .../></InstancedShape>`); a
 * shared `meshStandardMaterial` is created from the material props. This is the
 * generic complement to {@link InstancedBoxes} and is the workhorse of the
 * draw-call reduction pass — dozens/hundreds of identical meshes collapse to one.
 */
export function InstancedShape({
  items,
  children,
  color = '#ffffff',
  roughness = 0.9,
  metalness = 0,
  emissive,
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
  side,
  flatShading = false,
  depthWrite,
  map,
  emissiveMap,
  normalMap,
  materialRef,
  castShadow = false,
  receiveShadow = false,
}: {
  items: ShapeItem[]
  children: ReactNode
  color?: string
  roughness?: number
  metalness?: number
  emissive?: string
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
  side?: Side
  flatShading?: boolean
  depthWrite?: boolean
  map?: Texture
  emissiveMap?: Texture
  normalMap?: Texture
  materialRef?: Ref<MeshStandardMaterial>
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const col = new Color()
    let tinted = false
    items.forEach((it, i) => {
      dummy.position.set(it.pos[0], it.pos[1], it.pos[2])
      if (it.quat) {
        dummy.quaternion.set(it.quat[0], it.quat[1], it.quat[2], it.quat[3])
      } else {
        const r = it.rot ?? [0, 0, 0]
        dummy.rotation.set(r[0], r[1], r[2])
      }
      const s = it.scale ?? 1
      if (typeof s === 'number') dummy.scale.setScalar(s)
      else dummy.scale.set(s[0], s[1], s[2])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      if (it.color) {
        col.set(it.color)
        mesh.setColorAt(i, col)
        tinted = true
      }
    })
    mesh.instanceMatrix.needsUpdate = true
    if (tinted && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, items.length)]} castShadow={castShadow} receiveShadow={receiveShadow} frustumCulled={false}>
      {children}
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
        transparent={transparent}
        opacity={opacity}
        side={side}
        flatShading={flatShading}
        depthWrite={depthWrite}
        map={map}
        emissiveMap={emissiveMap}
        normalMap={normalMap}
      />
    </instancedMesh>
  )
}
