# Realm Performance Plan — "Every device gets a smooth entry"

**Goal:** a low-spec laptop (like your friend's) enters the Library realm fast, stays
playable, and is *told* honestly why the room looks simpler — instead of staring at a
long loading veil and concluding "boring web, my PC can't handle it."

## Grounding — what already exists in the code

| Piece | Where | Status |
|---|---|---|
| Auto-quality engine (device tier + FPS benchmark + low→step-up) | `src/three/realmQuality.ts` | **Dead code — never imported** |
| 7 quality axes + low/medium/high presets | `src/store/settings.ts` (PRESETS, qualityAxis) | Works, but auto only touches resolution |
| "Auto quality" toggle | `src/components/settings/LobbySettings.tsx` | Works, but does nothing |
| Loading veil (min 6s, waits for scene ready) | `src/screens/Explore.tsx` → `RoomLoader` | Works |
| Progressive shader primer (slices compile cost) | `LibraryScene.tsx` → `SceneReady` | Works |
| Seat-commit deferred mount (avoids freeze at page load) | `Explore.tsx` | Works |
| WebGL capability probe / software-renderer detection | — | **Missing** |
| "Your device is below spec" user warning | — | **Missing** |
| Context-loss handler + auto-retry at lower tier | — | **Missing** |
| Lite mode / 2D fallback for blocked devices | — | **Missing** (dev scaffolds exist: Simple/Clean/Working/Geometry scenes) |

## Phase 0 — Wire the engine that's already written (smallest, biggest win)

1. Call `enterRealmLowFirst()` in `Explore.tsx` at realm entry (seat commit / scene
   mount moment) — every device opens the realm at 0.5× resolution for a fast settle.
2. Call `settleRealmQuality()` inside `LibraryScene`'s `handleReady` (after the shader
   primer finishes) — device tier + measured FPS then step the resolution back up.
3. Ship. This alone fixes "loading was too long" for low-end devices.

## Phase 1 — Real device probe (`src/lib/deviceProfile.ts`)

- WebGL probe: `MAX_TEXTURE_SIZE`, `MAX_CUBE_TEXTURE_SIZE`, and
  `WEBGL_debug_renderer_info.UNMASKED_RENDERER_WEBGL` → detect software renderers
  (SwiftShader / llvmpipe / Basic Render Driver).
- Hardware: `navigator.deviceMemory`, `hardwareConcurrency`, screen size, DPR.
- Classify into `low | medium | high | blocked` (no WebGL at all).
- Keep the existing live FPS benchmark as the honest tie-breaker.

## Phase 2 — Tier the whole world, not just pixels

- Apply the full 7-axis preset from the detected tier (store presets already exist).
- Add a `useDeviceTier()` hook; gate heavy layers in `LibraryScene` on it — fireflies,
  floating books, lanterns, particles, reflections **unmount** on low tier instead of
  rendering invisibly. (Resolution stays the "fast settle" axis; the rest settle after ready.)

## Phase 3 — Loading experience

- On low tier, "ready" = "playable at low tier" (primer covers only materials that will
  actually render), so the veil lifts sooner.
- Add a progress breakdown (assets / shaders / world) so long waits read as progress,
  not a hang.
- WebGL **context-loss handler** with auto-retry one tier lower — this is the blank-screen /
  stuck-loading failure mode that makes users give up.

## Phase 4 — The warning ("your PC is low hardware")

- In the loader: for `low` or `blocked` tiers show a one-time, friendly notice —
  *"Your device is below the recommended spec, so we tuned this room for smooth play.
  It may look simpler, but it runs well."* — with a "Lite mode" toggle for blocked devices.
- Remember "seen once per device" in settings; never nag on repeat entries.
- Surface the detected tier in LobbySettings so power users can see and override it.

## Phase 5 — Lite mode fallback (nobody gets a black screen)

- `blocked` / software-renderer devices: render a low-cost scene variant (shadows off,
  antialias off, low DPR, `powerPreference: 'low-power'`) instead of the full LibraryScene.
- Manual "Lite mode" toggle for anyone who wants it.

## Phase 6 — Verification

- Chrome DevTools CPU throttling ×4/×6, software WebGL (disable GPU), a real low-end
  machine.
- Measure: time-to-first-frame, time-to-ready, FPS after settle, memory.
- Pass = no context loss, no black screen, loader lifts within a reasonable bound on low tier.

## Delivery order

Phase 0 (wire) → Phase 4 (warning) → Phase 1 (probe) → Phase 3 (loader + context loss)
→ Phase 2 (world tiering) → Phase 5 (lite mode). Each phase is independently shippable.
