// @ts-nocheck
import { useEffect, useState } from 'react'
import { useRealmNet } from '../../multiplayer/net'

interface CameraStatus {
  mode: 'personal' | 'universal'
  preset?: number
}

export function CameraStatusIndicator() {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>({ mode: 'personal', preset: 1 })
  const [visible, setVisible] = useState(false)
  const roster = useRealmNet((s) => s.roster)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      const key = parseInt(e.key)
      if (key >= 1 && key <= 4) {
        setCameraStatus({ mode: 'personal', preset: key })
        setVisible(true)
        // Hide after 3 seconds
        setTimeout(() => setVisible(false), 3000)
      } else if (key === 5) {
        setCameraStatus({ mode: 'universal' })
        setVisible(true)
        // Hide after 3 seconds
        setTimeout(() => setVisible(false), 3000)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const getStatusText = () => {
    if (cameraStatus.mode === 'personal') {
      return `Personal Camera Mode ${cameraStatus.preset}`
    } else {
      return 'Universal Camera Mode'
    }
  }

  const getStatusDescription = () => {
    if (cameraStatus.mode === 'personal') {
      const descriptions = {
        1: 'Front-right view of your seat',
        2: 'Front-left view of your seat',
        3: 'Overhead view of your seat',
        4: 'Side view of your seat'
      }
      return descriptions[cameraStatus.preset as keyof typeof descriptions] || 'Personal camera view'
    } else {
      return 'Cinematic camera showing the entire library'
    }
  }

  if (!visible) return null

  return (
    <div className="camera-status-indicator">
      <div className="camera-status-main">
        <span className="camera-status-mode">{getStatusText()}</span>
        <span className="camera-status-desc">{getStatusDescription()}</span>
      </div>
      <div className="camera-status-hint">
        Press 1-4 for personal camera, 5 for universal camera
      </div>
    </div>
  )
}