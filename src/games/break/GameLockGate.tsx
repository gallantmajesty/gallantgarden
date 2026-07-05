// @ts-nocheck
// Game Lock Gate — removed lock logic, always allows gameplay

import { useTranslation } from 'react-i18next'

interface GameLockGateProps {
  children: React.ReactNode
}

export function GameLockGate({ children }: GameLockGateProps) {
  // Always unlocked - no break requirement
  return <>{children}</>
}
