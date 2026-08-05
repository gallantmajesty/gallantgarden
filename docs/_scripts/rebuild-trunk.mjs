// Rebuild the elephant trunk. Old version hand-placed wrinkle rings / tip /
// nostrils at fixed positions that did NOT match the tube curve (rings tilted,
// nostrils floating outside the surface, trunk too long). New version computes
// the tube geometry AND ring/tip/nostril positions from the SAME curve so they
// line up exactly. CRLF-aware.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const src = readFileSync(FILE, 'utf8')
const isCrlf = src.includes('\r\n')
const norm = src.replace(/\r\n/g, '\n')

// ---- 1. Replace the trunkGeo useMemo with a `trunk` useMemo ----
const geoOld = `  const trunkGeo = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(0, -r * 0.05, r * 1.16),
      new Vector3(0, -r * 0.45, r * 1.3),
      new Vector3(0, -r * 0.85, r * 1.34),
      new Vector3(0, -r * 1.18, r * 1.22),
      new Vector3(0, -r * 1.36, r * 1.06),
      new Vector3(0, -r * 1.3, r * 0.98),
    ])
    const tubularSegs = 40
    const radialSegs = 16
    const geo = new TubeGeometry(curve, tubularSegs, r * 0.27, radialSegs, false)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / (radialSegs + 1))
      const t = ring / tubularSegs
      const taper = 1.0 - t * 0.46
      const cp = curve.getPointAt(t)
      const vx = pos.getX(i) - cp.x
      const vy = pos.getY(i) - cp.y
      const vz = pos.getZ(i) - cp.z
      pos.setXYZ(i, cp.x + vx * taper, cp.y + vy * taper, cp.z + vz * taper)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [r])`

const geoNew = `  // Thick trunk — hangs straight down the face centre, bows gently forward,
  // and finishes in a soft curl at the tip. The tube, wrinkle rings, tip cap
  // and nostrils are all computed from the SAME curve so they line up exactly.
  const trunk = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(0, -r * 0.05, r * 1.12),
      new Vector3(0, -r * 0.4, r * 1.26),
      new Vector3(0, -r * 0.75, r * 1.28),
      new Vector3(0, -r * 1.0, r * 1.2),
      new Vector3(0, -r * 1.15, r * 1.06),
      new Vector3(0, -r * 1.2, r * 0.96),
    ])
    const tubularSegs = 32
    const radialSegs = 14
    const baseR = r * 0.25
    const taperRate = 0.52
    const geo = new TubeGeometry(curve, tubularSegs, baseR, radialSegs, false)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / (radialSegs + 1))
      const t = ring / tubularSegs
      const taper = 1.0 - t * taperRate
      const cp = curve.getPointAt(t)
      const vx = pos.getX(i) - cp.x
      const vy = pos.getY(i) - cp.y
      const vz = pos.getZ(i) - cp.z
      pos.setXYZ(i, cp.x + vx * taper, cp.y + vy * taper, cp.z + vz * taper)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    // Wrinkle rings — every ring sits exactly on the tube surface
    const rings = [0.12, 0.28, 0.44, 0.6, 0.76].map((t) => {
      const p = curve.getPointAt(t)
      return { x: p.x, y: p.y, z: p.z, rr: baseR * (1 - t * taperRate) }
    })
    // Tip cap anchor — end of the curve
    const tip = curve.getPointAt(1)
    // Nostril anchor — near the tip on the front face of the tube
    const np = curve.getPointAt(0.86)
    const nr = baseR * (1 - 0.86 * taperRate)
    return { geo, rings, tip, np, nr }
  }, [r])`

if (!norm.includes(geoOld)) {
  console.error('GEO BLOCK NOT FOUND')
  process.exit(1)
}
let out = norm.replace(geoOld, geoNew)

// ---- 2. Replace the render block (tube mesh, rings, tip, nostrils) ----
const renderOld = `      {/* Trunk tube — hangs straight down, bows softly forward, curls inward at the tip */}
      <mesh geometry={trunkGeo} material={main} castShadow />

      {/* Trunk wrinkle rings — thin, subtle, spaced along the tube */}
      {[
        [0, -r * 0.35, r * 1.24, r * 0.22],
        [0, -r * 0.62, r * 1.31, r * 0.2],
        [0, -r * 0.9, r * 1.34, r * 0.18],
        [0, -r * 1.14, r * 1.26, r * 0.155],
        [0, -r * 1.32, r * 1.1, r * 0.135],
      ].map(([wx, wy, wz, wrr], i) => (
        <mesh key={\`twr\${i}\`} geometry={torusGeo(wrr as number, r * 0.011, 8, 24)} material={dark}
          position={[wx as number, wy as number, wz as number]} rotation={[Math.PI / 2.15, 0, 0]} />
      ))}

      {/* Trunk tip — rounded darker cap at the curled end */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.14, r * 0.13, r * 0.14]} position={[0, -r * 1.3, r * 0.98]} />

      {/* Nostrils on the trunk front */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#111111', 0.2)} scale={[r * 0.05, r * 0.035, r * 0.028]} position={[r * 0.07, -r * 1.18, r * 1.3]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#111111', 0.2)} scale={[r * 0.05, r * 0.035, r * 0.028]} position={[-r * 0.07, -r * 1.18, r * 1.3]} />`

const renderNew = `      {/* Trunk tube — hangs straight down, bows softly forward, curls gently at the tip */}
      <mesh geometry={trunk.geo} material={main} castShadow />

      {/* Trunk wrinkle rings — hugging the tube along its length */}
      {trunk.rings.map((ring, i) => (
        <mesh key={\`twr\${i}\`} geometry={torusGeo(ring.rr * 1.03, r * 0.012, 8, 24)} material={dark}
          position={[ring.x, ring.y, ring.z]} rotation={[Math.PI / 2, 0, 0]} />
      ))}

      {/* Trunk tip — rounded darker cap at the curled end */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.15, r * 0.13, r * 0.15]}
        position={[trunk.tip.x, trunk.tip.y, trunk.tip.z]} />

      {/* Nostrils — on the trunk front near the tip */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#111111', 0.2)} scale={[r * 0.045, r * 0.03, r * 0.03]}
        position={[trunk.np.x + trunk.nr * 0.55, trunk.np.y, trunk.np.z + trunk.nr * 0.7]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#111111', 0.2)} scale={[r * 0.045, r * 0.03, r * 0.03]}
        position={[trunk.np.x - trunk.nr * 0.55, trunk.np.y, trunk.np.z + trunk.nr * 0.7]} />`

if (!out.includes(renderOld)) {
  console.error('RENDER BLOCK NOT FOUND')
  process.exit(1)
}
out = out.replace(renderOld, renderNew)

writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log('Trunk rebuilt OK')
