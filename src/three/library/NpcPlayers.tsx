import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { Html } from '@react-three/drei'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { PlayerNameTag } from '../../components/PlayerNameTag'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import { seatAnchors, type Seat } from './furniture'
import { RANKS } from '../../lib/ranks'
import { CHARACTERS, characterById } from '../../avatar/characters'
import { ACCESSORIES } from '../../avatar/config'
import { useRealm } from '../../store/realm'
import { useWorld } from '../../store/world'

// ─────────────────────────────────────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_NPC_POOL = 120
const MAX_ACTIVE_NPCS = 55

// Scheduling: each NPC cycles through  stay → gap → stay → gap …
const MIN_STAY_MIN = 25
const MAX_STAY_MIN = 55
const MIN_GAP_MIN = 15
const MAX_GAP_MIN = 40

// ─────────────────────────────────────────────────────────────────────────────
//  NPC Data Pools
// ─────────────────────────────────────────────────────────────────────────────

/** Realistic first names — international mix so the library feels global. */
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sam', 'Charlie', 'Robin', 'Skyler', 'Drew', 'Finley', 'Hayden', 'Rowan',
  'Emery', 'Sage', 'Blake', 'Dakota', 'Reese', 'Peyton', 'Jesse', 'Kai',
  'Leo', 'Mila', 'Noah', 'Zara', 'Felix', 'Iris', 'Oscar', 'Luna',
  'Hugo', 'Aria', 'Finn', 'Ivy', 'Owen', 'Ruby', 'Ezra', 'Stella',
  'Atlas', 'Clara', 'Jude', 'Lyra', 'Miles', 'Nora', 'Theo', 'Willow',
  'Arlo', 'Hazel', 'Jasper', 'Aurora', 'Silas', 'Isla', 'Finn', 'Beau',
  'Wren', 'Seth', 'Lena', 'Mark', 'Troy', 'Ella', 'Dean', 'Lily',
  'Jake', 'Ruby', 'Tina', 'Derek', 'Nina', 'Omar', 'Fiona', 'Hector',
  'Leah', 'Victor', 'Mara', 'Neil', 'Sofia', 'Adam', 'Zoe', 'Liam',
]

/** Gamer / study-themed handles — used as last-name alternatives. */
const HANDLES = [
  'Bookworm', 'NightOwl', 'StudyBud', 'FocusMode', 'DeepWork',
  'QuietHours', 'PageTurner', 'PenPal', 'NoteTaker', 'MindPalace',
  'FlowState', 'ZenStudy', 'CalmFocus', 'StudyZen', 'LampLight',
  'DawnStudy', 'MidnightRead', 'TeaAndBooks', 'ReadingNook', 'InkDrop',
  'Cogito', 'Praxis', 'Lucerna', 'Codex', 'Stylus',
  'Palimpsest', 'Marginalia', 'ExLibris', 'Folio', 'Vellum',
]

/** Two-letter country ISO codes for flag badges. */
const COUNTRIES = [
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'KR', 'BR', 'IN',
  'MX', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ',
  'PT', 'GR', 'TR', 'AR', 'CL', 'CO', 'PE', 'ZA', 'NG', 'KE',
  'PH', 'TH', 'VN', 'ID', 'MY', 'SG', 'NZ', 'IE', 'CH', 'AT',
  'RO', 'HU', 'BG', 'HR', 'SK', 'LT', 'LV', 'EE', 'SI', 'CY',
]

const STUDY_TOPICS = [
  'Mathematics', 'Physics', 'Computer Science', 'Biology', 'Chemistry',
  'Literature', 'History', 'Philosophy', 'Economics', 'Psychology',
  'Art History', 'Music Theory', 'Linguistics', 'Political Science',
  'Environmental Science', 'Engineering', 'Medicine', 'Law',
  'Anthropology', 'Sociology', 'Neuroscience', 'Astronomy',
]

// ─────────────────────────────────────────────────────────────────────────────
//  Character / Accessory / Rank Selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Weighted character pool — Common characters are 3× more likely than Epic.
 * No Legendary characters (robot, angel, sunflower are excluded).
 * Animal costumes (dino, rabbit, pig, alien, elephant, monkey) are included
 * but at lower weight so the hall isn't full of mascots.
 */
const CHAR_POOL: { id: string; w: number }[] = CHARACTERS
  .filter((c) => c.rarity === 'Common' || c.rarity === 'Epic')
  .map((c) => ({
    id: c.id,
    w: c.rarity === 'Common' ? 4 : c.isAnimal ? 1 : 2,
  }))
const CHAR_WEIGHT_TOTAL = CHAR_POOL.reduce((s, c) => s + c.w, 0)

function pickCharacter(): string {
  let r = Math.random() * CHAR_WEIGHT_TOTAL
  for (const c of CHAR_POOL) {
    r -= c.w
    if (r <= 0) return c.id
  }
  return CHAR_POOL[0].id
}

const ALL_ACCESSORY_IDS = ACCESSORIES.map((a) => a.id)

function pickAccessories(): string[] {
  const n = Math.floor(Math.random() * 3) + 1
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const id = ALL_ACCESSORY_IDS[Math.floor(Math.random() * ALL_ACCESSORY_IDS.length)]
    if (!out.includes(id)) out.push(id)
  }
  return out
}

/** Bronze → Silver → occasional Gold. No high ranks for NPCs. */
const RANK_POOL = RANKS.filter(
  (r) => r.id.startsWith('bronze') || r.id.startsWith('silver') || r.id === 'gold-1',
)

function pickRank(): string {
  const weights = RANK_POOL.map((r) =>
    r.id.startsWith('bronze') ? 3 : r.id.startsWith('silver') ? 2 : 0.4,
  )
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < RANK_POOL.length; i++) {
    r -= weights[i]
    if (r <= 0) return RANK_POOL[i].id
  }
  return RANK_POOL[0].id
}

// ─────────────────────────────────────────────────────────────────────────────
//  NPC Profile
// ─────────────────────────────────────────────────────────────────────────────

interface NpcProfile {
  id: string
  name: string
  characterId: string
  accessories: string[]
  rank: string
  country: string
  studyTopic: string
  /** Minutes from session start when this NPC first appears. */
  offsetMin: number
  /** How long the NPC stays each visit (minutes). */
  stayMin: number
  /** Full cycle = stay + gap (minutes). */
  cycleMin: number
}

function generatePool(): NpcProfile[] {
  const pool: NpcProfile[] = []
  for (let i = 0; i < TOTAL_NPC_POOL; i++) {
    // Alternate between first-name + last-initial and handle-style names
    const useHandle = i >= FIRST_NAMES.length || (i > 0 && i % 5 === 0)
    let name: string
    if (useHandle) {
      name = HANDLES[i % HANDLES.length]
      if (i >= HANDLES.length) name += Math.floor(Math.random() * 99) + 1
    } else {
      name = FIRST_NAMES[i]
      if (i >= FIRST_NAMES.length) name += ' ' + String.fromCharCode(65 + (i % 26))
    }

    const stayMin = MIN_STAY_MIN + Math.random() * (MAX_STAY_MIN - MIN_STAY_MIN)
    const gapMin = MIN_GAP_MIN + Math.random() * (MAX_GAP_MIN - MIN_GAP_MIN)

    pool.push({
      id: `npc_${i}`,
      name,
      characterId: pickCharacter(),
      accessories: pickAccessories(),
      rank: pickRank(),
      country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
      studyTopic: STUDY_TOPICS[Math.floor(Math.random() * STUDY_TOPICS.length)],
      offsetMin: Math.random() * 120,
      stayMin,
      cycleMin: stayMin + gapMin,
    })
  }
  return pool
}

// ─────────────────────────────────────────────────────────────────────────────
//  Scheduling helpers
// ─────────────────────────────────────────────────────────────────────────────

function isActive(npc: NpcProfile, tMin: number): boolean {
  const cyc = ((tMin - npc.offsetMin) % npc.cycleMin + npc.cycleMin) % npc.cycleMin
  return cyc < npc.stayMin
}

function elapsedMin(startMs: number): number {
  return (Date.now() - startMs) / 60000
}

function remainingSec(npc: NpcProfile, tMin: number): number {
  const cyc = ((tMin - npc.offsetMin) % npc.cycleMin + npc.cycleMin) % npc.cycleMin
  return Math.max(0, Math.floor((npc.stayMin - cyc) * 60))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Components
// ─────────────────────────────────────────────────────────────────────────────

/** Floating name-tag that renders a timer for NPCs (bypasses the network roster). */
function NpcTag({
  name, rank, country, remaining, total,
}: {
  name: string; rank: string; country: string | null
  remaining: number; total: number
}) {
  return (
    <Html position={[0, 2.55, 0]} center distanceFactor={10} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <PlayerNameTag
        name={name}
        rank={rank}
        country={country}
        timerRemaining={remaining}
        timerTotal={total}
      />
    </Html>
  )
}

function NpcAvatar({
  npc, seat, totalSec, startMs,
}: {
  npc: NpcProfile; seat: Seat; totalSec: number; startMs: number
}) {
  const group = useRef<Group>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const nearLod = useRef<'near' | 'far' | 'cull'>('near')
  const [, setFrame] = useState(0)

  const config: AvatarConfig = useMemo(() => {
    const ch = characterById(npc.characterId)
    return { ...ch.fallback, accessories: npc.accessories }
  }, [npc.characterId, npc.accessories])

  const lastTagUpdate = useRef(0)
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    g.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
    g.rotation.y = seat.yaw + Math.PI
    loco.current.seated = true
    loco.current.speed = 0
    if (clock.elapsedTime - lastTagUpdate.current > 2) {
      lastTagUpdate.current = clock.elapsedTime
      setFrame((f) => f + 1)
    }
  })

  const rem = remainingSec(npc, elapsedMin(startMs))

  return (
    <group ref={group}>
      <CharacterAvatar config={config} locomotion={loco} lod={nearLod} preview={false} />
      <NpcTag
        name={npc.name}
        rank={npc.rank}
        country={npc.country}
        remaining={rem}
        total={totalSec}
      />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export
// ─────────────────────────────────────────────────────────────────────────────

export function NpcPlayers() {
  const realm = useRealm((s) => s.active)
  const userSeat = useWorld((s) => s.seat)
  const seats = useMemo(() => seatAnchors(), [])
  const pool = useMemo(() => generatePool(), [])
  const startMs = useMemo(() => Date.now(), [])

  const roomId = realm?.roomId

  // Re-check active NPCs every ~10 s using wall-clock time
  const [tick, setTick] = useState(0)
  const lastTick = useRef(0)
  useFrame(({ clock }) => {
    if (clock.elapsedTime - lastTick.current > 2) {
      lastTick.current = clock.elapsedTime
      setTick((t) => t + 1)
    }
  })
  const tMin = elapsedMin(startMs)

  // Active NPCs at current wall-clock time
  const active = useMemo(() => {
    if (!roomId) return []
    return pool.filter((npc) => isActive(npc, tMin)).slice(0, MAX_ACTIVE_NPCS)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, roomId, Math.floor(tMin / 0.5)])

  // Seat assignment — shuffle available seats, skip the user's seat
  const assignments = useMemo(() => {
    const map = new Map<string, Seat>()
    const avail = seats.filter((s) => s.id !== userSeat)
    const shuffled = [...avail].sort(() => Math.random() - 0.5)
    active.forEach((npc, i) => {
      if (i < shuffled.length) map.set(npc.id, shuffled[i])
    })
    return map
  }, [active, seats, userSeat])

  if (active.length === 0 || seats.length === 0) return null

  return (
    <>
      {active.map((npc) => {
        const seat = assignments.get(npc.id)
        if (!seat) return null
        const totalSec = Math.floor(npc.stayMin * 60)
        return (
          <NpcAvatar key={npc.id} npc={npc} seat={seat} totalSec={totalSec} startMs={startMs} />
        )
      })}
    </>
  )
}
