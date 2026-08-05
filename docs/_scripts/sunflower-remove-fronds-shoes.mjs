// Sunflower cleanup:
//  - remove the green leaf fronds hanging off the skirt sides
//  - rebuild the feet as neat little shoes: 3 rounded toes, a light sole,
//    green leafy anklet + a tiny gold buckle dot (no stray side tendrils)
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
let applied = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) { console.log('MISS: ' + label); return }
  s = s.replace(needle, repl); applied++; console.log('ok: ' + label)
}

// 1. Remove the green leaf fronds hanging off the skirt
sub(`            {/* green leaf fronds standing out from the skirt */}
            {[-1, 1].map((lx) => (
              <mesh key={'lf' + lx} geometry={taperGeo(P.hipBoneW * 0.07, P.hipBoneW * 0.014, P.hipBoneW * 0.55)} material={sfGreen}
                scale={[0.4, 1, 1]}
                position={[lx * P.hipBoneW * 1.46, -P.upperLeg * 0.3, 0]}
                rotation={[0.45, 0, lx * 0.9]} />
            ))}`,
    ``,
    'fronds removed')

// 2. Rebuild the feet as cute shoes (3 toes + sole + anklet + gold buckle)
sub(`          {/* Sunflower: cute earthy root feet */}
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
                  position={[tx, -P.ankleR * 0.6, P.footLen * 1.25]} />
              ))}
              {/* root tendrils fanning out at the sides */}
              {[-1, 1].map((sx) => (
                <mesh key={'td' + sx} geometry={taperGeo(P.ankleR * 0.05, P.ankleR * 0.015, P.ankleR * 0.72)} material={sfBrown}
                  position={[sx * P.ankleR * 1.38, -P.ankleR * 0.8, P.footLen * 0.35]}
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
    `          {/* Sunflower: cute little earthy shoes */}
          {isSunflower && sfBrown && (
            <group>
              {/* foot base — rounded root bulb */}
              <mesh geometry={sphereGeo(1)} material={sfBrown}
                scale={[P.ankleR * 1.3, P.ankleR * 0.95, P.footLen * 0.9]}
                position={[0, -P.ankleR * 0.45, P.footLen * 0.3]} castShadow />
              {/* light sole under the foot */}
              <mesh geometry={sphereGeo(1)} material={sharedMaterial('#a8834a', 0.65)}
                scale={[P.ankleR * 1.4, P.ankleR * 0.3, P.footLen * 0.95]}
                position={[0, -P.ankleR * 1.0, P.footLen * 0.32]} />
              {/* three neat rounded toes at the front */}
              {[-P.ankleR * 0.26, 0, P.ankleR * 0.26].map((tx, i) => (
                <mesh key={\`rt\${i}\`} geometry={sphereGeo(1)} material={sfBrown}
                  scale={[P.ankleR * 0.16, P.ankleR * 0.14, P.ankleR * 0.2]}
                  position={[tx, -P.ankleR * 0.58, P.footLen * 1.25]} />
              ))}
              {/* leafy green anklet */}
              <mesh geometry={torusGeo(P.ankleR * 1.16, P.ankleR * 0.1, 8, 18)} material={sfGreen}
                position={[0, P.ankleR * 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} />
              {/* little leaf tips on the anklet */}
              {[0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].map((a, i) => (
                <mesh key={'lc' + i} geometry={taperGeo(P.ankleR * 0.05, P.ankleR * 0.012, P.ankleR * 0.3)} material={sfGreen}
                  position={[Math.sin(a) * P.ankleR * 1.12, P.ankleR * 0.1, Math.cos(a) * P.ankleR * 1.12]}
                  rotation={[0.25, a, 0.7]} />
              ))}
              {/* tiny gold buckle dot at the anklet front */}
              <mesh geometry={sphereGeo(1)} material={sfYellowDark} scale={[P.ankleR * 0.09, P.ankleR * 0.09, P.ankleR * 0.09]}
                position={[0, P.ankleR * 0.12, P.ankleR * 1.2]} />
            </group>
          )}`,
    'shoes rebuilt')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
