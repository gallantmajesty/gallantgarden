import { useEffect, useState } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

function detect(): DeviceType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'desktop'
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const fine = window.matchMedia('(any-pointer: fine)').matches
  const width = window.innerWidth
  const ua = navigator.userAgent || ''
  const isMobileUA =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|iPad|Silk|Kindle|PlayBook|Nintendo|Phone/i.test(
      ua,
    )
  const iPadOS =
    (navigator.platform === 'MacIntel' || /Macintosh/.test(ua)) && (navigator.maxTouchPoints ?? 0) > 1
  if (isMobileUA || iPadOS) return width < 820 ? 'mobile' : 'tablet'
  // Touch-first device without a fine pointer (phones/tablets in any browser).
  if (coarse && !fine) return width < 820 ? 'mobile' : 'tablet'
  return 'desktop'
}

/** Returns the current device class: 'mobile' | 'tablet' | 'desktop'.
 *  Desktop is detected by a fine pointer + hover capability (or a wide viewport
 *  with a mouse). This is purely additive — it is only consumed by the new
 *  mobile/tablet branches, so desktop rendering is never affected. */
export function useDeviceType(): DeviceType {
  const [type, setType] = useState<DeviceType>(detect)
  useEffect(() => {
    const update = () => setType(detect())
    update()
    window.addEventListener('resize', update)
    const coarse = window.matchMedia('(pointer: coarse)')
    const fine = window.matchMedia('(any-pointer: fine)')
    coarse.addEventListener?.('change', update)
    fine.addEventListener?.('change', update)
    return () => {
      window.removeEventListener('resize', update)
      coarse.removeEventListener?.('change', update)
      fine.removeEventListener?.('change', update)
    }
  }, [])
  return type
}

/** True on touch-first devices (phones + tablets). Used to show on-screen
 *  controls that replace the keyboard/mouse. Mirrors the existing `isTouch`
 *  check in Explore.tsx so behavior is consistent across the app. */
export function useIsTouch(): boolean {
  const [touch, setTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setTouch(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])
  return touch
}

/** True when the layout should switch to the mobile/tablet UI (i.e. NOT desktop).
 *  This is the gate for every new responsive branch. */
export function useIsMobileOrTablet(): boolean {
  const type = useDeviceType()
  return type !== 'desktop'
}
