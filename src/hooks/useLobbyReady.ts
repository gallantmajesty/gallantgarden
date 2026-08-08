// useLobbyReady — tracks when the lobby's icons are fully loaded and painted.
// Used by the intro veil to stay visible until the lobby is visually ready.

import { useEffect, useState } from 'react'
import type { PngIconName } from '../components/PngIcon'

const LOBBY_ICONS: PngIconName[] = [
  'study-rooms',
  'notes',
  'realm',
  'tasks',
  'focus-timer',
  'profile',
  'games',
  'friends',
  'settings',
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
        if (cancelled) return
        // Wait two more animation frames so the lobby has actually drawn
        // behind the veil before we let it lift.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) setReady(true)
          })
        })
      },
    )

    return () => { cancelled = true }
  }, [])

  return ready
}
