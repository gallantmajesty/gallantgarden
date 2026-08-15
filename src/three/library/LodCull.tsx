import { type ReactNode } from 'react'

/**
 * Passthrough wrapper. Distance-based LOD culling was REMOVED at the user's
 * request — they want full sharpness everywhere, with no static prop shedding
 * detail or vanishing at range. There is no longer any distance swap here.
 *
 * THREE still frustum-culls off-screen meshes on its own (free, and it never
 * changes what the camera can see), so only the distance-based hide/swap is gone.
 * The "Mesh detail · LOD bias" slider now affects particles + impostor
 * billboards only — not the sharpness of the bookshelves / tables / decor.
 */
export function LodCull({ children }: { base?: number; children: ReactNode }) {
  return <>{children}</>
}
