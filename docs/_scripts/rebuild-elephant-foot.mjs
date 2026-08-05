// Rebuild the elephant foot: single smooth rounded pad with subtle toe ridges
// barely proud of the front face (previous toes poked 1.4 units forward = knobs).
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let file = readFileSync(FILE, 'utf8')

const startMark = '{/* Elephant: chunky clay-style foot with 5 big rounded toes clearly poking out */}'
const endMark = '          {showShoes && !isHacker && !isSunflower && !isGrim && !isElephant && (() => {'

const start = file.indexOf(startMark)
const end = file.indexOf(endMark)
if (start === -1 || end === -1 || end <= start) {
  console.error('MARKERS NOT FOUND', { start, end })
  process.exit(1)
}

const newBlock = `          {/* Elephant: clean rounded foot with soft toe ridges + ivory nails */}
          {isElephant && (
            <group>
              {/* Foot pad — one smooth rounded block */}
              <mesh geometry={sphereGeo(1)} material={botM}
                scale={[P.ankleR * 2.5, P.ankleR * 0.95, P.ankleR * 2.1]}
                position={[0, -P.ankleR * 0.3, P.ankleR * 0.25]} castShadow />
              {/* Heel — gentle rounded back */}
              <mesh geometry={sphereGeo(1)} material={botM}
                scale={[P.ankleR * 1.3, P.ankleR * 0.7, P.ankleR * 0.9]}
                position={[0, -P.ankleR * 0.4, -P.ankleR * 1.9]} castShadow />
              {/* Dark sole cushion — flat bottom pad */}
              <mesh geometry={sphereGeo(1)} material={shoeM}
                scale={[P.ankleR * 2.4, P.ankleR * 0.28, P.ankleR * 2.0]}
                position={[0, -P.ankleR * 1.1, P.ankleR * 0.2]} castShadow />
              {/* 5 rounded toe ridges on the front face — barely proud of the pad */}
              {[-P.ankleR * 1.0, -P.ankleR * 0.5, 0, P.ankleR * 0.5, P.ankleR * 1.0].map((tx, i) => (
                <group key={'toe' + i} position={[tx, -P.ankleR * 0.35, P.ankleR * 2.15]}>
                  <mesh geometry={sphereGeo(1)} material={botM}
                    scale={[P.ankleR * 0.46, P.ankleR * 0.38, P.ankleR * 0.4]} castShadow />
                  {/* ivory nail capping the top of each toe */}
                  <mesh geometry={sphereGeo(1)} material={shoeAccent}
                    scale={[P.ankleR * 0.2, P.ankleR * 0.12, P.ankleR * 0.18]}
                    position={[0, P.ankleR * 0.34, P.ankleR * 0.3]} />
                </group>
              ))}
              {/* dark crease lines between toes for separation */}
              {[-P.ankleR * 0.75, 0, P.ankleR * 0.75].map((tx, i) => (
                <mesh key={'tl' + i} geometry={boxGeo(P.ankleR * 0.06, P.ankleR * 0.3, P.ankleR * 0.3)} material={shoeM}
                  position={[tx, -P.ankleR * 0.35, P.ankleR * 2.3]} />
              ))}
            </group>
          )}
`

file = file.slice(0, start) + newBlock + file.slice(end)
writeFileSync(FILE, file)
console.log('Elephant foot rebuilt OK. New length:', file.length)
