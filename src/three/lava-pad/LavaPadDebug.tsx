import { useEffect, useState } from 'react'
import { useLavaPadStore } from './store'

export function LavaPadDebug() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') setVisible(v => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!visible) return null

  return <LavaPadDebugPanel />
}

function LavaPadDebugPanel() {
  const [fps, setFps] = useState(0)
  const phase = useLavaPadStore((s) => s.phase)
  const players = useLavaPadStore((s) => s.players)
  const lavaY = useLavaPadStore((s) => s.lavaY)
  const timeElapsed = useLavaPadStore((s) => s.timeElapsed)
  const survivors = useLavaPadStore((s) => s.survivors)
  const jumpState = useLavaPadStore((s) => s.jumpState)

  useEffect(() => {
    const frames: number[] = []
    let raf: number
    function tick() {
      const now = performance.now()
      frames.push(now)
      while (frames.length > 0 && frames[0] <= now - 1000) frames.shift()
      setFps(frames.length)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const alive = Object.values(players).filter(p => !p.eliminated)
  const playerCount = Object.keys(players).length

  return (
    <div className="lava-pad-debug">
      <div className="lava-pad-debug-row"><span>FPS</span><span className="lava-pad-debug-value">{fps}</span></div>
      <div className="lava-pad-debug-row"><span>Phase</span><span className="lava-pad-debug-value">{phase}</span></div>
      <div className="lava-pad-debug-row"><span>Players</span><span className="lava-pad-debug-value">{alive.length}/{playerCount}</span></div>
      <div className="lava-pad-debug-row"><span>Survivors</span><span className="lava-pad-debug-value">{survivors}</span></div>
      <div className="lava-pad-debug-row"><span>Lava Y</span><span className="lava-pad-debug-value">{lavaY.toFixed(1)}</span></div>
      <div className="lava-pad-debug-row"><span>Time</span><span className="lava-pad-debug-value">{timeElapsed.toFixed(1)}s</span></div>
      <div className="lava-pad-debug-row"><span>Jump</span><span className="lava-pad-debug-value">{jumpState}</span></div>
      <div className="lava-pad-debug-hint">F3 to toggle</div>

      <style>{`
        .lava-pad-debug {
          position: fixed; bottom: 12px; right: 12px; z-index: 999;
          font-family: 'Courier New', monospace; font-size: 11px;
          background: rgba(0,0,0,0.8); color: #0f0; padding: 10px 14px;
          border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
          pointer-events: all; min-width: 160px;
          backdrop-filter: blur(4px);
        }
        .lava-pad-debug-row {
          display: flex; justify-content: space-between; gap: 12px;
          line-height: 1.6;
        }
        .lava-pad-debug-value { color: #8f8; font-weight: 700; }
        .lava-pad-debug-hint {
          text-align: center; margin-top: 6px; padding-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.3); font-size: 10px;
        }
      `}</style>
    </div>
  )
}
