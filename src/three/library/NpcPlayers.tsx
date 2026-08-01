import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { Html } from '@react-three/drei'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { PlayerNameTag } from '../../components/PlayerNameTag'
import { NpcProfileCard, type NpcProfileData } from '../../components/NpcProfileCard'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import { seatAnchors, type Seat } from './furniture'
import { RANKS } from '../../lib/ranks'
import { BANNERS } from '../../lib/banners'
import { CHARACTERS, characterById } from '../../avatar/characters'
import { ACCESSORIES } from '../../avatar/config'
import { useWorld } from '../../store/world'

// ─────────────────────────────────────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_NPC_POOL = 28

// Scheduling: each NPC cycles through  stay → gap → stay → gap …
const MIN_STAY_MIN = 25
const MAX_STAY_MIN = 55
const MIN_GAP_MIN = 15
const MAX_GAP_MIN = 40

// ─────────────────────────────────────────────────────────────────────────────
//  Zone-based density
// ─────────────────────────────────────────────────────────────────────────────

interface Zone {
  name: string
  zCenter: number
  weight: number
}

const ZONES: Zone[] = [
  { name: 'back',    zCenter: -36, weight: 1.0 },
  { name: 'midBack', zCenter: -18, weight: 0.5 },
  { name: 'center',  zCenter: 0,   weight: 0.8 },
  { name: 'front',   zCenter: 27,  weight: 0.6 },
]

const ZONE_WEIGHT_TOTAL = ZONES.reduce((s, z) => s + z.weight, 0)

function pickZoneIdx(): number {
  let r = Math.random() * ZONE_WEIGHT_TOTAL
  for (let i = 0; i < ZONES.length; i++) {
    r -= ZONES[i].weight
    if (r <= 0) return i
  }
  return 0
}

function closestZone(z: number): Zone {
  let best = ZONES[0]
  let bestDist = Infinity
  for (const zone of ZONES) {
    const d = Math.abs(z - zone.zCenter)
    if (d < bestDist) { bestDist = d; best = zone }
  }
  return best
}

// ─────────────────────────────────────────────────────────────────────────────
//  Country pool — weighted by realistic student demographics
// ─────────────────────────────────────────────────────────────────────────────

interface CountryEntry { code: string; weight: number }

const COUNTRY_POOL: CountryEntry[] = [
  // Majority — large student populations / active users
  { code: 'US', weight: 20 },
  { code: 'IN', weight: 18 },
  { code: 'KR', weight: 10 },
  { code: 'JP', weight: 8 },
  { code: 'ZA', weight: 6 },
  { code: 'MX', weight: 6 },
  { code: 'FR', weight: 6 },
  // Moderate
  { code: 'GB', weight: 4 },
  { code: 'DE', weight: 4 },
  { code: 'BR', weight: 4 },
  { code: 'CA', weight: 3 },
  { code: 'AU', weight: 3 },
  { code: 'NG', weight: 3 },
  { code: 'PH', weight: 3 },
  // Rare — smaller pools
  { code: 'IT', weight: 2 },
  { code: 'ES', weight: 2 },
  { code: 'SE', weight: 1.5 },
  { code: 'PL', weight: 1.5 },
  { code: 'TR', weight: 1.5 },
  { code: 'AR', weight: 1 },
  { code: 'TH', weight: 1 },
  { code: 'ID', weight: 1 },
  { code: 'KE', weight: 1 },
  { code: 'CL', weight: 0.8 },
  { code: 'NZ', weight: 0.8 },
  { code: 'NO', weight: 0.5 },
  { code: 'DK', weight: 0.5 },
  { code: 'FI', weight: 0.5 },
]

const COUNTRY_WEIGHT_TOTAL = COUNTRY_POOL.reduce((s, c) => s + c.weight, 0)

function pickCountry(): string {
  let r = Math.random() * COUNTRY_WEIGHT_TOTAL
  for (const c of COUNTRY_POOL) {
    r -= c.weight
    if (r <= 0) return c.code
  }
  return 'US'
}

// ─────────────────────────────────────────────────────────────────────────────
//  NPC Data Pools
// ─────────────────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sam', 'Charlie', 'Robin', 'Skyler', 'Drew', 'Finley', 'Hayden', 'Rowan',
  'Emery', 'Sage', 'Blake', 'Dakota', 'Reese', 'Peyton', 'Jesse', 'Kai',
  'Leo', 'Mila', 'Noah', 'Zara', 'Felix', 'Iris', 'Oscar', 'Luna',
  'Hugo', 'Aria', 'Finn', 'Ivy', 'Owen', 'Ruby', 'Ezra', 'Stella',
  'Atlas', 'Clara', 'Jude', 'Lyra', 'Miles', 'Nora', 'Theo', 'Willow',
  'Arlo', 'Hazel', 'Jasper', 'Aurora', 'Silas', 'Isla', 'Beau', 'Wren',
  'Seth', 'Lena', 'Mark', 'Troy', 'Ella', 'Dean', 'Lily', 'Jake',
  'Tina', 'Derek', 'Nina', 'Omar', 'Fiona', 'Hector', 'Leah', 'Victor',
  'Mara', 'Neil', 'Sofia', 'Adam', 'Zoe', 'Liam', 'Maya', 'Ethan',
  'Priya', 'Amir', 'Yuki', 'Soo-Jin', 'Diego', 'Anika', 'Ravi', 'Lena',
]

const HANDLES = [
  'Bookworm', 'NightOwl', 'StudyBud', 'FocusMode', 'DeepWork',
  'QuietHours', 'PageTurner', 'PenPal', 'NoteTaker', 'MindPalace',
  'FlowState', 'ZenStudy', 'CalmFocus', 'StudyZen', 'LampLight',
  'DawnStudy', 'MidnightRead', 'TeaAndBooks', 'ReadingNook', 'InkDrop',
  'Cogito', 'Praxis', 'Lucerna', 'Codex', 'Stylus',
]

const STUDY_TOPICS = [
  'Mathematics', 'Physics', 'Computer Science', 'Biology', 'Chemistry',
  'Literature', 'History', 'Philosophy', 'Economics', 'Psychology',
  'Art History', 'Music Theory', 'Linguistics', 'Political Science',
  'Environmental Science', 'Engineering', 'Medicine', 'Law',
  'Neuroscience', 'Astronomy', 'Data Science', 'Architecture',
]

const BIOS = [
  'Early bird study sessions are my thing. Coffee + textbooks = perfect morning.',
  'Night owl here. The library hits different at 2 AM.',
  'Trying to maintain a 30-day study streak. Send help.',
  'Physics major. If I can understand quantum mechanics, I can handle anything.',
  'Here to procrastinate productively. At least I look busy.',
  'Just vibes and flashcards. Currently surviving finals week.',
  'Believe in this journey. One chapter at a time.',
  'Taking a break from my break. Studies: 1, Sleep: 0.',
  'My notes have notes. It\'s a problem but I\'m committed.',
  'Studying something I love makes it feel less like work.',
  'The library is my second home. The wifi is good here.',
  'Goal: understand everything. Current progress: understanding some things.',
  'Currently powered by caffeine and academic pressure.',
  'In my productive procrastination era. Studying instead of doing laundry.',
  'Future doctor/engineer/lawyer. Today: student who needs more sleep.',
  'Taking breaks between study sessions. This counts as studying.',
  'My brain has too many tabs open. Mostly academic ones.',
  'The stack of books next to me is a cry for help.',
  'I study therefore I am... tired.',
  'Academic weapon or academic victim? Depends on the day.',
]

const JOIN_DATES = [
  'Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024',
  'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024',
  'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025',
]

// ─────────────────────────────────────────────────────────────────────────────
//  Character / Accessory / Rank / Banner Selection
// ─────────────────────────────────────────────────────────────────────────────

// Common characters (40%), Epic non-animal (20%), Epic animal (1%), Legendary (1 rare slot)
const CHAR_POOL: { id: string; w: number }[] = (() => {
  const out: { id: string; w: number }[] = []
  for (const c of CHARACTERS) {
    if (c.rarity === 'Common') {
      out.push({ id: c.id, w: 8 })
    } else if (c.rarity === 'Epic' && !c.isAnimal) {
      out.push({ id: c.id, w: 4 })
    } else if (c.rarity === 'Epic' && c.isAnimal) {
      out.push({ id: c.id, w: 1 })
    }
    // Legendary excluded from random pool — assigned to exactly 1 NPC
  }
  return out
})()
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

const NPC_BANNER_IDS = [
  'default_banner', 'aurora', 'ember', 'forest', 'midnight', 'dawn',
  'tide', 'mystic', 'neon_glitch', 'heavenly_gold', 'crimson_flame',
  'cyberpunk_neon', 'ethereal_angel', 'moonlit_celestial',
  'neon_glitch_explosion', 'neon_rainy', 'vaporwave_glitch',
]

const NPC_LOGO_IDS = [
  '', 'neon_avatar', 'angel_logo', 'mystic_star', 'chibi_angel_2',
  'chibi_cat_girl', 'chibi_cyberpunk', 'chibi_mage', 'chibi_moon_spirit',
  'chibi_dragon', 'chibi_robot', 'chibi_samurai', 'cloud_angel',
  'glitch_chibi', 'kawaii_angel', 'neon_chibi_warrior', 'star_child',
]

// NPC rank pool — mostly Bronze/Silver, some Gold, rarely Platinum
const RANK_POOL = RANKS.filter(
  (r) => r.id.startsWith('bronze') || r.id.startsWith('silver') ||
         r.id.startsWith('gold') || r.id === 'platinum-1',
)

function pickRank(): string {
  const weights = RANK_POOL.map((r) => {
    if (r.id.startsWith('bronze')) return 5
    if (r.id.startsWith('silver')) return 3
    if (r.id.startsWith('gold')) return 1.5
    return 0.3 // platinum-1
  })
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
  banner: string
  logo: string
  bio: string
  joinDate: string
  totalXp: number
  sessionsCompleted: number
  streak: number
  status: 'studying' | 'on-break' | 'offline'
  offsetMin: number
  stayMin: number
  cycleMin: number
  preferredZone: number
}

function generatePool(): NpcProfile[] {
  const pool: NpcProfile[] = []
  const legendaryId = 'robot' // exactly 1 legendary NPC

  for (let i = 0; i < TOTAL_NPC_POOL; i++) {
    const useHandle = i >= FIRST_NAMES.length || (i > 0 && i % 5 === 0)
    let name: string
    if (useHandle) {
      name = HANDLES[i % HANDLES.length]
      if (i >= HANDLES.length) name += Math.floor(Math.random() * 99) + 1
    } else {
      name = FIRST_NAMES[i % FIRST_NAMES.length]
    }

    const stayMin = MIN_STAY_MIN + Math.random() * (MAX_STAY_MIN - MIN_STAY_MIN)
    const gapMin = MIN_GAP_MIN + Math.random() * (MAX_GAP_MIN - MIN_GAP_MIN)

    // Exactly 1 legendary NPC gets a high rank
    const isLegendary = i === 0
    const charId = isLegendary ? legendaryId : pickCharacter()
    const rankId = isLegendary
      ? RANKS[Math.floor(Math.random() * 3) + 15].id // Crystal I–III or Diamond
      : pickRank()

    const xp = RANKS.find((r) => r.id === rankId)?.threshold ?? 0
    const xpBonus = Math.floor(Math.random() * 2000)

    const banner = NPC_BANNER_IDS[Math.floor(Math.random() * NPC_BANNER_IDS.length)]
    const logo = NPC_LOGO_IDS[Math.floor(Math.random() * NPC_LOGO_IDS.length)]

    pool.push({
      id: `npc_${i}`,
      name,
      characterId: charId,
      accessories: pickAccessories(),
      rank: rankId,
      country: pickCountry(),
      studyTopic: STUDY_TOPICS[Math.floor(Math.random() * STUDY_TOPICS.length)],
      banner,
      logo,
      bio: BIOS[Math.floor(Math.random() * BIOS.length)],
      joinDate: JOIN_DATES[Math.floor(Math.random() * JOIN_DATES.length)],
      totalXp: xp + xpBonus,
      sessionsCompleted: Math.floor(Math.random() * 200) + 10,
      streak: Math.floor(Math.random() * 60) + 1,
      status: Math.random() < 0.7 ? 'studying' : Math.random() < 0.5 ? 'on-break' : 'offline',
      offsetMin: Math.random() * 120,
      stayMin,
      cycleMin: stayMin + gapMin,
      preferredZone: pickZoneIdx(),
    })
  }
  return pool
}

// ─────────────────────────────────────────────────────────────────────────────
//  Scheduling helpers
// ─────────────────────────────────────────────────────────────────────────────

function elapsedMin(startMs: number): number {
  return (Date.now() - startMs) / 60000
}

function isActive(npc: NpcProfile, tMin: number): boolean {
  const cyc = ((tMin - npc.offsetMin) % npc.cycleMin + npc.cycleMin) % npc.cycleMin
  return cyc < npc.stayMin
}

function remainingSec(npc: NpcProfile, tMin: number): number {
  const cyc = ((tMin - npc.offsetMin) % npc.cycleMin + npc.cycleMin) % npc.cycleMin
  return Math.max(0, Math.floor((npc.stayMin - cyc) * 60))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Seat assignment (once at mount)
// ─────────────────────────────────────────────────────────────────────────────

function assignAllSeats(
  pool: NpcProfile[],
  seats: Seat[],
  userSeat: number | null,
): Map<string, Seat> {
  const map = new Map<string, Seat>()

  const zoneMap = new Map<number, Seat[]>()
  for (const s of seats) {
    const zone = closestZone(s.pos[2])
    const idx = ZONES.indexOf(zone)
    if (!zoneMap.has(idx)) zoneMap.set(idx, [])
    zoneMap.get(idx)!.push(s)
  }

  const available = new Map<number, Seat[]>()
  for (const [zIdx, zSeats] of zoneMap) {
    const filtered = zSeats.filter((s) => s.id !== userSeat)
    filtered.sort((a, b) => a.id - b.id)
    available.set(zIdx, filtered)
  }

  for (const npc of pool) {
    const zoneIdx = npc.preferredZone
    let seat = pickFromZone(available, zoneIdx)
    if (!seat) {
      for (let z = 0; z < ZONES.length; z++) {
        seat = pickFromZone(available, z)
        if (seat) break
      }
    }
    if (seat) map.set(npc.id, seat)
  }
  return map
}

function pickFromZone(available: Map<number, Seat[]>, zIdx: number): Seat | null {
  const arr = available.get(zIdx)
  if (!arr || arr.length === 0) return null
  return arr.pop()!
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared timing
// ─────────────────────────────────────────────────────────────────────────────

let SHARED_START_MS = Date.now()

// ─────────────────────────────────────────────────────────────────────────────
//  Components
// ─────────────────────────────────────────────────────────────────────────────

function NpcTag({
  npc, remaining, total, onInfoClick,
}: {
  npc: NpcProfile; remaining: number; total: number; onInfoClick: () => void
}) {
  const banner = BANNERS.find((b) => b.id === npc.banner)

  return (
    <Html position={[0, 2.55, 0]} center distanceFactor={10} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <PlayerNameTag
        name={npc.name}
        rank={npc.rank}
        country={npc.country}
        timerRemaining={remaining}
        timerTotal={total}
        banner={npc.banner}
        logo={npc.logo}
        textDark={banner?.textDark}
        onInfoClick={onInfoClick}
      />
    </Html>
  )
}

function NpcAvatar({ npc, seat }: { npc: NpcProfile; seat: Seat }) {
  const group = useRef<Group>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const nearLod = useRef<'near' | 'far' | 'cull'>('near')
  const [visible, setVisible] = useState(() => isActive(npc, elapsedMin(SHARED_START_MS)))
  const [showProfile, setShowProfile] = useState(false)
  const [, setFrame] = useState(0)

  const config: AvatarConfig = useMemo(() => {
    const ch = characterById(npc.characterId)
    return { ...ch.fallback, accessories: npc.accessories }
  }, [npc.characterId, npc.accessories])

  const totalSec = Math.floor(npc.stayMin * 60)

  const lastCheck = useRef(0)
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return

    g.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
    g.rotation.y = seat.yaw + Math.PI
    loco.current.seated = true
    loco.current.speed = 0

    // Subtle idle breathing — gentle Y scale oscillation
    const breathe = 1 + Math.sin(clock.elapsedTime * 0.8 + npc.offsetMin) * 0.003
    g.scale.y = breathe

    if (clock.elapsedTime - lastCheck.current > 3) {
      lastCheck.current = clock.elapsedTime
      const now = isActive(npc, elapsedMin(SHARED_START_MS))
      setVisible(now)
      setFrame((f) => f + 1)
    }
  })

  const handleInfoClick = useCallback(() => setShowProfile(true), [])

  if (!visible) return null

  const rem = remainingSec(npc, elapsedMin(SHARED_START_MS))

  const profileData: NpcProfileData = {
    name: npc.name,
    rank: npc.rank,
    country: npc.country,
    characterId: npc.characterId,
    studyTopic: npc.studyTopic,
    totalXp: npc.totalXp,
    sessionsCompleted: npc.sessionsCompleted,
    streak: npc.streak,
    bio: npc.bio,
    joinDate: npc.joinDate,
    status: npc.status,
  }

  return (
    <>
      <group ref={group}>
        <CharacterAvatar config={config} locomotion={loco} lod={nearLod} preview={false} />
        <NpcTag npc={npc} remaining={rem} total={totalSec} onInfoClick={handleInfoClick} />
      </group>
      {showProfile && <NpcProfileCard profile={profileData} onClose={() => setShowProfile(false)} />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export
// ─────────────────────────────────────────────────────────────────────────────

export function NpcPlayers() {
  const userSeat = useWorld((s) => s.seat)
  const seats = useMemo(() => seatAnchors(), [])
  const pool = useMemo(() => generatePool(), [])

  const assignments = useMemo(() => {
    return assignAllSeats(pool, seats, userSeat)
  }, [pool, seats, userSeat])

  if (seats.length === 0) return null

  return (
    <>
      {pool.map((npc) => {
        const seat = assignments.get(npc.id)
        if (!seat) return null
        return <NpcAvatar key={npc.id} npc={npc} seat={seat} />
      })}
    </>
  )
}
