import { Suspense } from 'react'
import type { ScenePreset } from '../../store/settings'
import { StationSky } from './StationSky'
import { Station } from './Station'
import { TunnelJunction } from './TunnelJunction'
import { Platforms } from './Platforms'
import { StationProps } from './StationProps'
import { DepartureBoard } from './DepartureBoard'
import { Trains } from './Train'
import { Steam } from './Steam'
import { StationPlayerController } from './StationPlayerController'
import { RemotePlayers } from '../library/RemotePlayers'
import { StationAudio } from './StationAudio'

// The walkable station world. Everything you see while browsing/boarding. Mounted by
// TrainStationScene whenever the player is NOT aboard a moving train. Reuses the
// Library's generic RemotePlayers (driven by the shared net roster) so other
// students appear walking the concourse and platforms.

export function StationWorld({ preset }: { preset: ScenePreset }) {
  const accentLights = preset.grandLights // tinted per-platform key lights
  const lanternLights = preset.lampLights // promoted real lantern point-lights

  return (
    <>
      <StationSky shadows={preset.shadows} fogOn={preset.fog} shadowMap={preset.shadowMap} />
<Suspense fallback={null}>
        <Station />
        <TunnelJunction />
        <Platforms accentLights={accentLights} />
        <StationProps lanternLights={lanternLights} />
        <DepartureBoard />
        <Trains />
        {preset.particles && <Steam />}
        <StationAudio />
      </Suspense>

      <StationPlayerController />
      <RemotePlayers />
    </>
  )
}
