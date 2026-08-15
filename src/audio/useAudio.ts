import { useEffect } from 'react'
import { getAmbient } from './ambient'
import { useSettings } from '../store/settings'
import { useMusic } from '../store/music'

/**
 * Keeps the {@link AmbientEngine} in sync with the audio settings, starts it on
 * the first user gesture (browser autoplay rule), and silences it when the host
 * screen unmounts. Mount once in the Explore screen.
 */
export function useAudio() {
  const master = useSettings((s) => s.master)
  const ambientVol = useSettings((s) => s.ambientVol)
  const rainVol = useSettings((s) => s.rainVol)
  const ambientOn = useSettings((s) => s.ambientOn)
  const rainOn = useSettings((s) => s.rainOn)

  // apply mix whenever it changes
  useEffect(() => {
    getAmbient().apply({ master, ambientVol, rainVol, ambientOn, rainOn })
  }, [master, ambientVol, rainVol, ambientOn, rainOn])

  // start on first gesture, silence on unmount
  useEffect(() => {
    const eng = getAmbient()
    const kick = () => {
      eng.ensure()
      const s = useSettings.getState()
      eng.apply({ master: s.master, ambientVol: s.ambientVol, rainVol: s.rainVol, ambientOn: s.ambientOn, rainOn: s.rainOn })
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
  }, [])

  // The library music player is scoped to this screen: mark the library as
  // active on entry and pause the player the moment the user leaves it.
  useEffect(() => {
    useMusic.getState().setLibraryScope(true)
    return () => useMusic.getState().setLibraryScope(false)
  }, [])
}
