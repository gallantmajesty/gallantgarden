// Lava Pad Platform Renderer — instanced mesh with full platform variety support

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, Color } from 'three'
import { ARENA_CONFIG } from './arena'
import { useLavaPadStore } from './store'
import type { LavaPadPlatformSpecialState } from './types'

const _dummy = new Object3D()
const _colorWhite = new Color('#d4c9a8')
const _colorHighlight = new Color('#ffce54')
const _colorSpawn = new Color('#6b9e7a')
const _colorLarge = new Color('#7a8aad')
const _colorSmall = new Color('#9a7a6a')
const _colorCracked = new Color('#8a6a5a')
const _colorCrackedWarning = new Color('#cc5533')
const _colorMoving = new Color('#6a8aba')
const _colorShrinking = new Color('#ba8a6a')

function getPlatformColor(type: string, special?: LavaPadPlatformSpecialState): Color {
  if (special?.cracked?.broken) return _colorCrackedWarning
  if (special?.cracked && special.cracked.timeUntilBreak < 1) return _colorCrackedWarning
  switch (type) {
    case 'spawn': return _colorSpawn
    case 'large': return _colorLarge
    case 'small': return _colorSmall
    case 'cracked': return _colorCracked
    case 'moving': return _colorMoving
    case 'shrinking': return _colorShrinking
    default: return _colorWhite
  }
}

export function PlatformRenderer() {
  const meshRef = useRef<InstancedMesh | null>(null)
  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const localPlayer = useLavaPadStore((s) => localPlayerId ? s.players[localPlayerId] : null)
  const platformsRuntime = useLavaPadStore((s) => s.platforms)
  const hoveredPlatform = useLavaPadStore((s) => s.hoveredPlatform)
  const count = platformsRuntime.length

  const reachableIds = useMemo(() => {
    if (!localPlayer || !localPlayer.platformId) return new Set<string>()
    const platform = platformsRuntime.find(p => p.id === localPlayer.platformId)
    if (!platform) return new Set<string>()
    const conns = ARENA_CONFIG?.platforms?.find(p => p.id === localPlayer.platformId)?.connectedTo ?? []
    return new Set(conns)
  }, [localPlayer?.platformId, platformsRuntime])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const highlight = new Set(reachableIds)
    if (hoveredPlatform) highlight.add(hoveredPlatform)
    const time = Date.now() * 0.001

    for (let i = 0; i < count; i++) {
      const p = platformsRuntime[i]
      const pulse = highlight.has(p.id) ? 1 + Math.sin(time * 4 + i) * 0.03 : 1

      // Floating bob animation
      const floatY = Math.sin(time * 0.6 + i * 0.7) * 0.06

      // Cracked warning: rapid pulse when about to break
      let crackPulse = 1
      if (p.special?.cracked && !p.special.cracked.broken && p.special.cracked.timeUntilBreak < 0.5) {
        crackPulse = 1 + Math.sin(time * 16) * 0.04
      }

      _dummy.position.set(p.x, p.y + floatY, p.z)
      _dummy.scale.set(p.radius * pulse * crackPulse, p.height / 2, p.radius * pulse * crackPulse)

      // Moving platforms: slight rotation oscillation
      if (p.type === 'moving') {
        _dummy.rotation.z = Math.sin(time * 0.5 + i) * 0.02
        _dummy.rotation.x = Math.cos(time * 0.4 + i * 0.3) * 0.01
      } else {
        _dummy.rotation.z = 0
        _dummy.rotation.x = 0
      }

      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)

      const special = p.special
      const isHighlighted = highlight.has(p.id)
      if (isHighlighted) {
        mesh.setColorAt(i, _colorHighlight)
      } else {
        mesh.setColorAt(i, getPlatformColor(p.type, special))
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[1, 1, 1, 24]} />
      <meshStandardMaterial
        roughness={0.6}
        metalness={0.1}
        envMapIntensity={0.3}
      />
    </instancedMesh>
  )
}
