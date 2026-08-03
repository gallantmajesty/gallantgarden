import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { Html } from '@react-three/drei'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { PlayerNameTag } from '../../components/PlayerNameTag'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import { seatAnchors, type Seat } from './furniture'
import { RANKS } from '../../lib/ranks'
import { BANNERS } from '../../lib/banners'
import { CHARACTERS, characterById } from '../../avatar/characters'
import { ACCESSORIES } from '../../avatar/config'
import { useWorld } from '../../store/world'
import { useNpcProfile } from '../../store/npcProfile'
import type { NpcProfileData } from '../../store/npcProfile'
import { ImpostorSprite, useImpostorTexture } from './ImpostorSprites'

// ─────────────────────────────────────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_NPC_POOL = 28

// Impostor swap thresholds — same hysteresis as RemotePlayers: a seated NPC
// beyond SWAP_OUT renders as a baked billboard (1 draw call vs ~110 meshes);
// the full rig comes back once the player re-enters SWAP_IN.
const SWAP_OUT = 16
const SWAP_IN  = 12

// ─────────────────────────────────────────────────────────────────────────────
//  Zone-based density
// ─────────────────────────────────────────────────────────────────────────────

interface Zone { name: string; zCenter: number; weight: number }

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
//  Country pool — weighted demographics
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_POOL: { code: string; weight: number }[] = [
  { code: 'US', weight: 20 }, { code: 'IN', weight: 18 },
  { code: 'KR', weight: 10 }, { code: 'JP', weight: 8 },
  { code: 'ZA', weight: 6 },  { code: 'MX', weight: 6 },
  { code: 'FR', weight: 6 },  { code: 'GB', weight: 4 },
  { code: 'DE', weight: 4 },  { code: 'BR', weight: 4 },
  { code: 'CA', weight: 3 },  { code: 'AU', weight: 3 },
  { code: 'NG', weight: 3 },  { code: 'PH', weight: 3 },
  { code: 'IT', weight: 2 },  { code: 'ES', weight: 2 },
  { code: 'SE', weight: 1.5 },{ code: 'PL', weight: 1.5 },
  { code: 'TR', weight: 1.5 },{ code: 'AR', weight: 1 },
  { code: 'TH', weight: 1 },  { code: 'ID', weight: 1 },
  { code: 'KE', weight: 1 },  { code: 'CL', weight: 0.8 },
  { code: 'NZ', weight: 0.8 },{ code: 'NO', weight: 0.5 },
  { code: 'DK', weight: 0.5 },{ code: 'FI', weight: 0.5 },
]
const COUNTRY_WEIGHT_TOTAL = COUNTRY_POOL.reduce((s, c) => s + c.weight, 0)

function pickCountry(): string {
  let r = Math.random() * COUNTRY_WEIGHT_TOTAL
  for (const c of COUNTRY_POOL) { r -= c.weight; if (r <= 0) return c.code }
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

const CHAR_POOL: { id: string; w: number }[] = (() => {
  const out: { id: string; w: number }[] = []
  for (const c of CHARACTERS) {
    if (c.rarity === 'Common') out.push({ id: c.id, w: 8 })
    else if (c.rarity === 'Epic' && !c.isAnimal) out.push({ id: c.id, w: 4 })
    else if (c.rarity === 'Epic' && c.isAnimal) out.push({ id: c.id, w: 1 })
  }
  return out
})()
const CHAR_WEIGHT_TOTAL = CHAR_POOL.reduce((s, c) => s + c.w, 0)

function pickCharacter(): string {
  let r = Math.random() * CHAR_WEIGHT_TOTAL
  for (const c of CHAR_POOL) { r -= c.w; if (r <= 0) return c.id }
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

const NPC_RANK_POOL = RANKS.filter(
  (r) => r.id.startsWith('bronze') || r.id.startsWith('silver') ||
         r.id.startsWith('gold') || r.id === 'platinum-1',
)

function pickRank(): string {
  const weights = NPC_RANK_POOL.map((r) => {
    if (r.id.startsWith('bronze')) return 5
    if (r.id.startsWith('silver')) return 3
    if (r.id.startsWith('gold')) return 1.5
    return 0.3
  })
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < NPC_RANK_POOL.length; i++) {
    r -= weights[i]
    if (r <= 0) return NPC_RANK_POOL[i].id
  }
  return NPC_RANK_POOL[0].id
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
  preferredZone: number
}

function generatePool(): NpcProfile[] {
  const pool: NpcProfile[] = []
  for (let i = 0; i < TOTAL_NPC_POOL; i++) {
    const useHandle = i >= FIRST_NAMES.length || (i > 0 && i % 5 === 0)
    const name = useHandle
      ? HANDLES[i % HANDLES.length] + (i >= HANDLES.length ? String(Math.floor(Math.random() * 99) + 1) : '')
      : FIRST_NAMES[i % FIRST_NAMES.length]

    const isLegendary = i === 0
    const charId = isLegendary ? 'robot' : pickCharacter()
    const rankId = isLegendary ? 'crystal-2' : pickRank()
    const xp = RANKS.find((r) => r.id === rankId)?.threshold ?? 0

    pool.push({
      id: `npc_${i}`,
      name,
      characterId: charId,
      accessories: pickAccessories(),
      rank: rankId,
      country: pickCountry(),
      studyTopic: STUDY_TOPICS[Math.floor(Math.random() * STUDY_TOPICS.length)],
      banner: NPC_BANNER_IDS[Math.floor(Math.random() * NPC_BANNER_IDS.length)],
      logo: NPC_LOGO_IDS[Math.floor(Math.random() * NPC_LOGO_IDS.length)],
      bio: BIOS[Math.floor(Math.random() * BIOS.length)],
      joinDate: JOIN_DATES[Math.floor(Math.random() * JOIN_DATES.length)],
      totalXp: xp + Math.floor(Math.random() * 2000),
      sessionsCompleted: Math.floor(Math.random() * 200) + 10,
      streak: Math.floor(Math.random() * 60) + 1,
      status: Math.random() < 0.7 ? 'studying' : Math.random() < 0.5 ? 'on-break' : 'offline',
      preferredZone: pickZoneIdx(),
    })
  }
  return pool
}

// ─────────────────────────────────────────────────────────────────────────────
//  Seat assignment
// ─────────────────────────────────────────────────────────────────────────────

function assignAllSeats(pool: NpcProfile[], seats: Seat[], userSeat: number | null): Map<string, Seat> {
  const map = new Map<string, Seat>()
  const zoneMap = new Map<number, Seat[]>()
  for (const s of seats) {
    const idx = ZONES.indexOf(closestZone(s.pos[2]))
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
    let seat = available.get(npc.preferredZone)?.pop() ?? null
    if (!seat) {
      for (let z = 0; z < ZONES.length; z++) {
        seat = available.get(z)?.pop() ?? null
        if (seat) break
      }
    }
    if (seat) map.set(npc.id, seat)
  }
  return map
}

// ─────────────────────────────────────────────────────────────────────────────
//  Components — NO Html fullscreen, profile card is rendered OUTSIDE Canvas
// ─────────────────────────────────────────────────────────────────────────────

function NpcTag({ npc, onInfoClick }: { npc: NpcProfile; onInfoClick: () => void }) {
  const banner = BANNERS.find((b) => b.id === npc.banner)
  return (
    <Html position={[0, 2.55, 0]} center distanceFactor={10} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <PlayerNameTag
        name={npc.name}
        rank={npc.rank}
        country={npc.country}
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
  const bodyGroup = useRef<Group>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const nearLod = useRef<'near' | 'far' | 'cull'>('near')
  const showProfile = useNpcProfile((s) => s.show)

  const config: AvatarConfig = useMemo(() => {
    const ch = characterById(npc.characterId)
    return { ...ch.fallback, accessories: npc.accessories }
  }, [npc.characterId, npc.accessories])

  // Impostor sprite (baked seated, since NPCs live at their desks).
  const impostor = useImpostorTexture(config, 'sit')
  const spriteOn = useRef(false)

  useFrame(({ clock, camera }) => {
    const g = group.current
    if (!g) return
    g.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
    g.rotation.y = seat.yaw + Math.PI
    loco.current.seated = true
    loco.current.speed = 0
    g.scale.y = 1 + Math.sin(clock.elapsedTime * 0.8 + npc.totalXp) * 0.003

    // ---- Impostor swap (hysteresis) ----
    // The swap only happens once the baked sprite is ready — until then the
    // seated 3D rig stays visible, so an NPC never vanishes mid-bake.
    const dist = camera.position.distanceTo(g.position)
    if (spriteOn.current) {
      if (dist < SWAP_IN) spriteOn.current = false
    } else if (impostor && dist > SWAP_OUT) {
      spriteOn.current = true
    }
    const body = bodyGroup.current
    if (body && body.visible !== !spriteOn.current) body.visible = !spriteOn.current
    nearLod.current = spriteOn.current ? 'cull' : 'near'
  })

  const handleInfoClick = useCallback(() => {
    showProfile({
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
    })
  }, [npc, showProfile])

  return (
    <group ref={group}>
      <group ref={bodyGroup}>
        <CharacterAvatar config={config} locomotion={loco} lod={nearLod} preview={false} />
      </group>
      <ImpostorSprite entry={impostor} onRef={spriteOn} />
      <NpcTag npc={npc} onInfoClick={handleInfoClick} />
    </group>
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
