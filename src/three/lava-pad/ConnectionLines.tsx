// Lava Pad Connection Lines — visual links between current and reachable platforms

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, LineSegments, Color, BufferAttribute } from 'three'
import { ARENA_CONFIG } from './arena'
import { useLavaPadStore } from './store'

const _colorSafe = new Color('#44ff88')
const _colorRisk = new Color('#ffaa44')
const _colorDanger = new Color('#ff4444')
const _colorHover = new Color('#ffffff')

const MAX_CONNECTIONS = 32

export function ConnectionLines() {
  const lineRef = useRef<LineSegments>(null)
  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const localPlayer = useLavaPadStore((s) => (localPlayerId ? s.players[localPlayerId] : null))
  const platformsRuntime = useLavaPadStore((s) => s.platforms)
  const hoveredPlatform = useLavaPadStore((s) => s.hoveredPlatform)
  const lavaY = useLavaPadStore((s) => s.lavaY)
  const jumpState = useLavaPadStore((s) => s.jumpState)

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    const pos = new Float32Array(MAX_CONNECTIONS * 6)
    const col = new Float32Array(MAX_CONNECTIONS * 8)
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('color', new BufferAttribute(col, 4))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  useFrame(() => {
    const line = lineRef.current
    if (!line || !line.geometry) return

    if (!localPlayer || !localPlayer.platformId || jumpState !== 'idle') {
      line.geometry.setDrawRange(0, 0)
      return
    }

    const currentRuntime = platformsRuntime.find(p => p.id === localPlayer.platformId)
    if (!currentRuntime) {
      line.geometry.setDrawRange(0, 0)
      return
    }

    const conns = ARENA_CONFIG.platforms.find(p => p.id === localPlayer.platformId)?.connectedTo ?? []
    const posAttr = line.geometry.getAttribute('position') as BufferAttribute
    const colAttr = line.geometry.getAttribute('color') as BufferAttribute
    const posArray = posAttr.array as Float32Array
    const colArray = colAttr.array as Float32Array

    let lineCount = 0
    const startY = currentRuntime.y + currentRuntime.height / 2

    for (const connId of conns) {
      if (lineCount >= MAX_CONNECTIONS) break
      const target = platformsRuntime.find(p => p.id === connId)
      if (!target) continue
      if (target.special?.cracked?.broken) continue

      const dx = target.x - currentRuntime.x
      const dz = target.z - currentRuntime.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const dy = target.y - currentRuntime.y

      const isHover = hoveredPlatform === connId
      let color: Color
      if (isHover) {
        color = _colorHover
      } else if (dist > 5 || dy > 1.5) {
        color = _colorDanger
      } else if (dist > 3.5) {
        color = _colorRisk
      } else {
        color = _colorSafe
      }

      const endY = target.y + target.height / 2
      const nearLava = lavaY !== undefined && startY - lavaY < 3
      const alpha = isHover ? 0.7 : (nearLava ? 0.15 : 0.35)

      const idx = lineCount * 6
      const cidx = lineCount * 8

      posArray[idx] = currentRuntime.x
      posArray[idx + 1] = startY
      posArray[idx + 2] = currentRuntime.z
      posArray[idx + 3] = target.x
      posArray[idx + 4] = endY
      posArray[idx + 5] = target.z

      colArray[cidx] = color.r
      colArray[cidx + 1] = color.g
      colArray[cidx + 2] = color.b
      colArray[cidx + 3] = alpha
      colArray[cidx + 4] = color.r
      colArray[cidx + 5] = color.g
      colArray[cidx + 6] = color.b
      colArray[cidx + 7] = alpha

      lineCount++
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    line.geometry.setDrawRange(0, lineCount * 2)
  })

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial vertexColors transparent depthWrite={false} />
    </lineSegments>
  )
}