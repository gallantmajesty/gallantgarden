// Cozy cute modern-Korean café showcase — a 360° environment that surrounds the
// character in the avatar editor. An enclosing round room (wood-wainscot wall +
// shallow cone roof) holds warm wooden tables & chairs, a coffee counter with bar
// stools, a chalkboard menu, framed wall art, glowing pendant lights, plants and
// daylight windows. Procedural Canvas textures give the surfaces a realistic feel.

import { useMemo } from 'react'
import * as THREE from 'three'

const texCache = new Map<string, THREE.Texture>()
function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const hit = texCache.get(key)
  if (hit) return hit
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  draw(ctx)
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

function woodTexture(tint = '#7a5230') {
  return canvasTex('wood:' + tint, 256, 256, (c) => {
    c.fillStyle = tint
    c.fillRect(0, 0, 256, 256)
    for (let p = 0; p < 256; p += 32) {
      c.fillStyle = 'rgba(0,0,0,0.10)'
      c.fillRect(0, p, 256, 2)
      c.fillStyle = 'rgba(255,255,255,0.05)'
      c.fillRect(0, p + 2, 256, 1)
    }
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 256
      const y = Math.random() * 256
      c.strokeStyle = `rgba(60,35,15,${0.04 + Math.random() * 0.06})`
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 6)
      c.stroke()
    }
  })
}

function fabricTexture(tint: string) {
  return canvasTex('fabric:' + tint, 128, 128, (c) => {
    c.fillStyle = tint
    c.fillRect(0, 0, 128, 128)
    c.strokeStyle = 'rgba(0,0,0,0.05)'
    c.lineWidth = 1
    for (let x = 0; x < 128; x += 4) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 128); c.stroke()
    }
    for (let y = 0; y < 128; y += 4) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.stroke()
    }
  })
}

function ceramicTexture(tint = '#f3ece2') {
  return canvasTex('ceramic:' + tint, 128, 128, (c) => {
    c.fillStyle = tint
    c.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 128
      const y = Math.random() * 128
      c.fillStyle = `rgba(120,100,80,${Math.random() * 0.06})`
      c.fillRect(x, y, 1.4, 1.4)
    }
  })
}

const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture('#7a5230'), roughness: 0.8, metalness: 0.03 })
const woodDarkMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4f341d'), roughness: 0.85 })
const trimMat = new THREE.MeshStandardMaterial({ map: woodTexture('#8a5e36'), roughness: 0.7 })
const marbleMat = new THREE.MeshStandardMaterial({ color: '#e9e3da', roughness: 0.35, metalness: 0.05 })
const metalMat = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.3, metalness: 0.85 })
const brassMat = new THREE.MeshStandardMaterial({ color: '#caa24a', roughness: 0.35, metalness: 0.7 })
const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe6e8', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28 })
const leafMat = new THREE.MeshStandardMaterial({ color: '#5f8f4e', roughness: 0.85 })
const leafMat2 = new THREE.MeshStandardMaterial({ color: '#74a85e', roughness: 0.85 })
const potMat = new THREE.MeshStandardMaterial({ color: '#cf935f', roughness: 0.8 })
const potMat2 = new THREE.MeshStandardMaterial({ color: '#b9663f', roughness: 0.8 })
const ceramicMat = new THREE.MeshStandardMaterial({ map: ceramicTexture('#f3ece2'), roughness: 0.5 })
const pastryMats = ['#d9a86a', '#c98a4f', '#e7c89a', '#b5703f', '#efe2c4'].map(
  (c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.6 }),
)
const pendantMat = new THREE.MeshStandardMaterial({ color: '#fff3d2', emissive: '#ffd49a', emissiveIntensity: 1.9, roughness: 0.5 })
const cordMat = new THREE.MeshStandardMaterial({ color: '#3a2a18', roughness: 0.9 })
const windowMat = new THREE.MeshStandardMaterial({ color: '#eaf4ff', emissive: '#dcefff', emissiveIntensity: 0.9, roughness: 0.2 })
const frameMat = new THREE.MeshStandardMaterial({ map: woodTexture('#8a5e36'), roughness: 0.7 })
const rugMat = new THREE.MeshStandardMaterial({ color: '#c9a87f', roughness: 0.97 })
const rugRingMat = new THREE.MeshStandardMaterial({ color: '#b07e50', roughness: 0.95 })
const floorMat = new THREE.MeshStandardMaterial({ map: woodTexture('#5e3f24'), roughness: 0.95 })
const FABRIC_TINTS = ['#e7b7bb', '#bcd0e8', '#cfe2b6', '#f1cca2', '#dcb9e4']

// Interior surfaces are seen from inside, so they render on the BackSide.
const wallMat = new THREE.MeshStandardMaterial({ color: '#e7d5b8', roughness: 0.96, side: THREE.BackSide })
const wainscotMat = new THREE.MeshStandardMaterial({ map: woodTexture('#6f4a2b'), roughness: 0.8, side: THREE.BackSide })
const ceilingMat = new THREE.MeshStandardMaterial({ color: '#efe3ca', roughness: 0.96, side: THREE.BackSide })
const railMat = new THREE.MeshStandardMaterial({ map: woodTexture('#7a5230'), roughness: 0.75 })
const chalkMat = new THREE.MeshStandardMaterial({ color: '#2b2b28', roughness: 0.9 })
const menuTextMat = new THREE.MeshStandardMaterial({ color: '#e8e2d2', roughness: 0.8 })
const stoolMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4f341d'), roughness: 0.8 })
const stoolSeatMat = new THREE.MeshStandardMaterial({ color: '#b5663f', roughness: 0.85 })

/** A single cushioned café chair, seat centred on its group origin, facing +z. */
function Chair({ cushion }: { cushion: THREE.Material }) {
  return (
    <group>
      {/* seat frame + soft cushion (bevelled corners read as rounded) */}
      <mesh material={woodMat} position={[0, 0.44, 0]}><boxGeometry args={[0.42, 0.05, 0.42]} /></mesh>
      <mesh material={cushion} position={[0, 0.49, 0]}><boxGeometry args={[0.38, 0.06, 0.38]} /></mesh>
      {/* angled backrest with two slats + a cushioned pad */}
      <group position={[0, 0, -0.19]} rotation={[-0.12, 0, 0]}>
        <mesh material={woodMat} position={[-0.17, 0.68, 0]}><boxGeometry args={[0.05, 0.44, 0.05]} /></mesh>
        <mesh material={woodMat} position={[0.17, 0.68, 0]}><boxGeometry args={[0.05, 0.44, 0.05]} /></mesh>
        <mesh material={cushion} position={[0, 0.72, 0.02]}><boxGeometry args={[0.34, 0.22, 0.04]} /></mesh>
        <mesh material={woodMat} position={[0, 0.86, 0]}><boxGeometry args={[0.42, 0.06, 0.06]} /></mesh>
      </group>
      {/* four splayed legs with a stretcher rail */}
      {[[-0.17, 0.17], [0.17, 0.17], [-0.17, -0.17], [0.17, -0.17]].map(([lx, lz], i) => (
        <mesh key={i} material={woodDarkMat} position={[lx, 0.21, lz]}><cylinderGeometry args={[0.025, 0.032, 0.42, 10]} /></mesh>
      ))}
      <mesh material={woodDarkMat} position={[0, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.018, 0.018, 0.34, 8]} /></mesh>
    </group>
  )
}

/** A round wooden café table with two facing chairs, cups and a little vase. */
function TableSet({ seed }: { seed: number }) {
  const cushion = useMemo(
    () => new THREE.MeshStandardMaterial({ map: fabricTexture(FABRIC_TINTS[seed % FABRIC_TINTS.length]), roughness: 0.95 }),
    [seed],
  )
  const flowerMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(FABRIC_TINTS[(seed + 2) % FABRIC_TINTS.length]), roughness: 0.7 }),
    [seed],
  )
  return (
    <group>
      {/* table top + rim + pedestal + base */}
      <mesh material={woodMat} position={[0, 0.74, 0]}><cylinderGeometry args={[0.55, 0.55, 0.06, 32]} /></mesh>
      <mesh material={trimMat} position={[0, 0.71, 0]}><torusGeometry args={[0.55, 0.02, 8, 32]} /></mesh>
      <mesh material={woodDarkMat} position={[0, 0.37, 0]}><cylinderGeometry args={[0.08, 0.12, 0.74, 16]} /></mesh>
      <mesh material={woodDarkMat} position={[0, 0.03, 0]}><cylinderGeometry args={[0.34, 0.34, 0.05, 24]} /></mesh>

      {/* a small vase with a flower in the centre */}
      <mesh material={ceramicMat} position={[0, 0.83, 0]}><cylinderGeometry args={[0.05, 0.04, 0.12, 12]} /></mesh>
      <mesh material={leafMat} position={[0, 0.92, 0]}><cylinderGeometry args={[0.006, 0.006, 0.1, 6]} /></mesh>
      <mesh material={flowerMat} position={[0, 0.98, 0]}><sphereGeometry args={[0.04, 10, 8]} /></mesh>

      {/* two coffee cups on saucers, on opposite sides */}
      {[0.28, -0.28].map((cz, i) => (
        <group key={i} position={[0.08 * (i ? -1 : 1), 0.78, cz]}>
          <mesh material={ceramicMat} position={[0, 0.005, 0]}><cylinderGeometry args={[0.07, 0.06, 0.01, 14]} /></mesh>
          <mesh material={ceramicMat} position={[0, 0.04, 0]}><cylinderGeometry args={[0.045, 0.038, 0.06, 14]} /></mesh>
        </group>
      ))}

      {/* two chairs on opposite sides, each facing the table */}
      <group position={[0, 0, 0.82]} rotation={[0, Math.PI, 0]}><Chair cushion={cushion} /></group>
      <group position={[0, 0, -0.82]}><Chair cushion={cushion} /></group>
    </group>
  )
}

/** A framed picture that hangs flat on the round wall (local +z faces inward). */
function WallArt({ seed }: { seed: number }) {
  const art = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(FABRIC_TINTS[seed % FABRIC_TINTS.length]), roughness: 0.6 }),
    [seed],
  )
  const tall = seed % 2 === 0
  const w = tall ? 0.9 : 1.3
  const h = tall ? 1.2 : 0.9
  return (
    <group>
      <mesh material={frameMat} position={[0, 0, 0]}><boxGeometry args={[w + 0.12, h + 0.12, 0.06]} /></mesh>
      <mesh material={art} position={[0, 0, 0.04]}><boxGeometry args={[w, h, 0.02]} /></mesh>
    </group>
  )
}

/** A tall café bar stool. */
function Stool() {
  return (
    <group>
      <mesh material={stoolSeatMat} position={[0, 0.72, 0]}><cylinderGeometry args={[0.22, 0.22, 0.07, 20]} /></mesh>
      <mesh material={stoolMat} position={[0, 0.36, 0]}><cylinderGeometry args={[0.03, 0.04, 0.72, 10]} /></mesh>
      <mesh material={stoolMat} position={[0, 0.22, 0]}><torusGeometry args={[0.16, 0.015, 6, 20]} /></mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + 0.4
        return <mesh key={i} material={stoolMat} position={[Math.sin(a) * 0.16, 0.04, Math.cos(a) * 0.16]}><cylinderGeometry args={[0.02, 0.02, 0.08, 8]} /></mesh>
      })}
    </group>
  )
}

/** A chalkboard menu with faux menu lines (local +z faces inward). */
function MenuBoard() {
  return (
    <group>
      <mesh material={frameMat} position={[0, 0, 0]}><boxGeometry args={[1.5, 1.9, 0.08]} /></mesh>
      <mesh material={chalkMat} position={[0, 0, 0.05]}><boxGeometry args={[1.32, 1.72, 0.02]} /></mesh>
      <mesh material={menuTextMat} position={[0, 0.66, 0.07]}><boxGeometry args={[0.7, 0.09, 0.01]} /></mesh>
      {[0.3, 0.12, -0.06, -0.24, -0.42, -0.6].map((y, i) => (
        <mesh key={i} material={menuTextMat} position={[-0.1, y, 0.07]}><boxGeometry args={[0.9 - (i % 3) * 0.16, 0.045, 0.01]} /></mesh>
      ))}
    </group>
  )
}

/** Coffee counter with espresso machine, pastry display and cups. */
function CoffeeCounter() {
  return (
    <group>
      {/* base + marble top */}
      <mesh material={woodDarkMat} position={[0, 0.5, 0]}><boxGeometry args={[2.4, 1.0, 0.8]} /></mesh>
      <mesh material={marbleMat} position={[0, 1.02, 0]}><boxGeometry args={[2.5, 0.08, 0.9]} /></mesh>

      {/* espresso machine */}
      <mesh material={metalMat} position={[-0.8, 1.35, 0.1]}><boxGeometry args={[0.5, 0.5, 0.4]} /></mesh>
      <mesh material={brassMat} position={[-0.8, 1.2, 0.3]}><cylinderGeometry args={[0.04, 0.04, 0.18, 10]} /></mesh>
      <mesh material={metalMat} position={[-0.8, 1.62, 0.1]}><boxGeometry args={[0.42, 0.06, 0.34]} /></mesh>

      {/* pastry display case */}
      <mesh material={woodMat} position={[0.55, 1.2, 0]}><boxGeometry args={[1.0, 0.4, 0.6]} /></mesh>
      <mesh material={glassMat} position={[0.55, 1.48, 0]}><boxGeometry args={[0.92, 0.28, 0.52]} /></mesh>
      {[[-0.25, -0.12], [0.0, 0.12], [0.25, -0.08], [0.1, -0.15], [-0.1, 0.1]].map(([px, pz], i) => (
        <mesh key={i} material={pastryMats[i % pastryMats.length]} position={[0.55 + px, 1.32, pz]}>
          <sphereGeometry args={[0.08, 10, 8]} />
        </mesh>
      ))}

      {/* stacked cups */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={ceramicMat} position={[0.05 + i * 0.16, 1.16, -0.1]}>
          <cylinderGeometry args={[0.07, 0.06, 0.12, 12]} />
        </mesh>
      ))}
    </group>
  )
}

/** Glowing pendant light over a table. */
function Pendant({ lit }: { lit?: boolean }) {
  return (
    <group>
      <mesh material={cordMat} position={[0, 0.55, 0]}><cylinderGeometry args={[0.008, 0.008, 1.1, 6]} /></mesh>
      <mesh material={brassMat} position={[0, 0, 0]}><cylinderGeometry args={[0.1, 0.16, 0.1, 12]} /></mesh>
      <mesh material={pendantMat} position={[0, -0.13, 0]}><sphereGeometry args={[0.18, 16, 12]} /></mesh>
      {lit && <pointLight position={[0, -0.1, 0]} color="#ffd49a" intensity={1.0} distance={4.5} decay={2} />}
    </group>
  )
}

/** Potted plant. */
function Plant({ kind = 0 }: { kind?: number }) {
  const pot = kind % 2 === 0 ? potMat : potMat2
  return (
    <group>
      <mesh material={pot} position={[0, 0.18, 0]}><cylinderGeometry args={[0.18, 0.13, 0.36, 12]} /></mesh>
      <mesh material={leafMat} position={[0, 0.52, 0]}><sphereGeometry args={[0.26, 12, 10]} /></mesh>
      <mesh material={leafMat2} position={[0.14, 0.44, 0.05]} scale={[0.8, 1.1, 0.8]}><sphereGeometry args={[0.18, 12, 10]} /></mesh>
      <mesh material={leafMat} position={[-0.13, 0.47, -0.04]} scale={[0.7, 1.0, 0.7]}><sphereGeometry args={[0.16, 12, 10]} /></mesh>
    </group>
  )
}

/** Tall daylight window with a frame. */
function Window() {
  return (
    <group>
      <mesh material={frameMat} position={[0, 1.4, 0]}><boxGeometry args={[1.7, 2.9, 0.1]} /></mesh>
      <mesh material={windowMat} position={[0, 1.4, 0.04]}><boxGeometry args={[1.5, 2.6, 0.04]} /></mesh>
      <mesh material={frameMat} position={[0, 1.4, 0.06]}><boxGeometry args={[0.06, 2.6, 0.06]} /></mesh>
      <mesh material={frameMat} position={[0, 1.4, 0.06]}><boxGeometry args={[1.5, 0.06, 0.06]} /></mesh>
    </group>
  )
}

/** The enclosing round room: floor is drawn elsewhere; this is the cylindrical
 *  wall (with a wood wainscot + chair-rail + cornice) and a shallow cone roof
 *  overhead, all seen from the inside. Purely decorative — non-interactive. */
function CafeShell() {
  const R = 6.5
  const wallH = 4.2
  const roofH = 1.8
  return (
    <group>
      {/* upper plaster wall */}
      <mesh material={wallMat} position={[0, wallH / 2, 0]}>
        <cylinderGeometry args={[R, R, wallH, 64, 1, true]} />
      </mesh>
      {/* wood wainscot along the bottom */}
      <mesh material={wainscotMat} position={[0, 0.55, 0]}>
        <cylinderGeometry args={[R - 0.02, R - 0.02, 1.1, 64, 1, true]} />
      </mesh>
      {/* chair-rail + baseboard + cornice rings */}
      <mesh material={railMat} position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R - 0.02, 0.04, 8, 72]} /></mesh>
      <mesh material={railMat} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R - 0.02, 0.05, 8, 72]} /></mesh>
      <mesh material={railMat} position={[0, wallH - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R - 0.02, 0.06, 8, 72]} /></mesh>

      {/* shallow cone roof overhead */}
      <mesh material={ceilingMat} position={[0, wallH + roofH / 2, 0]}>
        <cylinderGeometry args={[0.5, R, roofH, 64, 1, true]} />
      </mesh>
      {/* ceiling medallion at the apex */}
      <mesh material={railMat} position={[0, wallH + roofH - 0.2, 0]}><cylinderGeometry args={[0.5, 0.5, 0.1, 24]} /></mesh>
    </group>
  )
}

export function KoreanCafeShowcase() {
  const tableR = 3.0
  const tableCount = 4
  const tables = useMemo(
    () => Array.from({ length: tableCount }).map((_, i) => {
      const a = (i / tableCount) * Math.PI * 2 + 0.4
      return { a, x: Math.sin(a) * tableR, z: Math.cos(a) * tableR }
    }),
    [tableCount],
  )
  const pendantCount = 4
  const pendants = useMemo(
    () => Array.from({ length: pendantCount }).map((_, i) => {
      const a = (i / pendantCount) * Math.PI * 2 + 0.4
      return { x: Math.sin(a) * tableR, z: Math.cos(a) * tableR }
    }),
    [pendantCount],
  )
  const artR = 6.36
  const artAngles = [0.5, 1.35, 2.2, 4.1, 4.95, 5.8]
  const wallArt = useMemo(
    () => artAngles.map((a) => ({ a, x: Math.sin(a) * artR, z: Math.cos(a) * artR })),
    [],
  )
  const windowCount = 4
  const windows = useMemo(
    () => Array.from({ length: windowCount }).map((_, i) => {
      const a = (i / windowCount) * Math.PI * 2 + 0.78
      return { a, x: Math.sin(a) * 6.42, z: Math.cos(a) * 6.42 }
    }),
    [windowCount],
  )
  const plantCount = 5
  const plants = useMemo(
    () => Array.from({ length: plantCount }).map((_, i) => {
      const a = (i / plantCount) * Math.PI * 2 + 1.1
      return { x: Math.sin(a) * 3.0, z: Math.cos(a) * 3.0 }
    }),
    [plantCount],
  )

  return (
    <group>
      {/* warm wood floor */}
      <mesh material={floorMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[6.6, 64]} />
      </mesh>

      {/* soft round rug in the centre — clearly separated in Y from the floor and
          ring to avoid z-fighting / flicker on the platform */}
      <mesh material={rugMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.008, 0]}>
        <circleGeometry args={[1.8, 48]} />
      </mesh>
      <mesh material={rugRingMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}>
        <ringGeometry args={[1.62, 1.78, 48]} />
      </mesh>

      {/* enclosing round wall + roof (decorative, non-interactive) */}
      <CafeShell />

      {/* daylight windows set into the wall */}
      {windows.map((w, i) => (
        <group key={`w${i}`} position={[w.x, 0, w.z]} rotation={[0, w.a + Math.PI, 0]}>
          <Window />
        </group>
      ))}

      {/* framed pictures hung around the wall */}
      {wallArt.map((s, i) => (
        <group key={`art${i}`} position={[s.x, 1.95, s.z]} rotation={[0, s.a + Math.PI, 0]}>
          <WallArt seed={i + 1} />
        </group>
      ))}

      {/* chalkboard menu on the wall behind the counter */}
      <group position={[0, 2.05, -6.34]}>
        <MenuBoard />
      </group>

      {/* tables & chairs */}
      {tables.map((s, i) => (
        <group key={`t${i}`} position={[s.x, 0, s.z]} rotation={[0, -s.a, 0]}>
          <TableSet seed={i + 1} />
        </group>
      ))}

      {/* pendant lights over the tables */}
      {pendants.map((p, i) => (
        <group key={`p${i}`} position={[p.x, 3.4, p.z]}>
          <Pendant lit={i < 4} />
        </group>
      ))}

      {/* coffee counter — one arc segment */}
      <group position={[0, 0, -4.4]} rotation={[0, Math.PI, 0]}>
        <CoffeeCounter />
      </group>

      {/* bar stools in front of the counter */}
      {[-0.95, 0, 0.95].map((x, i) => (
        <group key={`st${i}`} position={[x, 0, -3.55]}>
          <Stool />
        </group>
      ))}

      {/* potted plants */}
      {plants.map((p, i) => (
        <group key={`pl${i}`} position={[p.x, 0, p.z]}>
          <Plant kind={i} />
        </group>
      ))}
    </group>
  )
}
