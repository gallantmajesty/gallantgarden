// Brass fixture material — warm gold metal for door handles, window frames,
// luggage rack rails, lamp brackets, and decorative trim. Uses the shared
// material registry pattern for cache efficiency.

import { useMemo } from 'react'
import { MeshStandardMaterial } from 'three'

/** Brass Gold #C9A84C — primary fixture material */
export function useBrassMaterial() {
  return useMemo(() => {
    return new MeshStandardMaterial({
      color: '#C9A84C',
      roughness: 0.3,
      metalness: 0.9,
    })
  }, [])
}

/** Darker brass for structural elements (rack brackets, door frames) */
export function useBrassDarkMaterial() {
  return useMemo(() => {
    return new MeshStandardMaterial({
      color: '#A07830',
      roughness: 0.4,
      metalness: 0.8,
    })
  }, [])
}

/** Bright brass for decorative accents (nail heads, finials) */
export function useBrassBrightMaterial() {
  return useMemo(() => {
    return new MeshStandardMaterial({
      color: '#E0C060',
      roughness: 0.2,
      metalness: 0.95,
    })
  }, [])
}
