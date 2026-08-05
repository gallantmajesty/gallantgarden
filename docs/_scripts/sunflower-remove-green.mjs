// Remove the remaining green hanging elements from the sunflower dress:
//  - the green leaf bow at the waist front
//  - the green scalloped leaf tips fringing the hem
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
let applied = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) { console.log('MISS: ' + label); return }
  s = s.replace(needle, repl); applied++; console.log('ok: ' + label)
}

// 1. Green leaf bow at the waist front
sub(`            {/* little green leaf bow at the waist front */}
            <group position={[0, -P.upperLeg * 0.02, P.hipBoneW * 1.2]}>
              {[-1, 1].map((sx) => (
                <mesh key={'bw' + sx} geometry={taperGeo(P.hipBoneW * 0.05, P.hipBoneW * 0.015, P.hipBoneW * 0.3)} material={sfGreen}
                  scale={[0.4, 1, 1]}
                  position={[sx * P.hipBoneW * 0.13, 0, 0]}
                  rotation={[0, 0, sx * 0.55 + 0.45]} />
              ))}
              <mesh geometry={sphereGeo(1)} material={sfGreen} scale={[P.hipBoneW * 0.08, P.hipBoneW * 0.08, P.hipBoneW * 0.06]} />
            </group>
`,
    ``,
    'leaf bow removed')

// 2. Green scalloped leaf tips fringing the hem
sub(`            {/* Scalloped leaf hem — leaf tips peeking below the skirt edge */}
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2 + Math.PI / 14
              return (
                <mesh key={'hl' + i} geometry={sphereGeo(1)} material={sfGreen}
                  scale={[P.hipBoneW * 0.17, P.hipBoneW * 0.34, P.hipBoneW * 0.13]}
                  position={[Math.sin(a) * P.hipBoneW * 1.45, -P.upperLeg * 1.0, Math.cos(a) * P.hipBoneW * 1.45]} />
              )
            })}
`,
    ``,
    'green hem removed')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
