// Elephant fixes: (1) remove the constant cloth sway (reads unnatural on a rigid
// cone), (2) make the robe skirt double-sided so it isn't see-through from below
// (the bottom cap's front face points up, so the underside was culled),
// (3) improve the arms: puffed sleeve + gold cuff at a proper hem, clean
// monotonic forearm taper (removed the wrist bulge), rounder fanned fingers.
// CRLF-aware.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const src = readFileSync(FILE, 'utf8')
const isCrlf = src.includes('\r\n')
let out = src.replace(/\r\n/g, '\n')

function rep(oldS, newS, label) {
  if (!out.includes(oldS)) { console.error('MISSING: ' + label); process.exit(1) }
  out = out.split(oldS).join(newS)
  console.log('ok: ' + label)
}

// ---- 1. Remove the constant sway useFrame (keep the ref, unused now) ----
rep(
  `  // Elephant robe skirt — gentle cloth sway so the robe reads as fabric, not a
  // rigid cone. The skirt group rotates lazily around the waist like cloth
  // catching air when the character moves.
  const robeSkirtRef = useRef<Group>(null)
  useFrame((state) => {
    const el = robeSkirtRef.current
    if (el) {
      const t = state.clock.getElapsedTime()
      el.rotation.z = Math.sin(t * 1.3) * 0.05
      el.rotation.x = Math.sin(t * 0.85 + 1.7) * 0.02
    }
  })
`,
  `  // Robe skirt group ref — kept so future walk-cycle cloth animation can hook
  // into it; the robe hangs naturally (no artificial idle sway).
  const robeSkirtRef = useRef<Group>(null)
`,
  'remove sway hook'
)

// ---- 2. Skirt mesh -> double-sided so it isn't see-through from below ----
rep(
  `              <group ref={robeSkirtRef} position={[0, -0.02, 0]}>
                <mesh geometry={latheGeo([
                  [P.waistW * 1.32, 0.06],
                  [P.hipBoneW * 1.42, -0.1],
                  [P.hipBoneW * 1.58, -0.22],
                  [P.hipBoneW * 1.7, -0.35],
                ])} material={elNavy} castShadow />
`,
  `              <group ref={robeSkirtRef} position={[0, -0.02, 0]}>
                <mesh geometry={latheGeo([
                  [P.waistW * 1.32, 0.06],
                  [P.hipBoneW * 1.42, -0.1],
                  [P.hipBoneW * 1.58, -0.22],
                  [P.hipBoneW * 1.7, -0.35],
                ])} castShadow>
                  <meshStandardMaterial color="#1B2B5A" roughness={0.78} side={DoubleSide} />
                </mesh>
`,
  'skirt double-sided'
)

// ---- 3. Puffed sleeve with rounded cap + gold cuff at the hem ----
rep(
  `          {/* Short navy sleeve over the shoulder — matches the shirt */}
          <mesh geometry={latheGeo([
            [eArmElbowR * 1.04, -P.upperArm * 0.42 * eArmY],
            [eArmTopR * 0.94, -P.upperArm * 0.25 * eArmY],
            [eArmTopR, -P.upperArm * 0.08 * eArmY],
            [eArmTopR * 0.95, P.upperArm * 0.1 * eArmY],
            [eArmTopR * 0.5, P.upperArm * 0.2 * eArmY],
            [eArmTopR * 0.18, P.upperArm * 0.24 * eArmY],
          ])} material={topM} castShadow />
          {/* Gold cuff ring at the sleeve hem */}
          <mesh geometry={torusGeo(eArmElbowR * 1.06, eArmElbowR * 0.035, 8, 20)} material={sharedMaterial('#D4AF37', 0.3, 0.65)}
            position={[0, -P.upperArm * 0.42 * eArmY, P.wristR * 0.4]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Bare grey forearm below the sleeve */}
          <mesh geometry={latheGeo([
            [eArmElbowR, -P.upperArm * eArmY],
            [eArmElbowR * 1.04, -P.upperArm * 0.42 * eArmY],
          ])} material={armM} castShadow />
`,
  `          {/* Navy puff sleeve — rounded cap over the shoulder, flared hem */}
          <mesh geometry={latheGeo([
            [eArmElbowR * 1.08, -P.upperArm * 0.44 * eArmY],
            [eArmElbowR * 1.0, -P.upperArm * 0.3 * eArmY],
            [eArmTopR * 0.9, -P.upperArm * 0.12 * eArmY],
            [eArmTopR * 1.06, -P.upperArm * 0.02 * eArmY],
            [eArmTopR, P.upperArm * 0.08 * eArmY],
            [eArmTopR * 0.6, P.upperArm * 0.16 * eArmY],
            [eArmTopR * 0.25, P.upperArm * 0.2 * eArmY],
          ])} material={topM} castShadow />
          {/* Gold cuff ring at the sleeve hem */}
          <mesh geometry={torusGeo(eArmElbowR * 1.1, eArmElbowR * 0.04, 8, 20)} material={sharedMaterial('#D4AF37', 0.3, 0.65)}
            position={[0, -P.upperArm * 0.44 * eArmY, P.wristR * 0.4]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Bare grey forearm below the sleeve — clean column */}
          <mesh geometry={latheGeo([
            [eArmElbowR, -P.upperArm * eArmY],
            [eArmElbowR * 1.0, -P.upperArm * 0.45 * eArmY],
          ])} material={armM} castShadow />
`,
  'puffed sleeve + cuff'
)

// ---- 4. Clean monotonic forearm taper (no wrist bulge) ----
rep(
  `          <mesh geometry={latheGeo([
            [eArmElbowR, -P.lowerArm * eArmY],
            [eArmElbowR * 0.98, -P.lowerArm * 0.72 * eArmY],
            [eArmElbowR * 0.95, -P.lowerArm * 0.42 * eArmY],
            [eArmWristR * 1.3, -P.lowerArm * 0.16 * eArmY],
            [eArmWristR * 1.2, 0],
          ])} material={skin} castShadow />
`,
  `          <mesh geometry={latheGeo([
            [eArmElbowR, -P.lowerArm * eArmY],
            [eArmElbowR * 0.97, -P.lowerArm * 0.75 * eArmY],
            [eArmElbowR * 0.93, -P.lowerArm * 0.5 * eArmY],
            [eArmWristR * 1.12, -P.lowerArm * 0.25 * eArmY],
            [eArmWristR * 1.08, 0],
          ])} material={skin} castShadow />
`,
  'clean forearm taper'
)

// ---- 5. Rounder fingers with chunky base + rounded tip ----
rep(
  `              {[-P.wristR * 0.66, -P.wristR * 0.22, P.wristR * 0.22, P.wristR * 0.66].map((fx, i) => (
                <group key={'pf' + i} position={[fx, -P.handLen * 0.38, P.wristR * (0.12 + i * 0.05)]} rotation={[0, -0.12 + i * 0.08, 0]}>
                  <mesh geometry={taperGeo(P.wristR * 0.3, P.wristR * 0.2, P.handLen * 0.26)} material={gloveM} position={[0, -P.handLen * 0.08, 0]} castShadow />
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.28, P.wristR * 0.26, P.wristR * 0.28]} position={[0, -P.handLen * 0.24, 0]} />
                </group>
              ))}
`,
  `              {[-P.wristR * 0.68, -P.wristR * 0.23, P.wristR * 0.23, P.wristR * 0.68].map((fx, i) => (
                <group key={'pf' + i} position={[fx, -P.handLen * 0.36, P.wristR * (0.1 + i * 0.06)]} rotation={[0, -0.12 + i * 0.08, 0]}>
                  {/* chunky finger base */}
                  <mesh geometry={taperGeo(P.wristR * 0.32, P.wristR * 0.22, P.handLen * 0.28)} material={gloveM} position={[0, -P.handLen * 0.1, 0]} castShadow />
                  {/* rounded fingertip */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.26, P.wristR * 0.24, P.wristR * 0.26]} position={[0, -P.handLen * 0.3, 0]} />
                </group>
              ))}
`,
  'rounder fingers'
)

writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log('All fixes applied')
