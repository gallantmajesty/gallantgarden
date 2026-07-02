// useLobbyReady — tracks when lobby PNG icons are fully loaded and painted.
// Used by the intro veil to stay visible until the lobby is visually ready.

import { useEffect, useState } from 'react'
import type { PngIconName } from '../components/PngIcon'

const LOBBY_ICONS: PngIconName[] = [
  'study-rooms',
  'notes',
  'realm',
  'tasks',
  'focus-timer',
  'lotus',
]

function preload(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(true) // count errors as "done" so we don't block
    img.src = src
  })
}

export function useLobbyReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all(LOBBY_ICONS.map((name) => preload(`/icons/${name}.png`))).then(
      () => {
        if (!cancelled) setReady(true)
      },
    )

    return () => { cancelled = true }
  }, [])

  return ready
}
