import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRealm } from '../../store/realm'
import { useSeatFlow } from '../../store/seatFlow'
import { useWorld } from '../../store/world'
import {
  CAFE,
  chineseCafeSeatAnchors,
  type CafeSeat,
} from './layout'

const PLAN_WIDTH = 560
const PLAN_HEIGHT = 920
const PLAN_X = 28
const PLAN_Y = 46
const PLAN_INNER_WIDTH = 504
const PLAN_INNER_HEIGHT = 828

const ROOT_STYLE: CSSProperties = {
  opacity: 1,
  transition: 'opacity 0.5s ease',
  backgroundImage:
    'radial-gradient(circle at 50% 20%, rgba(27, 117, 87, 0.34), transparent 42%), linear-gradient(160deg, rgba(5, 39, 32, 0.92), rgba(28, 35, 22, 0.9) 52%, rgba(38, 28, 13, 0.94))',
}

const PANEL_STYLE = {
  '--room-accent': '#35b88a',
  '--room-accent-soft': 'rgba(214, 174, 82, 0.24)',
  background:
    'linear-gradient(180deg, rgba(16, 67, 53, 0.94), rgba(31, 34, 20, 0.96))',
} as CSSProperties

const MAP_STYLE: CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(12, 55, 45, 0.82), rgba(35, 31, 17, 0.9))',
  borderColor: 'rgba(214, 174, 82, 0.42)',
  boxShadow:
    'inset 0 0 48px rgba(39, 160, 116, 0.1), inset 0 2px 0 rgba(232, 193, 101, 0.14)',
}

interface DisplayCafeSeat extends CafeSeat {
  nx: number
  ny: number
}

function planX(x: number): number {
  return PLAN_X + ((x + CAFE.halfW) / (CAFE.halfW * 2)) * PLAN_INNER_WIDTH
}

function planY(z: number): number {
  return PLAN_Y + ((z + CAFE.halfL) / (CAFE.halfL * 2)) * PLAN_INNER_HEIGHT
}

function planW(width: number): number {
  return (width / (CAFE.halfW * 2)) * PLAN_INNER_WIDTH
}

function planH(length: number): number {
  return (length / (CAFE.halfL * 2)) * PLAN_INNER_HEIGHT
}

function occupantAt(occupied: Record<number, string>, seatId: number): string | null {
  if (!Object.prototype.hasOwnProperty.call(occupied, seatId)) return null
  return occupied[seatId] || 'Student'
}

export function ChineseCafeSeatSelectionOverlay() {
  const navigate = useNavigate()
  const realm = useRealm((state) => state.active)
  const currentSeatId = useWorld((state) => state.seat)
  const flow = useSeatFlow()
  const occupied = flow.occupied
  const pickSeat = flow.pickSeat
  const startWalk = flow.startWalk
  const [selected, setSelected] = useState<number | null>(currentSeatId)
  const roomId = realm?.roomId ?? null

  const seats = useMemo(() => chineseCafeSeatAnchors(), [])
  const seatPositions = useMemo<DisplayCafeSeat[]>(
    () =>
      seats.map((seat) => ({
        ...seat,
        nx: 0.05 + (0.9 * (seat.pos[0] + CAFE.halfW)) / (CAFE.halfW * 2),
        ny: 0.05 + (0.9 * (seat.pos[2] + CAFE.halfL)) / (CAFE.halfL * 2),
      })),
    [seats],
  )

  const occupiedCount = useMemo(
    () =>
      seatPositions.reduce(
        (count, seat) => count + (occupantAt(occupied, seat.id) ? 1 : 0),
        0,
      ),
    [occupied, seatPositions],
  )
  const availableCount = seatPositions.length - occupiedCount

  const lockedRoomId = flow.lockedRoomId
  const seatLockUntil = flow.seatLockUntil
  const lockMatches =
    lockedRoomId != null && roomId != null && lockedRoomId === roomId
  const [lockRemainingMs, setLockRemainingMs] = useState(0)

  useEffect(() => {
    const updateRemaining = () => {
      setLockRemainingMs(
        lockMatches && seatLockUntil != null
          ? Math.max(0, seatLockUntil - Date.now())
          : 0,
      )
    }
    const initialUpdate = window.setTimeout(updateRemaining, 0)
    const interval = window.setInterval(updateRemaining, 1000)
    return () => {
      window.clearTimeout(initialUpdate)
      window.clearInterval(interval)
    }
  }, [lockMatches, seatLockUntil])

  const isRoomLocked = lockRemainingMs > 0
  const cooldownSec = Math.ceil(lockRemainingMs / 1000)
  const cooldownMin = Math.floor(cooldownSec / 60)
  const cooldownS = cooldownSec % 60
  const wasSeated = flow.entrancePlayed

  const sitDown = useCallback(
    (seatId: number) => {
      const seatExists = seatPositions.some((seat) => seat.id === seatId)
      if (!seatExists || occupantAt(occupied, seatId) || isRoomLocked) return

      pickSeat(seatId)
      startWalk()
      useSeatFlow.getState().arrive(roomId ?? undefined)
      useWorld.getState().sit(seatId)
      useSeatFlow.getState().markEntrancePlayed()
    },
    [isRoomLocked, occupied, pickSeat, roomId, seatPositions, startWalk],
  )

  const handleSelect = useCallback(
    (seatId: number) => {
      if (isRoomLocked || occupantAt(occupied, seatId)) return
      setSelected(seatId)
      pickSeat(seatId)
    },
    [isRoomLocked, occupied, pickSeat],
  )

  const handleRandom = useCallback(() => {
    if (isRoomLocked) return
    const freeSeats = seatPositions.filter((seat) => !occupantAt(occupied, seat.id))
    if (freeSeats.length === 0) return
    const randomSeat = freeSeats[Math.floor(Math.random() * freeSeats.length)]
    sitDown(randomSeat.id)
  }, [isRoomLocked, occupied, seatPositions, sitDown])

  const handleCancel = useCallback(() => {
    useSeatFlow.getState().unlock()
  }, [])

  return (
    <div className="sso-root" style={ROOT_STYLE}>
      <JadeLanterns />
      <div className="sso-panel" style={PANEL_STYLE}>
        <div className="sso-header">
          {wasSeated ? (
            <button
              type="button"
              className="sso-cancel-btn"
              onClick={handleCancel}
              title="Cancel and go back"
            >
              ✕
            </button>
          ) : (
            <button
              type="button"
              className="sso-back-realms"
              onClick={() => navigate('/lobby/realm/choose')}
              title="Back to realms"
            >
              ‹ Back to Realms
            </button>
          )}
          <div className="sso-header-illu" aria-hidden="true">
            <CafeIcon />
          </div>
          <div className="sso-header-text">
            <h2 className="sso-title">
              Choose your seat
              <span className="sso-room-badge">🏮 Jade Lantern Study House</span>
            </h2>
            <p className="sso-subtitle">
              Find a quiet corner for tea, rainlight, and focused study.
            </p>
          </div>
        </div>

        <div className="sso-legend">
          <span className="sso-legend-item">
            <span className="sso-dot available" /> Available ({availableCount})
          </span>
          <span className="sso-legend-item">
            <span className="sso-dot occupied" /> Occupied ({occupiedCount})
          </span>
          <span className="sso-legend-item">
            <span className="sso-dot selected" /> Selected
          </span>
        </div>

        {isRoomLocked && (
          <div className="sso-cooldown">
            <span className="sso-cooldown-icon">🔒</span>
            <div className="sso-cooldown-text">
              <strong>This study house is locked</strong>
              <span>
                Wait {cooldownMin}:{String(cooldownS).padStart(2, '0')} or change rooms
                for a fresh seat.
              </span>
            </div>
          </div>
        )}

        <div className="sso-body">
          <CafeMapLayer
            seats={seatPositions}
            occupied={occupied}
            selected={selected}
            onSelect={handleSelect}
          />
        </div>

        <div className="sso-actions">
          <button
            type="button"
            className="sso-btn-secondary"
            onClick={handleRandom}
            disabled={isRoomLocked || availableCount === 0}
            title={
              isRoomLocked
                ? 'Study house is locked — wait or change rooms'
                : 'Choose a random available café seat'
            }
          >
            <span>Random Seat</span>
          </button>
          {selected != null && (
            <button
              type="button"
              className="sso-btn-primary"
              onClick={() => sitDown(selected)}
              disabled={
                isRoomLocked || occupantAt(occupied, selected) !== null
              }
            >
              <span>Join Study Session</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface CafeMapLayerProps {
  seats: readonly DisplayCafeSeat[]
  occupied: Record<number, string>
  selected: number | null
  onSelect: (seatId: number) => void
}

function CafeMapLayer({ seats, occupied, selected, onSelect }: CafeMapLayerProps) {
  return (
    <div className="sso-map-outer">
      <div className="sso-map-wrapper">
        <div className="sso-map" style={MAP_STYLE}>
          <CafeFloorPlan />
          {seats.map((seat) => {
            const occupant = occupantAt(occupied, seat.id)
            return (
              <CafeSeatDot
                key={seat.id}
                seat={seat}
                occupant={occupant}
                selected={selected === seat.id}
                onSelect={() => onSelect(seat.id)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

const CafeFloorPlan = memo(function CafeFloorPlan() {
  const courtyardX = planX(CAFE.courtyard.x) - planW(CAFE.courtyard.w) / 2
  const courtyardY = planY(CAFE.courtyard.z) - planH(CAFE.courtyard.l) / 2
  const pondX = planX(CAFE.pond.x) - planW(CAFE.pond.w) / 2
  const pondY = planY(CAFE.pond.z) - planH(CAFE.pond.l) / 2

  return (
    <svg
      className="sso-plan"
      viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect
        x={PLAN_X}
        y={PLAN_Y}
        width={PLAN_INNER_WIDTH}
        height={PLAN_INNER_HEIGHT}
        rx={14}
        className="sso-plan-floor"
        style={{ fill: 'rgba(24, 89, 70, 0.2)' }}
      />
      <rect
        x={PLAN_X}
        y={PLAN_Y}
        width={PLAN_INNER_WIDTH}
        height={PLAN_INNER_HEIGHT}
        rx={14}
        className="sso-plan-wall"
        style={{ stroke: 'rgba(224, 183, 84, 0.72)' }}
      />

      <rect
        x={planX(0) - planW(41) / 2}
        y={planY(-21.5) - planH(12.5) / 2}
        width={planW(41)}
        height={planH(12.5)}
        rx={9}
        className="sso-plan-deck"
        style={{
          fill: 'rgba(29, 101, 78, 0.28)',
          stroke: 'rgba(224, 183, 84, 0.56)',
        }}
      />
      <line
        x1={planX(-20.5)}
        y1={planY(-15.25)}
        x2={planX(20.5)}
        y2={planY(-15.25)}
        className="sso-plan-rail"
        style={{ stroke: 'rgba(224, 183, 84, 0.64)' }}
      />
      <text
        x={planX(0)}
        y={planY(-25.2)}
        textAnchor="middle"
        fill="rgba(235, 210, 145, 0.7)"
        fontSize={12}
        fontFamily="Georgia, serif"
        letterSpacing={1.4}
      >
        QUIET MEZZANINE
      </text>

      <rect
        x={planX(-8.4) - planW(2.4) / 2}
        y={planY(-7.2) - planH(13.2) / 2}
        width={planW(2.4)}
        height={planH(13.2)}
        rx={12}
        className="sso-plan-table"
        style={{
          fill: 'rgba(151, 103, 42, 0.5)',
          stroke: 'rgba(231, 192, 98, 0.72)',
        }}
      />
      <text
        x={planX(-8.4)}
        y={planY(-7.2)}
        textAnchor="middle"
        fill="rgba(246, 222, 158, 0.68)"
        fontSize={10}
        fontFamily="Georgia, serif"
        transform={`rotate(-90 ${planX(-8.4)} ${planY(-7.2)})`}
      >
        COMMUNAL TEA TABLE
      </text>

      {[-15, -7, 1, 9].map((z, index) => (
        <g key={z}>
          <rect
            x={planX(14.8) - planW(2.1) / 2}
            y={planY(z) - planH(2.25) / 2}
            width={planW(2.1)}
            height={planH(2.25)}
            rx={6}
            className="sso-plan-table"
            style={{
              fill: 'rgba(36, 113, 83, 0.48)',
              stroke: 'rgba(224, 183, 84, 0.62)',
            }}
          />
          <path
            d={`M ${planX(12.9)} ${planY(z - 1.25)} L ${planX(16.7)} ${planY(z - 1.25)} L ${planX(16.7)} ${planY(z + 1.25)} L ${planX(12.9)} ${planY(z + 1.25)}`}
            fill="none"
            stroke="rgba(224, 183, 84, 0.34)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          <text
            x={planX(18.25)}
            y={planY(z) + 4}
            textAnchor="middle"
            fill="rgba(235, 210, 145, 0.58)"
            fontSize={8}
            fontFamily="Georgia, serif"
          >
            B{index + 1}
          </text>
        </g>
      ))}

      <rect
        x={planX(-19.6) - planW(1.4) / 2}
        y={planY(9.675) - planH(14.65) / 2}
        width={planW(1.4)}
        height={planH(14.65)}
        rx={4}
        className="sso-plan-table"
        style={{
          fill: 'rgba(33, 119, 96, 0.42)',
          stroke: 'rgba(170, 226, 206, 0.58)',
        }}
      />
      {[3.05, 5.7, 8.35, 11.0, 13.65, 16.3].map((z) => (
        <g key={z} className="sso-plan-window">
          <rect
            x={planX(-21) - 2}
            y={planY(z) - 13}
            width={8}
            height={26}
            rx={2}
          />
          <line
            x1={planX(-21) + 2}
            y1={planY(z) - 13}
            x2={planX(-21) + 2}
            y2={planY(z) + 13}
          />
        </g>
      ))}

      <rect
        x={courtyardX}
        y={courtyardY}
        width={planW(CAFE.courtyard.w)}
        height={planH(CAFE.courtyard.l)}
        rx={16}
        fill="rgba(41, 135, 91, 0.2)"
        stroke="rgba(104, 185, 121, 0.55)"
        strokeWidth={2}
        strokeDasharray="7 5"
      />
      <rect
        x={pondX}
        y={pondY}
        width={planW(CAFE.pond.w)}
        height={planH(CAFE.pond.l)}
        rx={18}
        fill="rgba(52, 159, 151, 0.28)"
        stroke="rgba(117, 215, 195, 0.55)"
        strokeWidth={2}
      />
      <ellipse
        cx={planX(0)}
        cy={planY(5.2)}
        rx={planW(2.1)}
        ry={planH(1.1)}
        fill="rgba(224, 183, 84, 0.14)"
        stroke="rgba(224, 183, 84, 0.44)"
      />
      <text
        x={planX(0)}
        y={planY(5.2) + 4}
        textAnchor="middle"
        fill="rgba(194, 236, 217, 0.74)"
        fontSize={9}
        fontFamily="Georgia, serif"
      >
        JADE POND
      </text>

      {[18.5, 21, 23.5, 26].map((z) => (
        <g key={z} className="sso-plan-window">
          <rect
            x={planX(-21) - 2}
            y={planY(z) - 13}
            width={8}
            height={26}
            rx={2}
          />
          <line
            x1={planX(-21) + 2}
            y1={planY(z) - 13}
            x2={planX(-21) + 2}
            y2={planY(z) + 13}
          />
        </g>
      ))}

      <rect
        x={planX(10.7) - planW(8.8) / 2}
        y={planY(20.2) - planH(3.2) / 2}
        width={planW(8.8)}
        height={planH(3.2)}
        rx={8}
        className="sso-plan-table"
        style={{
          fill: 'rgba(139, 86, 34, 0.52)',
          stroke: 'rgba(232, 193, 101, 0.7)',
        }}
      />
      <text
        x={planX(10.7)}
        y={planY(20.2) + 4}
        textAnchor="middle"
        fill="rgba(246, 222, 158, 0.72)"
        fontSize={9}
        fontFamily="Georgia, serif"
      >
        TEA COUNTER
      </text>

      {[-12, 0, 12].map((x) => (
        <g key={x} transform={`translate(${planX(x)} ${planY(26.1)})`}>
          <line y1={-34} y2={-8} stroke="rgba(224, 183, 84, 0.58)" strokeWidth={2} />
          <path
            d="M -8 -8 Q 0 -14 8 -8 L 6 8 Q 0 13 -6 8 Z"
            fill="rgba(214, 58, 51, 0.54)"
            stroke="rgba(237, 193, 91, 0.74)"
            strokeWidth={1.5}
          />
          <circle cy={0} r={3} fill="rgba(255, 218, 126, 0.8)" />
        </g>
      ))}

      <circle
        cx={planX(0)}
        cy={planY(27.6)}
        r={10}
        className="sso-plan-entrance"
        style={{
          fill: 'rgba(48, 184, 133, 0.58)',
          stroke: 'rgba(224, 183, 84, 0.8)',
        }}
      />
      <text
        x={planX(0)}
        y={planY(26.4)}
        textAnchor="middle"
        fill="rgba(235, 210, 145, 0.62)"
        fontSize={9}
        fontFamily="Georgia, serif"
        letterSpacing={1}
      >
        ENTRANCE
      </text>
    </svg>
  )
})

interface CafeSeatDotProps {
  seat: DisplayCafeSeat
  occupant: string | null
  selected: boolean
  onSelect: () => void
}

const CafeSeatDot = memo(function CafeSeatDot({
  seat,
  occupant,
  selected,
  onSelect,
}: CafeSeatDotProps) {
  const occupied = occupant !== null

  return (
    <button
      type="button"
      className={`sso-seat ${occupied ? 'occupied' : ''} ${selected ? 'selected' : ''}`}
      style={{ left: `${seat.nx * 100}%`, top: `${seat.ny * 100}%` }}
      onClick={() => {
        if (!occupied) onSelect()
      }}
      disabled={occupied}
      title={occupied ? occupant : seat.label}
      aria-label={occupied ? `${seat.label}, occupied by ${occupant}` : seat.label}
    >
      {occupied ? (
        <span className="sso-seat-occupant">{occupant}</span>
      ) : (
        <span className="sso-seat-num">{seat.id + 1}</span>
      )}
      {!occupied && (
        <div className="sso-seat-hint">
          <span className="sso-seat-hint-name">{seat.label}</span>
          <span className="sso-seat-hint-feat">{seat.feature} · {seat.floor}</span>
          <span className="sso-seat-hint-quiet">{seat.quietness}</span>
        </div>
      )}
    </button>
  )
})

function CafeIcon() {
  return (
    <svg
      className="sso-svg"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 21 24 8l18 13" />
      <path d="M10 20h28v20H10z" />
      <path d="M16 40V27h16v13" />
      <path d="M24 8v7" />
      <path d="M20 15h8l-1.5 7h-5z" fill="rgba(213, 57, 47, 0.34)" />
      <circle cx={24} cy={18.5} r={1.5} fill="rgba(229, 190, 91, 0.9)" stroke="none" />
      <path d="M13 25h7M28 25h7" />
    </svg>
  )
}

interface LanternSpec {
  left: number
  cord: number
  width: number
  duration: number
  delay: number
}

const LANTERNS: readonly LanternSpec[] = [
  { left: 5, cord: 118, width: 30, duration: 6.2, delay: 0 },
  { left: 17, cord: 210, width: 38, duration: 7.6, delay: -1.5 },
  { left: 30, cord: 82, width: 26, duration: 5.4, delay: -3 },
  { left: 44, cord: 285, width: 42, duration: 8.4, delay: -0.7 },
  { left: 58, cord: 128, width: 30, duration: 6.8, delay: -2.2 },
  { left: 72, cord: 225, width: 38, duration: 8, delay: -1.1 },
  { left: 86, cord: 92, width: 27, duration: 5.8, delay: -3.3 },
  { left: 96, cord: 250, width: 40, duration: 8.8, delay: -1.9 },
]

function JadeLanterns() {
  return (
    <div className="sso-lanterns" aria-hidden="true">
      {LANTERNS.map((lantern) => (
        <div
          key={lantern.left}
          className="sso-lantern"
          style={
            {
              left: `${lantern.left}%`,
              top: '0%',
              '--cord': `${lantern.cord}px`,
              '--w': `${lantern.width}px`,
              '--dur': `${lantern.duration}s`,
              '--delay': `${lantern.delay}s`,
              '--fdur': `${Math.round(lantern.duration * 4.5) / 10}s`,
              '--fdelay': `${Math.round(lantern.delay * 6) / 10}s`,
            } as CSSProperties
          }
        >
          <div className="sso-lantern-cord" />
          <div className="sso-lantern-body">
            <div className="sso-lantern-glow" />
          </div>
        </div>
      ))}
    </div>
  )
}
