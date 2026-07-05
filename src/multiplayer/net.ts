// @ts-nocheck
import { create } from 'zustand'
import { insforge } from '../lib/insforge'
import { normalizeAvatar, type AvatarConfig } from '../avatar/config'
import { getDeviceLabel } from '../lib/session'
import type { PlayerIdentity, PlayerState, RosterEntry } from './types'

// ============================================================================
// Realm multiplayer — real-time presence + transform sync over InsForge realtime.
//
// One channel per realm (`realm:lib:<roomId>`, `realm:custom:<id>`, …). Three
// broadcast events:
//   • hello — full identity + a current state snapshot. Sent on join, whenever
//     the avatar/name changes, and on a 4s heartbeat. When we first see someone
//     we reply with our own hello so discovery is symmetric (no server presence
//     query required).
//   • move  — id + transform, ~10×/sec, but only when something actually changed
//     (plus a 1s keep-alive). This is the "efficient interval + no flooding" rule.
//   • bye   — id, on leave.
//
// Two stores of remote state, split by update rate:
//   • `useRealmNet.roster` (zustand) — identities, changes only on join/leave →
//     drives the roster UI and which avatars are mounted.
//   • `targets` (plain Map) — the latest transform per player, rewritten ~10×/sec
//     and read every frame by the renderer. Deliberately NOT React state.
// ============================================================================

const MOVE_HZ_MS = 100 // ~10 updates/sec
const HEARTBEAT_MS = 4000 // identity re-broadcast (discovery + liveness)
const PRUNE_MS = 3000
const STALE_MS = 12000 // drop a player we haven't heard from in this long

/** Latest transform snapshot per remote player (read every frame; never React). */
const targets = new Map<string, PlayerState>()
export function getTarget(id: string): PlayerState | undefined {
  return targets.get(id)
}

/** A token unique to THIS device, persisted in sessionStorage (per-device, not
 *  shared like localStorage). Appended to the network id so two devices of the
 *  same account are distinct players that can see each other, instead of colliding
 *  on one id and each treating the other as "self". */
function deviceToken(): string {
  try {
    let t = sessionStorage.getItem('sf.device')
    if (!t) {
      t = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem('sf.device', t)
    }
    return t
  } catch {
    return `${Date.now().toString(36)}`
  }
}

/** Stable per-device network id: the auth user id (or a persisted guest id) plus a
 *  per-device token. Use this for the realm identity's `id`. */
export function networkId(userId?: string): string {
  const base = userId || guestId()
  return `${base}:${deviceToken()}`
}

/** Get device-specific token for multiplayer identification. */
function deviceToken(): string {
  try {
    let t = sessionStorage.getItem('sf.device')
    if (!t) {
      t = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem('sf.device', t)
    }
    return t
  } catch {
    return `${Date.now().toString(36)}`
  }
}

/** Persisted guest id so a signed-out session is one consistent base identity. */
function guestId(): string {
  try {
    let g = localStorage.getItem('sf.guestId')
    if (!g) {
      g = `guest_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      localStorage.setItem('sf.guestId', g)
    }
    return g
  } catch {
    return `guest_${Date.now().toString(36)}`
  }
}

/** Get device label for multiplayer identity. */
function getDeviceLabelForIdentity(): string {
  return getDeviceLabel()
}

interface NetStore {
  /** the channel we're currently joined to (null = solo / not in a realm) */
  channel: string | null
  /** our own player id (excluded from the roster) */
  selfId: string | null
  /** remote players only, keyed by id */
  roster: Record<string, RosterEntry>
}

export const useRealmNet = create<NetStore>(() => ({
  channel: null,
  selfId: null,
  roster: {},
}))

/* ----------------------------------------------------------- module state --- */

let currentChannel: string | null = null
let selfId: string | null = null
let selfIdentity: PlayerIdentity | null = null
let localState: PlayerState = { x: 0, y: 0, z: 0, yaw: 0, speed: 0, grounded: true, seated: false }
let listenersBound = false
let moveTimer: number | null = null
let heartbeatTimer: number | null = null
let pruneTimer: number | null = null
let lastPub: PlayerState | null = null
let lastPubTime = 0

/* --------------------------------------------------------------- helpers ---- */

function helloPayload() {
  return {
    id: selfId,
    name: selfIdentity?.name ?? 'Explorer',
    country: selfIdentity?.country ?? null,
    rank: selfIdentity?.rank ?? '',
    avatar: selfIdentity?.avatar,
    state: localState,
    device: getDeviceLabelForIdentity(),
  }
}

async function publish(event: string, payload: unknown): Promise<void> {
  if (!currentChannel) return
  try {
    await insforge.realtime.publish(currentChannel, event, payload)
  } catch (err) {
    console.warn(`[multiplayer] publish "${event}" failed:`, err)
  }
}

/** Pull the payload + sender out of a SocketMessage, tolerant of whether the
 *  server spreads the payload onto the message or nests it under `payload`. */
function parse(msg: unknown): { senderId?: string; channel?: string; body: Record<string, unknown> } {
  const m = (msg ?? {}) as Record<string, unknown>
  const meta = (m.meta ?? {}) as Record<string, unknown>
  const nested = m.payload
  const body = (nested && typeof nested === 'object' ? nested : m) as Record<string, unknown>
  return { senderId: meta.senderId as string | undefined, channel: meta.channel as string | undefined, body }
}

function forUs(channel?: string): boolean {
  return !currentChannel || !channel || channel === currentChannel
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
  useRealmNet.setState((s) => {
    if (!s.roster[id]) return s
    const next = { ...s.roster }
    delete next[id]
    return { roster: next }
  })
}

/* ------------------------------------------------------------- listeners ---- */

function handleHello(msg: unknown) {
  const { channel, body } = parse(msg)
  if (!forUs(channel)) return
  const id = body.id as string | undefined
  if (!id || id === selfId || !body.avatar) return
  console.log('[multiplayer] hello from', id, body.name, 'on', body.device)
  const now = Date.now()
  const known = !!useRealmNet.getState().roster[id]
  setRoster(id, {
    id,
    name: (body.name as string) || 'Explorer',
    country: (body.country as string | null) ?? null,
    rank: (body.rank as string) || '',
    avatar: normalizeAvatar(body.avatar as Partial<AvatarConfig>),
    lastSeen: now,
  })
  if (body.state) targets.set(id, body.state as PlayerState)
  // First time we see them: announce ourselves back so they learn about us too.
  // Bounded to first-sight, so two clients exchange exactly one hello pair.
  if (!known) void publish('hello', helloPayload())
}

function handleMove(msg: unknown) {
  const { channel, body } = parse(msg)
  if (!forUs(channel)) return
  const id = body.id as string | undefined
  if (!id || id === selfId) return
  // Ignore movement from players we haven't met yet — their hello heartbeat
  // (≤4s) will introduce them, then their moves start applying.
  if (!useRealmNet.getState().roster[id]) return
  targets.set(id, {
    x: Number(body.x) || 0,
    y: Number(body.y) || 0,
    z: Number(body.z) || 0,
    yaw: Number(body.yaw) || 0,
    speed: Number(body.speed) || 0,
    grounded: body.grounded !== false,
    seated: body.seated === true,
  })
  touch(id, Date.now())
}

function handleBye(msg: unknown) {
  const { channel, body } = parse(msg)
  if (!forUs(channel)) return
  const id = body.id as string | undefined
  if (id && id !== selfId) drop(id)
}

function bindListeners() {
  if (listenersBound) return
  insforge.realtime.on('hello', handleHello)
  insforge.realtime.on('move', handleMove)
  insforge.realtime.on('bye', handleBye)
  insforge.realtime.on('seat-claim', handleSeatClaim)
  insforge.realtime.on('seat-release', handleSeatRelease)
  // Also listen for raw socket events to diagnose message format
  insforge.realtime.on('connect', () => console.log('[multiplayer] socket connected'))
  insforge.realtime.on('connect_error', (err) => console.error('[multiplayer] socket connect_error:', err))
  insforge.realtime.on('disconnect', (reason) => console.warn('[multiplayer] socket disconnected:', reason))
  insforge.realtime.on('error', (err) => console.error('[multiplayer] socket error:', err))
  listenersBound = true
}

/* ----------------------------------------------------------------- loops ---- */

function moved(a: PlayerState, b: PlayerState): boolean {
  return (
    Math.abs(a.x - b.x) > 0.01 ||
    Math.abs(a.y - b.y) > 0.01 ||
    Math.abs(a.z - b.z) > 0.01 ||
    Math.abs(a.yaw - b.yaw) > 0.01 ||
    Math.abs(a.speed - b.speed) > 0.05 ||
    a.grounded !== b.grounded ||
    a.seated !== b.seated
  )
}

function tickMove() {
  const now = Date.now()
  // Only send when the player actually moved, plus a 1s keep-alive so a still
  // player isn't pruned. This is what keeps 40–50 players off the network floor.
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

/* --------------------------------------------------------- train seat sync -- */

function handleSeatClaim(msg: unknown) {
  const { channel, body } = parse(msg)
  if (!forUs(channel)) return
  const id = body.id as string | undefined
  const seatIndex = body.seatIndex as number | undefined
  const displayName = (body.displayName as string) || 'Explorer'
  if (id === selfId || seatIndex == null) return
  const { claimSeat } = require('../three/train/interior') as typeof import('../three/train/interior')
  claimSeat(seatIndex, id, displayName)
}

function handleSeatRelease(msg: unknown) {
  const { channel, body } = parse(msg)
  if (!forUs(channel)) return
  const id = body.id as string | undefined
  const seatIndex = body.seatIndex as number | undefined
  if (id === selfId || seatIndex == null) return
  const { releaseSeat } = require('../three/train/interior') as typeof import('../three/train/interior')
  releaseSeat(seatIndex)
}

/** Broadcast a seat claim to other passengers. */
export function publishSeatClaim(seatIndex: number, displayName: string): void {
  void publish('seat-claim', { id: selfId, seatIndex, displayName })
}

/** Broadcast a seat release to other passengers. */
export function publishSeatRelease(seatIndex: number): void {
  void publish('seat-release', { id: selfId, seatIndex })
}

/* -------------------------------------------------------------- public API -- */

/** Feed the local player's transform every frame (cheap — just stores it; the
 *  move loop decides when to actually publish). */
export function setLocalState(s: PlayerState): void {
  localState = s
}

/** Join (or switch to) a realm channel and start syncing. Safe to call again
 *  with a new channel — it leaves the previous one first. */
export async function joinRealm(channel: string, identity: PlayerIdentity): Promise<void> {
  if (currentChannel && currentChannel !== channel) await leaveRealm()
  selfId = identity.id
  selfIdentity = identity
  currentChannel = channel
  lastPub = null
  targets.clear()
  useRealmNet.setState({ channel, selfId: identity.id, roster: {} })
  bindListeners()
  try {
    await insforge.realtime.connect()
    const sub = await insforge.realtime.subscribe(channel)
    if (!sub.ok) {
      console.error('[multiplayer] subscribe failed:', sub.error)
      return
    }
    console.log('[multiplayer] subscribed to', channel)
  } catch (err) {
    console.error('[multiplayer] connect/subscribe failed:', err)
    return
  }
  await publish('hello', helloPayload())
  startLoops()
}

/** Update our broadcast identity (avatar cosmetics, name, country, rank changed
 *  while in-realm) and push it out immediately so others re-skin us live. */
export function updateIdentity(identity: PlayerIdentity): void {
  selfId = identity.id
  selfIdentity = identity
  if (useRealmNet.getState().selfId !== identity.id) useRealmNet.setState({ selfId: identity.id })
  void publish('hello', helloPayload())
}

/** Leave the current realm: announce departure, unsubscribe, clear state. */
export async function leaveRealm(): Promise<void> {
  stopLoops()
  const channel = currentChannel
  if (channel) {
    await publish('bye', { id: selfId })
    try {
      insforge.realtime.unsubscribe(channel)
    } catch {
      /* already gone */
    }
  }
  currentChannel = null
  targets.clear()
  useRealmNet.setState({ channel: null, roster: {} })
}
