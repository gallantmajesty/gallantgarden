// Make the sunflower cute, not horror:
//  - warm honey seed disc instead of dark dirt-brown
//  - big bright golden eyes with sparkle
//  - small sweet smile (not a wide dark grin)
//  - soft pink blush instead of orange
//  - gentle short eyebrows
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
let applied = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) { console.log('MISS: ' + label); return }
  s = s.replace(needle, repl); applied++; console.log('ok: ' + label)
}

// 1. Warm honey seed disc (was dark dirt brown)
sub(`      {/* brown seed disc — the sunflower centre the face sits on */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#8a5a24', 0.6)} scale={[r * 1.02, r * 1.0, r * 0.88]} castShadow />`,
    `      {/* warm honey seed disc — the sunflower centre the face sits on */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#c98a3d', 0.55)} scale={[r * 1.02, r * 1.0, r * 0.88]} castShadow />`,
    'honey disc')

// 2. Big bright sparkly golden eyes
sub(`      <group scale={1.22}>
        <Eye r={r} x={-r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#a4682a" />
        <Eye r={r} x={r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#a4682a" />
      </group>`,
    `      <group scale={1.32}>
        <Eye r={r} x={-r * 0.28} y={-r * 0.05} z={fz * 0.98} iris="#e0a03c" />
        <Eye r={r} x={r * 0.28} y={-r * 0.05} z={fz * 0.98} iris="#e0a03c" />
      </group>`,
    'sparkly eyes')

// 3. Gentle short eyebrows
sub(`      {/* Lily-style eyebrows — thin, dark, gentle arch (tracking the bigger eyes) */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[-r * 0.35, -r * 0.05 + r * 0.18, fz * 0.98]} rotation={[0, 0, 0.14]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[r * 0.35, -r * 0.05 + r * 0.18, fz * 0.98]} rotation={[0, 0, -0.14]} />`,
    `      {/* soft happy brows — short, high, gently arched */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.03, r * 0.02]} position={[-r * 0.33, -r * 0.05 + r * 0.21, fz * 0.98]} rotation={[0, 0, 0.16]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.03, r * 0.02]} position={[r * 0.33, -r * 0.05 + r * 0.21, fz * 0.98]} rotation={[0, 0, -0.16]} />`,
    'soft brows')

// 4. Small sweet smile (not a wide grin)
sub(`      {/* Sunny smile — a wide cheerful arc with lifted corners and dimples */}
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
    `      {/* Sweet smile — a small gentle curve */}
      {[-0.08, -0.04, 0, 0.04, 0.08].map((dx, i) => (
        <mesh key={'sm' + i} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.036, r * 0.02, r * 0.01]}
          position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.7, fz * 0.92]} />
      ))}
      {[-0.09, 0.09].map((dx) => (
        <mesh key={'smc' + dx} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.022, r * 0.018, r * 0.01]}
          position={[dx * r, -r * 0.4, fz * 0.92]} />
      ))}`,
    'sweet smile')

// 5. Soft pink blush
sub(`      {/* rosy cheeks */}
      {[-1, 1].map((sx) => (
        <mesh key={\`sch\${sx}\`} geometry={sphereGeo(1)} material={sharedMaterial('#f4a040', 0.5)} scale={[r * 0.13, r * 0.1, r * 0.05]} position={[sx * r * 0.5, -r * 0.12, fz * 0.8]} />
      ))}`,
    `      {/* soft pink blush */}
      {[-1, 1].map((sx) => (
        <mesh key={\`sch\${sx}\`} geometry={sphereGeo(1)} material={sharedMaterial('#f7a8b8', 0.45)} scale={[r * 0.15, r * 0.12, r * 0.05]} position={[sx * r * 0.52, -r * 0.12, fz * 0.8]} />
      ))}`,
    'pink blush')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
