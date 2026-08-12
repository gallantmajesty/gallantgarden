import { useEffect, useMemo, useRef, useState } from 'react'
import { checkDisplayName } from '../lib/displayName'
import './NameMascot.css'

/* Max — the onboarding name mascot.
   Floats on the right of the "pick your name" step and reacts to the
   username as the player types, giving friendly guidance. */

type Mood = 'idle' | 'happy' | 'stupid' | 'cool' | 'good' | 'confused'

interface MoodDef {
  img: string
  emoji: string
  text: string
}

const MOODS: Record<Mood, MoodDef> = {
  idle: {
    img: '/mascot-smile.png',
    emoji: '🌱',
    text: "Hi! I'm Max. Type a username and I'll react as you go!",
  },
  happy: {
    img: '/mascot-happy.png',
    emoji: '😊',
    text: 'Short and sweet! A few more letters would make it extra strong.',
  },
  stupid: {
    img: '/mascot-sleep.png',
    emoji: '😵',
    text: "Numbers scramble my brain! Try letters and _ instead.",
  },
  cool: {
    img: '/mascot-sparkle.png',
    emoji: '✨',
    text: "Ooh, that's a unique vibe. Max likes it!",
  },
  good: {
    img: '/mascot-excited.png',
    emoji: '🌟',
    text: "Max approves — that's a solid username!",
  },
  confused: {
    img: '/mascot-deepwork.png',
    emoji: '🤔',
    text: 'Hmm, that one is not allowed.',
  },
}

function getMood(raw: string): { mood: Mood; error?: string } {
  const n = raw.trim()
  if (!n) return { mood: 'idle' }

  const check = checkDisplayName(n)
  if (!check.ok) return { mood: 'confused', error: check.error }

  const hasNumbers = /\d/.test(n)
  if (hasNumbers) return { mood: 'stupid' }
  if (n.length < 4) return { mood: 'happy' }
  if (n.length >= 8 || n.includes('_')) return { mood: 'cool' }
  return { mood: 'good' }
}

export function NameMascot({ name }: { name: string }) {
  const { mood, error } = useMemo(() => getMood(name), [name])
  const def = MOODS[mood]

  // Bounce the mascot whenever the mood changes so the reaction reads clearly.
  const [bounce, setBounce] = useState(false)
  const prev = useRef(mood)
  useEffect(() => {
    if (prev.current === mood) return
    prev.current = mood
    setBounce(true)
    const t = setTimeout(() => setBounce(false), 450)
    return () => clearTimeout(t)
  }, [mood])

  const bubbleText = mood === 'confused' && error ? error : def.text

  return (
    <div className="nm-root" aria-hidden>
      <div className="nm-bubble">
        <span className="nm-emoji">{def.emoji}</span>
        <span className="nm-text">{bubbleText}</span>
      </div>
      <div className={`nm-floater${bounce ? ' nm-bounce' : ''}`}>
        <div className="nm-glow" />
        <img className="nm-img" src={def.img} alt="" draggable={false} />
        <span className="nm-name">Max</span>
      </div>
    </div>
  )
}
