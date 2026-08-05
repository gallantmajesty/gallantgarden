import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')

const needle = `              {[-P.ankleR * 0.34, -P.ankleR * 0.11, P.ankleR * 0.11, P.ankleR * 0.34].map((tx, i) => (
                <mesh key={\`rt\${i}\`} geometry={sphereGeo(1)} material={sfBrown}
                  scale={[P.ankleR * 0.17, P.ankleR * 0.15, P.ankleR * 0.24]}
                  position={[tx, -P.ankleR * 0.6, P.footLen * 0.62]} />
              ))}`

const repl = `              {[-P.ankleR * 0.34, -P.ankleR * 0.11, P.ankleR * 0.11, P.ankleR * 0.34].map((tx, i) => (
                <mesh key={\`rt\${i}\`} geometry={sphereGeo(1)} material={sfBrown}
                  scale={[P.ankleR * 0.17, P.ankleR * 0.15, P.ankleR * 0.24]}
                  position={[tx, -P.ankleR * 0.6, P.footLen * 1.25]} />
              ))}`

if (s.includes(needle)) {
  s = s.replace(needle, repl)
  fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
  console.log('ok: toes at bulb front')
} else {
  console.log('MISS')
}
