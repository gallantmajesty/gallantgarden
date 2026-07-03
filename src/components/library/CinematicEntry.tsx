import { useEffect, useState } from 'react'
import { useSeatFlow } from '../../store/seatFlow'

/**
 * CinematicEntry — "Entering the Great Hall..."
 *
 * Shows a full-screen title card on first spawn into the library,
 * then fades out to reveal the 3D world just as the auto-walk begins.
 *
 * The card only appears once per session (tracked in seatFlow store).
 * On fast re-joins the card is skipped so the player isn't annoyed.
 */
export function CinematicEntry() {
  const entrancePlayed = useSeatFlow((s) => s.entrancePlayed)
  const stage = useSeatFlow((s) => s.stage)
  const markEntrancePlayed = useSeatFlow((s) => s.markEntrancePlayed)
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Show the card only on the first library entry, then mark it played
    if (!entrancePlayed && (stage === 'spawning' || stage === 'walking')) {
      setVisible(true)
      markEntrancePlayed()
      // Fade out after a brief hold
      const t = setTimeout(() => setFadeOut(true), 2200)
      return () => clearTimeout(t)
    }
  }, [entrancePlayed, stage, markEntrancePlayed])

  if (!visible) return null

  return (
    <div className={`cinematic-root ${fadeOut ? 'fade-out' : ''}`}>
      <div className="cinematic-vignette" />
      <div className="cinematic-content">
        <h1 className="cinematic-title">Entering the Great Hall...</h1>
        <p className="cinematic-sub">Your study space awaits</p>
        <div className="cinematic-line" />
      </div>
    </div>
  )
}
