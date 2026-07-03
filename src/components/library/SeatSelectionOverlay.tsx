import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useSeatFlow } from '../../store/seatFlow'
import { useWorld } from '../../store/world'
import { HALL } from '../../three/library/layout'
import { seatAnchors } from '../../three/library/furniture'
import type { Seat } from '../../three/library/furniture'

// aspect ratios for map positioning
const ASPECT_W = HALL.halfW * 2
const ASPECT_L = HALL.halfL * 2
const SIDE_MARGIN = 60
const TOP_MARGIN = 180

/** Seat metadata for the hover card */
interface SeatMeta {
  floor: 'Ground' | 'Upper Gallery'
  feature: string
  quietness: 'Quiet' | 'Moderate' | 'Lively'
}

function getSeatMeta(seat: Seat): SeatMeta {
  const isUpper = seat.pos[1] >= HALL.balconyY / 2
  const feature = (() => {
    if (Math.abs(seat.pos[0]) > HALL.halfW - 5) return 'Near window'
    if (Math.abs(seat.pos[2]) > HALL.halfL - 8) return 'Near fireplace'
    if (isUpper) return 'Upper gallery view'
    return 'Central hall'
  })()
  const quietness = isUpper ? 'Quiet' : Math.abs(seat.pos[2]) < 10 ? 'Lively' : 'Moderate'
  return { floor: isUpper ? 'Upper Gallery' : 'Ground', feature, quietness }
}

/** Audio hook placeholder — synthesised sounds ready for wiring up */
function useAudioCues() {
  const playHover = useCallback(() => {
    // TODO: wire to AudioEngine — page rustle / wood creak
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.debug('[audio] seat hover')
  }, [])
  const playSelect = useCallback(() => {
    // TODO: wire to AudioEngine — gentle bell chime
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.debug('[audio] seat select')
  }, [])
  return { playHover, playSelect }
}

export function SeatSelectionOverlay() {
  const flow = useSeatFlow()
  const occupied = flow.occupied
  const pickSeat = flow.pickSeat
  const startWalk = flow.startWalk
  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'ground' | 'upper'>('ground')
  const [scale, setScale] = useState(1)
  const audio = useAudioCues()

  // Responsive scale
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      if (w < 640) setScale(0.75)
      else if (w < 960) setScale(1)
      else setScale(1.1)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const seats = useMemo(() => seatAnchors(), [])

  // Map seat positions to normalised 0..1 within the hall
  const seatPositions = useMemo(() => {
    return seats.map((s) => {
      const nx = (s.pos[0] + HALL.halfW) / ASPECT_W
      const ny = (s.pos[2] + HALL.halfL) / ASPECT_L
      return { ...s, nx, ny, meta: getSeatMeta(s) }
    })
  }, [seats])

  // Floor filtering
  const groundSeats = useMemo(() => seatPositions.filter((s) => s.pos[1] < HALL.balconyY / 2), [seatPositions])
  const upperSeats = useMemo(() => seatPositions.filter((s) => s.pos[1] >= HALL.balconyY / 2), [seatPositions])
  const displayedSeats = activeTab === 'ground' ? groundSeats : upperSeats

  const handleSelect = (id: number) => {
    setSelected(id)
    audio.playSelect()
    pickSeat(id)
  }

  const handleHover = (id: number | null) => {
    if (id !== null && id !== hovered) audio.playHover()
    setHovered(id)
  }

  return (
    <div className="sso-root" style={{ opacity: 1, transition: 'opacity 0.5s ease' }}>
      <div className="sso-panel">
        {/* Header */}
        <div className="sso-header">
          <h2 className="sso-title">Choose your seat</h2>
          <p className="sso-subtitle">Pick a place in the great hall to begin your study session</p>
        </div>

        {/* Legend */}
        <div className="sso-legend">
          <span className="sso-legend-item">
            <span className="sso-dot available" /> Available
          </span>
          <span className="sso-legend-item">
            <span className="sso-dot occupied" /> Occupied
          </span>
          <span className="sso-legend-item">
            <span className="sso-dot selected" /> Selected
          </span>
        </div>

        {/* Floor Tabs */}
        <div className="sso-tabs">
          <button
            className={`sso-tab ${activeTab === 'ground' ? 'active' : ''}`}
            onClick={() => setActiveTab('ground')}
          >
            Ground floor
          </button>
          <button
            className={`sso-tab ${activeTab === 'upper' ? 'active' : ''}`}
            onClick={() => setActiveTab('upper')}
          >
            Upper gallery
          </button>
        </div>

        {/* Seat Map */}
        <MapLayer
          seats={displayedSeats}
          scale={scale}
          occupied={occupied}
          selected={selected}
          hovered={hovered}
          onHover={handleHover}
          onSelect={handleSelect}
        />

        {/* Actions */}
        <div className="sso-actions">
          <button
            className="sf-btn water sso-skip"
            disabled={selected == null}
            onClick={() => {
              if (selected != null) {
                pickSeat(selected)
                startWalk()
                useSeatFlow.getState().arrive()
                useWorld.getState().sit(selected)
              }
            }}
          >
            Skip to seat
          </button>
          <button
            className="sf-btn water sso-join"
            disabled={selected == null}
            onClick={() => {
              if (selected == null) return
              pickSeat(selected)
              startWalk()
            }}
          >
            Join Study Session
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface DisplaySeat extends Seat {
  nx: number
  ny: number
  meta: SeatMeta
}

interface MapLayerProps {
  seats: DisplaySeat[]
  scale: number
  occupied: Record<number, string>
  selected: number | null
  hovered: number | null
  onHover: (id: number | null) => void
  onSelect: (id: number) => void
}

function MapLayer({ seats, scale, occupied, selected, hovered, onHover, onSelect }: MapLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="sso-map-wrapper" style={{ marginTop: TOP_MARGIN, marginLeft: SIDE_MARGIN, marginRight: SIDE_MARGIN, marginBottom: 40 }}>
      <div className="sso-map" ref={containerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {/* Hall walls (decorative) */}
        <div className="sso-wall sso-wall-top" />
        <div className="sso-wall sso-wall-left" />
        <div className="sso-wall sso-wall-right" />
        <div className="sso-wall sso-wall-bottom" />

        {/* Inner hall border */}
        <div className="sso-hall" />

        {/* Entrance indicator */}
        <div className="sso-entrance" title="Entrance">
          <span>Entrance</span>
        </div>

        {/* Seats */}
        {seats.map((s) => (
          <SeatDot
            key={s.id}
            seat={s}
            isOccupied={!!occupied[s.id]}
            isSelected={selected === s.id}
            isHovered={hovered === s.id}
            onHover={() => onHover(s.id)}
            onLeave={() => onHover(null)}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface SeatDotProps {
  seat: DisplaySeat
  isOccupied: boolean
  isSelected: boolean
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}

function SeatDot({ seat, isOccupied, isSelected, isHovered, onHover, onLeave, onClick }: SeatDotProps) {
  const [showCard, setShowCard] = useState(false)

  useEffect(() => {
    if (isHovered) {
      const t = setTimeout(() => setShowCard(true), 200)
      return () => clearTimeout(t)
    }
    setShowCard(false)
  }, [isHovered])

  return (
    <button
      className={`sso-seat ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      style={{
        left: `${seat.nx * 100}%`,
        top: `${seat.ny * 100}%`,
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={() => {
        if (!isOccupied) onClick()
      }}
      disabled={isOccupied}
      title={isOccupied ? 'Occupied' : `Seat ${seat.id + 1}`}
    >
      {/* Hover Card */}
      {showCard && !isOccupied && (
        <div className="sso-seat-card" onClick={(e) => e.stopPropagation()}>
          <div className="sso-card-header">
            <span className="sso-card-number">Seat {seat.id + 1}</span>
            <span className={`sso-card-floor ${seat.meta.floor === 'Upper Gallery' ? 'upper' : ''}`}>
              {seat.meta.floor}
            </span>
          </div>
          <div className="sso-card-body">
            <span className="sso-card-feature">{seat.meta.feature}</span>
            <span className="sso-card-quiet">{seat.meta.quietness}</span>
          </div>
        </div>
      )}
    </button>
  )
}
