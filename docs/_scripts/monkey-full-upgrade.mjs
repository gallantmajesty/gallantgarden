import { readFileSync, writeFileSync } from 'fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const raw = readFileSync(FILE, 'utf8')
const crlf = raw.includes('\r\n')
let src = raw.replace(/\r\n/g, '\n')

let applied = 0
function replace(oldStr, newStr, label) {
  if (!src.includes(oldStr)) {
    console.error(`MISS: ${label}`)
    return
  }
  src = src.split(oldStr).join(newStr)
  applied++
  console.log(`ok: ${label}`)
}

// ============ 1. BODY: explorer vest + gold belt + red bandana ============
replace(
  `            {/* tan belly patch */}
            <mesh geometry={sphereGeo(1)} material={monkeyBelly} scale={[P.chestW * 0.55, P.chestLen * 0.38, P.torsoD * 0.22]} position={[0, P.spineLen + P.chestLen * 0.15, P.torsoD * 0.86]} />
            {/* long curling tail — a smooth tapered tube sweeping down into a curl */}`,
  `            {/* tan belly patch */}
            <mesh geometry={sphereGeo(1)} material={monkeyBelly} scale={[P.chestW * 0.55, P.chestLen * 0.38, P.torsoD * 0.22]} position={[0, P.spineLen + P.chestLen * 0.15, P.torsoD * 0.86]} />

            {/* Explorer vest — tan panels with gold trim + buttons over the fur */}
            <mesh geometry={boxGeo(P.chestW * 0.4, P.chestLen * 0.72, P.torsoD * 0.06)}
              material={sharedMaterial('#c9a06b', 0.8)}
              position={[-P.chestW * 0.26, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.05]} />
            <mesh geometry={boxGeo(P.chestW * 0.4, P.chestLen * 0.72, P.torsoD * 0.06)}
              material={sharedMaterial('#c9a06b', 0.8)}
              position={[P.chestW * 0.26, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.05]} />
            {/* gold trim down the vest opening */}
            <mesh geometry={boxGeo(P.chestW * 0.018, P.chestLen * 0.72, P.torsoD * 0.09)}
              material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.07]} />
            {/* gold buttons down the front */}
            {[0.55, 0.75, 0.95].map((t, i) => (
              <mesh key={'vb' + i} geometry={sphereGeo(1)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
                scale={[P.neckR * 0.16, P.neckR * 0.16, P.neckR * 0.08]}
                position={[0, P.spineLen + P.chestLen * t, P.torsoD * 1.12]} />
            ))}
            {/* gold belt with buckle at the waist */}
            <mesh geometry={torusGeo(P.waistW * 1.18, P.hipBoneW * 0.045, 8, 20)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={boxGeo(P.waistW * 0.22, P.waistW * 0.16, P.torsoD * 0.045)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen * 0.55, P.torsoD * 1.35]} />

            {/* red explorer bandana around the neck */}
            <mesh geometry={torusGeo(P.neckR * 1.7, P.neckR * 0.32, 8, 20)} material={sharedMaterial('#d8433f', 0.75)}
              position={[0, P.spineLen + P.chestLen * 1.0, P.torsoD * 1.5]} rotation={[Math.PI / 2, 0, 0]} />
            {/* knot at the front */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#b83330', 0.75)}
              scale={[P.neckR * 0.5, P.neckR * 0.45, P.neckR * 0.4]}
              position={[0, P.spineLen + P.chestLen * 0.82, P.torsoD * 1.85]} />
            {/* two tails hanging down */}
            {[-1, 1].map((sx) => (
              <mesh key={'bt' + sx} geometry={taperGeo(P.neckR * 0.16, P.neckR * 0.06, P.chestLen * 0.9)}
                material={sharedMaterial('#d8433f', 0.75)}
                position={[sx * P.neckR * 0.28, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.7]}
                rotation={[0.2, 0, sx * 0.25]} />
            ))}

            {/* long curling tail — a smooth tapered tube sweeping down into a curl */}`,
  'explorer vest + belt + bandana'
)

// ============ 2. HEAD: darker fur crown cap + sideburns ============
replace(
  `      {/* round furry head — slightly wider than tall for a cute monkey face */}
      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.12, r * 1.1, r * 1.0]} castShadow />`,
  `      {/* round furry head — slightly wider than tall for a cute monkey face */}
      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.12, r * 1.1, r * 1.0]} castShadow />
      {/* darker fur crown cap — richer shading on the top-back of the head */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.7)} scale={[r * 0.95, r * 0.45, r * 0.85]} position={[0, r * 0.68, -r * 0.15]} />
      {/* darker fur sideburns framing the tan face */}
      {[-1, 1].map((sx) => (
        <mesh key={'sd' + sx} geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.7)}
          scale={[r * 0.3, r * 0.42, r * 0.26]} position={[sx * r * 0.85, -r * 0.12, r * 0.25]} />
      ))}`,
  'head fur contrast'
)

// ============ 3. HAND: five long curved monkey fingers + palm pad ============
replace(
  `          ) : (
            [-P.wristR * 0.55, -P.wristR * 0.18, P.wristR * 0.18, P.wristR * 0.5].map((fx, i) => (`,
  `          ) : isMonkey ? (
            /* Monkey hand — five long curved fingers with knuckles + a lighter palm pad */
            <>
              {[-P.wristR * 0.55, -P.wristR * 0.28, 0, P.wristR * 0.28, P.wristR * 0.55].map((fx, i) => (
                <group key={'mkf' + i} position={[fx, -P.handLen * 0.42, P.wristR * 0.05]} rotation={[0.3, 0, (i - 2) * 0.08]}>
                  {/* knuckle */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.11, P.wristR * 0.12, P.wristR * 0.11]} position={[0, -P.handLen * 0.03, 0]} />
                  {/* long finger */}
                  <mesh geometry={taperGeo(P.wristR * 0.09, P.wristR * 0.05, P.handLen * 0.3)} material={gloveM} position={[0, -P.handLen * 0.17, 0]} />
                  {/* rounded fingertip */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.07, P.wristR * 0.08, P.wristR * 0.08]} position={[0, -P.handLen * 0.32, 0]} />
                </group>
              ))}
              {/* lighter palm pad */}
              <mesh geometry={sphereGeo(1)} material={sharedMaterial('#e8c9a2', 0.7)}
                scale={[P.wristR * 0.5, P.wristR * 0.45, P.wristR * 0.3]} position={[0, -P.handLen * 0.24, P.wristR * 0.5]} />
            </>
          ) : (
            [-P.wristR * 0.55, -P.wristR * 0.18, P.wristR * 0.18, P.wristR * 0.5].map((fx, i) => (`,
  'monkey hands'
)

// ============ 4. FOOT: visible round toes + tan pads ============
replace(
  `          {/* Monkey: darker brown feet like a real monkey's dark hands/feet */}
          {isMonkey && (
            <group>
              <mesh geometry={sphereGeo(1)} material={monkeyDark}
                scale={[P.ankleR * 1.15, P.ankleR * 0.9, P.footLen * 0.7]}
                position={[0, -P.ankleR * 0.4, P.footLen * 0.25]} castShadow />
              {/* toe bumps */}
              {[-P.ankleR * 0.2, -P.ankleR * 0.07, P.ankleR * 0.07, P.ankleR * 0.2].map((tx, i) => (
                <mesh key={\`mt\${i}\`} geometry={sphereGeo(1)} material={monkeyDark}
                  scale={[P.ankleR * 0.12, P.ankleR * 0.1, P.footLen * 0.12]}
                  position={[tx, -P.ankleR * 0.55, P.footLen * 0.55]} />
              ))}
            </group>
          )}`,
  `          {/* Monkey: dark feet with visible round toes + tan pads */}
          {isMonkey && (
            <group>
              {/* foot bulb */}
              <mesh geometry={sphereGeo(1)} material={monkeyDark}
                scale={[P.ankleR * 1.2, P.ankleR * 0.95, P.footLen * 0.75]}
                position={[0, -P.ankleR * 0.4, P.footLen * 0.3]} castShadow />
              {/* tan heel pad */}
              <mesh geometry={sphereGeo(1)} material={sharedMaterial('#e8c9a2', 0.7)}
                scale={[P.ankleR * 0.75, P.ankleR * 0.3, P.footLen * 0.1]}
                position={[0, -P.ankleR * 0.62, P.footLen * 0.32]} />
              {/* visible round toes poking out the front */}
              {[-P.ankleR * 0.3, -P.ankleR * 0.1, P.ankleR * 0.1, P.ankleR * 0.3].map((tx, i) => (
                <mesh key={\`mt\${i}\`} geometry={sphereGeo(1)} material={monkeyDark}
                  scale={[P.ankleR * 0.14, P.ankleR * 0.16, P.ankleR * 0.14]}
                  position={[tx, -P.ankleR * 0.52, P.footLen * 0.68]} />
              ))}
            </group>
          )}`,
  'monkey feet'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/4 patches applied`)
