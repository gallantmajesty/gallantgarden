import { useEffect, useRef, useState } from 'react'

interface SparklesTextProps {
  children: string
  className?: string
  color?: string
}

export function SparklesText({ children, className = '', color = '#ffce54' }: SparklesTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; size: number; delay: number }[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newSparkle = {
        id: Date.now() + Math.random(),
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 0.3,
      }
      setSparkles((prev) => [...prev.slice(-6), newSparkle])
    }, 300)
    return () => clearInterval(interval)
  }, [])

  return (
    <span ref={containerRef} className={`sparkles-text ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="sparkle-particle"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            backgroundColor: color,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      <span className="sparkles-text-content">{children}</span>
    </span>
  )
}
