// ReactionBar — floating emoji reactions (spec 6.4). A compact row of emoji
// buttons; tapping one spawns an emoji that floats up from the bar and fades
// out over ~3s. Local visual feedback (visible to the reacting player); the
// architecture leaves room to broadcast `player.reaction` over the realm sync
// channel so seated neighbours see it too.

import { useState } from 'react'
import { useTrain } from '../../../store/train'

const REACTIONS = ['👏', '🔥', '✨', '📚', '☕', '🚂', '❤️']

interface Float {
  id: number
  emoji: string
  x: number
}

export function ReactionBar() {
  const phase = useTrain((s) => s.phase)
  const seat = useTrain((s) => s.seat)
  const departureSec = useTrain((s) => s.departureSec)
  const [floats, setFloats] = useState<Float[]>([])
  const counter = useState({ n: 0 })[0]

  // Only show while aboard and seated (spec 6.4: reactions are a seated action)
  if (phase !== 'traveling' || departureSec > 0 || seat == null) return null

  const react = (emoji: string) => {
    const id = ++counter.n
    const x = 8 + Math.random() * 84 // % across the bar
    setFloats((prev) => [...prev, { id, emoji, x }])
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id))
    }, 3000)
  }

  return (
    <div className="train-reactions">
      <div className="train-reactions-bar">
        {REACTIONS.map((r) => (
          <button key={r} className="train-reaction-btn" onClick={() => react(r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="train-reactions-floats">
        {floats.map((f) => (
          <span
            key={f.id}
            className="train-reaction-float"
            style={{ left: `${f.x}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>
    </div>
  )
}
