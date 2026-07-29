import { Environment } from '@react-three/drei'
import { CafeShell } from './CafeShell'
import { CafeFloor } from './CafeFloor'
import { CafeTables } from './CafeTables'
import { ServiceCounter } from './ServiceCounter'
import { MenuBoard } from './MenuBoard'
import { CafeLighting } from './CafeLighting'
import { CafeDecor } from './CafeDecor'
import { CafeAtmosphere } from './CafeAtmosphere'

export function UkCafeScene() {
  return (
    <>
      <Environment preset="sunset" />
      <CafeLighting />
      <CafeShell />
      <CafeFloor />
      <CafeTables />
      <ServiceCounter />
      <MenuBoard />
      <CafeDecor />
      <CafeAtmosphere />
      <fog attach="fog" args={['#4a3020', 12, 28]} />
    </>
  )
}