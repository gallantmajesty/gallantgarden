// Frustum + occlusion culling for the train interior.
// Frustum culling: skip objects outside the camera's 6-plane bounding frustum.
// Occlusion culling: precompute visibility from each seat position, store as a
// lookup table, and at runtime skip objects hidden behind walls/seats.
//
// Expected savings: 30-50% of interior objects culled per frame.

import { Frustum, Matrix4, Vector3, Box3, Object3D, Camera } from 'three'
import { CARRIAGE, ROWS, ROW_DZ } from '../interior'

// ── Frustum Culling ─────────────────────────────────────────────────────────

const _frustum = new Frustum()
const _projScreenMatrix = new Matrix4()

/** Update the frustum from the current camera. */
export function updateFrustum(camera: Camera): void {
  _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  _frustum.setFromProjectionMatrix(_projScreenMatrix)
}

/** Test a bounding box against the current frustum. */
export function isInFrustum(box: Box3): boolean {
  return _frustum.intersectsBox(box)
}

// ── Occlusion Culling ───────────────────────────────────────────────────────

const ROW_Z0 = -7.5

export interface OcclusionEntry {
  seatId: number
  visibleObjectIds: Set<number>
}

export class OcclusionCuller {
  private visibilityMap = new Map<number, Set<number>>()
  private allObjects: Object3D[] = []
  private objectIds = new Map<Object3D, number>()

  /** Register objects that can be occluded. */
  registerObjects(objects: Object3D[]): void {
    this.allObjects = objects
    this.objectIds.clear()
    objects.forEach((obj, i) => this.objectIds.set(obj, i))
  }

  /** Precompute visibility from each seat position using simple raycasting. */
  precompute(seatPositions: { id: number; pos: [number, number, number] }[]): void {
    this.visibilityMap.clear()

    // Simple occluders: walls (x = ±halfW), seat backs, tables
    const halfW = CARRIAGE.halfW
    const ceilY = CARRIAGE.ceilY

    // Wall planes (simplified as AABB obstacles)
    const wallObstacles = [
      { min: new Vector3(-halfW - 0.2, 0, CARRIAGE.z0), max: new Vector3(-halfW + 0.2, ceilY, CARRIAGE.z1) }, // left wall
      { min: new Vector3(halfW - 0.2, 0, CARRIAGE.z0), max: new Vector3(halfW + 0.2, ceilY, CARRIAGE.z1) },  // right wall
    ]

    // Seat obstacles (each seat blocks view behind it)
    const seatObstacles: { min: Vector3; max: Vector3 }[] = []
    for (let r = 0; r < ROWS; r++) {
      const z = ROW_Z0 + r * ROW_DZ
      for (const x of [-2.3, -1.3, 1.3, 2.3]) {
        seatObstacles.push({
          min: new Vector3(x - 0.6, 0, z - 0.6),
          max: new Vector3(x + 0.6, 1.8, z + 0.6),
        })
      }
    }

    const allObstacles = [...wallObstacles, ...seatObstacles]

    for (const seat of seatPositions) {
      const visible = new Set<number>()
      const eyePos = new Vector3(seat.pos[0], 1.6, seat.pos[2])

      for (const obj of this.allObjects) {
        const objId = this.objectIds.get(obj)!
        const objPos = new Vector3()
        obj.getWorldPosition(objPos)

        // Quick distance check
        const dist = eyePos.distanceTo(objPos)
        if (dist > 60) continue // beyond interior

        // Simple ray test against obstacles
        if (!isRayBlocked(eyePos, objPos, allObstacles)) {
          visible.add(objId)
        }
      }

      this.visibilityMap.set(seat.id, visible)
    }
  }

  /** Apply visibility for the player's current seat. */
  update(playerSeatId: number | null): { visible: number; culled: number } {
    if (playerSeatId == null) {
      // no seat — show everything
      this.allObjects.forEach(obj => { obj.visible = true })
      return { visible: this.allObjects.length, culled: 0 }
    }

    const visible = this.visibilityMap.get(playerSeatId)
    if (!visible) {
      this.allObjects.forEach(obj => { obj.visible = true })
      return { visible: this.allObjects.length, culled: 0 }
    }

    let visCount = 0
    let culledCount = 0
    this.allObjects.forEach((obj, id) => {
      const show = visible.has(id)
      obj.visible = show
      if (show) visCount++
      else culledCount++
    })

    return { visible: visCount, culled: culledCount }
  }
}

/** Simple ray-AABB intersection test for occlusion. */
function isRayBlocked(
  origin: Vector3,
  target: Vector3,
  obstacles: { min: Vector3; max: Vector3 }[],
): boolean {
  const dir = new Vector3().subVectors(target, origin)
  const dist = dir.length()
  dir.normalize()

  for (const ob of obstacles) {
    let tmin = -Infinity
    let tmax = Infinity

    for (const axis of ['x', 'y', 'z'] as const) {
      const invD = 1 / dir[axis]
      let t0 = (ob.min[axis] - origin[axis]) * invD
      let t1 = (ob.max[axis] - origin[axis]) * invD
      if (invD < 0) { const tmp = t0; t0 = t1; t1 = tmp }
      tmin = Math.max(tmin, t0)
      tmax = Math.min(tmax, t1)
      if (tmax < tmin) break
    }

    if (tmin >= 0 && tmin <= dist && tmax >= tmin) {
      return true // ray hits obstacle before reaching target
    }
  }
  return false
}
