// Sit-anchors for the Waterfall Realm. The five campfire camps contribute ten
// seats each (50 total); the solo study decks add a couple more facing the
// falls. These feed BOTH the player controller (so "Press E to sit" → the shared
// Study Station opens, exactly like the Library's desks) and the renderer (so
// the visible benches line up with where you actually sit).

import type { Seat } from '../library/furniture'
import { CAMPS, STUDY_DECKS, campRing } from './layout'

/** Every sittable seat in the realm: the 5×10 campfire ring seats followed by
 *  the solo study-deck seats. IDs are sequential and stable. */
export function campSeatAnchors(): Seat[] {
  const out: Seat[] = []
  let id = 0

  for (const camp of CAMPS) {
    for (const s of campRing(camp)) {
      out.push({ id: id++, pos: s.pos, yaw: s.yaw })
    }
  }

  // two seats per study deck, side by side, both looking toward the falls
  for (const d of STUDY_DECKS) {
    for (const off of [-1, 1]) {
      const x = d.center[0] + Math.cos(d.faceYaw + Math.PI / 2) * off * 1.1
      const z = d.center[1] + Math.sin(d.faceYaw + Math.PI / 2) * off * 1.1
      out.push({ id: id++, pos: [x, d.y, z], yaw: d.faceYaw })
    }
  }

  return out
}
