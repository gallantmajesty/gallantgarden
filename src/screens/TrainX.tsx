import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { BookingCenter } from '../three/trainx/BookingCenter'
import { TrainInterior } from '../three/trainx/TrainInterior'
import { BookingUI } from '../components/trainx/BookingUI'
import { StudyHUD } from '../components/trainx/StudyHUD'
import { useTrainX } from '../store/trainx'
import '../components/trainx/BookingUI.css'
import '../components/trainx/StudyHUD.css'

const PASSCODE = '5908'

export default function TrainX() {
  const navigate = useNavigate()
  const phase = useTrainX((s) => s.phase)
  const setPhase = useTrainX((s) => s.setPhase)
  const goToDesk = useTrainX((s) => s.goToDesk)
  const markSeated = useTrainX((s) => s.markSeated)
  const [black, setBlack] = useState(phase === 'seated' || phase === 'boarding' ? 1 : 0)
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)

  // Arriving → walk the queue (free roam the concourse).
  useEffect(() => {
    if (phase === 'arriving') {
      const id = setTimeout(() => setPhase('queue'), 600)
      return () => clearTimeout(id)
    }
  }, [phase, setPhase])

  // Boarding: the real-time train has pulled in at the platform — fade, then seat.
  const board = () => {
    setBlack(1)
    window.setTimeout(() => markSeated(), 700)
  }

  // Fade back in once we're in the (Phase 2) interior.
  useEffect(() => {
    if (phase === 'seated') {
      const id = setTimeout(() => setBlack(0), 200)
      return () => clearTimeout(id)
    }
  }, [phase])

  if (!unlocked) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#05070f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          fontFamily: "'Cinzel', serif",
          color: '#ffe6c0',
        }}
      >
        <div style={{ fontSize: 18, opacity: 0.7 }}>TrainX — Coming Soon</div>
        <input
          type="password"
          placeholder="Enter passcode"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(false) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (code === PASSCODE) setUnlocked(true)
              else setError(true)
            }
          }}
          style={{
            background: 'rgba(11,16,32,0.8)',
            color: '#ffe6c0',
            border: `1px solid ${error ? '#e55' : 'rgba(202,168,74,0.5)'}`,
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 16,
            fontFamily: "'Cinzel', serif",
            textAlign: 'center',
            width: 200,
          }}
        />
        {error && <div style={{ color: '#e55', fontSize: 14 }}>Wrong passcode</div>}
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 8,
            background: 'rgba(11,16,32,0.8)',
            color: '#ffe6c0',
            border: '1px solid rgba(202,168,74,0.5)',
            borderRadius: 10,
            padding: '8px 14px',
            cursor: 'pointer',
            fontWeight: 700,
            fontFamily: "'Cinzel', serif",
          }}
        >
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05070f' }}>
      <Canvas
        shadows
        camera={{ position: [0, 8, 26], fov: 50 }}
        onCreated={({ camera }) => camera.lookAt(0, 2, 0)}
      >
        {phase === 'seated' || phase === 'arrived' ? (
          <TrainInterior />
        ) : (
          <BookingCenter phase={phase} onArrive={goToDesk} onBoard={board} />
        )}
      </Canvas>

      <BookingUI onExit={() => navigate('/')} />
      {(phase === 'seated' || phase === 'arrived') && <StudyHUD />}

      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 60,
          background: 'rgba(11,16,32,0.8)',
          color: '#ffe6c0',
          border: '1px solid rgba(202,168,74,0.5)',
          borderRadius: 10,
          padding: '8px 14px',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        ✕ Exit TrainX
      </button>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          opacity: black,
          pointerEvents: black > 0.5 ? 'auto' : 'none',
          transition: 'opacity 0.5s ease',
          zIndex: 70,
        }}
      />
    </div>
  )
}
