// The skirt flare still started below the thigh's widest point (top of thigh
// maps to lathe y≈-0.04, where the old profile only reached ~0.177 vs the
// 0.185 outer edge). Raise the flare to -0.04 at 1.6×hipBoneW and widen the
// hem, matching the hem bands. CRLF-aware.
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

rep(
  `                <mesh geometry={latheGeo([
                  [P.waistW * 1.36, 0.06],
                  [P.hipBoneW * 1.55, -0.08],
                  [P.hipBoneW * 1.68, -0.2],
                  [P.hipBoneW * 1.82, -0.35],
                ])} castShadow>`,
  `                <mesh geometry={latheGeo([
                  [P.waistW * 1.36, 0.06],
                  [P.hipBoneW * 1.6, -0.04],
                  [P.hipBoneW * 1.72, -0.18],
                  [P.hipBoneW * 1.85, -0.35],
                ])} castShadow>`,
  'flare covers widest thigh point'
)

rep(
  `                <mesh geometry={torusGeo(P.hipBoneW * 1.78, P.hipBoneW * 0.07, 8, 28)} material={elGlowGold}
                  position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={torusGeo(P.hipBoneW * 1.6, P.hipBoneW * 0.045, 8, 24)} material={elTrim}
                  position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
  `                <mesh geometry={torusGeo(P.hipBoneW * 1.81, P.hipBoneW * 0.07, 8, 28)} material={elGlowGold}
                  position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={torusGeo(P.hipBoneW * 1.63, P.hipBoneW * 0.045, 8, 24)} material={elTrim}
                  position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
  'hem bands match wider hem'
)

writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log('Skirt flare fixed')
