import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Group, Vector3 } from 'three'

interface VisibilityMap {
  originalVisibility: Map<unknown, boolean>
}

export function FrustumCuller({ children, distance = 50 }: { children: React.ReactNode; distance?: number }) {
  const { camera } = useThree()
  const ref = useRef<{ group: Group | null; visibility: VisibilityMap['originalVisibility'] }>({ group: null, visibility: new Map() })

  useEffect(() => {
    const group = ref.current.group
    if (!group) return

    const originalVisibility = ref.current.visibility
    originalVisibility.clear()

    group.traverse((child) => {
      if ('visible' in child) {
        originalVisibility.set(child, (child as { visible: boolean }).visible)
      }
    })

    const checkVisibility = () => {
      const cameraPos = camera.position
      const cameraDir = new Vector3()
      camera.getWorldDirection(cameraDir)

      group.traverse((child) => {
        if (!('visible' in child) || !(child as { position?: unknown }).position) return
        const objPos = (child as { position: { x: number; y: number; z: number } }).position
        const toObj = new Vector3().subVectors(objPos, cameraPos)
        const objDistance = toObj.length()

        const isVisible = objDistance < distance && toObj.dot(cameraDir) > -0.5
        child.visible = isVisible && (originalVisibility.get(child) ?? true)
      })
    }

    let frameCount = 0
    const interval = setInterval(() => {
      frameCount++
      if (frameCount % 3 === 0) {
        checkVisibility()
      }
    }, 16)

    return () => clearInterval(interval)
  }, [camera, distance])

  return <group ref={(el) => { ref.current.group = el }}>{children}</group>
}
