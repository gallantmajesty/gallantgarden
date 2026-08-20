/**
 * Best-effort landscape lock for the 3D realm worlds.
 *
 * Browsers only permit `screen.orientation.lock()` while the document is in
 * fullscreen or running as an installed PWA — outside of that it rejects, and
 * iOS Safari doesn't implement it at all. So this is purely best-effort: when a
 * seat is joined we try to flip the phone to landscape, and if it fails the
 * RotatePrompt (rendered over the world) tells the user to rotate manually.
 */
export function lockLandscape(): void {
  if (typeof screen === 'undefined') return
  const orientation = (screen as unknown as {
    orientation?: { lock?: (o: string) => Promise<void> }
  }).orientation
  orientation?.lock?.('landscape').catch(() => {})
}
