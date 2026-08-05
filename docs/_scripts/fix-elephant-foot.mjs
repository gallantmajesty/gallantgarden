// Fix the elephant foot: toes were buried inside the pad sphere (toe z=2.5 < pad front 3.1).
// Push them forward past the pad edge, make them chunky with seams, keep ivory nails.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let file = readFileSync(FILE, 'utf8')

const startMark = '{/* Elephant: chunky columnar foot pads with 5 ivory toenails and dark sole cushion */}'
const endMark = '          {showShoes && !isHacker && !isSunflower && !isGrim && !isElephant && (() => {'

const start = file.indexOf(startMark)
const end = file.indexOf(endMark)
if (start === -1 || end === -1 || end <= start) {
  console.error('MARKERS NOT FOUND', { start, end })
  process.exit(1)
}

const newBlock = `          {/* Elephant: chunky clay-style foot with 5 big rounded toes clearly poking out */}
          {isElephant && (
            <group>
              {/* Main foot pad — wide, rounded elephant pad */}
              <mesh geometry={sphereGeo(1)} material={botM}
                scale={[P.ankleR * 2.9, P.ankleR * 1.05, P.ankleR * 2.3]}
                position={[0, -P.ankleR * 0.25, P.ankleR * 0.2]} castShadow />
              {/* Heel cushion — pokes out the back of the pad */}
              <mesh geometry={sphereGeo(1)} material={botM}
                scale={[P.ankleR * 1.4, P.ankleR * 0.6, P.ankleR * 1.0]}
                position={[0, -P.ankleR * 0.35, -P.ankleR * 2.0]} castShadow />
              {/* Dark sole cushion underneath — pokes out the pad bottom */}
              <mesh geometry={sphereGeo(1)} material={shoeM}
                scale={[P.ankleR * 2.7, P.ankleR * 0.32, P.ankleR * 2.2]}
                position={[0, -P.ankleR * 1.2, P.ankleR * 0.1]} castShadow />
              {/* 5 chunky round bulbous toes poking well out the front of the pad */}
              {[-P.ankleR * 1.2, -P.ankleR * 0.6, 0, P.ankleR * 0.6, P.ankleR * 1.2].map((tx, i) => (
                <group key={'toe' + i} position={[tx, -P.ankleR * 0.6, P.ankleR * 3.4]}>
                  <mesh geometry={sphereGeo(1)} material={botM}
                    scale={[P.ankleR * 0.5, P.ankleR * 0.44, P.ankleR * 0.48]} castShadow />
                  {/* soft ivory nail capping each toe */}
                  <mesh geometry={sphereGeo(1)} material={shoeAccent}
                    scale={[P.ankleR * 0.18, P.ankleR * 0.13, P.ankleR * 0.17]}
                    position={[0, P.ankleR * 0.32, P.ankleR * 0.36]} />
                </group>
              ))}
              {/* dark seam lines between the toes — simple toe-line look */}
              {[-P.ankleR * 0.9, 0, P.ankleR * 0.9].map((tx, i) => (
                <mesh key={'tl' + i} geometry={boxGeo(P.ankleR * 0.05, P.ankleR * 0.28, P.ankleR * 0.26)} material={shoeM}
                  position={[tx, -P.ankleR * 0.62, P.ankleR * 3.4]} />
              ))}
            </group>
          )}
`

file = file.slice(0, start) + newBlock + file.slice(end)
writeFileSync(FILE, file)
console.log('Elephant foot patched OK. New length:', file.length)
