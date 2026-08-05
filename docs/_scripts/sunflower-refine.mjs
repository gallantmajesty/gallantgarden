// Sunflower realism & appeal pass:
//  - Petals: subtle centre veins + organic size/tilt variation
//  - Face: golden-angle seed spiral (real sunflower core), soft under-eye shading
//  - Expression: playful raised right brow
//  - Outfit: sunflower chest emblem, leafy wrist cuffs, elbow cloth fold,
//    green leaf fronds standing off the skirt
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
let applied = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) { console.log('MISS: ' + label); return }
  s = s.replace(needle, repl); applied++; console.log('ok: ' + label)
}

// --------------------------------------------------------------- HEAD

// 1. Outer petals: organic size/tilt variation + subtle centre vein
sub(`      {/* PETAL BLOOM — bright soft rounded petals radiating all around the disc */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return (
          <mesh key={\`petal\${i}\`} geometry={sphereGeo(1)} material={yellow}
            scale={[r * 0.36, r * 0.62, r * 0.05]}
            position={[Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.05, fz * 0.44]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}`,
    `      {/* PETAL BLOOM — bright soft rounded petals with organic variation + veins */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        const sz = 1 + Math.sin(i * 1.7) * 0.09
        const tilt = Math.cos(i * 2.1) * 0.05
        return (
          <group key={\`petal\${i}\`} position={[Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.05, fz * 0.44]} rotation={[0, 0, a + Math.PI / 2 + tilt]}>
            <mesh geometry={sphereGeo(1)} material={yellow} scale={[r * 0.36, r * 0.62 * sz, r * 0.05]} />
            {/* subtle centre vein down the petal */}
            <mesh geometry={taperGeo(r * 0.02, r * 0.006, r * 0.52)} material={dark}
              scale={[0.16, 1, 1]} position={[0, 0, r * 0.045]} />
          </group>
        )
      })}`,
    'petal veins + variation')

// 2. Golden-angle seed spiral (mimics a real sunflower core)
sub(`      {/* spiral seed texture — two rings of dark seeds circling the face edge */}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2 + 0.35
        return (
          <mesh key={'sd' + i} geometry={sphereGeo(1)} material={seed}
            scale={[r * 0.045, r * 0.045, r * 0.03]}
            position={[Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.54, fz * 0.82]} />
        )
      })}
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2 + 0.15
        return (
          <mesh key={'sd2' + i} geometry={sphereGeo(1)} material={seed}
            scale={[r * 0.05, r * 0.05, r * 0.03]}
            position={[Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.68, fz * 0.76]} />
        )
      })}`,
    `      {/* golden-angle seed spiral — the real sunflower core pattern */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = i * 2.399963 + 0.4
        const dist = r * (0.58 + (i / 23) * 0.26)
        return (
          <mesh key={'sd' + i} geometry={sphereGeo(1)} material={seed}
            scale={[r * (0.042 + (i % 4) * 0.005), r * (0.042 + (i % 4) * 0.005), r * 0.028]}
            position={[Math.cos(a) * dist, Math.sin(a) * dist * 0.92, fz * 0.8]} />
        )
      })}`,
    'golden-angle seed spiral')

// 3. Soft under-eye shading — blends the eyes into the seed face
sub(`      {/* soft happy brows — short, high, gently arched */}`,
    `      {/* soft under-eye shading — blends the eyes into the seed face */}
      {[-1, 1].map((sx) => (
        <mesh key={'esh' + sx} geometry={sphereGeo(1)} material={sharedMaterial('#a86f24', 0.5)}
          scale={[r * 0.24, r * 0.07, r * 0.02]} position={[sx * r * 0.37, -r * 0.12, fz * 0.96]} />
      ))}
      {/* soft happy brows — short, high, gently arched */}`,
    'under-eye shading')

// 4. Playful raised right brow
sub(`      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.03, r * 0.02]} position={[r * 0.36, -r * 0.05 + r * 0.21, fz * 0.98]} rotation={[0, 0, -0.16]} />`,
    `      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.03, r * 0.02]} position={[r * 0.36, -r * 0.05 + r * 0.26, fz * 0.98]} rotation={[0, 0, -0.22]} />`,
    'playful right brow')

// --------------------------------------------------------------- OUTFIT

// 5. Sunflower chest emblem on the yellow bodice
sub(`        {isSunflower && (
          <group>
            {/* Flared A-line skirt — fitted at body hips, gentle flare to below knees */}`,
    `        {isSunflower && (
          <group>
            {/* Sunflower chest emblem — little bloom on the bodice */}
            <group position={[0, P.spineLen + P.chestLen * 0.32, P.torsoD * 1.32]}>
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2
                return (
                  <mesh key={'ce' + i} geometry={sphereGeo(1)} material={sfYellowDark}
                    scale={[P.waistW * 0.06, P.waistW * 0.13, P.torsoD * 0.018]}
                    position={[Math.cos(a) * P.waistW * 0.11, Math.sin(a) * P.waistW * 0.11, 0]}
                    rotation={[0, 0, a + Math.PI / 2]} />
                )
              })}
              <mesh geometry={sphereGeo(1)} material={sfBrown} scale={[P.waistW * 0.08, P.waistW * 0.08, P.torsoD * 0.02]} />
            </group>
            {/* Flared A-line skirt — fitted at body hips, gentle flare to below knees */}`,
    'chest emblem')

// 6. Leafy wrist cuff (green ring where the arm meets the hand)
sub(`          {/* Sunflower: a tiny green leaf bud at the wrist */}
          {isSunflower && (
            <mesh geometry={taperGeo(P.wristR * 0.32, P.wristR * 0.01, P.wristR * 1.2)} material={sharedMaterial('#5caa3a', 0.65)}
              scale={[0.4, 1, 1]}
              position={[0, -P.handLen * 0.05, P.wristR * 0.2]} rotation={[0.5, 0, 1.0]} />
          )}`,
    `          {/* Sunflower: leafy wrist cuff + a tiny green leaf bud */}
          {isSunflower && (
            <>
              <mesh geometry={torusGeo(P.wristR * 1.08, P.wristR * 0.09, 8, 16)} material={sharedMaterial('#4c9a2f', 0.7)}
                position={[0, P.wristR * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={taperGeo(P.wristR * 0.32, P.wristR * 0.01, P.wristR * 1.2)} material={sharedMaterial('#5caa3a', 0.65)}
                scale={[0.4, 1, 1]}
                position={[0, -P.handLen * 0.05, P.wristR * 0.2]} rotation={[0.5, 0, 1.0]} />
            </>
          )}`,
    'leafy wrist cuff')

// 7. Natural cloth fold at the elbow (balances the puffed shoulder)
sub(`        {/* Angel: flowing bell sleeve flared cone at the wrist */}`,
    `        {/* Sunflower: natural cloth fold ring at the elbow */}
        {isSunflower && (
          <mesh geometry={torusGeo(P.elbowR * 1.06, P.elbowR * 0.055, 8, 18)} material={sharedMaterial('#4c9a2f', 0.7)}
            position={[0, -P.lowerArm * 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} />
        )}
        {/* Angel: flowing bell sleeve flared cone at the wrist */}`,
    'elbow fold ring')

// 8. Green leaf fronds standing off the skirt sides
sub(`            {/* Scalloped leaf hem — leaf tips peeking below the skirt edge */}
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2 + Math.PI / 14
              return (
                <mesh key={'hl' + i} geometry={sphereGeo(1)} material={sfGreen}
                  scale={[P.hipBoneW * 0.17, P.hipBoneW * 0.34, P.hipBoneW * 0.13]}
                  position={[Math.sin(a) * P.hipBoneW * 1.3, -P.upperLeg * 0.95, Math.cos(a) * P.hipBoneW * 1.3]} />
              )
            })}
          </group>`,
    `            {/* Scalloped leaf hem — leaf tips peeking below the skirt edge */}
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2 + Math.PI / 14
              return (
                <mesh key={'hl' + i} geometry={sphereGeo(1)} material={sfGreen}
                  scale={[P.hipBoneW * 0.17, P.hipBoneW * 0.34, P.hipBoneW * 0.13]}
                  position={[Math.sin(a) * P.hipBoneW * 1.3, -P.upperLeg * 0.95, Math.cos(a) * P.hipBoneW * 1.3]} />
              )
            })}
            {/* green leaf fronds standing out from the skirt */}
            {[-1, 1].map((lx) => (
              <mesh key={'lf' + lx} geometry={taperGeo(P.hipBoneW * 0.07, P.hipBoneW * 0.014, P.hipBoneW * 0.55)} material={sfGreen}
                scale={[0.4, 1, 1]}
                position={[lx * P.hipBoneW * 1.36, -P.upperLeg * 0.24, 0]}
                rotation={[0.45, 0, lx * 0.9]} />
            ))}
          </group>`,
    'skirt leaf fronds')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
