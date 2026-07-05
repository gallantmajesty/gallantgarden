import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Group, Vector3, Object3D } from 'three'

/**
 * Performance optimization: culls objects that are far from the camera's view frustum
 * to reduce unnecessary rendering of distant objects.
 */
export function FrustumCuller({ children, distance = 50 }: { children: React.ReactNode; distance?: number }) {
  const { camera } = useThree()
  const ref = useRef<Group>(null)

  useEffect(() => {
    const group = ref.current
    if (!group) return

    group.traverse((child: THREE.Object3D) => {
      if ('visible' in child) {
        originalVisibility.set(child, child.visible)
      }
    })

    const checkVisibility = () => {
      const cameraPos = camera.position
      const cameraDir = new Vector3()
      camera.getWorldDirection(cameraDir)
      
      group.traverse((child: Object3D) => {
        if ('visible' in child && child.position) {
          const objPos = child.position
          const toObj = new Vector3().subVectors(objPos, cameraPos)
          const objDistance = toObj.length()
          
          // Cull objects that are too far away or behind the camera
          const isVisible = objDistance < distance && toObj.dot(cameraDir) > -0.5
          child.visible = isVisible && originalVisibility.get(child)
        }
      })
    }

    // Check visibility every few frames instead of every frame
    let frameCount = 0
    const interval = setInterval(() => {
      frameCount++
      if (frameCount % 3 === 0) { // Check every 3 frames
        checkVisibility()
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [camera, distance])

  return <group ref={ref}>{children}</group>
}