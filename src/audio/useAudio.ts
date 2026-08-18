import { useEffect } from 'react'
import { getAmbient } from './ambient'
import { useSettings } from '../store/settings'
import { useMusic } from '../store/music'

interface UseAudioOptions {
  /** When false, the world's soundscape (rain) is held silent. Passed by the
   *  host screen: the Library/UK Café hold it until the player is actually in
   *  the world (past seat selection); the Train has no seat picker and always
   *  enables it. Prevents rain from playing over the seat-selection overlay. */
  enabled: boolean
}

/**
 * Keeps the {@link AmbientEngine} in sync with the audio settings, starts it on
 * the first user gesture (browser autoplay rule), and silences it when the host
 * screen unmounts. Mount once in the Explore screen.
 */
export function useAudio({ enabled }: UseAudioOptions) {
  const master = useSettings((s) => s.master)
  const ambientVol = useSettings((s) => s.ambientVol)
  const rainVol = useSettings((s) => s.rainVol)
  const ambientOn = useSettings((s) => s.ambientOn)
  const rainOn = useSettings((s) => s.rainOn)

  // Rain is only audible once the player is actually in the world. During seat
  // selection (or any other gate the host passes as disabled) it stays silent.
  const soundscape = enabled && rainOn

  // apply mix whenever it changes
  useEffect(() => {
    getAmbient().apply({ master, ambientVol, rainVol, ambientOn, rainOn: soundscape })
  }, [master, ambientVol, rainVol, ambientOn, soundscape])

  // start on first gesture, silence on unmount
  useEffect(() => {
    const eng = getAmbient()
    const kick = () => {
      const s = useSettings.getState()
      // ensure() must receive the gated mix so its first 0.4s master ramp never
      // swells rain over the seat picker before the apply below corrects it.
      eng.ensure({
        master: s.master,
        ambientVol: s.ambientVol,
        rainVol: s.rainVol,
        ambientOn: s.ambientOn,
        rainOn: enabled ? s.rainOn : false,
      })
      eng.apply({
        master: s.master,
        ambientVol: s.ambientVol,
        rainVol: s.rainVol,
        ambientOn: s.ambientOn,
        rainOn: enabled ? s.rainOn : false,
      })
      // First gesture also grants the music engine its autoplay licence — if the
      // player had music running when they left, it resumes now (only resumes
      // inside the library — the music store's resumeFromGesture is scoped).
      useMusic.getState().resumeFromGesture()
      detach()
    }
    const detach = () => {
      window.removeEventListener('pointerdown', kick)
      window.removeEventListener('keydown', kick)
    }
    window.addEventListener('pointerdown', kick)
    window.addEventListener('keydown', kick)
    return () => {
      detach()
      getAmbient().apply({ master, ambientVol, rainVol, ambientOn: false, rainOn: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // The library music player is scoped to this screen: mark the library as
  // active on entry and pause the player the moment the user leaves it.
  useEffect(() => {
    useMusic.getState().setLibraryScope(true)
    return () => useMusic.getState().setLibraryScope(false)
  }, [])
}
