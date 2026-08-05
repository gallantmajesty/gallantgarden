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

// ---- Step 1: revert the post-anatomy polish edits back to anatomy values ----
replace(
  `position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.55, r * 1.06]}`,
  `position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.55, r * 1.1]}`,
  'polish: smile z back to anatomy'
)
replace(
  `position={[0, -r * 0.54, r * 1.02]} />`,
  `position={[0, -r * 0.54, r * 1.06]} />`,
  'polish: lip z back to anatomy'
)
replace(
  `scale={[P.elbowR * 1.0, P.elbowR * 0.88, P.elbowR * 0.98]}`,
  `scale={[P.elbowR * 1.15, P.elbowR * 1.0, P.elbowR * 1.12]}`,
  'polish: elbow ball back to anatomy'
)
replace(
  `scale={[P.kneeR * 1.0, P.kneeR * 0.85, P.kneeR * 0.95]}`,
  `scale={[P.kneeR * 1.1, P.kneeR * 0.95, P.kneeR * 1.05]}`,
  'polish: kneecap back to anatomy'
)

// ---- Step 2: revert each anatomy patch (new -> old), reverse order ----
const pairs = [
  [
    `      new Vector3(0, -P.upperLeg * 0.16, P.hipBoneW * 0.05),
      new Vector3(0, -P.upperLeg * 0.32, P.hipBoneW * 0.1),
      new Vector3(0, -P.upperLeg * 0.48, P.hipBoneW * 0.09),
      new Vector3(0, -P.upperLeg * 0.62, P.hipBoneW * 0.04),
      new Vector3(0, -P.upperLeg * 0.72, -P.hipBoneW * 0.05),
      new Vector3(0, -P.upperLeg * 0.78, -P.hipBoneW * 0.14),`,
    `      new Vector3(0, -P.upperLeg * 0.14, P.hipBoneW * 0.05),
      new Vector3(0, -P.upperLeg * 0.28, P.hipBoneW * 0.09),
      new Vector3(0, -P.upperLeg * 0.4, P.hipBoneW * 0.08),
      new Vector3(0, -P.upperLeg * 0.5, P.hipBoneW * 0.03),
      new Vector3(0, -P.upperLeg * 0.56, -P.hipBoneW * 0.05),
      new Vector3(0, -P.upperLeg * 0.6, -P.hipBoneW * 0.12),`,
    'tail length restored',
  ],
  [
    `        {/* Monkey: small rounded kneecap for joint definition */}
        {isMonkey && (
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7a5434', 0.55)}
            scale={[P.kneeR * 1.1, P.kneeR * 0.95, P.kneeR * 1.05]}
            position={[0, -P.lowerLeg * 0.02, P.kneeR * 0.5]} />
        )}

        {/* Hacker cargo pockets + neon-green side stripes on the leg */}`,
    `        {/* Hacker cargo pockets + neon-green side stripes on the leg */}`,
    'kneecap removed',
  ],
  [
    `        ) : isMonkey ? (
          <>
            {/* Monkey shin — slim with a subtle calf swell */}
            <mesh geometry={latheGeo([
              [P.ankleR * 0.78, -P.lowerLeg],
              [P.ankleR * 0.8, -P.lowerLeg * 0.9],
              [P.ankleR * 0.88, -P.lowerLeg * 0.7],
              [P.kneeR * 0.82, -P.lowerLeg * 0.35],
              [P.kneeR * 0.85, -P.lowerLeg * 0.2],
              [P.kneeR * 0.8, 0],
            ])} material={calfMat} castShadow />
          </>
        ) : (
          <>
            {/* Shin — top radius matches thigh bottom exactly */}
            <mesh geometry={latheGeo([
              [P.ankleR * eM, -P.lowerLeg],
              [P.ankleR * 1.02 * eM, -P.lowerLeg * 0.9],
              [P.ankleR * 1.1 * eM, -P.lowerLeg * 0.7],
              [P.kneeR * 1.08 * eM, -P.lowerLeg * 0.35],
              [P.kneeR * 1.1 * eM, -P.lowerLeg * 0.2],
              [P.kneeR * eM, 0],
            ])} material={isRobot ? robotDark : calfMat} castShadow />
          </>
        )}`,
    `        ) : (
          <>
            {/* Shin — top radius matches thigh bottom exactly */}
            <mesh geometry={latheGeo([
              [P.ankleR * eM, -P.lowerLeg],
              [P.ankleR * 1.02 * eM, -P.lowerLeg * 0.9],
              [P.ankleR * 1.1 * eM, -P.lowerLeg * 0.7],
              [P.kneeR * 1.08 * eM, -P.lowerLeg * 0.35],
              [P.kneeR * 1.1 * eM, -P.lowerLeg * 0.2],
              [P.kneeR * eM, 0],
            ])} material={isRobot ? robotDark : calfMat} castShadow />
          </>
        )}`,
    'monkey shin removed',
  ],
  [
    `      ) : isMonkey ? (
        <>
          {/* Monkey thigh — slimmer, organic taper with a defined knee swell */}
          <mesh geometry={latheGeo([
            [P.kneeR * 0.82, -P.upperLeg],
            [P.kneeR * 0.95, -P.upperLeg * 0.88],
            [P.thighR * 0.78, -P.upperLeg * 0.6],
            [P.thighR * 0.88, -P.upperLeg * 0.35],
            [P.thighR * 0.96, -P.upperLeg * 0.15],
            [P.thighR * 0.9, 0],
          ])} material={legMat} castShadow />
        </>
      ) : (
        <>
          {/* Thigh — lathe profile bottom→top (ascending Y) */}
          <mesh geometry={latheGeo([
            [P.kneeR * eM, -P.upperLeg],
            [P.kneeR * 1.05 * eM, -P.upperLeg * 0.88],
            [P.thighR * 1.0 * eM, -P.upperLeg * 0.6],
            [P.thighR * 1.12 * eM, -P.upperLeg * 0.35],
            [P.thighR * 1.18 * eM, -P.upperLeg * 0.15],
            [P.thighR * 1.15 * eM, 0],
          ])} material={isRobot ? robotDark : legMat} castShadow />
        </>
      )}`,
    `      ) : (
        <>
          {/* Thigh — lathe profile bottom→top (ascending Y) */}
          <mesh geometry={latheGeo([
            [P.kneeR * eM, -P.upperLeg],
            [P.kneeR * 1.05 * eM, -P.upperLeg * 0.88],
            [P.thighR * 1.0 * eM, -P.upperLeg * 0.6],
            [P.thighR * 1.12 * eM, -P.upperLeg * 0.35],
            [P.thighR * 1.18 * eM, -P.upperLeg * 0.15],
            [P.thighR * 1.15 * eM, 0],
          ])} material={isRobot ? robotDark : legMat} castShadow />
        </>
      )}`,
    'monkey thigh removed',
  ],
  [
    `          ) : isMonkey ? (
            /* Monkey hand — five long dexterous fingers with knuckles + a light palm pad */
            <>
              {[-P.wristR * 0.62, -P.wristR * 0.31, 0, P.wristR * 0.31, P.wristR * 0.62].map((fx, i) => (
                <group key={'mf' + i} position={[fx, -P.handLen * 0.42, P.wristR * 0.05]} rotation={[0.25, 0, (i - 2) * 0.06]}>
                  {/* knuckle */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.1, P.wristR * 0.12, P.wristR * 0.11]} position={[0, -P.handLen * 0.03, 0]} />
                  {/* long finger */}
                  <mesh geometry={taperGeo(P.wristR * 0.1, P.wristR * 0.055, P.handLen * 0.32)} material={gloveM} position={[0, -P.handLen * 0.17, 0]} />
                  {/* rounded fingertip */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.075, P.wristR * 0.085, P.wristR * 0.08]} position={[0, -P.handLen * 0.32, 0]} />
                </group>
              ))}
              {/* lighter palm pad — soft dexterous grip */}
              <mesh geometry={sphereGeo(1)} material={sharedMaterial('#e8c9a2', 0.7)}
                scale={[P.wristR * 0.55, P.wristR * 0.5, P.wristR * 0.35]} position={[0, -P.handLen * 0.26, P.wristR * 0.55]} />
            </>
          ) : (
            [-P.wristR * 0.55, -P.wristR * 0.18, P.wristR * 0.18, P.wristR * 0.5].map((fx, i) => (`,
    `          ) : (
            [-P.wristR * 0.55, -P.wristR * 0.18, P.wristR * 0.18, P.wristR * 0.5].map((fx, i) => (`,
    'monkey hand removed',
  ],
  [
    `        {/* Soft elbow joint — rounds the upper-arm/forearm junction */}
        {isElephant && (
          <mesh geometry={sphereGeo(1)} material={skin} scale={[eArmElbowR * 1.2, eArmElbowR * 1.05, eArmElbowR * 1.2]}
            position={[0, -P.lowerArm * 0.02 * eArmY, 0]} />
        )}
        {/* Monkey: rounded elbow joint for definition */}
        {isMonkey && (
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7a5434', 0.55)}
            scale={[P.elbowR * 1.15, P.elbowR * 1.0, P.elbowR * 1.12]}
            position={[0, -P.lowerArm * 0.04, P.wristR * 0.35]} />
        )}`,
    `        {/* Soft elbow joint — rounds the upper-arm/forearm junction */}
        {isElephant && (
          <mesh geometry={sphereGeo(1)} material={skin} scale={[eArmElbowR * 1.2, eArmElbowR * 1.05, eArmElbowR * 1.2]}
            position={[0, -P.lowerArm * 0.02 * eArmY, 0]} />
        )}`,
    'monkey elbow removed',
  ],
  [
    `        ) : isMonkey ? (
          <mesh geometry={latheGeo([
            [P.wristR * 0.78, -P.lowerArm],
            [P.wristR * 0.82, -P.lowerArm * 0.9],
            [P.wristR * 0.92, -P.lowerArm * 0.7],
            [P.elbowR * 0.85, -P.lowerArm * 0.35],
            [P.elbowR * 0.88, -P.lowerArm * 0.2],
            [P.elbowR * 0.8, 0],
          ])} material={skin} castShadow />
        ) : (
          <mesh geometry={latheGeo([
            [P.wristR * (isAngel ? 1.3 : 1), -P.lowerArm],
            [P.wristR * (isAngel ? 1.25 : 1.02), -P.lowerArm * 0.9],
            [P.wristR * (isAngel ? 1.4 : 1.15), -P.lowerArm * 0.7],
            [P.elbowR * 1.05, -P.lowerArm * 0.35],
            [P.elbowR * 1.08, -P.lowerArm * 0.2],
            [P.elbowR, 0],
          ])} material={isAngel ? topM : isSunflower ? sharedMaterial('#5caa3a', 0.65) : skin} castShadow />
        )}`,
    `        ) : (
          <mesh geometry={latheGeo([
            [P.wristR * (isAngel ? 1.3 : 1), -P.lowerArm],
            [P.wristR * (isAngel ? 1.25 : 1.02), -P.lowerArm * 0.9],
            [P.wristR * (isAngel ? 1.4 : 1.15), -P.lowerArm * 0.7],
            [P.elbowR * 1.05, -P.lowerArm * 0.35],
            [P.elbowR * 1.08, -P.lowerArm * 0.2],
            [P.elbowR, 0],
          ])} material={isAngel ? topM : isSunflower ? sharedMaterial('#5caa3a', 0.65) : skin} castShadow />
        )}`,
    'monkey forearm removed',
  ],
  [
    `      ) : isMonkey ? (
        <mesh geometry={latheGeo([
          [P.elbowR * 0.8, -P.upperArm],
          [P.elbowR * 0.88, -P.upperArm * 0.85],
          [P.shoulderR * 0.92, -P.upperArm * 0.58],
          [P.shoulderR * 1.12, -P.upperArm * 0.3],
          [P.shoulderR * 1.28, -P.upperArm * 0.08],
          [P.shoulderR * 1.22, P.upperArm * 0.06],
          [P.shoulderR * 0.95, P.upperArm * 0.16],
          [P.shoulderR * 0.5, P.upperArm * 0.24],
          [P.shoulderR * 0.12, P.upperArm * 0.3],
        ])} material={armM} castShadow />
      ) : (
        <mesh geometry={latheGeo([
          [P.elbowR, -P.upperArm],
          [P.elbowR * 1.08, -P.upperArm * 0.85],
          [P.shoulderR * 1.3, -P.upperArm * 0.58],
          [P.shoulderR * 1.6, -P.upperArm * 0.3],
          [P.shoulderR * 1.8, -P.upperArm * 0.08],
          [P.shoulderR * 1.7, P.upperArm * 0.06],
          [P.shoulderR * 1.3, P.upperArm * 0.16],
          [P.shoulderR * 0.7, P.upperArm * 0.24],
          [P.shoulderR * 0.15, P.upperArm * 0.3],
        ])} material={armM} castShadow />
      )}`,
    `      ) : (
        <mesh geometry={latheGeo([
          [P.elbowR, -P.upperArm],
          [P.elbowR * 1.08, -P.upperArm * 0.85],
          [P.shoulderR * 1.3, -P.upperArm * 0.58],
          [P.shoulderR * 1.6, -P.upperArm * 0.3],
          [P.shoulderR * 1.8, -P.upperArm * 0.08],
          [P.shoulderR * 1.7, P.upperArm * 0.06],
          [P.shoulderR * 1.3, P.upperArm * 0.16],
          [P.shoulderR * 0.7, P.upperArm * 0.24],
          [P.shoulderR * 0.15, P.upperArm * 0.3],
        ])} material={armM} castShadow />
      )}`,
    'monkey upper arm removed',
  ],
  [
    `      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.14, r * 0.16, r * 0.14]} position={[0, r * 1.24, r * 0.4]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.12, r * 0.1]} position={[-r * 0.08, r * 1.3, r * 0.35]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.12, r * 0.1]} position={[r * 0.08, r * 1.3, r * 0.35]} />`,
    `      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.14, r * 0.14, r * 0.14]} position={[0, r * 1.0, r * 0.35]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[-r * 0.08, r * 1.05, r * 0.3]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[r * 0.08, r * 1.05, r * 0.3]} />`,
    'tuft restored',
  ],
  [
    `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.14, r * 0.1, r * 0.05]} position={[sx * r * 0.55, -r * 0.08, r * 1.1]} />`,
    `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.13, r * 0.09, r * 0.05]} position={[sx * r * 0.52, -r * 0.1, r * 0.92]} />`,
    'blush restored',
  ],
  [
    `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.08]} position={[0, -r * 0.54, r * 1.06]} />`,
    `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.08]} position={[0, -r * 0.52, r * 1.12]} />`,
    'lower lip restored',
  ],
  [
    `      {[-0.12, -0.06, 0, 0.06, 0.12].map((dx, i) => (
        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.055 : 0.05), r * 0.034, r * 0.028]}
          position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.55, r * 1.1]} />
      ))}`,
    `      {[-0.09, -0.045, 0, 0.045, 0.09].map((dx, i) => (
        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.032, r * 0.025]}
          position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.7, r * 1.17]} />
      ))}`,
    'smile restored',
  ],
  [
    `      {/* soft flat muzzle — wide and flat like a real monkey's nose/mouth area */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.42, r * 0.26, r * 0.2]} position={[0, -r * 0.3, r * 0.88]} />

      {/* small dark nose — flat button on the muzzle */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.14, r * 0.09, r * 0.1]} position={[0, -r * 0.28, r * 1.06]} />

      {/* nostrils — two tiny dots */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.032, r * 0.028, r * 0.012]} position={[-r * 0.05, -r * 0.28, r * 1.13]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.032, r * 0.028, r * 0.012]} position={[r * 0.05, -r * 0.28, r * 1.13]} />`,
    `      {/* soft muzzle — gently raised tan oval around the nose and mouth */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.34, r * 0.3, r * 0.26]} position={[0, -r * 0.28, r * 0.92]} />

      {/* small dark nose — slightly protruding on the muzzle */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.13, r * 0.1, r * 0.12]} position={[0, -r * 0.26, r * 1.1]} />

      {/* nostrils — two tiny dots */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.03, r * 0.03, r * 0.012]} position={[-r * 0.045, -r * 0.26, r * 1.19]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.03, r * 0.03, r * 0.012]} position={[r * 0.045, -r * 0.26, r * 1.19]} />`,
    'muzzle + nose + nostrils restored',
  ],
  [
    `          scale={[r * 0.15, r * 0.08, r * 0.12]} position={[sx * r * 0.32, r * 0.34, r * 0.95]} rotation={[0, 0, sx * -0.18]} />`,
    `          scale={[r * 0.14, r * 0.08, r * 0.12]} position={[sx * r * 0.3, r * 0.3, r * 0.95]} rotation={[0, 0, sx * -0.15]} />`,
    'brows restored',
  ],
  [
    `          {/* white sclera — almond shape, wider than tall */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.28, r * 0.22, r * 0.12]} />
          {/* dark limbal ring around the iris */}
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#3a2413', 0.5)} scale={[r * 0.18, r * 0.14, r * 0.1]} position={[0, 0, r * 0.02]} />
          {/* warm brown iris */}
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7a4a1e', 0.55)} scale={[r * 0.16, r * 0.125, r * 0.11]} position={[0, 0, r * 0.03]} />
          {/* dark pupil */}
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.085, r * 0.07, r * 0.11]} position={[0, 0, r * 0.04]} />
          {/* big top catchlight */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.055, r * 0.055, r * 0.1]} position={[sx * -r * 0.025, r * 0.04, r * 0.05]} />
          {/* small secondary catchlight */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.028, r * 0.028, r * 0.09]} position={[sx * r * 0.015, -r * 0.03, r * 0.05]} />`,
    `          {/* white sclera — big and round */}
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
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.028, r * 0.028, r * 0.09]} position={[sx * r * 0.015, -r * 0.03, r * 0.05]} />`,
    'eyes restored',
  ],
  [
    `        <group key={\`eye\${sx}\`} position={[sx * r * 0.3, r * 0.08, r * 1.02]} rotation={[0, 0, sx * -0.1]}>`,
    `        <group key={\`eye\${sx}\`} position={[sx * r * 0.3, r * 0.08, r * 1.02]}>`,
    'eye tilt removed',
  ],
  [
    `          <mesh geometry={sphereGeo(1)} material={inner} scale={[r * 0.34, r * 0.44, r * 0.08]} position={[sx * -r * 0.02, -r * 0.02, r * 0.05]} />`,
    `          <mesh geometry={sphereGeo(1)} material={inner} scale={[r * 0.26, r * 0.34, r * 0.06]} position={[sx * -r * 0.02, -r * 0.02, r * 0.05]} />`,
    'inner ear restored',
  ],
  [
    `          <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 0.52, r * 0.64, r * 0.13]} />`,
    `          <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 0.4, r * 0.5, r * 0.1]} />`,
    'outer ear restored',
  ],
  [
    `        <group key={\`ear\${sx}\`} position={[sx * r * 1.18, r * 0.32, -r * 0.08]} rotation={[0.12, sx * -0.08, sx * 0.14]}>`,
    `        <group key={\`ear\${sx}\`} position={[sx * r * 1.0, r * 0.3, -r * 0.05]} rotation={[0.12, sx * -0.08, sx * 0.14]}>`,
    'ear position restored',
  ],
  [
    `      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.68, r * 0.82, r * 0.6]} position={[0, -r * 0.12, r * 0.5]} />`,
    `      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.7, r * 0.7, r * 0.62]} position={[0, -r * 0.06, r * 0.5]} />`,
    'face mask restored',
  ],
  [
    `      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.08, r * 1.16, r * 1.04]} castShadow />`,
    `      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.1, r * 1.05, r * 1.02]} castShadow />`,
    'skull restored',
  ],
]

for (const [after, before, label] of pairs) {
  replace(after, before, label)
}

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/${4 + pairs.length} patches applied`)
