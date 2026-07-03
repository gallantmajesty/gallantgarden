import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

/** Floating text label above the avatar showing the current emote.
 *
 *  Renders via drei's <Html> for easy DOM positioning in screen space.
 *  Fades out after the emote ends.
 */
interface EmoteLabelProps {
  text: string
  duration?: number
  onComplete?: () => void
}

export function EmoteLabel({ text, duration = 2000, onComplete }: EmoteLabelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const start = useRef(Date.now())

  useFrame(() => {
    const elapsed = Date.now() - start.current
    if (!ref.current) return
    if (elapsed > duration) {
      ref.current.style.opacity = '0'
      if (onComplete) setTimeout(onComplete, 300)
    } else if (elapsed > duration - 500) {
      const t = (elapsed - (duration - 500)) / 500
      ref.current.style.opacity = String(1 - t)
    }
  })

  return (
    <Html position={[0, 2.6, 0]} center>
      <div
        ref={ref}
        style={{
          padding: '4px 12px',
          borderRadius: '999px',
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: 1,
          transition: 'opacity 0.3s ease',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      >
        {text}
      </div>
    </Html>
  )
}
