// Sunflower dress + feet pass:
//  - Dress: golden petal ruffle layered under the hem
//  - Feet: rounded root toes, side tendrils, leafy ankle cuff
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
let applied = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) { console.log('MISS: ' + label); return }
  s = s.replace(needle, repl); applied++; console.log('ok: ' + label)
}

// 1. Golden petal ruffle layered under the dress hem
sub(`            {/* green leaf fronds standing out from the skirt */}
            {[-1, 1].map((lx) => (
              <mesh key={'lf' + lx} geometry={taperGeo(P.hipBoneW * 0.07, P.hipBoneW * 0.014, P.hipBoneW * 0.55)} material={sfGreen}
                scale={[0.4, 1, 1]}
                position={[lx * P.hipBoneW * 1.46, -P.upperLeg * 0.3, 0]}
                rotation={[0.45, 0, lx * 0.9]} />
            ))}`,
    `            {/* golden petal ruffle layered under the hem */}
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2
              return (
                <mesh key={'pr' + i} geometry={taperGeo(P.hipBoneW * 0.11, P.hipBoneW * 0.02, P.hipBoneW * 0.45)} material={sfYellowDark}
                  scale={[0.45, 1, 1]}
                  position={[Math.sin(a) * P.hipBoneW * 1.43, -P.upperLeg * 0.94, Math.cos(a) * P.hipBoneW * 1.43]}
                  rotation={[0.35, 0, Math.cos(a) * 0.7]} />
              )
            })}
            {/* green leaf fronds standing out from the skirt */}
            {[-1, 1].map((lx) => (
              <mesh key={'lf' + lx} geometry={taperGeo(P.hipBoneW * 0.07, P.hipBoneW * 0.014, P.hipBoneW * 0.55)} material={sfGreen}
                scale={[0.4, 1, 1]}
                position={[lx * P.hipBoneW * 1.46, -P.upperLeg * 0.3, 0]}
                rotation={[0.45, 0, lx * 0.9]} />
            ))}`,
    'petal hem ruffle')

// 2. Rebuild the sunflower feet — root toes, side tendrils, leafy ankle cuff
sub(`          {/* Sunflower: earthy brown root-like feet */}
          {isSunflower && sfBrown && (
            <group>
              <mesh geometry={sphereGeo(1)} material={sfBrown}
                scale={[P.ankleR * 1.2, P.ankleR * 1.0, P.footLen * 0.8]}
                position={[0, -P.ankleR * 0.5, P.footLen * 0.3]} castShadow />
              {[-P.ankleR * 0.35, P.ankleR * 0.35].map((tx, i) => (
                <mesh key={\`rt\${i}\`} geometry={taperGeo(P.ankleR * 0.04, P.ankleR * 0.1, P.ankleR * 0.6)} material={sfBrown}
                  position={[tx, -P.ankleR * 0.65, P.footLen * 0.45]}
                  rotation={[0.6, 0, Math.sin(i * Math.PI) * 0.5]} />
              ))}
              <mesh geometry={torusGeo(P.ankleR * 1.1, P.ankleR * 0.08, 8, 18)} material={sfGreen}
                position={[0, P.ankleR * 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} />
            </group>
          )}`,
    `          {/* Sunflower: cute earthy root feet */}
          {isSunflower && sfBrown && (
            <group>
              {/* foot base — rounded root bulb */}
              <mesh geometry={sphereGeo(1)} material={sfBrown}
                scale={[P.ankleR * 1.28, P.ankleR * 1.0, P.footLen * 0.9]}
                position={[0, -P.ankleR * 0.5, P.footLen * 0.3]} castShadow />
              {/* rounded root toes at the front */}
              {[-P.ankleR * 0.34, -P.ankleR * 0.11, P.ankleR * 0.11, P.ankleR * 0.34].map((tx, i) => (
                <mesh key={\`rt\${i}\`} geometry={sphereGeo(1)} material={sfBrown}
                  scale={[P.ankleR * 0.17, P.ankleR * 0.15, P.ankleR * 0.24]}
                  position={[tx, -P.ankleR * 0.6, P.footLen * 0.62]} />
              ))}
              {/* root tendrils fanning out at the sides */}
              {[-1, 1].map((sx) => (
                <mesh key={'td' + sx} geometry={taperGeo(P.ankleR * 0.05, P.ankleR * 0.015, P.ankleR * 0.72)} material={sfBrown}
                  position={[sx * P.ankleR * 0.52, -P.ankleR * 0.78, P.footLen * 0.3]}
                  rotation={[0.5, 0, sx * 0.55]} />
              ))}
              {/* leafy green ankle cuff */}
              <mesh geometry={torusGeo(P.ankleR * 1.16, P.ankleR * 0.1, 8, 18)} material={sfGreen}
                position={[0, P.ankleR * 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} />
              {/* little leaf tips on the cuff */}
              {[0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].map((a, i) => (
                <mesh key={'lc' + i} geometry={taperGeo(P.ankleR * 0.05, P.ankleR * 0.012, P.ankleR * 0.32)} material={sfGreen}
                  position={[Math.sin(a) * P.ankleR * 1.14, P.ankleR * 0.1, Math.cos(a) * P.ankleR * 1.14]}
                  rotation={[0.25, a, 0.7]} />
              ))}
            </group>
          )}`,
    'root feet rebuilt')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
