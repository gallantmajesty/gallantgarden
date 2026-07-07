import { insforge } from './insforge'

// Realm presence / capacity / auto-instancing — the client side of the
// `realm_presence` table + its RPCs (see migrations/..._add-realm-presence.sql).
//
// Realtime (multiplayer/net.ts) syncs movement; this module answers the three
// questions realtime can't, because it keeps no history and exposes no roster:
//   • which instance of a room should I join?  → assignInstance() (capacity + auto-instance)
//   • how busy is each room right now?          → occupancy()
//   • keep me counted while I'm here / drop me  → startHeartbeat() / leavePresence()
//
// `roomKey` is the logical realm WITHOUT the instance suffix:
//   global room → `lib:<roomId>`      (e.g. `lib:forest-hall`)
//   custom realm → `custom:<realmId>`

/** Per-room player cap. The chooser shows N/CAPACITY and a room auto-instances
 *  once every existing instance is full. */
export const REALM_CAPACITY = 50

/** Heartbeat cadence. Must be comfortably under the 30s active window the server
 *  uses to decide who still counts as present. */
const HEARTBEAT_MS = 20_000

export interface InstanceOccupancy {
  instance: number
  count: number
}

/** Claim a slot in `roomKey`, returning the instance to join. Picks the lowest
 *  instance with free space, or opens a new one if all are full. Falls back to
 *  instance 1 for guests / when the backend is unreachable so play never blocks. */
export async function assignInstance(roomKey: string, capacity = REALM_CAPACITY): Promise<number> {
  try {
    const { data, error } = await insforge.rpc('assign_realm_instance', {
      p_room_key: roomKey,
      p_capacity: capacity,
    })
    if (error || typeof data !== 'number') return 1
    return data
  } catch {
    return 1
  }
}

/** Live per-instance counts for a room (for the pre-join chooser). [] on failure. */
export async function occupancy(roomKey: string): Promise<InstanceOccupancy[]> {
  try {
    const { data, error } = await insforge.rpc('realm_occupancy', { p_room_key: roomKey })
    if (error || !Array.isArray(data)) return []
    return data as InstanceOccupancy[]
  } catch {
    return []
  }
}

/** Total live players across every instance of a room. */
export function totalOccupants(rows: InstanceOccupancy[]): number {
  return rows.reduce((n, r) => n + (r.count || 0), 0)
}

async function heartbeat(roomKey: string, instance: number): Promise<void> {
  try {
    await insforge.rpc('realm_heartbeat', { p_room_key: roomKey, p_instance: instance })
  } catch {
    /* transient — next tick retries */
  }
}

/** Drop the caller's presence row immediately on leave. */
export async function leavePresence(): Promise<void> {
  try {
    await insforge.rpc('leave_realm_presence', {})
  } catch {
    /* the 30s active window will drop us anyway */
  }
}

/** Start the presence heartbeat for a room+instance. Fires once immediately,
 *  then every HEARTBEAT_MS. Returns a stop function that clears the timer. */
export function startHeartbeat(roomKey: string, instance: number): () => void {
  void heartbeat(roomKey, instance)
  const timer = window.setInterval(() => void heartbeat(roomKey, instance), HEARTBEAT_MS)
  return () => window.clearInterval(timer)
}
