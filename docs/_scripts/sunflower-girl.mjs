// Sunflower "girl" pass:
//  - Eyes: pull them back onto the disc surface (they were bulging way out
//    of the face) and scale down slightly.
//  - Skirt: bright warm-gold color (was brown-on-brown with the legs =
//    invisible), longer and fuller A-line flare, brown belt, deep-gold waist
//    petals, scalloped hem + fronds moved out to the wider hem.
import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
let applied = 0
function sub(needle, repl, label) {
  if (!s.includes(needle)) { console.log('MISS: ' + label); return }
  s = s.replace(needle, repl); applied++; console.log('ok: ' + label)
}

// --------------------------------------------------------------- EYES

// 1. Eyes sit ON the face (z back to the disc surface) + smaller
sub(`      <group scale={1.32}>
        <Eye r={r} x={-r * 0.28} y={-r * 0.05} z={fz * 0.98} iris="#e0a03c" />
        <Eye r={r} x={r * 0.28} y={-r * 0.05} z={fz * 0.98} iris="#e0a03c" />
      </group>`,
    `      <group scale={1.22}>
        <Eye r={r} x={-r * 0.28} y={-r * 0.05} z={fz * 0.9} iris="#e0a03c" />
        <Eye r={r} x={r * 0.28} y={-r * 0.05} z={fz * 0.9} iris="#e0a03c" />
      </group>`,
    'eyes on face')

// 2. Brows follow the eyes back
sub(`      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.03, r * 0.02]} position={[-r * 0.36, -r * 0.05 + r * 0.21, fz * 0.98]} rotation={[0, 0, 0.16]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.03, r * 0.02]} position={[r * 0.36, -r * 0.05 + r * 0.26, fz * 0.98]} rotation={[0, 0, -0.22]} />`,
    `      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.03, r * 0.02]} position={[-r * 0.36, -r * 0.05 + r * 0.21, fz * 0.92]} rotation={[0, 0, 0.16]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.03, r * 0.02]} position={[r * 0.36, -r * 0.05 + r * 0.26, fz * 0.92]} rotation={[0, 0, -0.22]} />`,
    'brows follow')

// --------------------------------------------------------------- SKIRT

// 3. Skirt: bright warm gold (visible vs brown legs), longer, fuller flare
sub(`  const sfSkirt = new MeshStandardMaterial({ color: '#a8762c', roughness: 0.72, metalness: 0, flatShading: false, side: DoubleSide })`,
    `  const sfSkirt = new MeshStandardMaterial({ color: '#f0b53c', roughness: 0.7, metalness: 0, flatShading: false, side: DoubleSide })`,
    'skirt warm gold')

// 4. Fuller, longer girly flare
sub(`            <mesh geometry={latheGeo([
              [P.hipBoneW * 1.08, -P.upperLeg * 0.04],
              [P.hipBoneW * 1.12, -P.upperLeg * 0.15],
              [P.hipBoneW * 1.18, -P.upperLeg * 0.35],
              [P.hipBoneW * 1.22, -P.upperLeg * 0.55],
              [P.hipBoneW * 1.25, -P.upperLeg * 0.72],
              [P.hipBoneW * 1.22, -P.upperLeg * 0.82],
            ])} material={sfSkirt} castShadow />`,
    `            <mesh geometry={latheGeo([
              [P.hipBoneW * 1.1, -P.upperLeg * 0.04],
              [P.hipBoneW * 1.16, -P.upperLeg * 0.15],
              [P.hipBoneW * 1.26, -P.upperLeg * 0.35],
              [P.hipBoneW * 1.34, -P.upperLeg * 0.55],
              [P.hipBoneW * 1.4, -P.upperLeg * 0.75],
              [P.hipBoneW * 1.38, -P.upperLeg * 0.9],
            ])} material={sfSkirt} castShadow />`,
    'fuller girly skirt')

// 5. Brown belt for contrast on the gold skirt
sub(`            {/* Deep-gold belt at the waist */}
            <mesh geometry={torusGeo(P.waistW * 0.88, P.hipBoneW * 0.045, 8, 24)} material={sfYellowDark}
              position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
    `            {/* Brown belt at the waist */}
            <mesh geometry={torusGeo(P.waistW * 0.88, P.hipBoneW * 0.045, 8, 24)} material={sfBrown}
              position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
    'brown belt')

// 6. Waist petals deep gold + riding the wider skirt
sub(`              <mesh key={\`sp\${i}\`} geometry={taperGeo(P.hipBoneW * 0.09, P.hipBoneW * 0.015, P.hipBoneW * 0.36)} material={sfYellow}
                scale={[0.4, 1, 1]}
                position={[Math.sin(a) * P.hipBoneW * 1.12, -P.upperLeg * 0.06, Math.cos(a) * P.hipBoneW * 1.12]}
                rotation={[0.35, 0, Math.cos(a) * 0.8]} />`,
    `              <mesh key={\`sp\${i}\`} geometry={taperGeo(P.hipBoneW * 0.09, P.hipBoneW * 0.015, P.hipBoneW * 0.36)} material={sfYellowDark}
                scale={[0.4, 1, 1]}
                position={[Math.sin(a) * P.hipBoneW * 1.16, -P.upperLeg * 0.06, Math.cos(a) * P.hipBoneW * 1.16]}
                rotation={[0.35, 0, Math.cos(a) * 0.8]} />`,
    'deep-gold waist petals')

// 7. Scalloped leaf hem follows the wider, longer hem
sub(`                <mesh key={'hl' + i} geometry={sphereGeo(1)} material={sfGreen}
                  scale={[P.hipBoneW * 0.17, P.hipBoneW * 0.34, P.hipBoneW * 0.13]}
                  position={[Math.sin(a) * P.hipBoneW * 1.3, -P.upperLeg * 0.95, Math.cos(a) * P.hipBoneW * 1.3]} />`,
    `                <mesh key={'hl' + i} geometry={sphereGeo(1)} material={sfGreen}
                  scale={[P.hipBoneW * 0.17, P.hipBoneW * 0.34, P.hipBoneW * 0.13]}
                  position={[Math.sin(a) * P.hipBoneW * 1.45, -P.upperLeg * 1.0, Math.cos(a) * P.hipBoneW * 1.45]} />`,
    'hem follows skirt')

// 8. Leaf fronds follow the wider skirt
sub(`              <mesh key={'lf' + lx} geometry={taperGeo(P.hipBoneW * 0.07, P.hipBoneW * 0.014, P.hipBoneW * 0.55)} material={sfGreen}
                scale={[0.4, 1, 1]}
                position={[lx * P.hipBoneW * 1.36, -P.upperLeg * 0.24, 0]}
                rotation={[0.45, 0, lx * 0.9]} />`,
    `              <mesh key={'lf' + lx} geometry={taperGeo(P.hipBoneW * 0.07, P.hipBoneW * 0.014, P.hipBoneW * 0.55)} material={sfGreen}
                scale={[0.4, 1, 1]}
                position={[lx * P.hipBoneW * 1.46, -P.upperLeg * 0.3, 0]}
                rotation={[0.45, 0, lx * 0.9]} />`,
    'fronds follow')

fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
console.log('Applied ' + applied + ' patches')
