// @ts-nocheck
// Draw-call batching for the library's table accessories.
//
// With 100+ seated players, rendering one <AccessoryModel> per seat is ~10,000
// draw calls (a laptop alone is ~90 meshes). Strategy, appearances untouched:
//
//   • near seats  (<= DETAIL_RADIUS): the ORIGINAL <AccessoryModel> is rendered
//     exactly as before — full drei <Text>, per-item point lights, shadows.
//   • far seats   (<= CULL_RADIUS):  ONE <InstancedMesh> per (kind, material).
//     All meshes of an accessory that share a material are baked into a single
//     merged geometry, so a 90-mesh laptop costs ~20 draw calls TOTAL for every
//     distant laptop instead of 90 per seat.
//   • beyond CULL_RADIUS: not rendered (a speck at that distance — invisible).
//   • animated kinds (chair_balloon) always render individually.
//
// A hidden "template probe" mounts one <AccessoryModel> per kind, snapshots its
// meshes once fully built (drei <Text> fonts load asynchronously) and bakes the
// merged geometry. If the snapshot fails for any reason the layer falls back to
// the original per-seat rendering — appearance is never degraded.
//
// The near/far split is recomputed on a slow throttle (0.5s) as the camera
// moves; swap between individual and instanced renderers is seamless because
// the instanced geometry is bit-identical to the individual meshes.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BufferGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Uint32BufferAttribute,
  Vector3,
  type Material,
  type Object3D,
} from 'three'
import { AccessoryModel } from '../../avatar/Accessories'
import type { AccessoryId } from '../../avatar/config'

/** One accessory placed on a table in front of a seat (kind + world pose). */
export interface PlacedAccessory {
  kind: AccessoryId
  seatId: number
  position: [number, number, number]
  rotationY: number
}

const DETAIL_RADIUS = 12 // near seats render the original, full-fidelity accessory
const CULL_RADIUS = 30 // past this the accessory is a sub-pixel speck — skip it
const REBALANCE_S = 0.5 // how often the near/far split is recomputed while moving
const PROBE_POLL_MS = 120 // template snapshot poll interval
const PROBE_TIMEOUT_MS = 2500 // give drei <Text> fonts time to materialise

// Accessories that animate per-frame cannot be instanced — always individual.
const ANIMATED = new Set<AccessoryId>(['chair_balloon', 'study_timer'])

const _euler = new Euler()
const _quat = new Quaternion()
const _pos = new Vector3()
const _scale = new Vector3(1, 1, 1)
const _mat = new Matrix4()
const _inv = new Matrix4()
const _local = new Matrix4()

// ---------------------------------------------------------------- templates

interface Part {
  geometry: BufferGeometry // merged-ready: transforms baked, non-indexed
  material: Material
}

interface Template {
  parts: Part[] // one merged geometry + material per distinct material
}

// kind -> built template | 'fallback' (build failed — never retry this session)
const templateCache = new Map<AccessoryId, Template | 'fallback'>()

/** Clone + bake a mesh's transform into a non-indexed geometry (position/normal/uv). */
function bakePartGeometry(src: BufferGeometry, localMatrix: Matrix4): BufferGeometry | null {
  const posAttr = src.getAttribute('position')
  if (!posAttr || posAttr.count < 8) return null

  const g = new BufferGeometry()
  g.setAttribute('position', posAttr.clone())

  const norm = src.getAttribute('normal')
  if (norm) g.setAttribute('normal', norm.clone())

  const uv = src.getAttribute('uv')
  if (uv) g.setAttribute('uv', uv.clone())
  else g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(posAttr.count * 2), 2))

  g.applyMatrix4(localMatrix)
  if (g.index) g.toNonIndexed()
  if (!g.getAttribute('normal')) g.computeVertexNormals()
  return g
}

/** Concatenate several already-baked, non-indexed geometries into one. */
function mergeGeometries(geos: BufferGeometry[]): BufferGeometry | null {
  if (geos.length === 0) return null
  if (geos.length === 1) {
    geos[0].computeBoundingSphere()
    return geos[0]
  }
  try {
    let total = 0
    for (const g of geos) total += g.attributes.position.count

    const pos = new Float32Array(total * 3)
    const norm = new Float32Array(total * 3)
    const uv = new Float32Array(total * 2)
    const idx = new Uint32Array(total)

    let vo = 0
    for (const g of geos) {
      const p = g.attributes.position
      const n = g.attributes.normal
      const u = g.attributes.uv
      pos.set(p.array, vo * 3)
      if (n) norm.set(n.array, vo * 3)
      if (u) uv.set(u.array, vo * 2)
      if (g.index) {
        const gi = g.index
        for (let j = 0; j < gi.count; j++) idx[vo + j] = gi.getX(j) + vo
      } else {
        for (let j = 0; j < p.count; j++) idx[vo + j] = vo + j
      }
      vo += p.count
    }

    const out = new BufferGeometry()
    out.setAttribute('position', new Float32BufferAttribute(pos, 3))
    out.setAttribute('normal', new Float32BufferAttribute(norm, 3))
    out.setAttribute('uv', new Float32BufferAttribute(uv, 2))
    out.setIndex(new Uint32BufferAttribute(idx, 1))
    out.computeBoundingSphere()
    return out
  } catch {
    return null
  }
}

/** Snapshot a rendered accessory subtree into @Template. Returns null if empty. */
function bakeTemplate(root: Group): Template | null {
  root.updateMatrixWorld(true)
  _inv.copy(root.matrixWorld).invert()

  // Group every mesh by its (shared) material instance, then merge per group.
  const byMaterial = new Map<Material, BufferGeometry[]>()
  root.traverse((o: Object3D) => {
    const mesh = o as unknown as { isMesh?: boolean; geometry?: BufferGeometry; material?: Material | Material[]; matrixWorld?: Matrix4 }
    if (!mesh.isMesh || !mesh.geometry || !mesh.matrixWorld) return
    _local.copy(mesh.matrixWorld).premultiply(_inv)
    const baked = bakePartGeometry(mesh.geometry, _local)
    if (!baked) return
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material!
    let arr = byMaterial.get(mat)
    if (!arr) {
      arr = []
      byMaterial.set(mat, arr)
    }
    arr.push(baked)
  })

  if (byMaterial.size === 0) return null
  const parts: Template['parts'] = []
  for (const [material, geos] of byMaterial) {
    const merged = mergeGeometries(geos)
    if (!merged) continue
    parts.push({ geometry: merged, material })
  }
  if (parts.length === 0) return null
  return { parts }
}

/** Hidden one-off accessory whose meshes we snapshot into the template cache. */
function TemplateProbe({ kind, onBuilt }: { kind: AccessoryId; onBuilt: (t: Template | 'fallback') => void }) {
  const ref = useRef<Group>(null)
  useEffect(() => {
    const start = performance.now()
    let finished = false
    let prevN = -1
    let prevV = -1

    const finish = (t: Template | 'fallback') => {
      if (finished) return
      finished = true
      window.clearInterval(timer)
      templateCache.set(kind, t)
      onBuilt(t)
    }

    const timer = window.setInterval(() => {
      const root = ref.current
      if (!root) return
      let t: Template | null = null
      try {
        t = bakeTemplate(root)
      } catch {
        // A geometry that won't bake — treat like an empty snapshot.
      }
      if (!t) {
        if (performance.now() - start > PROBE_TIMEOUT_MS) finish('fallback')
        return
      }
      const n = t.parts.length
      const v = t.parts.reduce((a, p) => a + p.geometry.attributes.position.count, 0)
      const stable = n === prevN && v === prevV
      prevN = n
      prevV = v
      if (stable || performance.now() - start > PROBE_TIMEOUT_MS) finish(t)
    }, PROBE_POLL_MS)

    return () => {
      finished = true // ensure late callbacks are dropped after unmount
      window.clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, onBuilt])

  return (
    <group ref={ref} visible={false}>
      <AccessoryModel id={kind} />
    </group>
  )
}

// ---------------------------------------------------------------- renderers

/** The original per-seat accessory — exactly how it rendered before. */
function AccessoryItem({ p }: { p: PlacedAccessory }) {
  return (
    <group position={p.position} rotation={[0, p.rotationY, 0]}>
      <AccessoryModel id={p.kind} />
    </group>
  )
}

function InstancedKindMesh({ kind, template, items }: { kind: AccessoryId; template: Template; items: PlacedAccessory[] }) {
  const meshes = useRef<(InstancedMesh | null)[]>([])
  const count = items.length

  // Allocate a power-of-two pool so seat churn doesn't remount the meshes. An
  // InstancedMesh that never unmounts keeps its shared geometry alive for good.
  const pool = Math.max(8, Math.pow(2, Math.ceil(Math.log2(count))))

  useLayoutEffect(() => {
    for (const mesh of meshes.current) {
      if (!mesh) continue
      for (let i = 0; i < count; i++) {
        const p = items[i]
        _euler.set(0, p.rotationY, 0)
        _quat.setFromEuler(_euler)
        _pos.set(p.position[0], p.position[1], p.position[2])
        _mat.compose(_pos, _quat, _scale)
        mesh.setMatrixAt(i, _mat)
      }
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = true
    }
  }, [items, count, template])

  return (
    <group>
      {template.parts.map((part, i) => (
        <instancedMesh
          key={`${kind}-${i}-${pool}`}
          ref={(m) => {
            meshes.current[i] = m
          }}
          args={[part.geometry, part.material, pool]}
          count={count}
          castShadow={false}
          receiveShadow={false}
          frustumCulled={false}
        />
      ))}
    </group>
  )
}

function KindBatch({ kind, items }: { kind: AccessoryId; items: PlacedAccessory[] }) {
  const [template, setTemplate] = useState<Template | 'fallback' | null>(() => templateCache.get(kind) ?? null)

  // Probe has never been built for this kind — start one now.
  if (template === null) {
    return (
      <>
        <TemplateProbe kind={kind} onBuilt={setTemplate} />
        {items.map((p) => (
          <AccessoryItem key={p.seatId} p={p} />
        ))}
      </>
    )
  }

  // Template build failed or the accessory animates — keep per-seat rendering.
  if (template === 'fallback') {
    return (
      <>
        {items.map((p) => (
          <AccessoryItem key={p.seatId} p={p} />
        ))}
      </>
    )
  }

  return <InstancedKindMesh key={kind} kind={kind} template={template} items={items} />
}

// ---------------------------------------------------------------- top level

export function InstancedAccessoryBatch({ placements }: { placements: PlacedAccessory[] }) {
  const camera = useThree((s) => s.camera)
  const [farIds, setFarIds] = useState<Set<number>>(() => new Set(placements.map((p) => p.seatId)))
  const acc = useRef(0)
  const keyRef = useRef('')

  // Rebalance the near/far split on a slow throttle as the camera travels.
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < REBALANCE_S) return
    acc.current = 0
    const c = camera.position
    const far = new Set<number>()
    for (const p of placements) {
      const dx = p.position[0] - c.x
      const dy = p.position[1] - c.y
      const dz = p.position[2] - c.z
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 > DETAIL_RADIUS * DETAIL_RADIUS && d2 <= CULL_RADIUS * CULL_RADIUS) far.add(p.seatId)
    }
    const key = Array.from(far)
      .sort((a, b) => a - b)
      .join(',')
    if (key !== keyRef.current) {
      keyRef.current = key
      setFarIds(far)
    }
  })

  const { near, farItems, farAnimated } = useMemo(() => {
    const near: PlacedAccessory[] = []
    const farItems: PlacedAccessory[] = []
    const farAnimated: PlacedAccessory[] = []
    for (const p of placements) {
      if (!farIds.has(p.seatId)) {
        near.push(p)
      } else if (ANIMATED.has(p.kind)) {
        farAnimated.push(p)
      } else {
        farItems.push(p)
      }
    }
    return { near, farItems, farAnimated }
  }, [placements, farIds])

  const byKind = useMemo(() => {
    const m = new Map<AccessoryId, PlacedAccessory[]>()
    for (const p of farItems) {
      let arr = m.get(p.kind)
      if (!arr) {
        arr = []
        m.set(p.kind, arr)
      }
      arr.push(p)
    }
    return m
  }, [farItems])

  return (
    <group>
      {near.map((p) => (
        <AccessoryItem key={p.seatId} p={p} />
      ))}
      {farAnimated.map((p) => (
        <AccessoryItem key={p.seatId} p={p} />
      ))}
      {Array.from(byKind.entries()).map(([kind, items]) => (
        <KindBatch key={kind} kind={kind} items={items} />
      ))}
    </group>
  )
}