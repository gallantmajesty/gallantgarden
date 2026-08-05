// Undo the fantasy pass on the elephant: remove crown, cape, fur ruff, blue
// runes, star arms, belt charms, armored pauldrons, and unused materials.
// Then improve the elephant arms (shoulder dome, elbow blend, gentler wrist,
// rounder curled fingers, symmetric thumb bump).
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')

let applied = 0
const N = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) {
    console.log('MISS: ' + label)
    return
  }
  s = s.replace(needle, repl)
  applied++
  console.log('ok: ' + label)
}

// ---------------------------------------------------------------- FANTASY UNDO

// 1. Crown on the head
sub(`                    {/* Golden royal crown */}
                    <group position={[0, P.headR * 2.14, 0]}>
                      {/* crown band */}
                      <mesh geometry={torusGeo(P.headR * 0.58, P.headR * 0.06, 8, 26)} material={elTrim}
                        position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
                      {/* crown points */}
                      {[0, 1, 2, 3, 4].map((i) => {
                        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
                        return (
                          <group key={'cr' + i} position={[Math.sin(a) * P.headR * 0.52, P.headR * 0.08, Math.cos(a) * P.headR * 0.52]}>
                            <mesh geometry={taperGeo(P.headR * 0.07, P.headR * 0.015, P.headR * 0.32)} material={elTrim}
                              position={[0, P.headR * 0.16, 0]} />
                          </group>
                        )
                      })}
                      {/* glowing gem on the crown */}
                      <mesh geometry={sphereGeo(1)} material={elGemRed} scale={[P.headR * 0.12, P.headR * 0.12, P.headR * 0.12]}
                        position={[0, P.headR * 0.22, 0]} />
                    </group>
`, ``, 'crown removed')

// 2. Ivory fur trim around the collar
sub(`              {/* Ivory fur trim — fluffy ring around the collar */}
              {Array.from({ length: 14 }).map((_, i) => {
                const a = (i / 14) * Math.PI * 2
                return (
                  <mesh key={'fur' + i} geometry={sphereGeo(1)} material={elFur}
                    scale={[P.neckR * 0.85, P.neckR * 0.55, P.neckR * 0.7]}
                    position={[Math.sin(a) * P.neckR * 2.7, 0.31, Math.cos(a) * P.neckR * 2.7]} />
                )
              })}
`, ``, 'fur ruff removed')

// 3. Blue rune dots + star arms around the medallion (keep the gold medallion)
sub(`              {/* Radiant arcane chest emblem — gold medallion + glowing rune ring */}
              <group position={[0, 0.2, P.torsoD * 1.6]}>
                <mesh geometry={torusGeo(P.waistW * 0.17, P.waistW * 0.045, 8, 24)} material={elTrim} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.1, P.waistW * 0.1, P.waistW * 0.02]} />
                {/* 8 glowing rune dots around the medallion */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2
                  return (
                    <mesh key={'em' + i} geometry={sphereGeo(1)} material={elGlowBlue}
                      scale={[P.waistW * 0.045, P.waistW * 0.045, P.waistW * 0.02]}
                      position={[Math.sin(a) * P.waistW * 0.24, Math.cos(a) * P.waistW * 0.24, 0]} />
                  )
                })}
                {/* star arms on the medallion — long enough to reach past the ring */}
                {[-1, 1].map((sx) => (
                  <mesh key={'st' + sx} geometry={taperGeo(P.waistW * 0.035, P.waistW * 0.005, P.waistW * 0.5)} material={elTrim}
                    position={[0, 0, 0]} rotation={[0, 0, sx * 0.785]} />
                ))}
              </group>
`, `              {/* Gold chest medallion — radiant centrepiece of the robe */}
              <group position={[0, 0.2, P.torsoD * 1.6]}>
                <mesh geometry={torusGeo(P.waistW * 0.17, P.waistW * 0.045, 8, 24)} material={elTrim} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.1, P.waistW * 0.1, P.waistW * 0.02]} />
              </group>
`, 'medallion runes + star arms removed')

// 4. Armored pauldrons -> simple gold epaulettes
sub(`              {/* Golden armored pauldrons — layered shoulder plates */}
              {[-1, 1].map((sx) => (
                <group key={'ep' + sx} position={[sx * P.chestW * 1.14, 0.32, 0]} rotation={[0, 0, sx * -0.25]}>
                  <mesh geometry={sphereGeo(1)} material={elTrim} scale={[P.waistW * 0.2, P.waistW * 0.08, P.waistW * 0.18]} />
                  <mesh geometry={torusGeo(P.waistW * 0.19, P.waistW * 0.025, 8, 20)} material={elTrim} rotation={[Math.PI / 2, 0, 0]} />
                  <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.05, P.waistW * 0.05, P.waistW * 0.03]}
                    position={[0, P.waistW * 0.03, P.waistW * 0.17]} />
                </group>
              ))}
`, `              {/* Gold epaulettes on the shoulders */}
              {[-1, 1].map((sx) => (
                <mesh key={'ep' + sx} geometry={sphereGeo(1)} material={elTrim}
                  scale={[P.waistW * 0.26, P.waistW * 0.1, P.waistW * 0.22]}
                  position={[sx * P.chestW * 1.14, 0.32, 0]} />
              ))}
`, 'pauldrons simplified to epaulettes')

// 5. Jeweled belt charms
sub(`              {/* jeweled belt charms — tiny gems hanging in front of the skirt */}
              {[-1, 0, 1].map((cx, i) => (
                <mesh key={'ch' + i} geometry={sphereGeo(1)} material={i === 1 ? elGemRed : elGlowBlue}
                  scale={[P.waistW * 0.05, P.waistW * 0.07, P.waistW * 0.04]}
                  position={[cx * P.waistW * 0.18, -0.02, P.torsoD * 2.0]} />
              ))}
`, ``, 'belt charms removed')

// 6. Glowing hem runes
sub(`                {/* glowing arcane runes around the hem */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2
                  return (
                    <mesh key={'hr' + i} geometry={sphereGeo(1)} material={elGlowBlue}
                      scale={[P.hipBoneW * 0.05, P.hipBoneW * 0.05, P.hipBoneW * 0.02]}
                      position={[Math.sin(a) * P.hipBoneW * 1.86, -0.32, Math.cos(a) * P.hipBoneW * 1.86]} />
                  )
                })}
`, ``, 'hem runes removed')

// 7. Royal cape
sub(`              {/* Royal cape — deep purple flowing behind the shoulders */}
              <group position={[0, 0.26, -P.torsoD * 1.9]} rotation={[0.08, 0, 0]}>
                <mesh geometry={latheGeo([
                  [P.neckR * 2.6, 0.0],
                  [P.hipBoneW * 1.5, -0.12],
                  [P.hipBoneW * 1.75, -0.3],
                  [P.hipBoneW * 1.85, -0.42],
                ])} material={elCape} scale={[0.8, 1, 0.55]} castShadow />
                {/* gold trim at the cape hem */}
                <mesh geometry={torusGeo(P.hipBoneW * 1.75, P.hipBoneW * 0.05, 8, 26)} material={elTrim}
                  position={[0, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.8, 1, 0.35]} />
                {/* glowing clasp at the cape top, on the back */}
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.09, P.waistW * 0.09, P.waistW * 0.09]}
                  position={[0, 0.02, -P.neckR * 1.55]} />
              </group>
`, ``, 'cape removed')

// 8. Restore the tail to its natural position (was pushed back for the cape)
sub(`            <group position={[0, -P.spineLen * 0.18, -P.torsoD * 1.8]} rotation={[0.42, 0, 0]}>`,
    `            <group position={[0, -P.spineLen * 0.18, -P.torsoD * 1.55]} rotation={[0.42, 0, 0]}>`,
    'tail restored')

// 9. Unused fantasy materials
sub(`  const elCape = sharedMaterial('#4a2f7d', 0.62)
  const elFur = sharedMaterial('#f7f3ea', 0.85)
  const elGemRed = glowMaterial('#ff5a7a', 1.0)
  const elGlowBlue = glowMaterial('#7dd8ff', 1.0)
`, ``, 'fantasy materials removed')

// ---------------------------------------------------------------- ARM UPGRADE

// 10. Gentler exposed wrist (was pinched 0.95 -> 0.7, now a soft neck)
sub(`          <mesh geometry={taperGeo(P.wristR * 0.95, P.wristR * 0.7, P.wristR * 1.5)} material={gloveM} position={[0, P.wristR * 0.55, 0]} castShadow />`,
    `          <mesh geometry={taperGeo(P.wristR * 1.12, P.wristR * 0.92, P.wristR * 1.35)} material={gloveM} position={[0, P.wristR * 0.55, 0]} castShadow />`,
    'gentler wrist cuff')

// 11. Symmetric thumb bump (was +x on both arms)
sub(`          <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * (isElephant ? 0.4 : 0.26), P.wristR * (isElephant ? 0.4 : 0.26), P.wristR * (isElephant ? 0.4 : 0.26)]} position={[P.wristR * (isElephant ? 1.2 : 0.88), -P.handLen * 0.12, P.wristR * (isElephant ? 0.35 : 0.26)]} />`,
    `          <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * (isElephant ? 0.45 : 0.26), P.wristR * (isElephant ? 0.45 : 0.26), P.wristR * (isElephant ? 0.45 : 0.26)]} position={[sign * P.wristR * (isElephant ? 1.25 : 0.88), -P.handLen * 0.12, P.wristR * (isElephant ? 0.35 : 0.26)]} />`,
    'symmetric thumb bump')

// 12. Rounder, curled, fanned fingers
sub(`              {[-P.wristR * 0.68, -P.wristR * 0.23, P.wristR * 0.23, P.wristR * 0.68].map((fx, i) => (
                <group key={'pf' + i} position={[fx, -P.handLen * 0.36, P.wristR * (0.1 + i * 0.06)]} rotation={[0, -0.12 + i * 0.08, 0]}>
                  {/* chunky finger base */}
                  <mesh geometry={taperGeo(P.wristR * 0.32, P.wristR * 0.22, P.handLen * 0.28)} material={gloveM} position={[0, -P.handLen * 0.1, 0]} castShadow />
                  {/* rounded fingertip */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.26, P.wristR * 0.24, P.wristR * 0.26]} position={[0, -P.handLen * 0.3, 0]} />
                </group>
              ))}`,
    `              {[-P.wristR * 0.72, -P.wristR * 0.24, P.wristR * 0.24, P.wristR * 0.72].map((fx, i) => (
                <group key={'pf' + i} position={[fx, -P.handLen * 0.34, P.wristR * (0.08 + i * 0.07)]} rotation={[0, -0.14 + i * 0.09, (i - 1.5) * -0.06]}>
                  {/* chunky finger base */}
                  <mesh geometry={taperGeo(P.wristR * 0.36, P.wristR * 0.25, P.handLen * 0.26)} material={gloveM} position={[0, -P.handLen * 0.08, 0]} castShadow />
                  {/* rounded fingertip — bigger, gently curled forward */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.3, P.wristR * 0.28, P.wristR * 0.32]} position={[0, -P.handLen * 0.27, P.wristR * 0.12]} />
                </group>
              ))}`,
    'rounder curled fingers')

// 13. Rounded shoulder dome under the puff sleeve
sub(`          {/* Bare grey upper-arm below the sleeve — clean column */}`,
    `          {/* Rounded shoulder dome — blends the puff sleeve cap into the torso */}
          <mesh geometry={sphereGeo(1)} material={topM} scale={[eArmTopR * 1.25, eArmTopR * 1.0, eArmTopR * 1.25]}
            position={[0, P.upperArm * 0.04 * eArmY, 0]} />
          {/* Bare grey upper-arm below the sleeve — clean column */}`,
    'shoulder dome added')

// 14. Soft elbow joint at the upper-arm/forearm junction
sub(`        {/* Hand — pushed slightly forward (+Z) off the sleeve's centre line and`, 
    `        {/* Soft elbow joint — rounds the upper-arm/forearm junction */}
        {isElephant && (
          <mesh geometry={sphereGeo(1)} material={skin} scale={[eArmElbowR * 1.4, eArmElbowR * 1.15, eArmElbowR * 1.4]}
            position={[0, -P.lowerArm * 0.03 * eArmY, 0]} />
        )}

        {/* Hand — pushed slightly forward (+Z) off the sleeve's centre line and`,
    'elbow joint added')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
