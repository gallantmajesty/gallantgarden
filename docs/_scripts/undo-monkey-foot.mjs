import fs from 'fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')

const oldStr = `{/* Monkey: dark feet with visible round toes + tan pads */}
           {isMonkey && (
             <group>
               {/* foot bulb */}
               <mesh geometry={sphereGeo(1)} material={monkeyDark}
                 scale={[P.ankleR * 1.2, P.ankleR * 0.95, P.footLen * 0.75]}
                 position={[0, -P.ankleR * 0.4, P.footLen * 0.3]} castShadow />
               {/* visible round toes poking out the front */}
               {[-P.ankleR * 0.32, -P.ankleR * 0.11, P.ankleR * 0.11, P.ankleR * 0.32].map((tx, i) => (
                 <mesh key={'mt' + i} geometry={sphereGeo(1)} material={monkeyDark}
                   scale={[P.ankleR * 0.17, P.ankleR * 0.19, P.ankleR * 0.17]}
                   position={[tx, -P.ankleR * 0.55, P.footLen * 0.8]} />
               ))}
             </group>
           )}`

const newStr = `          {/* Monkey: darker brown feet like a real monkey's dark hands/feet */}
          {isMonkey && (
            <group>
              <mesh geometry={sphereGeo(1)} material={monkeyDark}
                scale={[P.ankleR * 1.15, P.ankleR * 0.9, P.footLen * 0.7]}
                position={[0, -P.ankleR * 0.4, P.footLen * 0.25]} castShadow />
              {/* toe bumps */}
              {[-P.ankleR * 0.2, -P.ankleR * 0.07, P.ankleR * 0.07, P.ankleR * 0.2].map((tx, i) => (
                <mesh key={'mt' + i} geometry={sphereGeo(1)} material={monkeyDark}
                  scale={[P.ankleR * 0.12, P.ankleR * 0.1, P.footLen * 0.12]}
                  position={[tx, -P.ankleR * 0.55, P.footLen * 0.55]} />
              ))}
            </group>
          )}`

const idx = src.indexOf(oldStr)
if (idx === -1) {
  // maybe the key uses template literal backticks instead
  const alt = oldStr.replace(`key={'mt' + i}`, 'key={`mt${i}`}')
  const idx2 = src.indexOf(alt)
  if (idx2 === -1) {
    console.error('MISS foot (both forms)')
    process.exit(1)
  }
  src = src.slice(0, idx2) + newStr + src.slice(idx2 + alt.length)
} else {
  src = src.slice(0, idx) + newStr + src.slice(idx + oldStr.length)
}
fs.writeFileSync(FILE, src.replace(/\n/g, '\r\n'))
console.log('OK foot revert')
