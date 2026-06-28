import { Suspense, useEffect } from 'react'
import type { ScenePreset } from '../../store/settings'
import { MovingWorld } from './MovingWorld'
import { CarriageInterior } from './CarriageInterior'
import { InteriorController } from './InteriorController'
import { TrainInteriorAudio } from './TrainInteriorAudio'
import { RemotePlayers } from '../library/RemotePlayers'
import { useTrain } from '../../store/train'
import { TRAIN_LINES } from '../../lib/train/lines'
import { resetSeatMap } from './interior'

// The journey world: what you see once you've boarded and the train is rolling.
// Mounted by TrainStationScene whenever the player is aboard (phase traveling or
// arrived). It composes three layers in the carriage's own coordinate space —
//   • the CarriageInterior  (the cosy cabin you sit in, at the origin)
//   • the MovingWorld        (themed scenery streaming past the windows)
//   • the InteriorController  (seats you, broadcasts the seated pose, look-around)
// plus the shared RemotePlayers so fellow passengers appear in their chosen seats.
//
// The scenery only scrolls while actually traveling; on arrival it eases to a stop
// under the reward screen. The line is read live from the journey store so a
// restore-on-reload drops you straight back into the right cabin.

export function TrainRide({ preset }: { preset: ScenePreset }) {
  const line = useTrain((s) => s.line) ?? TRAIN_LINES[0]
  const phase = useTrain((s) => s.phase)
  const moving = phase === 'traveling'
  void preset // reserved: per-quality scenery density tuning lands with LOD pass

  // clear seat occupancy on a fresh ride
  useEffect(() => { resetSeatMap() }, [])

  return (
    <>
      <Suspense fallback={null}>
        {/* themed lighting + fog ride along inside MovingWorld, so it owns the
            atmosphere while aboard (no station sky here). */}
        <MovingWorld line={line} paused={!moving} />
        <CarriageInterior line={line} />
        <RemotePlayers />
      </Suspense>

      <InteriorController />
      <TrainInteriorAudio />
    </>
  )
}
