import { create } from 'zustand'
import { supabase } from './supabase'
import { networkId } from '../multiplayer/net'
import type { StudyStatus } from './types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ============================================================================
// Study-room presence — real multi-user presence over Supabase realtime.
// Channel namespace: `sr:<roomId>`. Events: `sr_hello` / `sr_bye`.
// ============================================================================

export interface StudyPeer {
  id: string
  name: string
  rank: string
  country: string | null
  avatarUrl: string | null
  status: StudyStatus
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
let supabaseChannel: RealtimeChannel | null = null
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
  if (!supabaseChannel) return
  try {
    await supabaseChannel.send({ type: 'broadcast', event, payload })
  } catch {
    /* transient — heartbeat retries */
  }
}

function handleHello(payload: { payload: Record<string, unknown> }) {
  const body = payload.payload
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
  if (!known) void publish('sr_hello', helloPayload())
}

function handleBye(payload: { payload: Record<string, unknown> }) {
  const body = payload.payload
  const id = body.id as string | undefined
  if (id && id !== selfId) drop(id)
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

export async function joinStudyRoom(channel: string, identity: StudyMe, userId?: string): Promise<void> {
  if (currentChannel && currentChannel !== channel) await leaveStudyRoom()
  selfId = networkId(userId)
  me = identity
  currentChannel = channel
  useStudyRoom.setState({ channel, selfId, roster: {} })

  try {
    supabaseChannel = supabase.channel(channel)

    supabaseChannel
      .on('broadcast', { event: 'sr_hello' }, handleHello)
      .on('broadcast', { event: 'sr_bye' }, handleBye)

    await supabaseChannel.subscribe()
  } catch {
    return
  }
  await publish('sr_hello', helloPayload())
  startLoops()
}

export function updateMe(patch: Partial<StudyMe>): void {
  if (!me) return
  me = { ...me, ...patch }
  void publish('sr_hello', helloPayload())
}

export async function leaveStudyRoom(): Promise<void> {
  stopLoops()
  if (currentChannel) {
    await publish('sr_bye', { id: selfId })
    try {
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel)
        supabaseChannel = null
      }
    } catch { /* already gone */ }
  }
  currentChannel = null
  me = null
  useStudyRoom.setState({ channel: null, roster: {} })
}
