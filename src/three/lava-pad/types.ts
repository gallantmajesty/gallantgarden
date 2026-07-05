// Lava Pad Game Types — plain JSON-serializable types for multiplayer sync

/** Match phase enum */
export type MatchPhase = 'waiting' | 'playersJoining' | 'countdown' | 'playing' | 'finished' | 'results'

/** Platform types available in Lava Pad arena */
export type PlatformType = 'normal' | 'spawn' | 'large' | 'small' | 'cracked' | 'moving' | 'shrinking'

/** Individual player state during a match */
export interface LavaPadPlayerState {
  /** Unique identifier for the player */
  id: string
  /** Player's display name */
  name: string
  /** ID of the platform the player is currently on (null if not spawned) */
  platformId: string | null
  /** Target platform ID for jumps in progress (null when not jumping) */
  targetPlatformId: string | null
  /** Jump progress (0→1) indicating how far the jump has advanced */
  jumpProgress: number
  /** Timestamp when jump started (used with jumpDuration for timing) */
  jumpStartTime: number
  /** Duration of a complete jump in seconds */
  jumpDuration: number
  /** Whether the player has been eliminated from the match */
  eliminated: boolean
  /** Game time when the player was eliminated */
  eliminationTime: number
  /** Final placement (1 = winner) calculated at match end */
  placement: number
  /** Whether the player is spectating after elimination */
  spectating: boolean
  /** ID of the platform being spectated when spectating */
  spectateTargetId: string | null
  /** Time survived during the match in seconds */
  survivalTime: number
}

/** Special state properties for different platform types */
export interface LavaPadPlatformSpecialState {
  /** Cracked platform state: breaking timer, respawn timer, and break status */
  cracked?: {
    timeUntilBreak: number
    respawnTimer: number
    broken: boolean
    breakDuration: number
    respawnDelay: number
  }
  /** Moving platform path information and movement state */
  moving?: {
    path: { x: number; z: number }[]
    pathIndex: number
    speed: number
    pauseTimer: number
  }
  /** Shrinking platform state: contraction progress and occupancy */
  shrinking?: {
    progress: number
    occupied: boolean
    minRadius: number
    shrinkSpeed: number
    growSpeed: number
  }
}

/** Base platform configuration before connectivity graph is built */
export interface LavaPadPlatform {
  /** Unique identifier */
  id: string
  /** World X position */
  x: number
  /** World Y position (height above ground) */
  y: number
  /** World Z position */
  z: number
  /** Platform radius (width) */
  radius: number
  /** Platform height (wall thickness) */
  height: number
  /** List of platform IDs this platform connects to */
  connectedTo: string[]
  /** Type of platform (normal, spawn, large, small, cracked, moving, shrinking) */
  type: PlatformType
  /** Special runtime state for certain platform types */
  special?: LavaPadPlatformSpecialState
}

/** Complete arena configuration including all platforms, lava properties, and arena dimensions */
export interface LavaPadArenaConfig {
  /** Array of platforms in the arena */
  platforms: LavaPadPlatform[]
  /** Lava system configuration */
  lava: {
    initialY: number      // Starting lava Y position
    riseSpeed: number      // Speed at which lava rises
    maxY: number           // Maximum lava Y position
  }
  /** Arena geometry and spawn configuration */
  arena: {
    centerX: number       // Arena center X coordinate
    centerZ: number       // Arena center Z coordinate
    radius: number        // Arena radius
    spawnHeight: number   // Height where spawns are placed
  }
  /** Match timing configuration */
  match: {
    countdownDuration: number  // Duration of pre-game countdown
    maxDuration: number        // Maximum match duration before automatic finish
  }
  /** Random seed used to generate this arena */
  seed: number
}

/** Game state information during a match */
export interface LavaPadMatchState {
  /** Current match phase: waiting → playersJoining → countdown → playing → finished → results */
  phase: MatchPhase
  /** Countdown timer (seconds remaining) */
  countdown: number
  /** Total game time elapsed */
  timeElapsed: number
  /** All players currently in the match */
  players: Record<string, LavaPadPlayerState>
  /** ID of the match winner (null for ties/timeouts) */
  winnerId: string | null
  /** Number of surviving players */
  survivors: number
  /** Order in which players were eliminated (last element is winner if any) */
  eliminationOrder: string[]
  /** Seed used to generate the current arena */
  arenaSeed: number
}

/** Complete game configuration with runtime values and constants */
export interface LavaPadGameConfig {
  /** Current arena configuration */
  arena: LavaPadArenaConfig
  /** Player movement and jump physics */
  player: {
    jumpDuration: number      // Duration of a normal jump arc
    jumpHeight: number        // Maximum height of jump arc
    maxJumpDistance: number   // Maximum distance a player can jump
    anticipationDuration: number // Pre-jump anticipation time
    landingDuration: number   // Post-jump landing time
  }
  /** Camera behavior and follow settings */
  camera: {
    distance: number      // Distance from target
    height: number        // Camera height above target
    stiffness: number     // Spring stiffness for smooth following
    damping: number       // Spring damping for stability
    jumpZoomFactor: number // Zoom multiplier during jumps
    tiltAmount: number    // Roll tilt during jumps
  }
  /** Lava warning and danger thresholds */
  lava: {
    warningThreshold: number // Game time when lava warning triggers
  }
  /** Platform-specific timing and physics constants */
  platform: {
    crackedBreakDelay: number      // Time before cracked platform breaks
    crackedRespawnDelay: number    // Time for cracked platform to respawn
    movingSpeed: number           // Movement speed for moving platforms
    shrinkingMinRadius: number    // Minimum radius for shrinking platforms
    shrinkingSpeed: number        // Speed of platform contraction
    shrinkingGrowSpeed: number    // Speed of platform expansion
  }
}
