import { type ReactNode } from 'react'
import { useScenePreset } from '../../store/quality'
import { Lod } from '../train/assets/Lod'

/**
 * Settings-driven distance culling for static world props: everything renders
 * near, then disappears past `base` metres. The switch distance scales with the
 * user's quality sliders — "Mesh detail · LOD bias" (0–1.5, pulls the cut in
 * aggressively) and "View distance" (0.6–1, extends it) — so how strong the
 * shedding is, is entirely controlled from the settings UI.
 */
export function LodCull({ base, children }: { base: number; children: ReactNode }) {
  const preset = useScenePreset()
  const vd = preset.far / 1400 // viewDistance proxy (0.6 … 1)
  const far = Math.max(24, Math.round(base * (0.7 + 0.3 * vd)))
  return (
    <Lod distances={[0, far, far + 10]} bias={preset.lodBias}>
      {children}
      <group />
    </Lod>
  )
}
