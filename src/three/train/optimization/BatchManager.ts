// Static + instanced batching manager.
// Merges stationary geometry (walls, floor, ceiling) into single meshes and
// uses InstancedMesh for repeated objects (seats, windows, curtains) to
// minimize draw calls.
//
// Target: 5 static batches + 6 instance sets = ~11 draw calls for the entire
// interior, down from ~80 individual meshes.

import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  InstancedMesh,
} from 'three'
import type { CarriageSeat } from '../interior'

// ── Static Batching ─────────────────────────────────────────────────────────

export interface BatchDef {
  name: string
  geometries: BufferGeometry[]
  transforms: Matrix4[]
  material: MeshStandardMaterial
}

/** Merge an array of geometries (each with its own transform) into one. */
export function mergeGeometries(geos: BufferGeometry[], transforms: Matrix4[]): BufferGeometry {
  if (geos.length === 0) return new BufferGeometry()
  if (geos.length === 1) return geos[0].clone()

  let totalVerts = 0
  let totalIdx = 0
  for (const g of geos) {
    totalVerts += g.attributes.position.count
    if (g.index) totalIdx += g.index.count
    else totalIdx += g.attributes.position.count
  }

  const pos = new Float32Array(totalVerts * 3)
  const norm = new Float32Array(totalVerts * 3)
  const uv = new Float32Array(totalVerts * 2)
  const indices = new Uint32Array(totalIdx)

  let vertOffset = 0
  let idxOffset = 0
  const tempPos = new Vector3()
  const tempNorm = new Vector3()

  for (let i = 0; i < geos.length; i++) {
    const g = geos[i]
    const m = transforms[i]
    const posAttr = g.attributes.position
    const normAttr = g.attributes.normal
    const uvAttr = g.attributes.uv

    for (let v = 0; v < posAttr.count; v++) {
      tempPos.fromBufferAttribute(posAttr as BufferAttribute, v).applyMatrix4(m)
      pos[(vertOffset + v) * 3] = tempPos.x
      pos[(vertOffset + v) * 3 + 1] = tempPos.y
      pos[(vertOffset + v) * 3 + 2] = tempPos.z

      if (normAttr) {
        tempNorm.fromBufferAttribute(normAttr as BufferAttribute, v).transformDirection(m)
        norm[(vertOffset + v) * 3] = tempNorm.x
        norm[(vertOffset + v) * 3 + 1] = tempNorm.y
        norm[(vertOffset + v) * 3 + 2] = tempNorm.z
      }

      if (uvAttr) {
        uv[(vertOffset + v) * 2] = uvAttr.getX(v)
        uv[(vertOffset + v) * 2 + 1] = uvAttr.getY(v)
      }
    }

    if (g.index) {
      for (let j = 0; j < g.index.count; j++) {
        indices[idxOffset + j] = g.index.array[j] + vertOffset
      }
      idxOffset += g.index.count
    } else {
      for (let j = 0; j < posAttr.count; j++) {
        indices[idxOffset + j] = vertOffset + j
      }
      idxOffset += posAttr.count
    }

    vertOffset += posAttr.count
  }

  const merged = new BufferGeometry()
  merged.setAttribute('position', new Float32BufferAttribute(pos, 3))
  merged.setAttribute('normal', new Float32BufferAttribute(norm, 3))
  merged.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  merged.setIndex(new Float32BufferAttribute(indices, 1))
  return merged
}

// ── Instanced Mesh Pool ─────────────────────────────────────────────────────

export class InstancedMeshPool {
  mesh: InstancedMesh
  private count = 0
  private matrix = new Matrix4()
  private position = new Vector3()
  private quaternion = new Quaternion()
  private scale = new Vector3(1, 1, 1)

  constructor(
    geometry: BufferGeometry,
    material: MeshStandardMaterial,
    maxCount: number,
  ) {
    this.mesh = new InstancedMesh(geometry, material, maxCount)
    this.mesh.count = 0
    this.mesh.instanceMatrix.setUsage(35048) // DynamicDrawUsage
  }

  addInstance(
    x: number, y: number, z: number,
    rotY = 0,
    sx = 1, sy = 1, sz = 1,
  ): number {
    if (this.count >= this.mesh.count) return -1
    this.position.set(x, y, z)
    this.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), rotY)
    this.scale.set(sx, sy, sz)
    this.matrix.compose(this.position, this.quaternion, this.scale)
    this.mesh.setMatrixAt(this.count, this.matrix)
    this.count++
    return this.count - 1
  }

  finalize(): void {
    this.mesh.count = this.count
    this.mesh.instanceMatrix.needsUpdate = true
    this.mesh.computeBoundingSphere()
  }

  dispose(): void {
    this.mesh.dispose()
  }
}

// ── Pre-built seat instance pool ────────────────────────────────────────────

export function createSeatInstances(
  seats: CarriageSeat[],
  seatGeo: BufferGeometry,
  seatMat: MeshStandardMaterial,
): InstancedMeshPool {
  const pool = new InstancedMeshPool(seatGeo, seatMat, seats.length)
  for (const s of seats) {
    pool.addInstance(s.pos[0], 0, s.pos[2], 0)
  }
  pool.finalize()
  return pool
}
