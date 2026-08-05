// Sunflower skirt improvement:
//  - vertical pleat-shadow lines down the mid-skirt (read as pleats/folds)
//  - a thin gold band mid-skirt for structure
//  - a little green leaf bow at the waist front
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
let applied = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) { console.log('MISS: ' + label); return }
  s = s.replace(needle, repl); applied++; console.log('ok: ' + label)
}

// 1. Green leaf bow at the waist front (right after the belt)
sub(`            {/* Brown belt at the waist */}
            <mesh geometry={torusGeo(P.waistW * 0.88, P.hipBoneW * 0.045, 8, 24)} material={sfBrown}
              position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
    `            {/* Brown belt at the waist */}
            <mesh geometry={torusGeo(P.waistW * 0.88, P.hipBoneW * 0.045, 8, 24)} material={sfBrown}
              position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />
            {/* little green leaf bow at the waist front */}
            <group position={[0, -P.upperLeg * 0.02, P.hipBoneW * 1.2]}>
              {[-1, 1].map((sx) => (
                <mesh key={'bw' + sx} geometry={taperGeo(P.hipBoneW * 0.05, P.hipBoneW * 0.015, P.hipBoneW * 0.3)} material={sfGreen}
                  scale={[0.4, 1, 1]}
                  position={[sx * P.hipBoneW * 0.13, 0, 0]}
                  rotation={[0, 0, sx * 0.55 + 0.45]} />
              ))}
              <mesh geometry={sphereGeo(1)} material={sfGreen} scale={[P.hipBoneW * 0.08, P.hipBoneW * 0.08, P.hipBoneW * 0.06]} />
            </group>`,
    'leaf bow')

// 2. Pleat shadows + mid-skirt gold band (before the scalloped leaf hem)
sub(`            {/* Scalloped leaf hem — leaf tips peeking below the skirt edge */}`,
    `            {/* vertical pleat shadows — fold lines down the mid-skirt */}
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2 + 0.12
              return (
                <mesh key={'pl' + i} geometry={taperGeo(P.hipBoneW * 0.016, P.hipBoneW * 0.008, P.hipBoneW * 0.34)} material={sfYellowDark}
                  scale={[0.3, 1, 1]}
                  position={[Math.sin(a) * P.hipBoneW * 1.33, -P.upperLeg * 0.42, Math.cos(a) * P.hipBoneW * 1.33]} />
              )
            })}
            {/* thin gold band mid-skirt */}
            <mesh geometry={torusGeo(P.hipBoneW * 1.37, P.hipBoneW * 0.038, 8, 24)} material={sfYellowDark}
              position={[0, -P.upperLeg * 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} />
            {/* Scalloped leaf hem — leaf tips peeking below the skirt edge */}`,
    'pleats + gold band')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
