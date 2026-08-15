import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { CanvasTexture, CatmullRomCurve3, DoubleSide, SRGBColorSpace, Vector3 } from 'three'
import { CAFE_PALETTE } from './materials'

function useScrollTexture(text: string, subtitle: string, landscape = false): CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = landscape ? 768 : 384
    canvas.height = landscape ? 384 : 768
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas rendering is required for Chinese café art')

    const paper = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    paper.addColorStop(0, '#eee2c8')
    paper.addColorStop(0.5, '#d8c6a4')
    paper.addColorStop(1, '#ead9ba')
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = 'rgba(80,57,35,0.12)'
    ctx.lineWidth = 1
    for (let i = 0; i < 120; i++) {
      const y = (i * 67) % canvas.height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(canvas.width * 0.3, y + Math.sin(i) * 6, canvas.width * 0.7, y - Math.cos(i) * 5, canvas.width, y)
      ctx.stroke()
    }

    if (landscape) {
      const ink = ['rgba(27,39,34,0.82)', 'rgba(43,61,51,0.58)', 'rgba(77,87,68,0.42)']
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = ink[layer]
        ctx.beginPath()
        ctx.moveTo(0, canvas.height)
        for (let x = 0; x <= canvas.width; x += 24) {
          const peak = 180 - layer * 32
          const y = canvas.height - 42 - layer * 44 - Math.abs(Math.sin(x * 0.011 + layer * 1.7)) * peak - Math.sin(x * 0.037) * 22
          ctx.lineTo(x, y)
        }
        ctx.lineTo(canvas.width, canvas.height)
        ctx.closePath()
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(28,36,31,0.6)'
      ctx.lineWidth = 5
      for (let i = 0; i < 7; i++) {
        const x = 70 + i * 103
        ctx.beginPath()
        ctx.moveTo(x, 315)
        ctx.quadraticCurveTo(x - 12, 245 - (i % 3) * 20, x + 8, 190)
        ctx.stroke()
        for (let j = 0; j < 5; j++) {
          ctx.beginPath()
          ctx.moveTo(x, 225 + j * 14)
          ctx.lineTo(x + (j % 2 ? -34 : 34), 205 + j * 13)
          ctx.stroke()
        }
      }
      ctx.fillStyle = '#3c3328'
      ctx.font = '600 30px "Noto Serif SC", "Microsoft YaHei", SimSun, serif'
      ctx.fillText(text, 42, 58)
      ctx.font = '18px Georgia, serif'
      ctx.fillText(subtitle, 44, 88)
    } else {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#29251f'
      ctx.font = '700 72px "Noto Serif SC", "Microsoft YaHei", SimSun, serif'
      const chars = Array.from(text)
      chars.forEach((char, index) => ctx.fillText(char, canvas.width / 2, 145 + index * 112))
      ctx.fillStyle = '#675844'
      ctx.font = '20px Georgia, serif'
      ctx.save()
      ctx.translate(42, canvas.height - 60)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(subtitle, 0, 0)
      ctx.restore()
    }

    ctx.fillStyle = '#9e3027'
    ctx.fillRect(canvas.width - 78, canvas.height - 82, 46, 46)
    ctx.strokeStyle = '#e0b994'
    ctx.lineWidth = 3
    ctx.strokeRect(canvas.width - 70, canvas.height - 74, 30, 30)
    ctx.beginPath()
    ctx.moveTo(canvas.width - 67, canvas.height - 58)
    ctx.lineTo(canvas.width - 43, canvas.height - 58)
    ctx.moveTo(canvas.width - 55, canvas.height - 70)
    ctx.lineTo(canvas.width - 55, canvas.height - 44)
    ctx.stroke()

    const result = new CanvasTexture(canvas)
    result.colorSpace = SRGBColorSpace
    return result
  }, [landscape, subtitle, text])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function HangingScroll({ position, rotationY = 0, text, subtitle, scale = 1 }: { position: [number, number, number]; rotationY?: number; text: string; subtitle: string; scale?: number }) {
  const texture = useScrollTexture(text, subtitle)
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh castShadow>
        <planeGeometry args={[1.75, 3.45]} />
        <meshStandardMaterial map={texture} roughness={0.82} side={DoubleSide} />
      </mesh>
      {[-1.82, 1.82].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 2.05, 16]} />
            <meshStandardMaterial color="#3b2214" roughness={0.5} />
          </mesh>
          <mesh position={[-1.08, 0, 0]}><sphereGeometry args={[0.08, 12, 8]} /><meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.65} roughness={0.3} /></mesh>
          <mesh position={[1.08, 0, 0]}><sphereGeometry args={[0.08, 12, 8]} /><meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.65} roughness={0.3} /></mesh>
        </group>
      ))}
    </group>
  )
}

function InkPainting({ position, rotationY = 0, title }: { position: [number, number, number]; rotationY?: number; title: string }) {
  const texture = useScrollTexture(title, 'mountains after rain', true)
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[5.4, 2.75, 0.18]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color="#302117" roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, 0, 0.105]}>
        <planeGeometry args={[5.05, 2.42]} />
        <meshStandardMaterial map={texture} roughness={0.88} />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[5.8, 0.08, 0.08]} />
        <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.67} roughness={0.3} />
      </mesh>
    </group>
  )
}

function GuardianLion({ side }: { side: -1 | 1 }) {
  const stone = '#70766f'
  const dark = '#555c56'
  return (
    <group position={[side * 4.55, 0, 24.25]} rotation={[0, side < 0 ? 0.22 : -0.22, 0]} scale={0.86}>
      <RoundedBox args={[1.55, 0.55, 1.75]} radius={0.12} smoothness={5} position={[0, 0.28, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#4e5550" roughness={0.96} />
      </RoundedBox>
      <RoundedBox args={[1.3, 0.24, 1.45]} radius={0.08} smoothness={4} position={[0, 0.68, 0]} castShadow>
        <meshStandardMaterial color="#798079" roughness={0.93} />
      </RoundedBox>
      <mesh position={[0, 1.42, 0.12]} castShadow>
        <capsuleGeometry args={[0.48, 0.8, 10, 24]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.35, -0.02]} castShadow>
        <sphereGeometry args={[0.62, 28, 20]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.59, 2.35 + Math.sin(a) * 0.45, -0.02]} scale={[1, 0.82, 0.72]} castShadow>
            <sphereGeometry args={[0.19, 14, 10]} />
            <meshStandardMaterial color={dark} roughness={0.94} />
          </mesh>
        )
      })}
      <mesh position={[0, 2.22, -0.58]} scale={[1.2, 0.85, 0.75]} castShadow>
        <sphereGeometry args={[0.34, 20, 14]} />
        <meshStandardMaterial color="#858b84" roughness={0.92} />
      </mesh>
      {[-0.22, 0.22].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.49, -0.53]}><sphereGeometry args={[0.09, 16, 12]} /><meshStandardMaterial color="#ddd3b9" roughness={0.35} /></mesh>
          <mesh position={[x, 2.5, -0.6]}><sphereGeometry args={[0.035, 12, 8]} /><meshBasicMaterial color="#161816" /></mesh>
        </group>
      ))}
      <mesh position={[0, 2.1, -0.85]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.035, 10, 22, Math.PI]} />
        <meshStandardMaterial color="#3a3d39" roughness={0.85} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.85, -0.52]} scale={[1.2, 0.7, 1.45]} castShadow>
          <sphereGeometry args={[0.31, 18, 12]} />
          <meshStandardMaterial color={stone} roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[side * 0.42, 0.93, -0.72]} castShadow>
        <sphereGeometry args={[0.35, 22, 16]} />
        <meshStandardMaterial color={side < 0 ? '#5b625c' : '#6e746d'} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.55, 0.49]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.35, 0.085, 12, 32]} />
        <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.52} roughness={0.42} />
      </mesh>
    </group>
  )
}

function BronzeCrane({ position, mirror = false }: { position: [number, number, number]; mirror?: boolean }) {
  const neck = useMemo(() => new CatmullRomCurve3([
    new Vector3(0, 1.25, 0),
    new Vector3(mirror ? -0.18 : 0.18, 1.75, 0),
    new Vector3(mirror ? 0.08 : -0.08, 2.25, 0),
    new Vector3(mirror ? 0.3 : -0.3, 2.7, -0.05),
  ]), [mirror])
  const bronze = '#5f745d'
  return (
    <group position={position} scale={0.8}>
      <mesh position={[0, 1.0, 0]} scale={[0.75, 1, 0.55]} castShadow>
        <sphereGeometry args={[0.52, 24, 16]} />
        <meshStandardMaterial color={bronze} metalness={0.68} roughness={0.42} />
      </mesh>
      <mesh castShadow><tubeGeometry args={[neck, 28, 0.1, 12, false]} /><meshStandardMaterial color={bronze} metalness={0.68} roughness={0.42} /></mesh>
      <mesh position={[mirror ? 0.3 : -0.3, 2.72, -0.05]} castShadow>
        <sphereGeometry args={[0.19, 18, 12]} />
        <meshStandardMaterial color="#74826c" metalness={0.62} roughness={0.42} />
      </mesh>
      <mesh position={[mirror ? 0.58 : -0.58, 2.68, -0.05]} rotation={[0, 0, mirror ? Math.PI / 2 : -Math.PI / 2]}>
        <coneGeometry args={[0.075, 0.55, 12]} />
        <meshStandardMaterial color="#a28348" metalness={0.6} roughness={0.38} />
      </mesh>
      {[-0.15, 0.15].map((x, index) => (
        <group key={x} position={[x, 0.46, 0]} rotation={[0, 0, index ? -0.1 : 0.1]}>
          <mesh><cylinderGeometry args={[0.035, 0.045, 1.0, 12]} /><meshStandardMaterial color="#836b42" metalness={0.62} roughness={0.36} /></mesh>
          <mesh position={[0, -0.52, -0.08]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.1, 0.38, 10]} /><meshStandardMaterial color="#836b42" metalness={0.62} roughness={0.36} /></mesh>
        </group>
      ))}
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.7, 0.82, 0.16, 24]} /><meshStandardMaterial color="#3d4c43" metalness={0.55} roughness={0.48} /></mesh>
    </group>
  )
}

function ScholarStatue() {
  return (
    <group position={[0, 5.48, -25.85]} scale={0.9}>
      <RoundedBox args={[2.2, 0.42, 1.55]} radius={0.12} smoothness={4} position={[0, 0.22, 0]} castShadow>
        <meshStandardMaterial color="#3d4d44" metalness={0.5} roughness={0.48} />
      </RoundedBox>
      <mesh position={[0, 1.4, 0]} castShadow>
        <coneGeometry args={[0.82, 2.2, 28]} />
        <meshStandardMaterial color="#536759" metalness={0.58} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <sphereGeometry args={[0.38, 24, 18]} />
        <meshStandardMaterial color="#69776a" metalness={0.52} roughness={0.52} />
      </mesh>
      <mesh position={[0, 3.02, 0.04]}>
        <cylinderGeometry args={[0.31, 0.37, 0.22, 20]} />
        <meshStandardMaterial color="#33453c" metalness={0.6} roughness={0.43} />
      </mesh>
      <mesh position={[0, 1.85, -0.7]} rotation={[0.12, 0, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 1.25, 18]} />
        <meshStandardMaterial color="#a1844e" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.85, -0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[1.4, 0.52, 0.08]} />
        <meshStandardMaterial color="#a78755" roughness={0.48} />
      </mesh>
    </group>
  )
}

function CarvedPanel({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[3.4, 3.4, 0.18]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color="#3c2416" roughness={0.58} />
      </RoundedBox>
      {[0.55, 1.0, 1.45].map((radius) => (
        <mesh key={radius} position={[0, 0, 0.12]}>
          <torusGeometry args={[radius, 0.035, 8, 48]} />
          <meshStandardMaterial color={radius === 1 ? CAFE_PALETTE.brass : '#7d5632'} metalness={radius === 1 ? 0.55 : 0.05} roughness={0.45} />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.14]} rotation={[0, 0, a]}>
            <boxGeometry args={[1.4, 0.07, 0.05]} />
            <meshStandardMaterial color="#a47a42" roughness={0.42} />
          </mesh>
        )
      })}
    </group>
  )
}

export function ChineseCafeCulture() {
  return (
    <group>
      <GuardianLion side={-1} />
      <GuardianLion side={1} />
      <BronzeCrane position={[-5.5, 0.72, 9.55]} />
      <BronzeCrane position={[5.5, 0.72, 9.55]} mirror />
      <ScholarStatue />

      <HangingScroll position={[20.42, 3.75, -12]} rotationY={-Math.PI / 2} text="静心笃学" subtitle="Calm mind · diligent study" scale={0.92} />
      <HangingScroll position={[20.42, 3.75, -4.6]} rotationY={-Math.PI / 2} text="茶香书韵" subtitle="Tea fragrance · books" scale={0.92} />
      <HangingScroll position={[20.42, 3.75, 12.8]} rotationY={-Math.PI / 2} text="宁静致远" subtitle="Tranquility carries far" scale={0.92} />

      <InkPainting position={[-10.2, 7.7, -27.35]} title="山水清音" />
      <InkPainting position={[10.2, 7.7, -27.35]} title="雨后江南" />

      <CarvedPanel position={[20.42, 7.8, -8.3]} rotationY={-Math.PI / 2} />
      <CarvedPanel position={[20.42, 7.8, 8.3]} rotationY={-Math.PI / 2} />
    </group>
  )
}
