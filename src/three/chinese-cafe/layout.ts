export const CAFE = {
  halfW: 21,
  halfL: 28,
  wallH: 11,
  mezzanineY: 5.2,
  courtyard: { x: 0, z: 5.2, w: 9.6, l: 10.4 },
  pond: { x: 0, z: 5.2, w: 6.8, l: 7.6 },
} as const

export type CafeSeatZone = 'communal' | 'booth' | 'window' | 'mezzanine' | 'garden'

export interface CafeSeat {
  id: number
  zone: CafeSeatZone
  label: string
  floor: 'Ground Floor' | 'Mezzanine'
  feature: string
  quietness: 'Quiet' | 'Moderate' | 'Social'
  pos: [number, number, number]
  /** Direction from the chair toward its desk/table. */
  yaw: number
}

const seats: CafeSeat[] = []

// Eight seats around the live-edge communal tea table in the west study hall.
const communalZ = [-12, -8.8, -5.6, -2.4]
for (const side of [-1, 1] as const) {
  for (const z of communalZ) {
    const id = seats.length
    seats.push({
      id,
      zone: 'communal',
      label: `Communal Tea Table · Seat ${id + 1}`,
      floor: 'Ground Floor',
      feature: 'Live-edge tea table',
      quietness: 'Social',
      pos: [-8.4 + side * 2.1, 0, z],
      yaw: side === 1 ? Math.PI / 2 : -Math.PI / 2,
    })
  }
}

// Four two-person lattice booths on the east wall — expanded to 4 chairs per desk
// (seats 9–24) so each booth has two chairs on each long side.
const BOOTH_ZS = [-15, -7, 1, 9]
for (const z of BOOTH_ZS) {
  for (const side of [-1, 1] as const) {
    for (const dz of [-1.2, 1.2]) {
      const id = seats.length
      seats.push({
        id,
        zone: 'booth',
        label: `Lattice Booth ${Math.round((z + 15) / 8) + 1} · ${side < 0 ? 'Inner' : 'Window'} · ${dz < 0 ? 'Front' : 'Back'}`,
        floor: 'Ground Floor',
        feature: 'Private lattice booth',
        quietness: 'Quiet',
        pos: [14.8 + side * 1.45, 0, z + dz],
        yaw: side === 1 ? Math.PI / 2 : -Math.PI / 2,
      })
    }
  }
}

// Six individual rain-window seats along the west glazing. The row sits well
// south of the MoonGate partition (z 17.15..17.85) so no chair clips the wall.
for (let i = 0; i < 6; i++) {
  const id = seats.length
  seats.push({
    id,
    zone: 'window',
    label: `Rain Window · Seat ${i + 1}`,
    floor: 'Ground Floor',
    feature: 'Rain-washed street view',
    quietness: 'Moderate',
    pos: [-18.1, 0, 3.05 + i * 2.65],
    yaw: Math.PI / 2,
  })
}

// Four window seats along the west glazing in the south "second room",
// past the MoonGate partition (z 17.5..27.5) — a rain-lit continuation of the
// window row that otherwise stops at the moon gate.
for (const tz of [18.5, 21, 23.5, 26] as const) {
  const id = seats.length
  seats.push({
    id,
    zone: 'window',
    label: `South Window · Seat ${id - 21}`,
    floor: 'Ground Floor',
    feature: 'Rain-washed south window view',
    quietness: 'Moderate',
    pos: [-18.1, 0, tz],
    yaw: Math.PI / 2,
  })
}

// Four quiet seats at two desks on the rear mezzanine.
for (const deskX of [-8.2, 8.2]) {
  for (const side of [-1, 1] as const) {
    const id = seats.length
    seats.push({
      id,
      zone: 'mezzanine',
      label: `Mezzanine Courtyard View · Seat ${id - 25}`,
      floor: 'Mezzanine',
      feature: 'Courtyard overlook',
      quietness: 'Quiet',
      pos: [deskX + side * 1.15, CAFE.mezzanineY + 0.25, -21.6],
      yaw: side === 1 ? Math.PI / 2 : -Math.PI / 2,
    })
  }
}

export const CHINESE_CAFE_SEATS: readonly CafeSeat[] = Object.freeze(seats)

export function chineseCafeSeatAnchors(): CafeSeat[] {
  return CHINESE_CAFE_SEATS.map((seat) => ({ ...seat, pos: [...seat.pos] as [number, number, number] }))
}

export interface CafeAabb {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

function aabb(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): CafeAabb {
  return {
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minY: cy - sy / 2,
    maxY: cy + sy / 2,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
  }
}

/** Static camera blockers. Furniture uses these same dimensions in its visual build. */
export function chineseCafeBlockers(): CafeAabb[] {
  const { halfW, halfL, wallH, mezzanineY } = CAFE
  return [
    aabb(-halfW - 0.25, wallH / 2, 0, 0.5, wallH, halfL * 2),
    aabb(halfW + 0.25, wallH / 2, 0, 0.5, wallH, halfL * 2),
    aabb(0, wallH / 2, -halfL - 0.25, halfW * 2, wallH, 0.5),
    aabb(0, wallH / 2, halfL + 0.25, halfW * 2, wallH, 0.5),
    aabb(-8.4, 0.78, -7.2, 2.4, 1.56, 13.2),
    ...BOOTH_ZS.map((z) => aabb(14.8, 0.75, z, 2.1, 1.5, 5.0)),
    aabb(-19.6, 0.75, 9.675, 1.4, 1.5, 14.65),
    aabb(0, 0.45, 5.2, 8.2, 0.9, 9.1),
    aabb(10.7, 1.2, 20.2, 8.8, 2.4, 3.2),
    aabb(-19.6, 0.75, 22, 1.4, 1.5, 9),
    aabb(0, mezzanineY - 0.25, -21.5, 41, 0.5, 12.5),
    aabb(-8.2, mezzanineY + 0.85, -21.6, 2.4, 1.7, 4.2),
    aabb(8.2, mezzanineY + 0.85, -21.6, 2.4, 1.7, 4.2),
  ]
}

export function rayHitCafe(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  blockers: readonly CafeAabb[],
): number {
  let nearest = maxDist
  for (const box of blockers) {
    let tMin = 0
    let tMax = maxDist
    let hit = true
    const axes: [number, number, number, number][] = [
      [ox, dx, box.minX, box.maxX],
      [oy, dy, box.minY, box.maxY],
      [oz, dz, box.minZ, box.maxZ],
    ]
    for (const [origin, direction, lo, hi] of axes) {
      if (Math.abs(direction) < 1e-6) {
        if (origin < lo || origin > hi) { hit = false; break }
        continue
      }
      let a = (lo - origin) / direction
      let b = (hi - origin) / direction
      if (a > b) [a, b] = [b, a]
      tMin = Math.max(tMin, a)
      tMax = Math.min(tMax, b)
      if (tMin > tMax) { hit = false; break }
    }
    if (hit && tMin >= 0 && tMin < nearest) nearest = tMin
  }
  return nearest
}
