import { create } from 'zustand'
import { insforge } from './insforge'
import { networkId } from '../multiplayer/net'
import type { StudyStatus } from './types'

// ============================================================================
// Study-room presence — real multi-user presence over InsForge realtime, built
// for the StudyStream-style grid. Deliberately separate from the 3D realm
// net.ts: distinct channel namespace (`sr:<roomId>`) and distinct events
// (`sr_hello` / `sr_bye`) so the two systems never cross-talk.
//
// Each peer broadcasts a small identity + study snapshot:
//   id, name, rank, country, avatarUrl, status, sessionStart, camOn
// `sessionStart` is the epoch ms the peer joined — every client renders a live
// session stopwatch from it, so your focus time is publicly visible to all.
//
// Discovery is symmetric (reply to a stranger's hello with our own), exactly
// like net.ts, so no server roster query is needed. A 4s heartbeat re-announces
// us; peers we haven't heard from in STALE_MS are pruned.
// ============================================================================

export interface StudyPeer {
  id: string
  name: string
  rank: string
  country: string | null
  avatarUrl: string | null
  status: StudyStatus
  /** epoch ms the peer joined this room (drives the public stopwatch) */
  sessionStart: number
  camOn: boolean
  lastSeen: number
}

export interface StudyMe {
  name: string
  rank: string
  country: string | null
  avatarUrl: string | null
  status: StudyStatus
  sessionStart: number
  camOn: boolean
}

const HEARTBEAT_MS = 4000
const PRUNE_MS = 3000
const STALE_MS = 12000

interface RoomStore {
  channel: string | null
  selfId: string | null
  roster: Record<string, StudyPeer>
}
export const useStudyRoom = create<RoomStore>(() => ({ channel: null, selfId: null, roster: {} }))

let currentChannel: string | null = null
let selfId: string | null = null
let me: StudyMe | null = null
let bound = false
let heartbeatTimer: number | null = null
let pruneTimer: number | null = null

function helloPayload() {
  return {
    id: selfId,
    name: me?.name ?? 'Explorer',
    rank: me?.rank ?? '',
    country: me?.country ?? null,
    avatarUrl: me?.avatarUrl ?? null,
    status: me?.status ?? 'studying',
    sessionStart: me?.sessionStart ?? Date.now(),
    camOn: me?.camOn ?? false,
  }
}

async function publish(event: string, payload: unknown) {
  if (!currentChannel) return
  try {
    await insforge.realtime.publish(currentChannel, event, payload)
  } catch {
    /* transient — heartbeat retries */
  }
}

function parse(msg: unknown): { channel?: string; body: Record<string, unknown> } {
  const m = (msg ?? {}) as Record<string, unknown>
  const meta = (m.meta ?? {}) as Record<string, unknown>
  const nested = m.payload
  const body = (nested && typeof nested === 'object' ? nested : m) as Record<string, unknown>
  return { channel: meta.channel as string | undefined, body }
}

function forUs(channel?: string) {
  return !currentChannel || !channel || channel === currentChannel
}

function setPeer(id: string, p: StudyPeer) {
  useStudyRoom.setState((s) => ({ roster: { ...s.roster, [id]: p } }))
}
function drop(id: string) {
  useStudyRoom.setState((s) => {
    if (!s.roster[id]) return s
    const next = { ...s.roster }
    delete next[id]
    return { roster: next }
  })
}

function handleHello(msg: unknown) {
  const { channel, body } = parse(msg)
  if (!forUs(channel)) return
  const id = body.id as string | undefined
  if (!id || id === selfId) return
  const known = !!useStudyRoom.getState().roster[id]
  setPeer(id, {
    id,
    name: (body.name as string) || 'Explorer',
    rank: (body.rank as string) || '',
    country: (body.country as string | null) ?? null,
    avatarUrl: (body.avatarUrl as string | null) ?? null,
    status: (body.status as StudyStatus) || 'studying',
    sessionStart: Number(body.sessionStart) || Date.now(),
    camOn: body.camOn === true,
    lastSeen: Date.now(),
  })
  // first sight → announce back so discovery is symmetric
  if (!known) void publish('sr_hello', helloPayload())
}

function handleBye(msg: unknown) {
  const { channel, body } = parse(msg)
  if (!forUs(channel)) return
  const id = body.id as string | undefined
  if (id && id !== selfId) drop(id)
}

function bind() {
  if (bound) return
  insforge.realtime.on('sr_hello', handleHello)
  insforge.realtime.on('sr_bye', handleBye)
  bound = true
}

function prune() {
  const now = Date.now()
  const roster = useStudyRoom.getState().roster
  for (const id of Object.keys(roster)) {
    if (now - roster[id].lastSeen > STALE_MS) drop(id)
  }
}

function startLoops() {
  stopLoops()
  heartbeatTimer = window.setInterval(() => void publish('sr_hello', helloPayload()), HEARTBEAT_MS)
  pruneTimer = window.setInterval(prune, PRUNE_MS)
}
function stopLoops() {
  if (heartbeatTimer != null) window.clearInterval(heartbeatTimer)
  if (pruneTimer != null) window.clearInterval(pruneTimer)
  heartbeatTimer = pruneTimer = null
}

/** Join a study-room realtime channel and start broadcasting presence. */
export async function joinStudyRoom(channel: string, identity: StudyMe, userId?: string): Promise<void> {
  if (currentChannel && currentChannel !== channel) await leaveStudyRoom()
  selfId = networkId(userId)
  me = identity
  currentChannel = channel
  useStudyRoom.setState({ channel, selfId, roster: {} })
  bind()
  try {
    await insforge.realtime.connect()
    await insforge.realtime.subscribe(channel)
  } catch {
    return // stay solo if realtime is unreachable
  }
  await publish('sr_hello', helloPayload())
  startLoops()
}

/** Update my broadcast snapshot (status / camera) and flush immediately. */
export function updateMe(patch: Partial<StudyMe>): void {
  if (!me) return
  me = { ...me, ...patch }
  void publish('sr_hello', helloPayload())
}

/** Leave the room: announce departure, unsubscribe, clear roster. */
export async function leaveStudyRoom(): Promise<void> {
  stopLoops()
  const channel = currentChannel
  if (channel) {
    await publish('sr_bye', { id: selfId })
    try {
      insforge.realtime.unsubscribe(channel)
    } catch {
      /* already gone */
    }
  }
  currentChannel = null
  me = null
  useStudyRoom.setState({ channel: null, roster: {} })
}
