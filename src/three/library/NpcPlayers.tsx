import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group } from 'three'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import type { AvatarConfig } from '../../avatar/config'
import { seatAnchors } from './furniture'
import { PlayerNameTag3D } from './PlayerNameTag3D'
import { RANKS } from '../../lib/ranks'
import { CHARACTERS, characterById } from '../../avatar/characters'
import { ACCESSORIES } from '../../avatar/config'
import { useRealm } from '../../store/realm'
import { usePomodoro } from '../../store/pomodoro'

// NPC configuration - maps room IDs to NPC counts
const NPC_COUNT_PER_ROOM: Record<string, number> = {
  'forest-hall': 30,
  'scholar-grove': 5,
  'silent-valley': 10,
  'mossy-archive': 0,
  'lantern-court': 11,
  'willow-study': 0,
  'amber-loft': 0,
  'fern-atrium': 0,
  'oakwood-den': 0,
  'starlit-wing': 0,
}

// Weird/unrealistic NPC names
const NPC_NAMES = [
  'ShadowNinja', 'PixelGhost', 'CodeMonkey', 'QuantumCat', 'NeonPhantom',
  'ByteBandit', 'Starlight', 'MoonRider', 'FireFly', 'IceCream',
  'ThunderBolt', 'DreamWeaver', 'CosmicJoker', 'RobotDuck', 'PurpleUnicorn',
  'ZenMaster', 'PixelPirate', 'CryptoKing', 'MemeLord', 'GamerQueen',
  'HackerPro', 'ArtNinja', 'MusicBot', 'DanceStar', 'ChessMaster',
  'PuzzleSolver', 'BookWorm', 'CoffeeAddict', 'NightOwl', 'Sunshine',
  'Rainbow', 'DragonFly', 'SilverFox', 'GoldenEagle', 'Midnight',
  'Echo', 'Blaze', 'Frost', 'Storm', 'Whisper',
  'Nova', 'Orion', 'Phoenix', 'Titan', 'Viper',
  'Jester', 'Sage', 'Rogue', 'Mage', 'Warrior',
]

// Common and Epic character IDs (excluding Legendary)
const VALID_NPC_CHARACTERS = CHARACTERS.filter(
  (c) => c.rarity === 'Common' || c.rarity === 'Epic'
).map((c) => c.id)

const NPC_ACCESSORIES = ACCESSORIES.map((a) => a.id)

// Ranks below Gold (Bronze and Silver only)
const VALID_NPC_RANKS = RANKS.filter(
  (r) => r.id.startsWith('bronze') || r.id.startsWith('silver')
).map((r) => r.id)

// Fake avatar configs for NPCs
function generateNpcAvatarConfig(characterId: string, accessories: string[]): AvatarConfig {
  const character = characterById(characterId)
  return {
    ...character.fallback,
    accessories,
  }
}

// Generate a random NPC
function generateNpc(id: number, sessionMin: number): {
  id: string
  name: string
  characterId: string
  accessories: string[]
  rank: string
  timerDuration: number
  timerStart: number
} {
  const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)] + (Math.floor(Math.random() * 1000) % 100)
  const characterId = VALID_NPC_CHARACTERS[Math.floor(Math.random() * VALID_NPC_CHARACTERS.length)]
  const rank = VALID_NPC_RANKS[Math.floor(Math.random() * VALID_NPC_RANKS.length)]
  
  // Random 1-3 accessories from the allowed list
  const numAccessories = Math.floor(Math.random() * 3) + 1
  const accessories = []
  for (let i = 0; i < numAccessories; i++) {
    const acc = NPC_ACCESSORIES[Math.floor(Math.random() * NPC_ACCESSORIES.length)]
    if (!accessories.includes(acc)) {
      accessories.push(acc)
    }
  }
  
  // Use session minutes as timer duration, randomized start
  const timerDuration = Math.max(300, sessionMin * 60)
  const timerStart = Date.now() - Math.floor(Math.random() * timerDuration)
  
  return {
    id: `npc_${id}`,
    name,
    characterId,
    accessories,
    rank,
    timerDuration,
    timerStart,
  }
}

// Check if NPC timer has expired
function isNpcTimerExpired(npc: { timerDuration: number; timerStart: number }): boolean {
  const elapsed = (Date.now() - npc.timerStart) / 1000
  return elapsed >= npc.timerDuration
}

// Get remaining time in seconds
function getNpcRemainingTime(npc: { timerDuration: number; timerStart: number }): number {
  const elapsed = (Date.now() - npc.timerStart) / 1000
  return Math.max(0, npc.timerDuration - elapsed)
}

export function NpcPlayers() {
  const realm = useRealm((s) => s.active)
  const camera = useThree((s) => s.camera)
  const [npcs, setNpcs] = useState<ReturnType<typeof generateNpc>[]>([])
  const seats = useMemo(() => seatAnchors(), [])
  const sessionMin = usePomodoro((s) => s.sessionMinutes)
  
  // Get room ID from realm
  const roomId = realm?.roomId
  
  // Generate NPCs for the current room
  useEffect(() => {
    if (!roomId) {
      setNpcs([])
      return
    }
    
    const count = NPC_COUNT_PER_ROOM[roomId] || 0
    if (count === 0) {
      setNpcs([])
      return
    }
    
    // Generate NPCs using session minutes
    const newNpcs: ReturnType<typeof generateNpc>[] = []
    for (let i = 0; i < count; i++) {
      newNpcs.push(generateNpc(i, sessionMin))
    }
    setNpcs(newNpcs)
  }, [roomId, sessionMin])
  
  // Filter out expired NPCs and re-generate them periodically
  useEffect(() => {
    if (npcs.length === 0 || !roomId) return
    
    const interval = setInterval(() => {
      const curMin = usePomodoro.getState().sessionMinutes
      setNpcs((prev) => {
        // Remove expired NPCs
        const active = prev.filter((npc) => !isNpcTimerExpired(npc))
        
        // If we lost NPCs, regenerate them
        if (active.length < prev.length) {
          const count = NPC_COUNT_PER_ROOM[roomId] || 0
          const toAdd = count - active.length
          for (let i = 0; i < toAdd; i++) {
            active.push(generateNpc(Date.now() + i, curMin))
          }
        }
        
        return active
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [npcs.length, roomId])
  
  // Assign NPCs to random seats
  const npcSeats = useMemo(() => {
    const result: Map<string, number> = new Map()
    if (seats.length === 0) return result
    const availableSeats = [...seats]
    
    npcs.forEach((npc) => {
      if (availableSeats.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSeats.length)
        const seat = availableSeats[randomIndex]
        result.set(npc.id, seat.id)
        availableSeats.splice(randomIndex, 1)
      }
    })
    
    return result
  }, [npcs, seats])
  
  if (npcs.length === 0 || seats.length === 0) return null
  
  return (
    <>
      {npcs.map((npc) => {
        const seatId = npcSeats.get(npc.id)
        if (seatId === undefined) return null
        
        const seat = seats[seatId]
        if (!seat) return null
        
        const avatarConfig = generateNpcAvatarConfig(npc.characterId, npc.accessories)
        const remainingTime = getNpcRemainingTime(npc)
        const isExpired = isNpcTimerExpired(npc)
        
        // Don't render expired NPCs
        if (isExpired) return null
        
        return (
          <NpcAvatar
            key={npc.id}
            npc={npc}
            seat={seat}
            config={avatarConfig}
            remainingTime={remainingTime}
          />
        )
      })}
    </>
  )
}

// Individual NPC avatar component
function NpcAvatar({ npc, seat, config, remainingTime }: {
  npc: { id: string; name: string; rank: string }
  seat: { id: number; pos: [number, number, number]; yaw: number } | null
  config: AvatarConfig
  remainingTime: number
}) {
  const group = useRef<Group>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const nearLod = useRef<'near' | 'far' | 'cull'>('near')
  
  // NPCs are seated and facing their desk
  useFrame(() => {
    const g = group.current
    if (!g || !seat) return
    
    // Position at seat
    g.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
    g.rotation.y = seat.yaw
    
    // Update locomotion to seated
    loco.current.seated = true
    loco.current.speed = 0
  })
  
  if (!seat) return null
  
  return (
    <group ref={group}>
      {/* Avatar */}
      <CharacterAvatar
        config={config}
        locomotion={loco.current}
        lod={nearLod}
        preview={false}
      />
      
      {/* Name tag */}
      <PlayerNameTag3D
        name={npc.name}
        rank={npc.rank}
        country={null}
        headY={2.55}
      />
    </group>
  )
}
