import { readFileSync, writeFileSync } from 'node:fs'

// ── 1) layout.ts — add 'garden' zone, 4 seats, blockers ────────────────────
const layout = 'C:/Users/taksh/studyforest/src/three/chinese-cafe/layout.ts'
let l = readFileSync(layout, 'utf8')

const zoneOld = `export type CafeSeatZone = 'communal' | 'booth' | 'window' | 'mezzanine'`
const zoneNew = `export type CafeSeatZone = 'communal' | 'booth' | 'window' | 'mezzanine' | 'garden'`
if (!l.includes(zoneOld)) { console.log('LAYOUT: zone anchor missing'); process.exit(1) }
l = l.replace(zoneOld, zoneNew)

const seatsAnchor = `// Four quiet seats at two desks on the rear mezzanine.`
const gardenBlock = `// Four seats around two round garden tea tables in the south "second room",
// past the MoonGate partition (z 17.5..27.5) — that zone otherwise reads empty.
for (const tz of [22, 25] as const) {
  for (const side of [-1, 1] as const) {
    const id = seats.length
    seats.push({
      id,
      zone: 'garden',
      label: \`Garden Tea Table · Seat \${id - 25}\`,
      floor: 'Ground Floor',
      feature: 'Round garden tea table',
      quietness: 'Quiet',
      pos: [-8.5 + side * 1.15, 0, tz],
      yaw: side === 1 ? Math.PI / 2 : -Math.PI / 2,
    })
  }
}

// Four quiet seats at two desks on the rear mezzanine.`
if (!l.includes(seatsAnchor)) { console.log('LAYOUT: seats anchor missing'); process.exit(1) }
l = l.replace(seatsAnchor, gardenBlock)

const blockerAnchor = `    aabb(10.7, 1.2, 20.2, 8.8, 2.4, 3.2),`
const blockerNew = `    aabb(10.7, 1.2, 20.2, 8.8, 2.4, 3.2),
    aabb(-8.5, 0.8, 22, 1.8, 1.6, 1.8),
    aabb(-8.5, 0.8, 25, 1.8, 1.6, 1.8),`
if (!l.includes(blockerAnchor)) { console.log('LAYOUT: blocker anchor missing'); process.exit(1) }
l = l.replace(blockerAnchor, blockerNew)
writeFileSync(layout, l)
console.log('layout.ts updated')

// ── 2) ChineseCafeFurniture.tsx — round garden tea tables ──────────────────
const furn = 'C:/Users/taksh/studyforest/src/three/chinese-cafe/ChineseCafeFurniture.tsx'
let f = readFileSync(furn, 'utf8')

const compAnchor = `function CommunalTable() {`
const roundTable = `/** A round garden tea table (石桌) — a carved stone disc on a turned
 *  pedestal with a brass collar, for the south garden room. Kept bare so
 *  the player's equipped accessory shows on the top. */
function RoundTeaTable({ position }: { position: [number, number, number] }) {
  const gold = CAFE_PALETTE.brass
  return (
    <group position={position}>
      {/* stone disc top */}
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.9, 0.1, 28]} />
        <meshStandardMaterial color="#b9c2bc" roughness={0.5} />
      </mesh>
      {/* turned pedestal */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 0.75, 14]} />
        <meshStandardMaterial color="#4a4b47" roughness={0.55} />
      </mesh>
      {/* base pad */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.4, 0.1, 18]} />
        <meshStandardMaterial color="#252927" roughness={0.6} />
      </mesh>
      {/* brass collar under the top */}
      <mesh position={[0, 0.76, 0]}>
        <torusGeometry args={[0.16, 0.02, 8, 18]} />
        <meshStandardMaterial color={gold} metalness={0.78} roughness={0.26} />
      </mesh>
    </group>
  )
}

function CommunalTable() {`
if (!f.includes(compAnchor)) { console.log('FURN: component anchor missing'); process.exit(1) }
f = f.replace(compAnchor, roundTable)

const renderAnchor = `      <CommunalTable />`
const renderNew = `      <CommunalTable />
      <RoundTeaTable position={[-8.5, 0, 22]} />
      <RoundTeaTable position={[-8.5, 0, 25]} />`
if (!f.includes(renderAnchor)) { console.log('FURN: render anchor missing'); process.exit(1) }
f = f.replace(renderAnchor, renderNew)
writeFileSync(furn, f)
console.log('ChineseCafeFurniture.tsx updated')

// ── 3) ChineseCafeTableAccessories.tsx — garden tablePose ──────────────────
const ta = 'C:/Users/taksh/studyforest/src/three/chinese-cafe/ChineseCafeTableAccessories.tsx'
let t = readFileSync(ta, 'utf8')

const poseAnchor = `  } else if (seat.zone === 'window') {
    tableX = -19.18
    tableY = 0.9
  } else {`
const poseNew = `  } else if (seat.zone === 'window') {
    tableX = -19.18
    tableY = 0.9
  } else if (seat.zone === 'garden') {
    // round garden tables sit at x = -8.5; the accessory goes on the disc,
    // offset toward the table centre from the seat side
    const toward = seat.pos[0] < -8.5 ? 1 : -1
    tableX = seat.pos[0] + toward * 0.6
    tableY = 0.9
  } else {`
if (!t.includes(poseAnchor)) { console.log('TABLEACC: pose anchor missing'); process.exit(1) }
t = t.replace(poseAnchor, poseNew)
writeFileSync(ta, t)
console.log('ChineseCafeTableAccessories.tsx updated')

// ── 4) Seat-selection plan map — round tables in the south room ────────────
const ov = 'C:/Users/taksh/studyforest/src/three/chinese-cafe/ChineseCafeSeatSelectionOverlay.tsx'
let o = readFileSync(ov, 'utf8')

const planAnchor = `      <rect
        x={planX(10.7) - planW(8.8) / 2}`
const planNew = `      {[22, 25].map((z) => (
        <g key={z}>
          <circle
            cx={planX(-8.5)}
            cy={planY(z)}
            r={planW(1.7) / 2}
            className="sso-plan-table"
            style={{
              fill: 'rgba(151, 103, 42, 0.5)',
              stroke: 'rgba(231, 192, 98, 0.72)',
            }}
          />
          <text
            x={planX(-8.5)}
            y={planY(z) + 4}
            textAnchor="middle"
            fill="rgba(246, 222, 158, 0.68)"
            fontSize={8}
            fontFamily="Georgia, serif"
          >
            GARDEN TEA
          </text>
        </g>
      ))}

      <rect
        x={planX(10.7) - planW(8.8) / 2}`
if (!o.includes(planAnchor)) { console.log('OVERLAY: plan anchor missing'); process.exit(1) }
o = o.replace(planAnchor, planNew)
writeFileSync(ov, o)
console.log('Seat-selection overlay updated')

// ── 5) Capacity 26 → 30 + text mentions ────────────────────────────────────
const realm = 'C:/Users/taksh/studyforest/src/lib/realm.ts'
let r = readFileSync(realm, 'utf8')
const capOld = `  'jade-lantern': 26,`
const capNew = `  'jade-lantern': 30,`
if (!r.includes(capOld)) { console.log('REALM: capacity anchor missing'); process.exit(1) }
r = r.replace(capOld, capNew)
writeFileSync(realm, r)
console.log('realm.ts capacity updated')
