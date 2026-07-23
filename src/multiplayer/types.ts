import type { AvatarConfig } from '../avatar/config'

// Wire types for realm multiplayer. Everything here is plain JSON so it travels
// over the InsForge realtime channel unchanged.

/** Who a player is — the public identity + their avatar look. Broadcast on the
 *  low-frequency `hello` event (join, avatar change, and a periodic heartbeat). */
export interface PlayerIdentity {
  /** stable id — the auth user id, or a persisted guest id when signed out */
  id: string
  name: string
  /** ISO 3166-1 alpha-2 country code (UPPERCASE), or null */
  country: string | null
  /** rank id (ranks.ts) */
  rank: string
  avatar: AvatarConfig
}

/** A player's transform + motion, broadcast ~10×/sec on the `move` event. The
 *  remote renderer interpolates toward the latest snapshot, so a modest rate
 *  stays smooth without flooding the channel. */
export interface PlayerState {
  x: number
  y: number
  z: number
  /** body heading (radians) */
  yaw: number
  /** horizontal speed (drives idle ⇄ walk ⇄ run on the remote animator) */
  speed: number
  grounded: boolean
  seated: boolean
  /** seat id when seated (enables cross-client seat occupancy tracking) */
  seatId?: number
  /** timestamp (ms) when the study timer started — 0 when no timer is running */
  timerStartedAt: number
  /** total session duration in ms (e.g. 3600000 for 1 hour) — 0 when no timer */
  timerDurationMs: number
  /** true while this player is driving / watching the shared Cinematic Tour — their
   *  avatar is hidden from everyone else so it doesn't fly through the shared shot. */
  cinematic: boolean
}

/** A remote player as tracked locally: their identity plus the last time we
 *  heard from them (for pruning). The fast-moving transform target lives in a
 *  separate Map in net.ts so per-frame updates never go through React. */
export interface RosterEntry extends PlayerIdentity {
  lastSeen: number
}
