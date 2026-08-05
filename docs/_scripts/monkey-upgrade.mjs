import { readFileSync, writeFileSync } from 'fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const raw = readFileSync(FILE, 'utf8')
const crlf = raw.includes('\r\n')
let src = raw.replace(/\r\n/g, '\n')

let applied = 0
function replace(oldStr, newStr, label) {
  if (!src.includes(oldStr)) {
    console.error(`MISS: ${label}`)
    return
  }
  src = src.split(oldStr).join(newStr)
  applied++
  console.log(`ok: ${label}`)
}

// 1. Fur grain — soft bumpy coat (adds a monkey material block after the elephant one)
replace(
  `    elNavy.bumpMap = elSkinTex
    elNavy.bumpScale = 0.085
    elNavy.roughnessMap = elSkinTex
    elNavy.roughness = 0.94
  }
  const topM =`,
  `    elNavy.bumpMap = elSkinTex
    elNavy.bumpScale = 0.085
    elNavy.roughnessMap = elSkinTex
    elNavy.roughness = 0.94
  }
  // Monkey: soft fur grain so the coat reads as fur, not plastic
  if (isMonkey) {
    const mkTex = skinReliefTex()
    monkeyFur.bumpMap = mkTex
    monkeyFur.bumpScale = 0.16
    monkeyFur.roughnessMap = mkTex
    monkeyFur.roughness = 0.82
    monkeyDark.bumpMap = mkTex
    monkeyDark.bumpScale = 0.12
    monkeyDark.roughnessMap = mkTex
    monkeyDark.roughness = 0.75
  }
  const topM =`,
  'fur grain texture'
)

// 2. Ears — gentle tilt for character
replace(
  `        <group key={\`ear\${sx}\`} position={[sx * r * 1.0, r * 0.3, -r * 0.05]}>`,
  `        <group key={\`ear\${sx}\`} position={[sx * r * 1.0, r * 0.3, -r * 0.05]} rotation={[0.12, sx * -0.08, sx * 0.14]}>`,
  'ear tilt'
)

// 3. Eyes — layered warm brown anime eyes with limbal ring + dual catchlights
replace(
  `      {[-1, 1].map((sx) => (
        <group key={\`eye\${sx}\`} position={[sx * r * 0.3, r * 0.08, r * 1.02]}>
          {/* white sclera */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.22, r * 0.25, r * 0.13]} />
          {/* dark iris */}
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.12, r * 0.14, r * 0.09]} position={[0, 0, r * 0.06]} />
          {/* catchlights — two per eye for sparkle */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.05, r * 0.05, r * 0.02]} position={[sx * -r * 0.03, r * 0.06, r * 0.13]} />
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.03, r * 0.03, r * 0.02]} position={[sx * r * 0.02, -r * 0.04, r * 0.13]} />
        </group>
      ))}`,
  `      {[-1, 1].map((sx) => (
        <group key={\`eye\${sx}\`} position={[sx * r * 0.3, r * 0.08, r * 1.02]}>
          {/* white sclera — big and round */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.24, r * 0.27, r * 0.12]} />
          {/* dark limbal ring around the iris */}
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#3a2413', 0.5)} scale={[r * 0.17, r * 0.19, r * 0.1]} position={[0, 0, r * 0.02]} />
          {/* warm brown iris */}
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7a4a1e', 0.55)} scale={[r * 0.15, r * 0.17, r * 0.11]} position={[0, 0, r * 0.03]} />
          {/* dark pupil */}
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.08, r * 0.09, r * 0.11]} position={[0, 0, r * 0.04]} />
          {/* big top catchlight */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.055, r * 0.055, r * 0.1]} position={[sx * -r * 0.025, r * 0.045, r * 0.05]} />
          {/* small secondary catchlight */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.028, r * 0.028, r * 0.09]} position={[sx * r * 0.015, -r * 0.03, r * 0.05]} />
        </group>
      ))}`,
  'layered expressive eyes'
)

// 4. Brows — one soft arched brow per eye instead of a single bar
replace(
  `      {/* brow ridge — subtle fur ledge above the eyes */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.7, r * 0.08, r * 0.3]} position={[0, r * 0.22, r * 0.85]} />`,
  `      {/* soft arched brows — one per eye, raised and friendly */}
      {[-1, 1].map((sx) => (
        <mesh key={\`br\${sx}\`} geometry={sphereGeo(1)} material={dark}
          scale={[r * 0.14, r * 0.08, r * 0.12]} position={[sx * r * 0.3, r * 0.3, r * 0.95]} rotation={[0, 0, sx * -0.15]} />
      ))}`,
  'per-eye arched brows'
)

// 5. Muzzle + nose + nostrils — soft raised tan muzzle
replace(
  `      {/* small dark nose — slightly protruding */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.12, r * 0.09, r * 0.1]} position={[0, -r * 0.24, r * 1.04]} />

      {/* nostrils — two tiny dots */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.025, r * 0.025, r * 0.01]} position={[-r * 0.04, -r * 0.24, r * 1.12]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.025, r * 0.025, r * 0.01]} position={[r * 0.04, -r * 0.24, r * 1.12]} />`,
  `      {/* soft muzzle — gently raised tan oval around the nose and mouth */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.34, r * 0.3, r * 0.26]} position={[0, -r * 0.28, r * 0.92]} />

      {/* small dark nose — slightly protruding on the muzzle */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.13, r * 0.1, r * 0.12]} position={[0, -r * 0.26, r * 1.1]} />

      {/* nostrils — two tiny dots */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.03, r * 0.03, r * 0.012]} position={[-r * 0.045, -r * 0.26, r * 1.19]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.03, r * 0.03, r * 0.012]} position={[r * 0.045, -r * 0.26, r * 1.19]} />`,
  'muzzle + nose + nostrils'
)

// 6. Smile — soft arc with lifted corners instead of a thin torus line
replace(
  `      {/* wide cheeky grin — a curved mouth line */}
      <mesh geometry={torusGeo(r * 0.3, r * 0.03, 8, 20)} material={blackDot}
        position={[0, -r * 0.46, r * 1.0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]} />`,
  `      {/* wide cheeky grin — soft smile arc with lifted corners */}
      {[-0.09, -0.045, 0, 0.045, 0.09].map((dx, i) => (
        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.032, r * 0.025]}
          position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.7, r * 1.04]} />
      ))}`,
  'smile arc'
)

// 7. Tail — replace the torus donut stack with a smooth tapered curled tube
replace(
  `            {/* long curling tail — a graceful spiral curve starting from lower back */}
            <group position={[0, -0.02, -P.torsoD * 0.85]} rotation={[0.8, 0, 0]}>
              {/* tail base — thick root */}
              <mesh geometry={taperGeo(P.hipBoneW * 0.1, P.hipBoneW * 0.07, P.upperLeg * 0.4)} material={monkeyFur} position={[0, -P.upperLeg * 0.2, 0]} castShadow />
              {/* first curl — torus ring */}
              <mesh geometry={torusGeo(P.hipBoneW * 0.22, P.hipBoneW * 0.045, 8, 20)} material={monkeyFur}
                position={[0, -P.upperLeg * 0.45, P.hipBoneW * 0.15]} rotation={[Math.PI / 2, 0, 0]} />
              {/* second curl — slightly smaller */}
              <mesh geometry={torusGeo(P.hipBoneW * 0.16, P.hipBoneW * 0.035, 8, 18)} material={monkeyDark}
                position={[0, -P.upperLeg * 0.55, P.hipBoneW * 0.3]} rotation={[Math.PI / 2, 0, 0.3]} />
              {/* tail tip — little curl */}
              <mesh geometry={torusGeo(P.hipBoneW * 0.1, P.hipBoneW * 0.028, 8, 14)} material={monkeyBelly}
                position={[P.hipBoneW * 0.04, -P.upperLeg * 0.58, P.hipBoneW * 0.4]} rotation={[Math.PI / 2.5, 0.3, 0.4]} />
            </group>`,
  `            {/* long curling tail — a smooth tapered tube sweeping down into a curl */}
            <group position={[0, -0.02, -P.torsoD * 0.85]} rotation={[0.8, 0, 0]}>
              <MonkeyTail P={P} fur={monkeyFur} dark={monkeyDark} belly={monkeyBelly} />
            </group>`,
  'tail tube swap'
)

// 8. Add the MonkeyTail component after MonkeyHead
replace(
  `      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[-r * 0.08, r * 1.05, r * 0.3]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[r * 0.08, r * 1.05, r * 0.3]} />
    </group>
  )
}

/* ================================================ HACKER HEAD ================================================ */`,
  `      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[-r * 0.08, r * 1.05, r * 0.3]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[r * 0.08, r * 1.05, r * 0.3]} />
    </group>
  )
}

/* ================================================ MONKEY TAIL ================================================ */

/** Long curling monkey tail — one smooth tapered tube (like the elephant trunk)
 *  sweeping down from the lower back and easing into a curl at the tip, with a
 *  lighter tan tip cap. Replaces the old stack of torus rings. */
function MonkeyTail({ P, fur, dark, belly }: { P: Proportions; fur: Mat; dark: Mat; belly: Mat }) {
  const tail = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(0, -P.upperLeg * 0.14, P.hipBoneW * 0.05),
      new Vector3(0, -P.upperLeg * 0.28, P.hipBoneW * 0.09),
      new Vector3(0, -P.upperLeg * 0.4, P.hipBoneW * 0.08),
      new Vector3(0, -P.upperLeg * 0.5, P.hipBoneW * 0.03),
      new Vector3(0, -P.upperLeg * 0.56, -P.hipBoneW * 0.05),
      new Vector3(0, -P.upperLeg * 0.6, -P.hipBoneW * 0.12),
    ])
    const tubularSegs = 24
    const radialSegs = 10
    const baseR = P.hipBoneW * 0.11
    const taperRate = 0.72
    const geo = new TubeGeometry(curve, tubularSegs, baseR, radialSegs, false)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / (radialSegs + 1))
      const t = ring / tubularSegs
      const taper = 1.0 - t * taperRate
      const cp = curve.getPointAt(t)
      const vx = pos.getX(i) - cp.x
      const vy = pos.getY(i) - cp.y
      const vz = pos.getZ(i) - cp.z
      pos.setXYZ(i, cp.x + vx * taper, cp.y + vy * taper, cp.z + vz * taper)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    const tip = curve.getPointAt(1)
    return { geo, tip }
  }, [P])
  return (
    <group>
      <mesh geometry={tail.geo} material={fur} castShadow />
      {/* lighter tan tip cap */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[P.hipBoneW * 0.08, P.hipBoneW * 0.08, P.hipBoneW * 0.08]}
        position={[tail.tip.x, tail.tip.y, tail.tip.z]} />
    </group>
  )
}

/* ================================================ HACKER HEAD ================================================ */`,
  'MonkeyTail component'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/8 patches applied`)
