import { useEffect, useMemo, useRef, useState } from 'react'
import { checkDisplayName } from '../lib/displayName'
import { GHOST_MASCOT, type GhostMood } from '../lib/mascotGhost'
import { GOAL_LINES } from '../lib/goalLines'
import './GhostMascot.css'

/* Max the ghost — floating name mascot (basic-emotion set).
   Floats on the right of the "pick your name" step and reacts to the
   username as the player types, with casual, friendly guidance. */

function react(raw: string): { mood: GhostMood; text: string } {
  const n = raw.trim()
  if (!n)
    return { mood: 'bored', text: "yo, pick a name and i'll hang out here with you." }

  const check = checkDisplayName(n)
  if (!check.ok) {
    const reason = check.error
      ? ` ${check.error.charAt(0).toLowerCase()}${check.error.slice(1)}`
      : ''
    return { mood: 'sad', text: `aw nah, that one don't work${reason}.` }
  }

  const hasNumbers = /\d/.test(n)
  if (hasNumbers)
    return { mood: 'angry', text: "bro numbers?? my ghost brain spins, just use letters n _" }
  if (n.length < 4)
    return { mood: 'happy', text: "short n sweet! throw a couple more letters on it tho" }
  if (n.length >= 8 || n.includes('_'))
    return { mood: 'happy', text: "ooh that's got a vibe, i'm feelin it" }
  return { mood: 'happy', text: "yesss clean name, i'm rockin with it" }
}

/* Age-step reactions: under 7 he politely turns them away, under 18 he gets
   guarded and makes sure a parent/guardian is on board, 18+ gets the welcome. */
function reactAge(age: number | null, guardianOk: boolean): { mood: GhostMood; text: string } {
  if (age === null)
    return { mood: 'bored', text: "how old are you, if you don't mind?" }
  if (age < 7)
    return { mood: 'angry', text: "whoa whoa, that young?? the forest's for 7 and up. come back when you're a bit older, champ." }
  if (age > 100)
    return { mood: 'angry', text: "c'mon now, that old?? be real with me, i can tell." }
  if (age < 18)
    return guardianOk
      ? { mood: 'happy', text: "ayy, your adult gave the ok — then you're officially in!" }
      : { mood: 'sad', text: "hold up — under 18 you gotta have a parent or guardian's ok first. go grab an adult, tick that box, then we're good." }
  return { mood: 'happy', text: `ayy, ${age} — grown and ready. the forest's yours, welcome in!` }
}

/* Goal-step reactions: Max has a line for EVERY goal in the catalog (see
   src/lib/goalLines.ts) — with local-language cheers for the country exams
   and motivation for the school classes. Multi-pick gets a hustle line. */
function reactGoals(goals: string[]): { mood: GhostMood; text: string } {
  if (goals.length === 0)
    return { mood: 'bored', text: "what you grindin towards? pick one (up to three) and let's get it." }
  if (goals.length > 1)
    return { mood: 'happy', text: `ooo big plan — ${goals.length} goals lined up. i respect the hustle.` }
  const line = GOAL_LINES[goals[0]]
  return line
    ? { mood: 'happy', text: line }
    : { mood: 'happy', text: "ayy, solid pick — let's lock in on it!" }
}

export function GhostMascot({
  name,
  hint,
  age,
  guardianOk,
  goals,
  mood,
  style,
}: {
  name: string
  hint?: string
  age?: number | null
  guardianOk?: boolean
  goals?: string[]
  /** Explicit mood override (used when a hint is shown, e.g. the guided
   *  tour) — otherwise the mood is derived from the step reaction. */
  mood?: GhostMood
  /** Optional inline positioning (e.g. the guided tour moves him next to the
   *  highlighted element instead of his default right-center spot). */
  style?: React.CSSProperties
}) {
  // Priority: step hint guides a normal step; the age step reacts to the
  // typed age; the goals step cheers for the picked goal; the name step
  // reacts to what's being typed.
  const { mood: resMood, text } = useMemo(() => {
    if (hint) return { mood: (mood ?? 'happy') as GhostMood, text: hint }
    if (age !== undefined) return reactAge(age, !!guardianOk)
    if (goals !== undefined) return reactGoals(goals)
    return react(name)
  }, [name, hint, age, guardianOk, goals, mood])

  // Bounce the mascot whenever the mood changes so the reaction reads clearly.
  const [bounce, setBounce] = useState(false)
  const prev = useRef(resMood)
  useEffect(() => {
    if (prev.current === resMood) return
    prev.current = resMood
    setBounce(true)
    const t = setTimeout(() => setBounce(false), 450)
    return () => clearTimeout(t)
  }, [resMood])

  return (
    <div className="gm-root" style={style} aria-hidden>
      <div className="gm-bubble">
        <span className="gm-text">{text}</span>
      </div>
      <div className={`gm-floater${bounce ? ' gm-bounce' : ''}`}>
        <div className="gm-glow" />
        <img className="gm-img" src={GHOST_MASCOT[mood]} alt="" draggable={false} />
      </div>
    </div>
  )
}
