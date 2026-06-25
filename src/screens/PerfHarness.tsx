// TEMPORARY perf harness — mounts the real Forest Hall (LibraryScene) with NO
// auth and NO multiplayer presence, i.e. the exact "1 player, environment only"
// scenario. The scene's built-in PerfLogger prints [FocusLily perf] stats to the
// console; profile-forest.cjs scrapes them. Delete this file + its /__perf route
// when the performance pass is done.
import { Suspense } from 'react'
import { LibraryScene } from '../three/library/LibraryScene'

export function PerfHarness() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Suspense fallback={null}>
        <LibraryScene />
      </Suspense>
      <div id="perf-ready" style={{ position: 'fixed', bottom: 4, left: 4, color: '#fff6', font: '11px monospace' }}>
        perf-harness
      </div>
    </div>
  )
}
