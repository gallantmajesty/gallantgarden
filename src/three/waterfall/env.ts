// Fixed bright-golden-day atmosphere for the Waterfall Realm. Unlike the Library
// (which runs a live day/night cycle in its own env.ts), this realm is daytime
// ONLY — warm golden sun, clear blue sky — so these are constants, not animated
// state. Components read them directly; nothing here changes per frame.

import { Color, Vector3 } from 'three'

export const sky = {
  // clear-blue dome graduating to a bright warm horizon
  top: new Color('#3d86d6'),
  horizon: new Color('#dcefff'),
}

export const sun = {
  // late-morning golden sun, high and to the side so the falls catch the light
  dir: new Vector3(0.42, 0.78, 0.46).normalize(),
  color: new Color('#fff4d8'),
  // warm bounce / fill from sky + water
  skyFill: new Color('#bfe0ff'),
  groundFill: new Color('#6f7a4a'),
}

export const fog = {
  color: new Color('#cfeaff'),
}

/** Mist/water tints reused across the waterfall, lake and foam.
 *  Tuned for a real daylight glacial lake + falling water (blue-grey, NOT white):
 *  shallow turquoise at the shore deepening to teal in the basin; the waterfall
 *  reads as cool blue-grey sheets that only brighten to near-white in the foam. */
export const water = {
  shallow: new Color('#7ad7cb'), // turquoise shallows
  deep: new Color('#0c5e6a'), // dark teal depths
  turquoise: new Color('#1f9aa0'),
  // waterfall sheet colours
  fallLight: new Color('#cfe7ee'), // pale blue-grey crest water
  fallDeep: new Color('#5a8794'), // shaded blue-grey body
  // soft off-white foam/spray (never pure 1,1,1 — that's what blows out + blooms)
  foam: new Color('#e8f4f6'),
  mist: new Color('#d4e6ea'),
}
