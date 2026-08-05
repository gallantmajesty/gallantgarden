import fs from 'node:fs'
const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let s = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')

const needle = `      {/* structured seed ring — brown seeds circling the face edge like a real seed disc */}
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
          <mesh key={\`sd\${i}\`} geometry={sphereGeo(1)} material={dark}
            scale={[r * 0.04, r * 0.04, r * 0.03]}
            position={[Math.cos(a) * dist, Math.sin(a) * dist * 0.7, fz * 0.8]} />
        )
      })}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.7
        const dist = r * 0.42
        return (
          <mesh key={\`sd2\${i}\`} geometry={sphereGeo(1)} material={dark}
            scale={[r * 0.03, r * 0.03, r * 0.02]}
            position={[Math.cos(a) * dist, Math.sin(a) * dist * 0.7, fz * 0.84]} />
        )
      })}`

const repl = `      {/* spiral seed texture — two rings of dark seeds circling the face edge */}
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
      })}`

if (s.includes(needle)) {
  s = s.replace(needle, repl)
  fs.writeFileSync(FILE, s.replace(/\n/g, '\r\n'))
  console.log('ok: spiral seed rings')
} else {
  console.log('MISS')
}
