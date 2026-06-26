// Art-direction core for the Train Station Realm — FocusLily's third flagship
// world. A premium, AAA-stylized vintage terminus at golden dusk: deep indigo
// sky outside the trainshed, the concourse and platforms bathed in warm amber
// lantern pools — the cosy "coffee and old teak" mood. The whole realm reads
// from this one file so the palette, glow, sky, fog and key-light stay cohesive.
//
// Design language (set here, applied everywhere):
//   • WARM interior vs COOL exterior — amber lantern light indoors, cool dusk/
//     moonlight outside, so the station feels like shelter and the world beyond
//     feels vast. Real point-lights stay budgeted; most "lights" are emissive +
//     bloom (see store/settings ScenePreset lampLights/grandLights).
//   • Rich but disciplined palette — deep teak, brass, oxblood, ivory signage,
//     dusk indigo, ember. Per-platform `mood` (lib/train/lines.ts) tints accents.
//   • Atmosphere over geometry — layered fog + warm floor haze + a graded sky
//     dome do the heavy lifting, not polygon count.
//
// These are fixed constants (no live day/night cycle, like the Waterfall realm);
// the moving WORLD outside the train has its own time-of-day, driven per-line.

import { Color } from 'three'

export const sky = {
  // dusk dome: deep indigo overhead fading to a warm ember band at the horizon
  top: new Color('#161b32'),
  horizon: new Color('#d8a766'),
  // a thin cool zenith tint just above the warm band, for depth
  band: new Color('#3a3f63'),
}

export const ambient = {
  // cool blue fill from the dusk sky, so the warm lantern pools read against it
  sky: new Color('#6678b0'),
  ground: new Color('#5a4530'),
  intensity: 0.85,
}

/** The low golden key light raking in under the canopy from the south-west,
 *  long shadows down the platforms. Warm — the "golden hour" sun. */
export const keyLight = {
  dir: [0.55, 0.6, -0.55] as [number, number, number],
  color: new Color('#ffce86'),
  intensity: 1.1,
}

/** A cool counter-fill from the open north end of the shed (the world outside),
 *  no shadows — gives the warm/cool depth that flat lighting lacks. */
export const fillLight = {
  pos: [0, 22, 60] as [number, number, number],
  color: new Color('#8fa6da'),
  intensity: 0.55,
}

export const fog = {
  // warm haze — steam + dusk; softens the far platform ends without a hard wall
  color: new Color('#221d30'),
  density: 0.011,
  near: 36,
  far: 150,
}

/** Warm materials reused across the station woodwork, brass, stone and glass.
 *  Existing keys are preserved (downstream modules import them) and refined;
 *  the new richer tokens (teak/oak/plaster/oxblood/ivory/copper…) are the AAA
 *  palette the redesigned geometry draws from. */
export const palette = {
  // --- floors / stone ---
  stoneFloor: new Color('#504850'), // concourse dark warm slate
  stoneFloorWarm: new Color('#60584e'), // platform warm stone
  stoneEdge: new Color('#5a5048'),
  plaster: new Color('#46403e'), // warm wall plaster (interior)
  plasterCool: new Color('#383642'), // cooler wall in shadow
  // --- wood ---
  woodDark: new Color('#352216'),
  wood: new Color('#6b4427'),
  woodWarm: new Color('#8a5a32'),
  teak: new Color('#5a3a24'), // deep warm hero teak
  teakDark: new Color('#3a2418'),
  oak: new Color('#7d5532'), // lighter trim oak
  // --- metal ---
  brass: new Color('#c39a52'),
  brassBright: new Color('#ecc879'),
  brassDark: new Color('#8a6a34'),
  iron: new Color('#48464e'),
  ironWarm: new Color('#504a52'),
  copper: new Color('#7c4a38'), // weathered roof copper
  steel: new Color('#9aa0a6'),
  // --- brick (King's Cross terminus shell) ---
  brick: new Color('#7a4632'), // warm London stock brick
  brickDark: new Color('#5a3324'), // shaded brick courses
  brickCool: new Color('#4a3a3a'), // cool brick in the tunnel
  mortar: new Color('#b9a487'), // pale mortar lines / stone banding
  // --- fabric / accents ---
  oxblood: new Color('#6e2f2c'), // seat upholstery / runner
  ivory: new Color('#efe2c2'), // signage cream
  canvasCanopy: new Color('#46433f'),
  glassWarm: new Color('#ffd9a0'),
  glassDusk: new Color('#2c3454'), // canopy / window cool glass
  signGreen: new Color('#123b34'),
  signCream: new Color('#f3e2bf'),
  plant: new Color('#356b3e'),
  plantPot: new Color('#7a4a30'),
}

/** Emissive glow tints — lanterns, signage lamps, train windows, steam. Driven
 *  bright (toneMapped=false) so the high-threshold bloom blossoms only on these. */
export const glow = {
  lantern: new Color('#ffb55a'),
  lanternCore: new Color('#ffe7b0'),
  window: new Color('#ffce86'), // warm cabin / window glow
  signLamp: new Color('#ffd27a'),
  ember: new Color('#ff7a3c'),
  coolMoon: new Color('#9fb6e6'), // cool exterior counter-glow
  tunnel: new Color('#5fd7c8'), // cool teal tunnel sconces (going somewhere)
  signalRed: new Color('#ff4d4d'),
  signalGreen: new Color('#39ff88'),
  steam: new Color('#d8d2c4'),
}
