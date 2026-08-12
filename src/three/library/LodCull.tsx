import { type ReactNode } from 'react'
import { useScenePreset } from '../../store/quality'
import { Lod } from '../train/assets/Lod'

/**
 * Settings-driven distance culling for static world props: everything renders
 * near, then disappears past `base` metres. The switch distance scales with the
 * user's quality sliders — "Mesh detail · LOD bias" (0–1.5, pulls the cut in
 * aggressively) and "View distance" (0.6–1, extends it) — so how strong the
 * shedding is, is entirely controlled from the settings UI.
 *
 * NOTE: this is intentionally DISTANCE-ONLY. A camera-based "hide what's behind
 * the lens" pass was tried here and caused recurring, camera-dependent furniture
 * vanishing (groups strobed or stayed hidden at certain angles), which read as
 * "the tables/bookshelves/banner randomly disappear". Distance LOD never hides
 * anything the camera can see, so it stays the only culling this wrapper does.
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
