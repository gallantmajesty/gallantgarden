// @ts-nocheck
// WallPanels — wood paneling system for the carriage interior walls.
// Lower half: dark walnut planks with brass nail heads.
// Upper half: cream damask wallpaper.
// Dividing rail: brass trim strip.
// Crown molding: decorative wood trim at ceiling junction.

import { useMemo } from 'react'
import { CARRIAGE, ROWS, ROW_DZ, DOOR_Z } from '../interior'
import { useWoodPanelMaterial, useWallpaperMaterial } from '../materials/WoodMaterial'
import { useBrassMaterial } from '../materials/BrassMaterial'

const PANEL_HEIGHT = 1.2 // lower wood panel height
const WALLPAPER_HEIGHT = 1.0 // upper wallpaper section
const BRASS_TRIM_H = 0.05
const CROWN_TRIM_H = 0.1
const DOOR_ZONE_PADDING = 1.5 // extra space around doors to skip paneling

interface WallPanelProps {
  side: -1 | 1
}

/** Single side wall — wood paneling + wallpaper + brass trim + crown molding */
function SideWall({ side }: WallPanelProps) {
  const woodMat = useWoodPanelMaterial()
  const wallpaperMat = useWallpaperMaterial()
  const brassMat = useBrassMaterial()

  const { halfW, ceilY, z0, z1 } = CARRIAGE
  const x = side * halfW
  const wallLen = z1 - z0

  // Door zone Z range — skip paneling in this area
  const doorMinZ = Math.min(...DOOR_Z) - DOOR_ZONE_PADDING
  const doorMaxZ = Math.max(...DOOR_Z) + DOOR_ZONE_PADDING

  // We split the wall into segments to cut out the door zone
  const segments = useMemo(() => {
    const segs: { z: number; len: number }[] = []
    let cursor = z0

    // segment before door zone
    if (doorMinZ > z0) {
      segs.push({ z: (z0 + doorMinZ) / 2, len: doorMinZ - z0 })
    }
    // segment after door zone
    if (doorMaxZ < z1) {
      segs.push({ z: (doorMaxZ + z1) / 2, len: z1 - doorMaxZ })
    }
    return segs
  }, [z0, z1, doorMinZ, doorMaxZ])

  return (
    <group>
      {segments.map((seg, i) => (
        <group key={i}>
          {/* Lower wood paneling */}
          <mesh position={[x, PANEL_HEIGHT / 2, seg.z]}>
            <boxGeometry args={[0.14, PANEL_HEIGHT, seg.len]} />
            <meshStandardMaterial {...woodMat} />
          </mesh>
          {/* Upper wallpaper */}
          <mesh position={[x, PANEL_HEIGHT + WALLPAPER_HEIGHT / 2, seg.z]}>
            <boxGeometry args={[0.12, WALLPAPER_HEIGHT, seg.len]} />
            <meshStandardMaterial {...wallpaperMat} />
          </mesh>
          {/* Brass dividing rail */}
          <mesh position={[x, PANEL_HEIGHT + BRASS_TRIM_H / 2, seg.z]}>
            <boxGeometry args={[0.16, BRASS_TRIM_H, seg.len]} />
            <meshStandardMaterial color={brassMat.color} roughness={0.3} metalness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Crown molding — runs full length */}
      <mesh position={[x, ceilY - CROWN_TRIM_H / 2, (z0 + z1) / 2]}>
        <boxGeometry args={[0.12, CROWN_TRIM_H, wallLen]} />
        <meshStandardMaterial color="#3E2723" roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  )
}

/** End walls — flat panel at rear and front of carriage */
function EndWall({ z }: { z: number }) {
  const woodMat = useWoodPanelMaterial()
  const wallpaperMat = useWallpaperMaterial()
  const { halfW, ceilY } = CARRIAGE

  return (
    <group>
      {/* Lower wood paneling */}
      <mesh position={[0, PANEL_HEIGHT / 2, z]}>
        <boxGeometry args={[halfW * 2, PANEL_HEIGHT, 0.18]} />
        <meshStandardMaterial {...woodMat} />
      </mesh>
      {/* Upper wallpaper */}
      <mesh position={[0, PANEL_HEIGHT + WALLPAPER_HEIGHT / 2, z]}>
        <boxGeometry args={[halfW * 2, WALLPAPER_HEIGHT, 0.16]} />
        <meshStandardMaterial {...wallpaperMat} />
      </mesh>
    </group>
  )
}

/** Complete wall paneling system — both sides + both ends */
export function WallPanels() {
  const { z0, z1 } = CARRIAGE

  return (
    <group>
      <SideWall side={-1} />
      <SideWall side={1} />
      <EndWall z={z0} />
      <EndWall z={z1} />
    </group>
  )
}
