// Fix monkey hip/bum intersection: widen hip attach + slim thighs so the two
// legs stop overlapping each other and the torso at the crotch.
import { readFileSync, writeFileSync } from 'fs'

const path = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let src = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')

let count = 0

// 1) Hip attach: monkey gets wider stance (0.8 instead of 0.7)
const OLD_ATTACH = `<group ref={bind(upper)} position={[sign * P.hipW * (isElephant ? 0.95 : 0.7), -0.02, 0]}>`
const NEW_ATTACH = `<group ref={bind(upper)} position={[sign * P.hipW * (isElephant ? 0.95 : isMonkey ? 0.8 : 0.7), -0.02, 0]}>`
if (src.includes(OLD_ATTACH)) { src = src.replace(OLD_ATTACH, NEW_ATTACH); count++ } else console.log('MISS: attach')

// 2) Slim monkey thighs: multiply the thighR profile points by 0.8 (monkey),
//    keeping kneeR points untouched so the knee/shin stay proportional.
const OLD_THIGH = `<mesh geometry={latheGeo([
             [P.kneeR * eM, -P.upperLeg],
             [P.kneeR * 1.05 * eM, -P.upperLeg * 0.88],
             [P.thighR * 1.0 * eM, -P.upperLeg * 0.6],
             [P.thighR * 1.12 * eM, -P.upperLeg * 0.35],
             [P.thighR * 1.18 * eM, -P.upperLeg * 0.15],
             [P.thighR * 1.15 * eM, 0],
           ])} material={isRobot ? robotDark : legMat} castShadow />`
const NEW_THIGH = `<mesh geometry={latheGeo([
             [P.kneeR * eM, -P.upperLeg],
             [P.kneeR * 1.05 * eM, -P.upperLeg * 0.88],
             [P.thighR * 1.0 * eM * (isMonkey ? 0.8 : 1), -P.upperLeg * 0.6],
             [P.thighR * 1.12 * eM * (isMonkey ? 0.8 : 1), -P.upperLeg * 0.35],
             [P.thighR * 1.18 * eM * (isMonkey ? 0.8 : 1), -P.upperLeg * 0.15],
             [P.thighR * 1.15 * eM * (isMonkey ? 0.8 : 1), 0],
           ])} material={isRobot ? robotDark : legMat} castShadow />`
if (src.includes(OLD_THIGH)) { src = src.replace(OLD_THIGH, NEW_THIGH); count++ } else console.log('MISS: thigh')

writeFileSync(path, src)
console.log(`applied ${count}/2`)
