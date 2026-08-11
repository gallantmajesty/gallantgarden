import { useMemo } from 'react'
import { scenePreset, useSettings, type ScenePreset } from './settings'
import { useHud } from './hud'

/**
 * The single source of truth the 3D scene reads for its per-frame budget. Merges
 * the user's six quality axes (from the settings store) with the transient
 * Performance Mode flag (Ctrl+F, from the HUD store) and collapses them into one
 * ScenePreset via the pure `scenePreset()` helper.
 *
 * Axes are selected individually (not as one object) so the hook only re-runs
 * when a value actually changes — returning a fresh object from a zustand
 * selector would re-render every frame.
 */
export function useScenePreset(): ScenePreset {
  const resolutionScale = useSettings((s) => s.resolutionScale)
  const viewDistance = useSettings((s) => s.viewDistance)
  const shadowQuality = useSettings((s) => s.shadowQuality)
  const postProcessing = useSettings((s) => s.postProcessing)
  const textureQuality = useSettings((s) => s.textureQuality)
  const lodBias = useSettings((s) => s.lodBias)
  const impostorLod = useSettings((s) => s.impostorLod)
  const ultra = useSettings((s) => s.ultra)
  const perfMode = useHud((s) => s.perfMode)
  return useMemo(
    () =>
      scenePreset(
        { resolutionScale, viewDistance, shadowQuality, postProcessing, textureQuality, lodBias, impostorLod },
        perfMode,
        ultra,
      ),
    [resolutionScale, viewDistance, shadowQuality, postProcessing, textureQuality, lodBias, impostorLod, ultra, perfMode],
  )
}
