import { useKeepAwake } from "../lib/keepAwake";

/**
 * KeepAwakeProvider — a no-render component that activates the Wake Lock API
 * when the `keepAwake` setting is enabled.
 *
 * Place this at the root of your app (e.g., in App.tsx or main.tsx) so it
 * manages the wake lock globally while the app is running.
 */
export function KeepAwakeProvider(): null {
  useKeepAwake();
  return null;
}