// Convert the sunflower character to a true sunflower theme:
//  - Head: brown seed-disc face (not yellow dotted skin), soft rounded bright
//    yellow petals in 3 layers (not sharp spikes), spiral seed texture,
//    cheerful wide smile with dimples.
//  - Outfit: bright yellow bodice, earthy brown skirt, brown seed necklace,
//    deep-gold belt, green leafy arms with deeper-green leaf hands.
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
let applied = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) { console.log('MISS: ' + label); return }
  s = s.replace(needle, repl); applied++; console.log('ok: ' + label)
}

// --------------------------------------------------------------- MATERIALS

// 1. Skirt material: green -> earthy brown (renamed sfGreenDouble -> sfSkirt)
sub(`  const sfGreenDouble = new MeshStandardMaterial({ color: '#5caa3a', roughness: 0.65, metalness: 0, flatShading: false, side: DoubleSide })`,
    `  const sfSkirt = new MeshStandardMaterial({ color: '#a8762c', roughness: 0.72, metalness: 0, flatShading: false, side: DoubleSide })`,
    'skirt material brown')

// 2. Skirt usage follows the rename
sub(`            ])} material={sfGreenDouble} castShadow />`,
    `            ])} material={sfSkirt} castShadow />`,
    'skirt usage renamed')

// 3. Bodice: green -> bright sunflower yellow (topM)
sub(`  const topM = isDino ? dinoMain : isRabbit ? bunPink : isRobot ? robotDark : isAlien ? alienDark : isPig ? pigMain : isAngel ? angelRobe : isSunflower ? sfGreen : isGrim ? grimCloak : isElephant ? elNavy : isMonkey ? monkeyFur : sharedMaterial(config.topColor ?? topHex(config.top), 0.82)`,
    `  const topM = isDino ? dinoMain : isRabbit ? bunPink : isRobot ? robotDark : isAlien ? alienDark : isPig ? pigMain : isAngel ? angelRobe : isSunflower ? sfYellow : isGrim ? grimCloak : isElephant ? elNavy : isMonkey ? monkeyFur : sharedMaterial(config.topColor ?? topHex(config.top), 0.82)`,
    'bodice yellow')

// --------------------------------------------------------------- HEAD

// 4. Warm dark-brown mouth colour (soft on the brown disc)
sub(`  const blackDot = sharedMaterial('#1a1a1a', 0.6)`,
    `  const blackDot = sharedMaterial('#3a2410', 0.6)`,
    'warm mouth colour')

// 5. Skull: yellow -> brown seed disc (the face sits ON the sunflower centre)
sub(`      {/* rounded yellow skull (the face base behind the petals) */}
      <mesh geometry={sphereGeo(1)} material={yellow} scale={[r * 1.05, r * 1.08, r * 0.92]} castShadow />`,
    `      {/* brown seed disc — the sunflower centre the face sits on */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#8a5a24', 0.6)} scale={[r * 1.02, r * 1.0, r * 0.88]} castShadow />`,
    'brown seed disc')

// 6. Cheerier: eyes a touch bigger
sub(`      <group scale={1.16}>
        <Eye r={r} x={-r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#8c5a2e" />
        <Eye r={r} x={r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#8c5a2e" />
      </group>`,
    `      <group scale={1.22}>
        <Eye r={r} x={-r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#a4682a" />
        <Eye r={r} x={r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#a4682a" />
      </group>`,
    'bigger warmer eyes')

// 7. Wide sunny smile with dimples
sub(`      {/* Cute smile — a gentle upward arc with lifted corners */}
      {[-0.09, -0.045, 0, 0.045, 0.09].map((dx, i) => (
        <mesh key={'sm' + i} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.034, r * 0.018, r * 0.01]}
          position={[dx * r, -r * 0.48 + Math.abs(dx) * r * 0.9, fz * 0.92]} />
      ))}`,
    `      {/* Sunny smile — a wide cheerful arc with lifted corners and dimples */}
      {[-0.12, -0.06, 0, 0.06, 0.12].map((dx, i) => (
        <mesh key={'sm' + i} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.04, r * 0.02, r * 0.01]}
          position={[dx * r, -r * 0.5 + Math.abs(dx) * r * 0.75, fz * 0.92]} />
      ))}
      {[-0.13, 0.13].map((dx) => (
        <mesh key={'smc' + dx} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.024, r * 0.02, r * 0.01]}
          position={[dx * r, -r * 0.43, fz * 0.92]} />
      ))}`,
    'sunny smile')

// 8. Spiral seed texture on the disc (replaces the scattered cactus dots)
sub(`      {/* structured seed ring — brown seeds circling the face edge like a real seed disc */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + Math.PI / 16
        return (
          <mesh key={'sr' + i} geometry={sphereGeo(1)} material={seed}
            scale={[r * 0.05, r * 0.05, r * 0.035]}
            position={[Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.64, fz * 0.78]} />
        )
      })}
      {/* tiny seed dots scattered across the face as texture (no disc) */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3
        const dist = r * 0.65
        return (
          <mesh key={'sd' + i} geometry={sphereGeo(1)} material={dark}
            scale={[r * 0.04, r * 0.04, r * 0.03]}
            position={[Math.cos(a) * dist, Math.sin(a) * dist * 0.7, fz * 0.8]} />
        )
      })}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.7
        const dist = r * 0.42
        return (
          <mesh key={'sd2' + i} geometry={sphereGeo(1)} material={dark}
            scale={[r * 0.03, r * 0.03, r * 0.02]}
            position={[Math.cos(a) * dist, Math.sin(a) * dist * 0.7, fz * 0.84]} />
        )
      })}`,
    `      {/* spiral seed texture — two rings of dark seeds circling the face edge */}
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
    'spiral seed rings')

// 9. Soft rounded bright-yellow petals in 3 layers (no more sharp spikes)
sub(`      {/* BIG PETAL RING — long pointed petals radiating from the seed disc */}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2
        const curl = Math.sin(i * 2.4) * 0.07
        return (
          <mesh key={\`petal\${i}\`} geometry={taperGeo(r * 0.17, r * 0.012, r * 0.78)} material={petalEdge}
            scale={[0.42, 1, 1]}
            position={[Math.cos(a) * r * 1.02, Math.sin(a) * r * 0.84, fz * 0.42]}
            rotation={[0, 0, a + Math.PI / 2 + curl]} />
        )
      })}
      {/* inner ring — shorter darker petals tucked between the outer ones */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + Math.PI / 18
        return (
          <mesh key={\`peti\${i}\`} geometry={taperGeo(r * 0.13, r * 0.01, r * 0.52)} material={yellow}
            scale={[0.4, 1, 1]}
            position={[Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.74, fz * 0.28]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}`,
    `      {/* PETAL BLOOM — bright soft rounded petals radiating all around the disc */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return (
          <mesh key={\`petal\${i}\`} geometry={sphereGeo(1)} material={yellow}
            scale={[r * 0.36, r * 0.62, r * 0.05]}
            position={[Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.05, fz * 0.44]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}
      {/* mid ring — pale gold petals tucked between, offset angle */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + Math.PI / 16
        return (
          <mesh key={\`petm\${i}\`} geometry={sphereGeo(1)} material={petalEdge}
            scale={[r * 0.32, r * 0.52, r * 0.05]}
            position={[Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.95, fz * 0.38]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}
      {/* inner ring — deep gold close against the disc */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + Math.PI / 18
        return (
          <mesh key={\`peti\${i}\`} geometry={sphereGeo(1)} material={dark}
            scale={[r * 0.28, r * 0.44, r * 0.05]}
            position={[Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.85, fz * 0.32]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}`,
    'soft rounded petals')

// --------------------------------------------------------------- BODY

// 10. Neckline ring: yellow -> brown (seed necklace against the yellow bodice)
sub(`            {/* Yellow neckline ring */}
            <mesh geometry={torusGeo(P.chestW * 0.35, P.chestW * 0.035, 8, 20)} material={sfYellow}
              position={[0, P.chestLen * 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
    `            {/* Brown seed necklace at the neckline */}
            <mesh geometry={torusGeo(P.chestW * 0.35, P.chestW * 0.035, 8, 20)} material={sfBrown}
              position={[0, P.chestLen * 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
    'brown seed necklace')

// 11. Waist sash: green -> deep gold belt
sub(`            {/* Leafy waist sash — sits at natural waist */}
            <mesh geometry={torusGeo(P.waistW * 0.88, P.hipBoneW * 0.045, 8, 24)} material={sfGreen}
              position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
    `            {/* Deep-gold belt at the waist */}
            <mesh geometry={torusGeo(P.waistW * 0.88, P.hipBoneW * 0.045, 8, 24)} material={sfYellowDark}
              position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
    'gold belt')

// 12. Leafy green arms (explicit green — bodice is yellow now)
sub(`  const armM = isSunflower ? topM : isElephant ? skin : isSleeved ? topM : skin`,
    `  const armM = isSunflower ? sharedMaterial('#5caa3a', 0.65) : isElephant ? skin : isSleeved ? topM : skin`,
    'green arm material')

// 13. Green forearm for sunflower
sub(`            [P.elbowR * 1.08, -P.lowerArm * 0.2],
            [P.elbowR, 0],
          ])} material={isAngel ? topM : isSunflower ? topM : skin} castShadow />`,
    `            [P.elbowR * 1.08, -P.lowerArm * 0.2],
            [P.elbowR, 0],
          ])} material={isAngel ? topM : isSunflower ? sharedMaterial('#5caa3a', 0.65) : skin} castShadow />`,
    'green forearm')

// 14. Deeper-green leaf hands for sunflower
sub(`  const gloveM = isHacker ? sharedMaterial('#0e0f13', 0.7, 0.05) : isMonkey && monkeyDark ? monkeyDark : skin`,
    `  const gloveM = isHacker ? sharedMaterial('#0e0f13', 0.7, 0.05) : isMonkey && monkeyDark ? monkeyDark : isSunflower ? sharedMaterial('#4c9a2f', 0.7) : skin`,
    'green leaf hands')

// 15. Wrist leaf stays green (was topM = yellow now)
sub(`            <mesh geometry={taperGeo(P.wristR * 0.32, P.wristR * 0.01, P.wristR * 1.2)} material={topM}
              scale={[0.4, 1, 1]}
              position={[0, -P.handLen * 0.05, P.wristR * 0.2]} rotation={[0.5, 0, 1.0]} />`,
    `            <mesh geometry={taperGeo(P.wristR * 0.32, P.wristR * 0.01, P.wristR * 1.2)} material={sharedMaterial('#5caa3a', 0.65)}
              scale={[0.4, 1, 1]}
              position={[0, -P.handLen * 0.05, P.wristR * 0.2]} rotation={[0.5, 0, 1.0]} />`,
    'green wrist leaf')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
