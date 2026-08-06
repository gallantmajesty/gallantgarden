import { useCallback, useMemo, useState, memo, type CSSProperties } from 'react'
import { useSeatFlow, SEAT_LOCK_MS } from '../../store/seatFlow'
import { useWorld } from '../../store/world'
import { useRealm } from '../../store/realm'
import { HALL, windowZs } from '../../three/library/layout'
import { seatAnchors, TABLE, groundShelves, upperShelves, balconyPlatforms, columns, staircases } from '../../three/library/furniture'
import type { Seat } from '../../three/library/furniture'

const ASPECT_W = HALL.halfW * 2
const ASPECT_L = HALL.halfL * 2

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

function useAudioCues() {
  const playHover = useCallback(() => {
  }, [])
  const playSelect = useCallback(() => {
  }, [])
  return { playHover, playSelect }
}

export function SeatSelectionOverlay() {
  const flow = useSeatFlow()
  const occupied = flow.occupied
  const pickSeat = flow.pickSeat
  const startWalk = flow.startWalk
  const [selected, setSelected] = useState<number | null>(null)
  const audio = useAudioCues()
  const cinematic = useWorld((s) => s.cinematic)
  const wasSeated = flow.entrancePlayed
  const realm = useRealm((s) => s.active)
  const roomId = realm?.roomId ?? null

  // Check if this room is locked (can't re-sit until cooldown expires)
  const lockedRoomId = useSeatFlow((s) => s.lockedRoomId)
  const seatLockUntil = useSeatFlow((s) => s.seatLockUntil)
  const isRoomLocked = lockedRoomId != null && roomId != null && lockedRoomId === roomId && seatLockUntil != null && Date.now() < seatLockUntil
  const cooldownSec = isRoomLocked ? Math.ceil((seatLockUntil! - Date.now()) / 1000) : 0
  const cooldownMin = Math.floor(cooldownSec / 60)
  const cooldownS = cooldownSec % 60

  const seats = useMemo(() => seatAnchors(), [])

  const seatPositions = useMemo(() => seats.map((s) => ({
    ...s,
    nx: 0.05 + 0.9 * (s.pos[0] + HALL.halfW) / ASPECT_W,
    ny: 0.05 + 0.9 * (s.pos[2] + HALL.halfL) / ASPECT_L,
    meta: getSeatMeta(s),
  })), [seats])

  const occupiedCount = useMemo(() => Object.keys(occupied).length, [occupied])
  const availableCount = seatPositions.length - occupiedCount

  const sitDown = useCallback((seatId: number) => {
    pickSeat(seatId)
    startWalk()
    useSeatFlow.getState().arrive(roomId ?? undefined)
    useWorld.getState().sit(seatId)
    useSeatFlow.getState().markEntrancePlayed()
    sessionStorage.setItem('sf.seatBooted', '1')
    window.location.reload()
  }, [pickSeat, startWalk, roomId])

  const handleSelect = useCallback((id: number) => {
    if (isRoomLocked) return
    setSelected(id)
    audio.playSelect()
    pickSeat(id)
  }, [audio, pickSeat, isRoomLocked])

  const handleRandom = useCallback(() => {
    if (isRoomLocked) return
    const free = seatPositions.filter((s) => !occupied[s.id])
    if (free.length === 0) return
    const pick = free[Math.floor(Math.random() * free.length)]
    audio.playSelect()
    sitDown(pick.id)
  }, [seatPositions, occupied, audio, sitDown, isRoomLocked])

  const handleCancel = useCallback(() => {
    useSeatFlow.getState().unlock()
  }, [])

  return (
    <div className={`sso-root ${cinematic ? 'sso-tour' : ''}`} style={{ opacity: 1, transition: 'opacity 0.5s ease' }}>
      <HangingLanterns />
      {cinematic && (
        <div className="sso-panel sso-tour-panel">
          <div className="sso-tour-head">
            <span className="sso-tour-badge">🎬</span>
            <div>
              <h2 className="sso-title">Cinematic Tour</h2>
              <p className="sso-subtitle">Roaming the great hall — random angles, just for the mood</p>
            </div>
          </div>
          <div className="sso-actions sso-tour-actions">
            <button className="sf-btn water" onClick={() => useWorld.getState().setCinematic(false)}>Stop Tour</button>
            <button className="sso-btn-primary" onClick={() => useWorld.getState().setCinematic(false)}>Choose a seat</button>
          </div>
        </div>
      )}
      <div className={`sso-panel ${cinematic ? 'sso-hidden' : ''}`}>
        <div className="sso-header">
          {wasSeated && (
            <button className="sso-cancel-btn" onClick={handleCancel} title="Cancel and go back">
              ✕
            </button>
          )}
          <div className="sso-header-illu" aria-hidden><IconHall /></div>
          <div className="sso-header-text">
            <h2 className="sso-title">Choose your seat</h2>
            <p className="sso-subtitle">Pick a place in the great hall — the whole library on one map.</p>
          </div>
        </div>

        <div className="sso-legend">
          <span className="sso-legend-item"><span className="sso-dot available" /> Available ({availableCount})</span>
          <span className="sso-legend-item"><span className="sso-dot occupied" /> Occupied ({occupiedCount})</span>
          <span className="sso-legend-item"><span className="sso-dot selected" /> Selected</span>
        </div>

        {isRoomLocked && (
          <div className="sso-cooldown">
            <span className="sso-cooldown-icon">🔒</span>
            <div className="sso-cooldown-text">
              <strong>This room is locked</strong>
              <span>Wait {cooldownMin}:{String(cooldownS).padStart(2, '0')} or change rooms for a fresh seat.</span>
            </div>
          </div>
        )}

        <div className="sso-body">
          <MapLayer
            seats={seatPositions}
            occupied={occupied}
            selected={selected}
            onSelect={handleSelect}
          />
        </div>

        <div className="sso-actions">
          <button
            className="sso-btn-secondary"
            onClick={handleRandom}
            title={isRoomLocked ? 'Room is locked — wait or change rooms' : 'Pick a random available seat and sit down'}
            disabled={isRoomLocked}
          >
            <span>Random Seat</span>
          </button>
          {selected != null && (
            <button
              className="sso-btn-primary"
              onClick={() => sitDown(selected)}
              disabled={isRoomLocked}
            >
              <span>Join Study Session</span>
            </button>
          )}
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
  occupied: Record<number, string>
  selected: number | null
  onSelect: (id: number) => void
}

function WindowGlyph({ x, z }: { x: number; z: number }) {
  return (
    <g className="sso-plan-window">
      <rect x={x} y={z - 14} width={14} height={28} rx={2} />
      <line x1={x + 7} y1={z - 14} x2={x + 7} y2={z + 14} />
      <line x1={x} y1={z} x2={x + 14} y2={z} />
    </g>
  )
}

function FireplaceGlyph({ x, z }: { x: number; z: number }) {
  return (
    <g className="sso-plan-fire">
      <path d={`M${x} ${z + 18} V${z + 4} a16 16 0 0 1 32 0 V${z + 18} Z`} />
      <path d={`M${x + 16} ${z + 13} c-6-9 3-13 0-19 c7 4 9 11 6 16 c6-4 3-11 3-11`} className="sso-plan-flame" />
    </g>
  )
}

function ShelfGlyph({ x, z, rot }: { x: number; z: number; rot: number }) {
  const horizontal = Math.abs(rot) < 0.1 || Math.abs(Math.abs(rot) - Math.PI) < 0.1
  const w = horizontal ? 26 : 8
  const h = horizontal ? 8 : 26
  return <rect x={x - w / 2} y={z - h / 2} width={w} height={h} rx={2} className="sso-plan-shelf" />
}

const MapPlan = memo(function MapPlan({ seats }: { seats: DisplaySeat[] }) {
  const W = HALL.halfW
  const L = HALL.halfL
  const sx = (x: number) => ((x + W) / (2 * W)) * 560
  const sy = (z: number) => ((z + L) / (2 * L)) * 920

  const { tables, windows, shelves, decks, cols, stairs } = useMemo(() => {
    const tableGroups = new Map<string, Seat[]>()
    for (const s of seats) {
      const key = `${Math.round(s.pos[0] / 13) * 13},${Math.round(s.pos[2] / 18) * 18}`
      if (!tableGroups.has(key)) tableGroups.set(key, [])
      tableGroups.get(key)!.push(s)
    }
    return {
      tables: [...tableGroups.values()].map((g) => ({
        cx: g.reduce((a, s) => a + s.pos[0], 0) / g.length,
        cz: g.reduce((a, s) => a + s.pos[2], 0) / g.length,
      })),
      windows: windowZs(),
      shelves: [...groundShelves(), ...upperShelves()],
      decks: balconyPlatforms(),
      cols: columns(),
      stairs: staircases(),
    }
  }, [seats])

  const sideX = W - HALL.balconyDepth / 2
  const railX = (s: number) => sx(s * (sideX - HALL.balconyDepth / 2))

  return (
    <svg className="sso-plan" viewBox="0 0 560 920" preserveAspectRatio="none" aria-hidden>
      <g transform="translate(28 46) scale(0.9 0.9)">
        <rect x="6" y="6" width="548" height="908" rx="10" className="sso-plan-floor" />
        <rect x="6" y="6" width="548" height="908" rx="10" className="sso-plan-wall" />
        {windows.map((z, i) => (
          <g key={i}>
            <WindowGlyph x={2} z={sy(z)} />
            <WindowGlyph x={544} z={sy(z)} />
          </g>
        ))}
        <FireplaceGlyph x={560 / 2 - 16} z={14} />
        {shelves.map((p, i) => (
          <ShelfGlyph key={i} x={sx(p.pos[0])} z={sy(p.pos[2])} rot={p.rotY} />
        ))}
        {cols.map((c, i) => (
          <rect key={i} x={sx(c[0]) - 3} y={sy(c[2]) - 3} width={6} height={6} rx={1} className="sso-plan-col" />
        ))}
        {stairs.map((st, i) => (
          <rect
            key={i}
            x={sx(st.side * (W - HALL.balconyDepth / 2)) - 5}
            y={sy(21)}
            width={10}
            height={Math.max(6, sy(35) - sy(21))}
            rx={2}
            className="sso-plan-stair"
          />
        ))}
        {decks.map((p, i) => {
          const isSide = Math.abs(p.pos[0]) > HALL.halfW / 2
          return (
            <g key={i}>
              <rect
                x={sx(p.pos[0] - p.size[0] / 2)}
                y={sy(p.pos[2] - p.size[2] / 2)}
                width={p.size[0] * 10}
                height={p.size[2] * 10}
                rx={6}
                className="sso-plan-deck"
              />
              {isSide && (
                <line
                  x1={sx(p.pos[0])}
                  y1={sy(Math.min(p.pos[2] + p.size[2] / 2, HALL.halfL - 1))}
                  x2={sx(p.pos[0] * 0.45)}
                  y2={sy(HALL.halfL - 2)}
                  className="sso-plan-walk"
                />
              )}
            </g>
          )
        })}
        {[-1, 1].map((s) => (
          <line key={s} x1={railX(s)} y1={sy(-(L - 0.5))} x2={railX(s)} y2={sy(22)} className="sso-plan-rail" />
        ))}
        {tables.map((t, i) => (
          <rect
            key={i}
            x={sx(t.cx) - TABLE.w * 5}
            y={sy(t.cz) - TABLE.l * 5}
            width={TABLE.w * 10}
            height={TABLE.l * 10}
            rx={6}
            className="sso-plan-table"
          />
        ))}
        <g className="sso-plan-tree">
          {/* Stone dais */}
          <ellipse cx={280} cy={468} rx={22} ry={6} className="sso-plan-tree-dais" />
          <circle cx={280} cy={465} r={28} className="sso-plan-tree-dais-ring" />
          {/* Trunk with root flares */}
          <rect x={277} y={445} width={6} height={25} rx={1} className="sso-plan-tree-trunk" />
          <path d="M277,468 Q272,472 268,470 Q274,469 277,466Z" className="sso-plan-tree-root" />
          <path d="M283,468 Q288,472 292,470 Q286,469 283,466Z" className="sso-plan-tree-root" />
          {/* Canopy — 4 layered polygon tiers, natural green */}
          <polygon points="280,398 316,446 244,446" className="sso-plan-tree-canopy sso-plan-tree-canopy--1" />
          <polygon points="280,412 310,452 250,452" className="sso-plan-tree-canopy sso-plan-tree-canopy--2" />
          <polygon points="280,426 304,460 256,460" className="sso-plan-tree-canopy sso-plan-tree-canopy--3" />
          <polygon points="280,438 298,466 262,466" className="sso-plan-tree-canopy sso-plan-tree-canopy--4" />
          {/* Crown dot */}
          <circle cx={280} cy={396} r={2.5} className="sso-plan-tree-crown" />
        </g>
        <circle cx={280} cy={908} r={9} className="sso-plan-entrance" />
      </g>
    </svg>
  )
})

function MapLayer({ seats, occupied, selected, onSelect }: MapLayerProps) {
  return (
    <div className="sso-map-outer">
      <div className="sso-map-wrapper">
        <div className="sso-map">
          <MapPlan seats={seats} />
          {seats.map((s) => (
            <SeatDot
              key={s.id}
              seat={s}
              isOccupied={!!occupied[s.id]}
              isSelected={selected === s.id}
              onClick={() => onSelect(s.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface SeatDotProps {
  seat: DisplaySeat
  isOccupied: boolean
  isSelected: boolean
  onClick: () => void
}

const SeatDot = memo(function SeatDot({ seat, isOccupied, isSelected, onClick }: SeatDotProps) {
  const occupant = isOccupied ? (useSeatFlow.getState().occupied[seat.id] ?? 'Student') : null

  return (
    <button
      className={`sso-seat ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`}
      style={{
        left: `${seat.nx * 100}%`,
        top: `${seat.ny * 100}%`,
      }}
      onClick={() => {
        if (!isOccupied) onClick()
      }}
      disabled={isOccupied}
      title={isOccupied ? occupant : `Seat ${seat.id + 1}`}
    >
      {isOccupied ? (
        <span className="sso-seat-occupant">{occupant}</span>
      ) : (
        <span className="sso-seat-num">{seat.id + 1}</span>
      )}
      {!isOccupied && (
        <div className="sso-seat-hint">
          <span className="sso-seat-hint-name">Seat {seat.id + 1}</span>
          <span className="sso-seat-hint-feat">{seat.meta.feature}</span>
          <span className="sso-seat-hint-quiet">{seat.meta.quietness}</span>
        </div>
      )}
    </button>
  )
})

/* ------------------------------------------------------------------ */

const INK = 'currentColor'

function IconHall() {
  return (
    <svg className="sso-svg" viewBox="0 0 48 48" fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M7 21 L24 9 L41 21" />
      <rect x="11" y="21" width="26" height="18" />
      <path d="M17 39 V30 a3.5 3.5 0 0 1 7 0 V39" />
      <path d="M24 39 V30 a3.5 3.5 0 0 1 7 0 V39" />
      <line x1="17" y1="21" x2="17" y2="39" />
      <line x1="31" y1="21" x2="31" y2="39" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Hanging lanterns across the whole page — they swing gently and the
   warm glow flickers, like the great hall's ceiling lamps. Purely
   decorative; the layer sits BEHIND the seat panel and ignores clicks. */

interface LanternSpec {
  left: number
  top: number
  cord: number
  w: number
  dur: number
  delay: number
}

const LANTERNS: LanternSpec[] = [
  { left: 3, top: 0, cord: 120, w: 30, dur: 6.2, delay: 0 },
  { left: 12, top: 0, cord: 220, w: 38, dur: 7.6, delay: -1.5 },
  { left: 21, top: 0, cord: 88, w: 26, dur: 5.4, delay: -3 },
  { left: 30, top: 0, cord: 320, w: 44, dur: 8.4, delay: -0.7 },
  { left: 39, top: 0, cord: 150, w: 32, dur: 6.8, delay: -2.2 },
  { left: 48, top: 0, cord: 100, w: 28, dur: 7.1, delay: -4 },
  { left: 57, top: 0, cord: 260, w: 40, dur: 8.0, delay: -1.1 },
  { left: 66, top: 0, cord: 92, w: 26, dur: 5.8, delay: -3.3 },
  { left: 75, top: 0, cord: 210, w: 36, dur: 7.3, delay: -0.4 },
  { left: 84, top: 0, cord: 130, w: 30, dur: 6.5, delay: -2.7 },
  { left: 93, top: 0, cord: 300, w: 44, dur: 8.8, delay: -1.9 },
]

function HangingLanterns() {
  return (
    <div className="sso-lanterns" aria-hidden>
      {LANTERNS.map((l, i) => (
        <div
          key={i}
          className="sso-lantern"
          style={
            {
              left: `${l.left}%`,
              top: `${l.top}%`,
              '--cord': `${l.cord}px`,
              '--w': `${l.w}px`,
              '--dur': `${l.dur}s`,
              '--delay': `${l.delay}s`,
              '--fdur': `${Math.round(l.dur * 0.45 * 10) / 10}s`,
              '--fdelay': `${Math.round(l.delay * 0.6 * 10) / 10}s`,
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
