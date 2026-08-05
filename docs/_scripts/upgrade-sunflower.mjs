// Sunflower character upgrade:
//  - Head: real pointed tapered petals (2 layers), a structured seed ring
//    around the face, a proper smile arc, bigger anime eyes, a leaf sprout
//    on top of the bloom.
//  - Body: green leafy arms with yellow flower hands, waist petals fixed so
//    they sit ON the skirt surface (they were buried inside it), and a
//    scalloped leaf hem around the skirt.
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
let applied = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) { console.log('MISS: ' + label); return }
  s = s.replace(needle, repl); applied++; console.log('ok: ' + label)
}

// ------------------------------------------------------------ HEAD UPGRADES

// 1. Bigger anime eyes (wrap in a scale group) + aligned eyebrows
sub(`      {/* Lily-style anime eyes — big coloured iris with dark limbal ring,
          brighter lower glow, small pupil, two catchlights, upper lash line */}
      <Eye r={r} x={-r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#8c5a2e" />
      <Eye r={r} x={r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#8c5a2e" />

      {/* Lily-style eyebrows — thin, dark, gentle arch */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[-r * 0.3, -r * 0.04 + r * 0.18, fz * 0.98]} rotation={[0, 0, 0.14]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[r * 0.3, -r * 0.04 + r * 0.18, fz * 0.98]} rotation={[0, 0, -0.14]} />`,
    `      {/* Lily-style anime eyes — big coloured iris with dark limbal ring,
          brighter lower glow, small pupil, two catchlights, upper lash line */}
      <group scale={1.16}>
        <Eye r={r} x={-r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#8c5a2e" />
        <Eye r={r} x={r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#8c5a2e" />
      </group>

      {/* Lily-style eyebrows — thin, dark, gentle arch (tracking the bigger eyes) */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[-r * 0.35, -r * 0.05 + r * 0.18, fz * 0.98]} rotation={[0, 0, 0.14]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[r * 0.35, -r * 0.05 + r * 0.18, fz * 0.98]} rotation={[0, 0, -0.14]} />`,
    'bigger eyes + aligned brows')

// 2. Proper smile arc (was three dots)
sub(`      {/* Lily cute smile — a small centre dot + two side dots */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.045, r * 0.02, r * 0.01]} position={[0, -r * 0.51, fz * 0.92]} />
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.028, r * 0.018, r * 0.01]} position={[-r * 0.07, -r * 0.49, fz * 0.92]} />
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.028, r * 0.018, r * 0.01]} position={[r * 0.07, -r * 0.49, fz * 0.92]} />`,
    `      {/* Cute smile — a gentle upward arc with lifted corners */}
      {[-0.09, -0.045, 0, 0.045, 0.09].map((dx, i) => (
        <mesh key={'sm' + i} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.034, r * 0.018, r * 0.01]}
          position={[dx * r, -r * 0.48 + Math.abs(dx) * r * 0.9, fz * 0.92]} />
      ))}`,
    'smile arc')

// 3. Structured seed ring around the face edge (real seed-disc look)
sub(`      {/* tiny seed dots scattered across the face as texture (no disc) */}`,
    `      {/* structured seed ring — brown seeds circling the face edge like a real seed disc */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + Math.PI / 16
        return (
          <mesh key={'sr' + i} geometry={sphereGeo(1)} material={seed}
            scale={[r * 0.05, r * 0.05, r * 0.035]}
            position={[Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.7, fz * 0.78]} />
        )
      })}
      {/* tiny seed dots scattered across the face as texture (no disc) */}`,
    'seed ring')

// 4. Pointed tapered petals replacing the flat ellipse blobs
sub(`      {/* BIG PETAL RING — petals radiating outward from the seed disc */}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2
        return (
          <mesh key={\`petal\${i}\`} geometry={sphereGeo(1)} material={petalEdge}
            scale={[r * 0.28, r * 0.55, r * 0.05]}
            position={[Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.1, fz * 0.35]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}
      {/* inner ring of petals — slightly darker yellow, behind the outer ring */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + Math.PI / 18
        return (
          <mesh key={\`peti\${i}\`} geometry={sphereGeo(1)} material={yellow}
            scale={[r * 0.22, r * 0.42, r * 0.05]}
            position={[Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.92, fz * 0.24]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}`,
    `      {/* BIG PETAL RING — long pointed petals radiating from the seed disc */}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2
        const curl = Math.sin(i * 2.4) * 0.07
        return (
          <mesh key={\`petal\${i}\`} geometry={taperGeo(r * 0.17, r * 0.012, r * 0.78)} material={petalEdge}
            scale={[0.42, 1, 1]}
            position={[Math.cos(a) * r * 1.02, Math.sin(a) * r * 0.84, fz * 0.42]}
            rotation={[0, 0, a + Math.PI / 2 + curl]} />
        )
      })}
      {/* inner ring — shorter darker petals tucked between the outer ones */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + Math.PI / 18
        return (
          <mesh key={\`peti\${i}\`} geometry={taperGeo(r * 0.13, r * 0.01, r * 0.52)} material={yellow}
            scale={[0.4, 1, 1]}
            position={[Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.74, fz * 0.28]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}`,
    'pointed petals')

// 5. Leaf sprout on top of the bloom
sub(`      {/* small green leaf accent on the head */}`,
    `      {/* little green sprout leaves on top of the bloom */}
      {[-0.5, 0.5].map((sx) => (
        <mesh key={'spr' + sx} geometry={taperGeo(r * 0.07, r * 0.012, r * 0.4)} material={green}
          scale={[0.5, 1, 1]}
          position={[sx * r * 0.16, r * 1.22, -r * 0.12]}
          rotation={[0.25, 0, sx * 0.6 + 1.1]} />
      ))}
      {/* small green leaf accent on the head */}`,
    'leaf sprout')

// ------------------------------------------------------------ BODY UPGRADES

// 6. Green leafy arms: pass isSunflower into Arm and use the green top material
sub(`        <Arm side="L" bind={bind} P={P} skin={skin} topM={config.top === 'sarafan' ? sharedMaterial('#f7f2e7', 0.85) : topM} isSleeved={isSleeved} isDino={isDino} isAngel={isAngel} clawM={dinoBelly} isRobot={isRobot} glowM={isRobot ? robotGlowMat : glowBlue} isHacker={isHacker} isMonkey={isMonkey} monkeyDark={monkeyDark} isElephant={isElephant} />`,
    `        <Arm side="L" bind={bind} P={P} skin={skin} topM={config.top === 'sarafan' ? sharedMaterial('#f7f2e7', 0.85) : topM} isSleeved={isSleeved} isDino={isDino} isAngel={isAngel} clawM={dinoBelly} isRobot={isRobot} glowM={isRobot ? robotGlowMat : glowBlue} isHacker={isHacker} isMonkey={isMonkey} monkeyDark={monkeyDark} isElephant={isElephant} isSunflower={isSunflower} />`,
    'Arm L gets isSunflower')
sub(`        <Arm side="R" bind={bind} P={P} skin={skin} topM={config.top === 'sarafan' ? sharedMaterial('#f7f2e7', 0.85) : topM} isSleeved={isSleeved} isDino={isDino} isAngel={isAngel} clawM={dinoBelly} isRobot={isRobot} glowM={isRobot ? robotGlowMat : glowBlue} isHacker={isHacker} isMonkey={isMonkey} monkeyDark={monkeyDark} isElephant={isElephant} />`,
    `        <Arm side="R" bind={bind} P={P} skin={skin} topM={config.top === 'sarafan' ? sharedMaterial('#f7f2e7', 0.85) : topM} isSleeved={isSleeved} isDino={isDino} isAngel={isAngel} clawM={dinoBelly} isRobot={isRobot} glowM={isRobot ? robotGlowMat : glowBlue} isHacker={isHacker} isMonkey={isMonkey} monkeyDark={monkeyDark} isElephant={isElephant} isSunflower={isSunflower} />`,
    'Arm R gets isSunflower')

// 7. Arm component: accept + use isSunflower (green leafy arms)
sub(`function Arm({ side, bind, P, skin, topM, isSleeved, isDino, isAngel, clawM, isRobot, glowM, isHacker, isMonkey, monkeyDark, isElephant }: {
  side: 'L' | 'R'; bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions; skin: Mat; topM: Mat; isSleeved: boolean; isDino?: boolean; isAngel?: boolean; clawM?: Mat; isRobot?: boolean; glowM?: Mat; isHacker?: boolean; isMonkey?: boolean; monkeyDark?: Mat; isElephant?: boolean
}) {`,
    `function Arm({ side, bind, P, skin, topM, isSleeved, isDino, isAngel, clawM, isRobot, glowM, isHacker, isMonkey, monkeyDark, isElephant, isSunflower }: {
  side: 'L' | 'R'; bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions; skin: Mat; topM: Mat; isSleeved: boolean; isDino?: boolean; isAngel?: boolean; clawM?: Mat; isRobot?: boolean; glowM?: Mat; isHacker?: boolean; isMonkey?: boolean; monkeyDark?: Mat; isElephant?: boolean; isSunflower?: boolean
}) {`,
    'Arm signature')

// 8. Green arm material for sunflower (stem/leaf arms, yellow flower hands stay skin)
sub(`  const armM = isElephant ? skin : isSleeved ? topM : skin`,
    `  const armM = isSunflower ? topM : isElephant ? skin : isSleeved ? topM : skin`,
    'green arm material')

// 9. Sunflower forearm uses the green material too
sub(`            [P.elbowR * 1.08, -P.lowerArm * 0.2],
            [P.elbowR, 0],
          ])} material={isAngel ? topM : skin} castShadow />`,
    `            [P.elbowR * 1.08, -P.lowerArm * 0.2],
            [P.elbowR, 0],
          ])} material={isAngel ? topM : isSunflower ? topM : skin} castShadow />`,
    'green forearm')

// 10. Stubby round fingers for sunflower hands (flower buds)
sub(`            {isElephant ? (
            /* Elephant hand — four chubby stubby fingers in a row */`,
    `            {isElephant || isSunflower ? (
            /* Elephant/sunflower hand — four chubby stubby fingers in a row */`,
    'stubby fingers branch')

// 11. Little green leaf at the sunflower wrist
sub(`          {/* Elephant: soft lighter paw pad on the palm, like their feet */}`,
    `          {/* Sunflower: a tiny green leaf bud at the wrist */}
          {isSunflower && (
            <mesh geometry={taperGeo(P.wristR * 0.32, P.wristR * 0.01, P.wristR * 1.2)} material={topM}
              position={[0, -P.handLen * 0.05, P.wristR * 0.2]} rotation={[0.5, 0, 1.0]} />
          )}
          {/* Elephant: soft lighter paw pad on the palm, like their feet */}`,
    'wrist leaf bud')

// 12. Fix the buried waist petals — sit them on the skirt surface as petals
sub(`            {/* Small yellow petals at waist */}
            {[0, Math.PI * 0.33, Math.PI * 0.67, Math.PI, -Math.PI * 0.33, -Math.PI * 0.67].map((a, i) => (
              <mesh key={\`sp\${i}\`} geometry={sphereGeo(1)} material={sfYellow}
                scale={[P.hipBoneW * 0.1, P.hipBoneW * 0.07, P.torsoD * 0.06]}
                position={[Math.sin(a) * P.hipBoneW * 0.9, -P.upperLeg * 0.04, Math.cos(a) * P.torsoD * 0.5]} />
            ))}`,
    `            {/* Small yellow petals ringing the waist on the skirt surface */}
            {[0, Math.PI * 0.33, Math.PI * 0.67, Math.PI, -Math.PI * 0.33, -Math.PI * 0.67].map((a, i) => (
              <mesh key={\`sp\${i}\`} geometry={taperGeo(P.hipBoneW * 0.09, P.hipBoneW * 0.015, P.hipBoneW * 0.36)} material={sfYellow}
                scale={[0.4, 1, 1]}
                position={[Math.sin(a) * P.hipBoneW * 1.12, -P.upperLeg * 0.06, Math.cos(a) * P.hipBoneW * 1.12]}
                rotation={[0.35, 0, Math.cos(a) * 0.8]} />
            ))}`,
    'waist petals on skirt surface')

// 13. Scalloped leaf hem — leaf tips poking below the skirt hem
sub(`            {/* Small yellow petals at waist */}`,
    `            {/* Scalloped leaf hem — leaf tips peeking below the skirt edge */}
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2 + Math.PI / 14
              return (
                <mesh key={'hl' + i} geometry={sphereGeo(1)} material={sfGreen}
                  scale={[P.hipBoneW * 0.17, P.hipBoneW * 0.34, P.hipBoneW * 0.13]}
                  position={[Math.sin(a) * P.hipBoneW * 1.3, -P.upperLeg * 0.95, Math.cos(a) * P.hipBoneW * 1.3]} />
              )
            })}
            {/* Small yellow petals at waist */}`,
    'scalloped leaf hem')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
