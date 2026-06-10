import { useLayoutEffect, useRef } from 'react'
import { Color, type InstancedMesh, Object3D } from 'three'

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
