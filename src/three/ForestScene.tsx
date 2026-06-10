import { Component, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  CameraControls,
  Sky,
  Cloud,
  Clouds,
  Environment,
  Sparkles,
} from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import CameraControlsImpl from 'camera-controls'
import type { StickyNote, Tree } from '../lib/types'
import { TreeMesh } from './TreeMesh'
import { NoteLayer } from './NoteLayer'
import { CrystalMarker } from './CrystalMarker'
import { Terrain } from './Terrain'
import { Castle } from './Castle'

interface ForestSceneProps {
  trees: Tree[]
  notesByTree: Record<string, StickyNote[]>
  focusedTreeId: string | null
  editing: boolean
  onSelectTree: (id: string | null) => void
  onOpenNote: (note: StickyNote) => void
  onReanchorNote: (id: string, anchorId: number) => void
}

/** Renders children, but swallows any render/load error and shows nothing. */
class SoftBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function ForestScene(props: ForestSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 22, 26], fov: 45 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      {/* ---- sky & atmosphere ---- */}
      <color attach="background" args={['#9ad4f0']} />
      <fog attach="fog" args={['#bfe0e8', 40, 110]} />

      <Sky
        distance={450000}
        sunPosition={[12, 18, 8]}
        turbidity={8}
        rayleigh={2.2}
        mieCoefficient={0.005}
        mieDirectionalG={0.85}
      />
      {/* HDRI lighting; silently skipped if the CDN asset can't load */}
      <SoftBoundary>
        <Suspense fallback={null}>
          <Environment preset="sunset" environmentIntensity={0.55} />
        </Suspense>
      </SoftBoundary>

      <hemisphereLight args={['#dff1ff', '#5a7a3a', 0.7]} />
      <directionalLight
        position={[14, 22, 10]}
        intensity={2.0}
        color="#fff3df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0004}
      />

      <Suspense fallback={null}>
        <Clouds limit={60}>
          <Cloud position={[-22, 20, -18]} speed={0.16} opacity={0.55} bounds={[14, 3, 6]} />
          <Cloud position={[24, 24, -26]} speed={0.12} opacity={0.45} bounds={[16, 3, 7]} />
          <Cloud position={[2, 26, -34]} speed={0.1} opacity={0.4} bounds={[20, 3, 8]} />
        </Clouds>
      </Suspense>

      {/* floating magical motes over the kingdom */}
      <Sparkles count={120} scale={[60, 12, 60]} position={[0, 7, -6]} size={4} speed={0.3} color="#fff6c8" opacity={0.6} />

      {/* ---- ground ---- */}
      <Suspense fallback={null}>
        <Terrain />
      </Suspense>

      {/* kingdom centerpiece */}
      <Castle />

      {/* ---- trees ---- */}
      {props.trees.map((tree) => {
        const isFocused = tree.id === props.focusedTreeId
        const dimmed = props.focusedTreeId !== null && !isFocused
        return (
          <group
            key={tree.id}
            position={[tree.pos_x, 0, tree.pos_z]}
            onClick={(e) => {
              e.stopPropagation()
              props.onSelectTree(tree.id)
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto'
            }}
          >
            <TreeMesh
              variant={tree.variant}
              selected={isFocused}
              dimmed={dimmed}
              grow={isFocused ? 1.55 : 1}
            />

            <CrystalMarker
              title={tree.title}
              color={tree.crystal_color}
              focused={isFocused}
              dimmed={dimmed}
              onClick={() => props.onSelectTree(tree.id)}
            />

            {isFocused && (
              <NoteLayer
                notes={props.notesByTree[tree.id] ?? []}
                variant={tree.variant}
                editing={props.editing}
                onOpen={props.onOpenNote}
                onReanchor={props.onReanchorNote}
              />
            )}
          </group>
        )
      })}

      {/* click empty ground to deselect */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onClick={() => props.onSelectTree(null)}
      >
        <circleGeometry args={[120, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <KingdomCamera trees={props.trees} focusedTreeId={props.focusedTreeId} />

      {/* ---- post-processing: bloom makes crystals & names glow ---- */}
      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.3} intensity={0.9} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  )
}

/**
 * Clash-of-Clans style camera: angled top-down, pan + zoom only, narrow angle
 * band (no free-fly). Clicking a tree triggers a cinematic Google-Maps zoom-in
 * with a small spiral; deselecting pulls back to the kingdom overview.
 */
function KingdomCamera({
  trees,
  focusedTreeId,
}: {
  trees: Tree[]
  focusedTreeId: string | null
}) {
  const ref = useRef<CameraControls>(null)

  // configure the control envelope once
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.minDistance = 6
    c.maxDistance = 60
    // keep a strategic angled view — never top-flat, never horizon
    c.minPolarAngle = Math.PI * 0.18
    c.maxPolarAngle = Math.PI * 0.40
    c.smoothTime = 0.5
    c.draggingSmoothTime = 0.18
    // left = pan (truck), wheel = zoom, right = gentle rotate within the band
    c.mouseButtons.left = CameraControlsImpl.ACTION.TRUCK
    c.mouseButtons.wheel = CameraControlsImpl.ACTION.DOLLY
    c.mouseButtons.right = CameraControlsImpl.ACTION.ROTATE
    c.touches.one = CameraControlsImpl.ACTION.TOUCH_TRUCK
    c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK
    c.dollyToCursor = true
    // gentle azimuth freedom for a strategic feel
    c.minAzimuthAngle = -Math.PI * 0.35
    c.maxAzimuthAngle = Math.PI * 0.35
  }, [])

  // animate to kingdom overview or the focused tree on change
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const focused = focusedTreeId ? trees.find((t) => t.id === focusedTreeId) : null
    if (focused) {
      // cinematic spiral zoom-in: rotate azimuth a touch while diving in
      void c.rotateAzimuthTo(Math.PI * 0.12, true)
      void c.setLookAt(
        focused.pos_x + 4,
        7,
        focused.pos_z + 11,
        focused.pos_x,
        2.6,
        focused.pos_z,
        true,
      )
    } else {
      void c.rotateAzimuthTo(0, true)
      void c.setLookAt(0, 24, 30, 0, 2, -4, true)
    }
  }, [focusedTreeId, trees])

  useFrame((_, delta) => {
    ref.current?.update(delta)
  })

  return <CameraControls ref={ref} makeDefault />
}
