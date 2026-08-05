// Elephant upgrade pass: (1) smoother arm forearm + rounder fanned fingers,
// (2) bigger fan ears with soft crease shading (no ring-like torus folds),
// (3) robe rebuilt as fitted bodice + flared skirt that sways like cloth and
// fully covers the hips/thighs (fixes "bum coming out of the robe").
// CRLF-aware.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const src = readFileSync(FILE, 'utf8')
const isCrlf = src.includes('\r\n')
let out = src.replace(/\r\n/g, '\n')
const B = '\\u0060' // escaped backtick placeholder

function rep(oldS, newS, label) {
  if (!out.includes(oldS)) { console.error('MISSING: ' + label); process.exit(1) }
  out = out.split(oldS).join(newS)
  console.log('ok: ' + label)
}

// ---- 1. Add robeSkirtRef + cloth sway useFrame after proportions ----
rep(
  `  const P = proportionsFor(config.bodyType)
  const s = heightScale(config.height)
`,
  `  const P = proportionsFor(config.bodyType)
  const s = heightScale(config.height)

  // Elephant robe skirt — gentle cloth sway so the robe reads as fabric, not a
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
  'robe sway hook'
)

// ---- 2. Robe body -> fitted bodice + flared skirt group ----
rep(
  `              {/* Robe body — A-line from the neck down to the calves */}
              <mesh geometry={latheGeo([
                [P.hipBoneW * 1.35, -0.31],
                [P.hipBoneW * 1.32, -0.18],
                [P.hipBoneW * 1.28, -0.04],
                [P.waistW * 1.28, 0.1],
                [P.chestW * 1.16, 0.22],
                [P.chestW * 1.1, 0.31],
                [P.neckR * 2.4, 0.35],
              ])} material={elNavy} position={[0, 0, 0]} castShadow />
`,
  `              {/* Upper robe — fitted bodice from chest to waist */}
              <mesh geometry={latheGeo([
                [P.waistW * 1.32, 0.02],
                [P.waistW * 1.3, 0.08],
                [P.chestW * 1.16, 0.22],
                [P.chestW * 1.1, 0.31],
                [P.neckR * 2.4, 0.35],
              ])} material={elNavy} position={[0, 0, 0]} castShadow />

              {/* Flowing skirt — flared wide over the hips and thighs (covers the
                  bum), hangs to just above the feet, and sways like cloth */}
              <group ref={robeSkirtRef} position={[0, -0.02, 0]}>
                <mesh geometry={latheGeo([
                  [P.waistW * 1.32, 0.06],
                  [P.hipBoneW * 1.42, -0.1],
                  [P.hipBoneW * 1.58, -0.22],
                  [P.hipBoneW * 1.7, -0.35],
                ])} material={elNavy} castShadow />
`,
  'robe bodice + skirt'
)

// ---- 3. Hem bands -> sit on the skirt, match the wider flare ----
rep(
  `              {/* Glowing gold hem band + a second gold trim above it */}
              <mesh geometry={torusGeo(P.hipBoneW * 1.35, P.hipBoneW * 0.07, 8, 28)} material={elGlowGold}
                position={[0, -0.31, 0]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={torusGeo(P.hipBoneW * 1.3, P.hipBoneW * 0.045, 8, 24)} material={elTrim}
                position={[0, -0.19, 0]} rotation={[Math.PI / 2, 0, 0]} />
`,
  `              {/* Glowing gold hem band + a second gold trim above it (on the skirt) */}
              <mesh geometry={torusGeo(P.hipBoneW * 1.66, P.hipBoneW * 0.07, 8, 28)} material={elGlowGold}
                position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={torusGeo(P.hipBoneW * 1.5, P.hipBoneW * 0.045, 8, 24)} material={elTrim}
                position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]} />
`,
  'hem bands on skirt'
)

// ---- 4. Close the skirt group after the tassels ----
rep(
  `              {[-P.waistW * 0.05, 0, P.waistW * 0.05].map((tx, i) => (
                <mesh key={'ts' + i} geometry={taperGeo(P.waistW * 0.02, P.waistW * 0.005, P.waistW * 0.24)} material={elTrim}
                  position={[tx, -0.02, P.torsoD * 1.52]} />
              ))}
`,
  `              {[-P.waistW * 0.05, 0, P.waistW * 0.05].map((tx, i) => (
                <mesh key={'ts' + i} geometry={taperGeo(P.waistW * 0.02, P.waistW * 0.005, P.waistW * 0.24)} material={elTrim}
                  position={[tx, -0.02, P.torsoD * 1.52]} />
              ))}
              </group>
`,
  'close skirt group'
)

// ---- 5. Shorten the placket so it stays on the bodice ----
rep(
  `              {/* Gold front placket down the robe centre */}
              <mesh geometry={boxGeo(P.chestW * 0.16, 0.5, P.torsoD * 0.03)} material={elTrim}
                position={[0, -0.12, P.torsoD * 1.42]} />
`,
  `              {/* Gold front placket down the robe centre */}
              <mesh geometry={boxGeo(P.chestW * 0.16, 0.34, P.torsoD * 0.03)} material={elTrim}
                position={[0, -0.02, P.torsoD * 1.42]} />
`,
  'placket on bodice'
)

// ---- 6. Smoother elephant forearm (remove the mid-forearm bulge) ----
rep(
  `          <mesh geometry={latheGeo([
            [eArmElbowR, -P.lowerArm * eArmY],
            [eArmElbowR * 1.06, -P.lowerArm * 0.65 * eArmY],
            [eArmWristR * 1.45, -P.lowerArm * 0.38 * eArmY],
            [eArmWristR * 1.3, -P.lowerArm * 0.15 * eArmY],
            [eArmWristR * 1.22, 0],
          ])} material={skin} castShadow />
`,
  `          <mesh geometry={latheGeo([
            [eArmElbowR, -P.lowerArm * eArmY],
            [eArmElbowR * 0.98, -P.lowerArm * 0.72 * eArmY],
            [eArmElbowR * 0.95, -P.lowerArm * 0.42 * eArmY],
            [eArmWristR * 1.3, -P.lowerArm * 0.16 * eArmY],
            [eArmWristR * 1.2, 0],
          ])} material={skin} castShadow />
`,
  'smooth forearm'
)

// ---- 7. Rounder fanned elephant fingers ----
rep(
  `              {[-P.wristR * 0.6, -P.wristR * 0.2, P.wristR * 0.2, P.wristR * 0.6].map((fx, i) => (
                <group key={'pf' + i} position={[fx, -P.handLen * 0.4, P.wristR * 0.18]}>
                  <mesh geometry={taperGeo(P.wristR * 0.28, P.wristR * 0.18, P.handLen * 0.3)} material={gloveM} position={[0, -P.handLen * 0.1, 0]} castShadow />
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.25, P.wristR * 0.23, P.wristR * 0.25]} position={[0, -P.handLen * 0.28, 0]} />
                </group>
              ))}
`,
  `              {[-P.wristR * 0.66, -P.wristR * 0.22, P.wristR * 0.22, P.wristR * 0.66].map((fx, i) => (
                <group key={'pf' + i} position={[fx, -P.handLen * 0.38, P.wristR * (0.12 + i * 0.05)]} rotation={[0, -0.12 + i * 0.08, 0]}>
                  <mesh geometry={taperGeo(P.wristR * 0.3, P.wristR * 0.2, P.handLen * 0.26)} material={gloveM} position={[0, -P.handLen * 0.08, 0]} castShadow />
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.28, P.wristR * 0.26, P.wristR * 0.28]} position={[0, -P.handLen * 0.24, 0]} />
                </group>
              ))}
`,
  'fanned fingers'
)

// ---- 8. Bigger fan ears with soft crease shading (no torus rings) ----
rep(
  `      {[-1, 1].map((sx) => (
        <group key={\`ear\${sx}\`} position={[sx * r * 1.32, r * 0.04, -r * 0.12]} rotation={[0, sx * -0.18, sx * 0.16]}>
          {/* main ear disc */}
          <mesh geometry={sphereGeo(1)} material={main} scale={[r * 1.1, r * 1.24, r * 0.32]} castShadow />
          {/* pink inner pad */}
          <mesh geometry={sphereGeo(1)} material={inner} scale={[r * 0.78, r * 0.9, r * 0.2]} position={[0, -r * 0.03, r * 0.07]} />
          {/* upper wrinkle fold */}
          <mesh geometry={torusGeo(r * 0.58, r * 0.02, 6, 20)} material={dark} position={[0, r * 0.3, r * 0.1]} rotation={[0.35, 0, 0]} />
          {/* lower wrinkle fold */}
          <mesh geometry={torusGeo(r * 0.4, r * 0.016, 6, 18)} material={dark} position={[0, r * 0.06, r * 0.12]} rotation={[0.42, 0, 0]} />
        </group>
      ))}
`,
  `      {[-1, 1].map((sx) => (
        <group key={\`ear\${sx}\`} position={[sx * r * 1.34, r * 0.06, -r * 0.14]} rotation={[0, sx * -0.16, sx * 0.15]}>
          {/* main ear disc — big round fan */}
          <mesh geometry={sphereGeo(1)} material={main} scale={[r * 1.18, r * 1.3, r * 0.34]} castShadow />
          {/* pink inner pad — soft and blended */}
          <mesh geometry={sphereGeo(1)} material={inner} scale={[r * 0.84, r * 0.95, r * 0.22]} position={[0, -r * 0.04, r * 0.08]} />
          {/* soft crease shading — thin darker ellipses, no visible rings */}
          <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.5, r * 0.12, r * 0.04]} position={[0, r * 0.34, r * 0.12]} rotation={[0.3, 0, 0]} />
          <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.42, r * 0.1, r * 0.04]} position={[0, r * 0.08, r * 0.13]} rotation={[0.42, 0, 0]} />
        </group>
      ))}
`,
  'fan ears upgrade'
)

writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log('All elephant upgrades applied')
