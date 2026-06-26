import { useMemo } from 'react'
import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three'
import { platforms, PLAT_Z0, PLAT_LEN, CANOPY_H } from './layout'
import { TRAIN_LINES, type TrainLine } from '../../lib/train/lines'
import { MAT } from './assets'

// Per-platform identity: a hanging "PLATFORM n" gateway board at the mouth, a big
// painted platform NUMBER on the floor, a destination sign mid-way down, a round
// station clock on a bracket, and a single warm accent light tinted to the line's
// mood — so each platform reads as unmistakably its own the moment you turn onto
// it. Each is given a slightly different prop rhythm (sign heights, number) so no
// two feel identical. The big live departure board (with countdowns) is a
// separate, dynamic module; these signs are static identity.

function signTexture(line: TrainLine): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')!
  // enamel sign in the line's accent, cream lettering
  ctx.fillStyle = line.mood.glow
  ctx.fillRect(0, 0, 512, 256)
  ctx.fillStyle = 'rgba(0,0,0,0.78)'
  ctx.fillRect(10, 10, 492, 236)
  ctx.fillStyle = '#f3e2bf'
  ctx.textAlign = 'center'
  ctx.font = 'bold 92px Georgia, serif'
  ctx.fillText(`PLATFORM ${line.platform}`, 256, 96)
  ctx.font = 'bold 54px Georgia, serif'
  ctx.fillStyle = line.mood.glow
  ctx.fillText(line.name.toUpperCase(), 256, 168)
  ctx.font = 'italic 34px Georgia, serif'
  ctx.fillStyle = '#d9c9a6'
  ctx.fillText(`to ${line.destination}`, 256, 216)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** A big painted platform number for the floor, in the line's accent ring. */
function numberTexture(line: TrainLine): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 256, 256)
  ctx.strokeStyle = line.mood.glow
  ctx.lineWidth = 14
  ctx.beginPath()
  ctx.arc(128, 128, 104, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#f3e2bf'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 150px Georgia, serif'
  ctx.fillText(`${line.platform}`, 128, 138)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function clockTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#f3ead4'
  ctx.beginPath()
  ctx.arc(128, 128, 124, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.fillStyle = '#1a1a1a'
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const x = 128 + Math.sin(a) * 100
    const y = 128 - Math.cos(a) * 100
    ctx.beginPath()
    ctx.arc(x, y, i % 3 === 0 ? 7 : 4, 0, Math.PI * 2)
    ctx.fill()
  }
  // static hands (cosmetic — the live time is on the departure board)
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(128, 128)
  ctx.lineTo(128 + 46, 128 - 30)
  ctx.stroke()
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(128, 128)
  ctx.lineTo(128 - 18, 128 - 82)
  ctx.stroke()
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

export function Platforms({ accentLights }: { accentLights: number }) {
  const signs = useMemo(() => TRAIN_LINES.map(signTexture), [])
  const numbers = useMemo(() => TRAIN_LINES.map(numberTexture), [])
  const clock = useMemo(clockTexture, [])
  const geo = platforms()

  return (
    <group>
      {geo.map((p, i) => {
        const line = TRAIN_LINES[i]
        const midZ = PLAT_Z0 + PLAT_LEN * 0.5
        // give each platform a slightly different rhythm so none feel identical
        const signZ = PLAT_Z0 + PLAT_LEN * (0.66 + (i % 3) * 0.06)
        return (
          <group key={p.index}>
            {/* gateway board hung across the platform mouth */}
            <group position={[p.platformX, 3.8, PLAT_Z0 + 2.4]}>
              <mesh material={MAT.teakDark()}>
                <boxGeometry args={[4.8, 2.4, 0.25]} />
              </mesh>
              <mesh position={[0, 0, 0.14]}>
                <planeGeometry args={[4.5, 2.1]} />
                <meshStandardMaterial map={signs[i]} emissive={line.mood.glow} emissiveMap={signs[i]} emissiveIntensity={0.55} toneMapped={false} />
              </mesh>
              {/* hanger rods to the canopy */}
              {[-1.9, 1.9].map((dx) => (
                <mesh key={dx} position={[dx, (CANOPY_H - 3.8) / 2, 0]} material={MAT.iron()}>
                  <cylinderGeometry args={[0.05, 0.05, CANOPY_H - 3.8, 6]} />
                </mesh>
              ))}
            </group>

            {/* big painted platform number on the floor near the mouth */}
            <mesh rotation-x={-Math.PI / 2} position={[p.platformX, 0.03, PLAT_Z0 + 8]}>
              <planeGeometry args={[3.0, 3.0]} />
              <meshStandardMaterial map={numbers[i]} transparent emissive={line.mood.glow} emissiveMap={numbers[i]} emissiveIntensity={0.25} toneMapped={false} depthWrite={false} />
            </mesh>

            {/* round station clock on a bracket off the track-edge, mid-platform */}
            <group position={[p.eastX - 0.3, 4.6, midZ]}>
              <mesh rotation-y={-Math.PI / 2}>
                <circleGeometry args={[0.95, 28]} />
                <meshStandardMaterial map={clock} emissive={'#fff4d8'} emissiveIntensity={0.25} toneMapped={false} side={DoubleSide} />
              </mesh>
              <mesh position={[0.16, 0, 0]} rotation-z={Math.PI / 2} material={MAT.iron()}>
                <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
              </mesh>
            </group>

            {/* small destination sign further down the platform — raised well clear
                of the avatar's head (sign underside ≈4.1 m, far above EYE_HEIGHT) on
                a post that runs all the way to the floor. */}
            <group position={[p.platformX, 4.5, signZ]}>
              <mesh material={MAT.iron()}>
                <boxGeometry args={[3.4, 0.8, 0.14]} />
              </mesh>
              <mesh position={[0, 0, 0.09]}>
                <planeGeometry args={[3.1, 0.55]} />
                <meshStandardMaterial map={signs[i]} emissiveMap={signs[i]} emissive={'#ffffff'} emissiveIntensity={0.3} toneMapped={false} />
              </mesh>
              {/* post — base at floor (group is at y=4.5, post centre 2.1 below it) */}
              <mesh position={[0, -2.25, 0]} material={MAT.iron()}>
                <cylinderGeometry args={[0.08, 0.1, 4.1, 8]} />
              </mesh>
            </group>

            {/* one warm accent light per platform, tinted to the line mood */}
            {i < accentLights && (
              <pointLight position={[p.platformX, 5.6, midZ]} color={line.mood.glow} intensity={16} distance={30} decay={2} />
            )}
            {/* a cheap always-on emissive glow disc so the mood reads even with 0 real lights */}
            <mesh rotation-x={-Math.PI / 2} position={[p.platformX, 0.045, midZ]}>
              <circleGeometry args={[2.6, 24]} />
              <meshBasicMaterial color={line.mood.glow} transparent opacity={0.05} toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
