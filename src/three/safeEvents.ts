import { events } from '@react-three/fiber'

// r3f 9.x calls `state.events.connect(target)` from its internal `onCreated`, and
// under certain re-render / DOM-reparenting conditions (Provider remounts, context
// churn) `target` can be transiently null. That throws
// "Cannot read properties of null (reading 'addEventListener')".
// See https://github.com/pmndrs/react-three-fiber/issues/3754
//
// This factory wraps the default web event manager and no-ops `connect(null)`,
// which is safe: the next non-null `connect(target)` re-attaches every listener
// cleanly. Pass it to a <Canvas events={createNullSafeEvents} />.
export function createNullSafeEvents(store: any) {
  const manager = (events as (s: any) => any)(store)
  const originalConnect = manager.connect
  manager.connect = (target: HTMLElement | null) => {
    if (!target) return
    originalConnect(target)
  }
  return manager
}
