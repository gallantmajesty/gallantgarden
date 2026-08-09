import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LibraryShell } from '../../three/library/LibraryShell'
import { Bookshelves } from '../../three/library/Bookshelf'
import { StudyTables } from '../../three/library/StudyTable'
import { Lanterns } from '../../three/library/Lanterns'
import { KnowledgeTree } from '../../three/library/KnowledgeTree'
import { HALL } from '../../three/library/layout'

/**
 * HeroLibrary — a real-time, non-controllable cinematic view of the actual
 * library hall, shown on the landing page in place of the old snowfall canvas.
 * Reuses the real procedural shell components so the visitor sees the genuine
 * product, not a screenshot. Lightweight on purpose:
 *   • slow auto-drifting camera (a gentle loop, no controls)
 *   • warm fill lighting + the hall's own lantern glow
 *   • no NPCs, no post-processing, no shadows, capped DPR
 */

function CinematicCam() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const tmpPos = useRef(new THREE.Vector3())
  const tmpLook = useRef(new THREE.Vector3())

  // A slow elliptical drift around the hall centre at seated-eye height, plus a
  // subtle yaw so the knowledge tree stays in frame the whole time.
  const R = HALL.halfW * 0.55
  const Z = HALL.halfL * 0.35
  const EYE = 2.6

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.06
    const x = Math.sin(t) * R
    const z = Math.cos(t * 0.8) * Z + HALL.halfL * 0.1
    tmpPos.current.set(x, EYE + Math.sin(t * 0.5) * 0.4, z)
    camera.position.lerp(tmpPos.current, 0.02)
    tmpLook.current.set(Math.sin(t) * 3, EYE + 0.6, -Math.cos(t * 0.7) * 2)
    camera.lookAt(tmpLook.current)
    camera.fov = 58
    camera.updateProjectionMatrix()
  })
  return null
}

export function HeroLibrary() {
  // Respect reduced-motion: show a static frame instead of the drift.
  const reduced = useRef(false)
  useEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  }, [])

  return (
    <div
      className="fl-hero-3d"
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        opacity: 0.9,
      }}
    >
      <Canvas
        frameloop={reduced.current ? 'demand' : 'always'}
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 2.6, 10], fov: 58, near: 0.1, far: 120 }}
        style={{ background: '#0c0a08' }}
      >
        {/* Warm, cozy fill — the hall's signature golden interior light */}
        <hemisphereLight args={['#aebfe0', '#6b4a2a', 0.55]} />
        <ambientLight intensity={0.5} color="#ffd9a8" />
        <pointLight position={[0, 14, 0]} intensity={0.5} color="#ffc98a" distance={80} decay={2} />

        <LibraryShell />
        <Bookshelves />
        <StudyTables />
        <Lanterns />
        <KnowledgeTree />

        <CinematicCam />
      </Canvas>
      {/* Soft vignette so the headline reads clearly over the scene */}
      <div
        className="fl-hero-3d-shade"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 42%, rgba(10,8,6,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
