// @ts-nocheck
import { create } from 'zustand'
import { supabase } from '../lib/insforge'
import { normalizeAvatar, type AvatarConfig } from '../avatar/config'
import { getDeviceLabel } from '../lib/session'
import type { PlayerIdentity, PlayerState, RosterEntry } from './types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ============================================================================
// Realm multiplayer — real-time presence + transform sync over Supabase realtime.
//
// One channel per realm (`realm:<roomId>`). Three broadcast events:
//   • hello — full identity + a current state snapshot.
//   • move  — id + transform, ~10×/sec, but only when something actually changed.
//   • bye   — id, on leave.
// ============================================================================

const MOVE_HZ_MS = 100
const HEARTBEAT_MS = 4000
const PRUNE_MS = 3000
const STALE_MS = 12000

const targets = new Map<string, PlayerState>()
export function getTarget(id: string): PlayerState | undefined {
  return targets.get(id)
}

// --- Cinematic tour shared-view sync ---------------------------------------
// When any player enables the Cinematic Tour (key 5) they drive a single shared
// camera that every *other* cinematic viewer renders too — so two people in the
// tour see the exact same "screen". Entering/leaving is each player's own wish,
// but the camera path is one broadcast feed. The player with the lexicographically
// smallest id among those currently in cinematic is the "host" who drives + sends
// the camera; everyone else receives and renders it.
const cineActive = new Map<string, boolean>()
const cineCamTargets = new Map<string, { pos: number[]; look: number[]; fov: number }>()
let localCineActive = false

export function setLocalCineActive(v: boolean): void {
  localCineActive = v
}

export function getSelfId(): string | null {
  return selfId
}

/** id of the player whose camera is authoritative for the shared cinematic, or
 *  null if nobody (including the local player) is in cinematic. */
export function getCineHostId(): string | null {
  let host: string | null = null
  const roster = useRealmNet.getState().roster
  for (const id of cineActive.keys()) {
    if (!cineActive.get(id)) continue
    if (!roster[id]) continue
    if (host == null || id < host) host = id
  }
  if (localCineActive && selfId && (host == null || selfId < host)) host = selfId
  return host
}

/** The authoritative host camera (pos + look), or null if we don't have it yet. */
export function getCineHostCam(): { pos: number[]; look: number[]; fov: number } | null {
  const host = getCineHostId()
  if (!host) return null
  return cineCamTargets.get(host) ?? null
}

export function publishCineState(active: boolean): void {
  if (!selfId) return
  void publish('cine-state', { id: selfId, active })
}

export function publishCineCam(pos: [number, number, number], look: [number, number, number], fov: number): void {
  if (!selfId) return
  void publish('cine-cam', { id: selfId, pos, look, fov })
}

function deviceToken(): string {
  try {
    let t = sessionStorage.getItem('sf.device')
    if (!t) {
      const bytes = new Uint8Array(8)
      crypto.getRandomValues(bytes)
      t = `${Date.now().toString(36)}${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')}`
      sessionStorage.setItem('sf.device', t)
    }
    return t
  } catch {
    return `${Date.now().toString(36)}`
  }
}

export function networkId(userId?: string): string {
  const base = userId || guestId()
  return `${base}:${deviceToken()}`
}

function guestId(): string {
  try {
    let g = localStorage.getItem('sf.guestId')
    if (!g) {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      g = `guest_${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')}${Date.now().toString(36)}`
      localStorage.setItem('sf.guestId', g)
    }
    return g
  } catch {
    return `guest_${Date.now().toString(36)}`
  }
}

function getDeviceLabelForIdentity(): string {
  return getDeviceLabel()
}

interface NetStore {
  channel: string | null
  selfId: string | null
  roster: Record<string, RosterEntry>
}

export const useRealmNet = create<NetStore>(() => ({
  channel: null,
  selfId: null,
  roster: {},
}))

let currentChannel: string | null = null
let selfId: string | null = null
let selfIdentity: PlayerIdentity | null = null
let localState: PlayerState = { x: 0, y: 0, z: 0, yaw: 0, speed: 0, grounded: true, seated: false, cinematic: false }
let supabaseChannel: RealtimeChannel | null = null
let moveTimer: number | null = null
let heartbeatTimer: number | null = null
let pruneTimer: number | null = null
let lastPub: PlayerState | null = null
let lastPubTime = 0

const MAX_NAME_LEN = 30

function helloPayload() {
  return {
    id: selfId,
    name: (selfIdentity?.name ?? 'Explorer').slice(0, MAX_NAME_LEN),
    country: selfIdentity?.country ?? null,
    rank: (selfIdentity?.rank ?? '').slice(0, 20),
    avatar: selfIdentity?.avatar,
    state: localState,
    device: getDeviceLabelForIdentity(),
  }
}

async function publish(event: string, payload: unknown): Promise<void> {
  if (!supabaseChannel) return
  try {
    await supabaseChannel.send({ type: 'broadcast', event, payload })
  } catch (err) {
    console.warn(`[multiplayer] publish "${event}" failed:`, err)
  }
}

function handleHello(payload: { payload: Record<string, unknown> }) {
  const body = payload.payload
  const id = body.id as string | undefined
  if (!id || id === selfId || !body.avatar) return
  const now = Date.now()
  const known = !!useRealmNet.getState().roster[id]
  setRoster(id, {
    id,
    name: ((body.name as string) || 'Explorer').slice(0, MAX_NAME_LEN),
    country: (body.country as string | null) ?? null,
    rank: ((body.rank as string) || '').slice(0, 20),
    avatar: normalizeAvatar(body.avatar as Partial<AvatarConfig>),
    lastSeen: now,
  })
  if (body.state) targets.set(id, body.state as PlayerState)
  if (!known) void publish('hello', helloPayload())
}

function handleMove(payload: { payload: Record<string, unknown> }) {
  const body = payload.payload
  const id = body.id as string | undefined
  if (!id || id === selfId) return
  if (!useRealmNet.getState().roster[id]) return
  targets.set(id, {
    x: Number(body.x) || 0,
    y: Number(body.y) || 0,
    z: Number(body.z) || 0,
    yaw: Number(body.yaw) || 0,
    speed: Number(body.speed) || 0,
    grounded: body.grounded !== false,
    seated: body.seated === true,
    seatId: typeof body.seatId === 'number' ? body.seatId : undefined,
    cinematic: body.cinematic === true,
  })
  touch(id, Date.now())
}

function handleBye(payload: { payload: Record<string, unknown> }) {
  const body = payload.payload
  const id = body.id as string | undefined
  if (id && id !== selfId) drop(id)
}

function handleCineState(payload: { payload: Record<string, unknown> }) {
  const body = payload.payload
  const id = body.id as string | undefined
  if (!id || id === selfId) return
  cineActive.set(id, body.active === true)
  touch(id, Date.now())
}

function handleCineCam(payload: { payload: Record<string, unknown> }) {
  const body = payload.payload
  const id = body.id as string | undefined
  if (!id || id === selfId) return
  const pos = body.pos as unknown
  const look = body.look as unknown
  const fov = typeof body.fov === 'number' ? (body.fov as number) : 68
  if (!Array.isArray(pos) || !Array.isArray(look)) return
  cineCamTargets.set(id, { pos: pos as number[], look: look as number[], fov })
  touch(id, Date.now())
}

function handleSeatClaim(payload: { payload: Record<string, unknown> }) {
  const body = payload.payload
  const id = body.id as string | undefined
  const seatIndex = body.seatIndex as number | undefined
  const displayName = (body.displayName as string) || 'Explorer'
  if (id === selfId || seatIndex == null) return
  void import('../three/train/interior').then(({ claimSeat }) => {
    claimSeat(seatIndex, id, displayName)
  }).catch(() => { /* module not loaded */ })
}

function handleSeatRelease(payload: { payload: Record<string, unknown> }) {
  const body = payload.payload
  const id = body.id as string | undefined
  const seatIndex = body.seatIndex as number | undefined
  if (id === selfId || seatIndex == null) return
  void import('../three/train/interior').then(({ releaseSeat }) => {
    releaseSeat(seatIndex)
  }).catch(() => { /* module not loaded */ })
}

function setRoster(id: string, entry: RosterEntry) {
  useRealmNet.setState((s) => ({ roster: { ...s.roster, [id]: entry } }))
}

function touch(id: string, now: number) {
  const cur = useRealmNet.getState().roster[id]
  if (cur) setRoster(id, { ...cur, lastSeen: now })
}

function drop(id: string) {
  targets.delete(id)
  cineActive.delete(id)
  cineCamTargets.delete(id)
  useRealmNet.setState((s) => {
    if (!s.roster[id]) return s
    const next = { ...s.roster }
    delete next[id]
    return { roster: next }
  })
}

function moved(a: PlayerState, b: PlayerState): boolean {
  return (
    Math.abs(a.x - b.x) > 0.01 ||
    Math.abs(a.y - b.y) > 0.01 ||
    Math.abs(a.z - b.z) > 0.01 ||
    Math.abs(a.yaw - b.yaw) > 0.01 ||
    Math.abs(a.speed - b.speed) > 0.05 ||
    a.grounded !== b.grounded ||
    a.seated !== b.seated ||
    a.seatId !== b.seatId ||
    a.cinematic !== b.cinematic
  )
}

/** Build a seat-id → display-name map from all known remote targets.
 *  Call this periodically or on move events to keep the seat picker updated. */
export function getRemoteOccupied(): Record<number, string> {
  const roster = useRealmNet.getState().roster
  const out: Record<number, string> = {}
  for (const [id, st] of targets.entries()) {
    if (!st.seated || st.seatId == null) continue
    const name = roster[id]?.name ?? 'Student'
    out[st.seatId] = name
  }
  return out
}

function tickMove() {
  const now = Date.now()
  if (lastPub && !moved(lastPub, localState) && now - lastPubTime < 1000) return
  lastPub = { ...localState }
  lastPubTime = now
  void publish('move', { id: selfId, ...localState })
}


function prune() {
  const now = Date.now()
  const roster = useRealmNet.getState().roster
  for (const id of Object.keys(roster)) {
    if (now - roster[id].lastSeen > STALE_MS) drop(id)
  }
}

function startLoops() {
  stopLoops()
  moveTimer = window.setInterval(tickMove, MOVE_HZ_MS)
  heartbeatTimer = window.setInterval(() => void publish('hello', helloPayload()), HEARTBEAT_MS)
  pruneTimer = window.setInterval(prune, PRUNE_MS)
}

function stopLoops() {
  for (const t of [moveTimer, heartbeatTimer, pruneTimer]) if (t != null) window.clearInterval(t)
  moveTimer = heartbeatTimer = pruneTimer = null
}

export function publishSeatClaim(seatIndex: number, displayName: string): void {
  void publish('seat-claim', { id: selfId, seatIndex, displayName })
}

export function publishSeatRelease(seatIndex: number): void {
  void publish('seat-release', { id: selfId, seatIndex })
}

export function setLocalState(s: PlayerState): void {
  localState = s
}

/** Set the seat id for the local player (called when sitting in the library). */
export function setLocalSeatId(seatId: number | undefined): void {
  localState = { ...localState, seatId }
}

export async function joinRealm(channel: string, identity: PlayerIdentity): Promise<void> {
  if (currentChannel && currentChannel !== channel) await leaveRealm()
  selfId = identity.id
  selfIdentity = identity
  currentChannel = channel
  lastPub = null
  targets.clear()
  useRealmNet.setState({ channel, selfId: identity.id, roster: {} })

  try {
    supabaseChannel = supabase.channel(channel)

    supabaseChannel
      .on('broadcast', { event: 'hello' }, handleHello)
      .on('broadcast', { event: 'move' }, handleMove)
      .on('broadcast', { event: 'bye' }, handleBye)
      .on('broadcast', { event: 'cine-state' }, handleCineState)
      .on('broadcast', { event: 'cine-cam' }, handleCineCam)
      .on('broadcast', { event: 'seat-claim' }, handleSeatClaim)
      .on('broadcast', { event: 'seat-release' }, handleSeatRelease)

    await supabaseChannel.subscribe()
  } catch (err) {
    console.error('[multiplayer] channel subscribe failed:', err)
    return
  }
  await publish('hello', helloPayload())
  startLoops()
}

export function updateIdentity(identity: PlayerIdentity): void {
  selfId = identity.id
  selfIdentity = identity
  if (useRealmNet.getState().selfId !== identity.id) useRealmNet.setState({ selfId: identity.id })
  void publish('hello', helloPayload())
}

export async function leaveRealm(): Promise<void> {
  stopLoops()
  if (currentChannel) {
    await publish('bye', { id: selfId })
    try {
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel)
        supabaseChannel = null
      }
    } catch { /* already gone */ }
  }
  currentChannel = null
  targets.clear()
  useRealmNet.setState({ channel: null, roster: {} })
}
