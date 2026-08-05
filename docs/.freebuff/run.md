# StudyForest Preview — Run Doc

The app lives in the **parent directory** `C:\Users\taksh\studyforest` (Vite + React + Three.js).
This workspace (`docs/`) holds the preview tooling under `docs/_scripts/`.

## How to reproduce the artifacts

The dev server needs the parent project's sources with a few **uncommitted preview
artifacts** already patched in. Check before starting:

1. `src/App.tsx` must contain the `/__shot` preview route (grep for `__shot`; the
   route is registered in the public-routes block and `PUBLIC_PATHS` must include
   `/__shot` so it renders without auth).
2. `src/screens/ShotHarness.tsx` must exist — renders fixed camera views
   (`?char=<id>&view=front|side|threequarter|back`) for inspecting a character.
3. `src/avatar/AvatarRig.tsx` contains the rebuilt elephant + legendary-robe work
   (grep for `ELEPHANT HEAD` / `legendary`).

These edits were applied with idempotent Node patch scripts in `docs/_scripts/`
(`patch-preview.mjs`, then the `*-elephant.mjs` splices). Re-run them in order if a
fresh checkout lacks the artifacts:

```bash
node docs/_scripts/patch-preview.mjs      # wires __shot route + PUBLIC_PATHS
node docs/_scripts/splice-head-only.mjs   # current elephant head (eyes/clothes/robe state)
node docs/_scripts/legendary-robe.mjs     # legendary robe additions
```

No env copying is needed: `.env.local` already exists in the parent project root
(`C:\Users\taksh\studyforest\.env.local`) and this workspace is the same checkout.
`node_modules` is installed in the parent (npm, `package-lock.json`).

## How to run the server

Start vite detached from the **parent** directory on a fixed port. From this workspace:

```bash
node docs/_scripts/start-preview.mjs 5201 <log-file> <pid-file>
```

- Default vite port is 5173; use 5201 (strict) so it never clashes with other dev
  servers. If 5201 is taken, pick another free port and pass it as argv[2].
- The wrapper spawns `node_modules/vite/bin/vite.js` with `cwd` = parent project,
  logs to the given log file, and writes the child's real OS PID to the pid file.
- Verify it answers: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5201/__shot?char=elephant&view=front`
- The character preview URL is `http://localhost:5201/__shot?char=elephant&view=front`
  (views: front, side, threequarter, back).
