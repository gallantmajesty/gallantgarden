import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePomodoro } from '../../store/pomodoro'
import { Notifications } from '../../games/break/Notifications'
import { useBreakIntegration } from '../../games/break/BreakIntegration'
import { GameLockGate } from '../../games/break/GameLockGate'
import { MatchLobby } from '../../games/lobby/MatchLobby'
import { MatchTypeSelector } from '../../games/lobby/MatchTypeSelector'
import { ReturnToStudy } from '../../games/lobby/ReturnToStudy'
import { useMatchmaking } from '../../games/lobby/Matchmaking'
import { useLavaPadStore } from '../../three/lava-pad/store'
import { useSessionStore } from '../../three/lava-pad/sessionStore'
import { LavaPadScene } from '../../three/lava-pad/LavaPadScene'
import { LavaPadUI } from '../../three/lava-pad/LavaPadUI'
import { SceneErrorBoundary } from '../../three/lava-pad/SceneErrorBoundary'
import './LavaPad.css'

const LavaPadDebug = /* #__PURE__ */ lazy(() => import('../../three/lava-pad/LavaPadDebug').then(m => ({ default: m.LavaPadDebug })))

type Screen = 'matchType' | 'lobby' | 'game'

function recordMatchStart() {
  console.log('[Analytics] Match started')
}

function recordMatchComplete(survivalTime: number, placement: number) {
  console.log('[Analytics] Match completed', { survivalTime, placement })
}

function recordDisconnect() {
  console.log('[Analytics] Match disconnected')
}

export function LavaPad() {
  const [screen, setScreen] = useState<Screen>('matchType')
  const [gameStarted, setGameStarted] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
  const setMatchResult = useBreakIntegration((s) => s.setMatchResult)
  const phase = useLavaPadStore((s) => s.phase)
  const results = useLavaPadStore((s) => s.results)
  const leaveRoom = useMatchmaking((s) => s.leaveRoom)

  const playMode = useSessionStore((s) => s.playMode)
  const beginSession = useSessionStore((s) => s.beginSession)
  const resetSession = useSessionStore((s) => s.reset)

  // Monitor pomodoro state and start game
  useEffect(() => {
    const unsub = usePomodoro.subscribe(() => {
      useBreakIntegration.getState().checkBreak()
    })
    return () => unsub()
  }, [])

  // Initialize game state on mount
  useEffect(() => {
    const store = useLavaPadStore.getState()
    store.reset()
    store.regenerate()
    store.addPlayer('local', 'You')
    store.setLocalPlayerId('local')
    useBreakIntegration.getState().checkBreak()

    return () => {
      store.reset()
      leaveRoom()
      resetSession()
    }
  }, [])

  // Detect match end and record results
  useEffect(() => {
    if (phase === 'results' && results) {
      setMatchResult(results.matchDuration, results.placement)
      setShowReturn(true)
    }
  }, [phase, results])

  // Analytics
  const analyticsRecorded = useRef(false)

  useEffect(() => {
    if (phase === 'playing' && !analyticsRecorded.current) {
      recordMatchStart()
      analyticsRecorded.current = true
    }
    if (phase === 'results' && results && analyticsRecorded.current) {
      recordMatchComplete(results.survivalTime, results.placement)
    }
  }, [phase, results])

  // Record disconnect on unmount mid-match
  useEffect(() => {
    return () => {
      if (analyticsRecorded.current && phase !== 'results' && phase !== 'finished') {
        recordDisconnect()
      }
    }
  }, [])

  // Pick a session then go to lobby (multiplayer) or start immediately (single)
  const handleConfirmMatchType = useCallback(() => {
    if (playMode === 'multi') {
      setScreen('lobby')
    } else {
      beginSession()
      setGameStarted(true)
      setScreen('game')
    }
  }, [playMode, beginSession])

  const handleStartMatch = useCallback(() => {
    beginSession()
    setGameStarted(true)
    setScreen('game')
  }, [beginSession])

  const handleReturnToType = useCallback(() => {
    setScreen('matchType')
    resetSession()
  }, [resetSession])

  const handleReturn = useCallback(() => {
    setGameStarted(false)
    setShowReturn(false)
    setScreen('matchType')
    resetSession()
    const store = useLavaPadStore.getState()
    store.reset()
    store.regenerate()
    store.addPlayer('local', 'You')
    store.setLocalPlayerId('local')
  }, [resetSession])

  const lobbyOnBack = useMemo(() => () => {
    setScreen('matchType')
    leaveRoom()
  }, [leaveRoom])

  return (
    <GameLockGate>
      <div className="lava-pad-root">
        <Notifications />

        {screen === 'matchType' && (
          <MatchTypeSelector onConfirm={handleConfirmMatchType} onBack={handleReturnToType} />
        )}

        {screen === 'lobby' && (
          <MatchLobby onStartMatch={handleStartMatch} onBack={lobbyOnBack} />
        )}

        {screen === 'game' && gameStarted && (
          <Suspense fallback={
            <div className="lava-pad-loading water-glass">
              <div className="lava-pad-loading-spinner" />
              <span>Loading Lava Pad…</span>
            </div>
          }>
            <SceneErrorBoundary>
              <div className="lava-pad-scene-container">
                <LavaPadScene />
                <LavaPadUI />
                {showReturn && <ReturnToStudy onReturn={handleReturn} />}
              </div>
            </SceneErrorBoundary>
            {import.meta.env.DEV && <LavaPadDebug />}
          </Suspense>
        )}
      </div>
    </GameLockGate>
  )
}