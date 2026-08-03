// Multi-device boost — "the more devices you connect, the more you get".
//
// The Master (hardcore host) generates a short join code. Connectors open the
// app, tap "Hardcore Connect", and paste the code (or open `?boost=CODE`).
// Each live connector adds +DEVICE_BOOST_PCT to the hardcore effective
// multiplier, capped at DEVICE_BOOST_MAX_DEVICES (see store/hardcore.ts).
//
// Implementation: a single Supabase realtime channel per code
// (`boost:<CODE>`). Presence on that channel = connected devices. Each
// connector reports a device label (iPhone / Android phone / Windows PC …) so
// the Master can see exactly which devices are boosting. Best-effort: if
// realtime is unavailable or nobody joins, the boost is simply 0 and the
// session still works normally.

import { create } from 'zustand'
import { supabase } from './supabase'
import { getDeviceLabel } from './session'
import { DEVICE_BOOST_MAX_DEVICES, DEVICE_BOOST_PCT } from '../store/hardcore'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ---- Types ---------------------------------------------------------------

export interface BoostDevice {
  /** stable presence key for this connector */
  key: string
  /** human device label, e.g. "iPhone" or "Windows PC" */
  label: string
  /** 'master' | 'connector' */
  role: string
}

// ---- Store ---------------------------------------------------------------

interface DeviceBoostState {
  /** Is this tab acting as a Master (hosting a boost room)? */
  isHost: boolean
  /** Is this tab a connected connector device? */
  isConnector: boolean
  /** Current join code (host generates; connector sets from URL/code). */
  code: string | null
  /** Number of live connector devices in the room (host's own slot excluded). */
  deviceCount: number
  /** Live connector device details (for the Master's info panel). */
  devices: BoostDevice[]
  /** Session-local stable id for this tab so presence self-counts once. */
  clientId: string | null

  host: (code: string) => void
  connect: (code: string) => void
  disconnect: () => void
  reset: () => void
}

export const useDeviceBoost = create<DeviceBoostState>((set, get) => ({
  isHost: false,
  isConnector: false,
  code: null,
  deviceCount: 0,
  devices: [],
  clientId: null,

  host: (code) => {
    if (get().code === code && get().isHost) return
    leaveChannel()
    const clientId = makeClientId()
    set({ isHost: true, isConnector: false, code, clientId, deviceCount: 0, devices: [] })
    joinChannel(code, clientId, true)
  },

  connect: (code) => {
    if (get().code === code && get().isConnector) return
    leaveChannel()
    const clientId = makeClientId()
    set({ isHost: false, isConnector: true, code, clientId, deviceCount: 0, devices: [] })
    joinChannel(code, clientId, false)
  },

  disconnect: () => {
    leaveChannel()
    set({ isHost: false, isConnector: false, code: null, deviceCount: 0, devices: [] })
  },

  reset: () => {
    leaveChannel()
    set({ isHost: false, isConnector: false, code: null, deviceCount: 0, devices: [], clientId: null })
  },
}))

// ---- Channel lifecycle (single global channel at a time) --------------------

let activeChannel: RealtimeChannel | null = null
let activeClientId: string | null = null

function makeClientId(): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${rand}-${Date.now().toString(36)}`
}

function readDevices(): BoostDevice[] {
  if (!activeChannel) return []
  const state = activeChannel.presenceState() as Record<string, { role?: string; label?: string }[]>
  const out: BoostDevice[] = []
  for (const key of Object.keys(state)) {
    if (key === activeClientId) continue
    const first = state[key]?.[0]
    out.push({ key, label: first?.label ?? 'another device', role: first?.role ?? 'connector' })
  }
  return out
}

function joinChannel(code: string, clientId: string, isHost: boolean) {
  const room = `boost:${code}`
  activeClientId = clientId

  try {
    const ch = supabase.channel(room)

    ch.on('presence', { event: 'sync' }, () => {
      const devices = readDevices()
      const connectors = devices.filter((d) => d.role !== 'master')
      useDeviceBoost.setState({
        deviceCount: Math.min(DEVICE_BOOST_MAX_DEVICES, connectors.length),
        devices,
      })
    })

    ch.on('presence', { event: 'join' }, ({ key }) => {
      if (key === activeClientId) return
      const devices = readDevices()
      const connectors = devices.filter((d) => d.role !== 'master')
      useDeviceBoost.setState({
        deviceCount: Math.min(DEVICE_BOOST_MAX_DEVICES, connectors.length),
        devices,
      })
    })

    ch.on('presence', { event: 'leave' }, ({ key }) => {
      if (key === activeClientId) return
      const devices = readDevices()
      const connectors = devices.filter((d) => d.role !== 'master')
      useDeviceBoost.setState({
        deviceCount: Math.min(DEVICE_BOOST_MAX_DEVICES, connectors.length),
        devices,
      })
    })

    activeChannel = ch

    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      // Track presence with an explicit key = clientId so each tab counts once
      // and we can exclude our own slot from the connector tally. Report the
      // device label so the Master can see exactly what's connected.
      ch.track(
        { role: isHost ? 'master' : 'connector', label: getDeviceLabel(), at: Date.now() },
        { key: clientId },
      ).catch(() => {
        /* best-effort */
      })
    })
  } catch {
    /* realtime unavailable — boost stays 0 */
  }
}

function leaveChannel() {
  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel)
    } catch {
      /* already gone */
    }
  }
  activeChannel = null
  activeClientId = null
}

// ---- Parse a boost code from the URL (?boost=CODE) --------------------------

export function boostCodeFromUrl(): string | null {
  try {
    const p = new URLSearchParams(window.location.search)
    const code = p.get('boost')
    if (code && /^[A-Z0-9]{4,12}$/i.test(code)) return code.toUpperCase()
  } catch {
    /* no URL */
  }
  return null
}

export function copyBoostLink(code: string): string {
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('boost', code)
    return url.toString()
  } catch {
    return `${window.location.origin}/?boost=${code}`
  }
}

// ---- Helpers for UI ----------------------------------------------------------

export function boostPct(devices: number): number {
  return Math.min(DEVICE_BOOST_MAX_DEVICES, devices) * DEVICE_BOOST_PCT * 100
}

export function generateBoostCode(): string {
  // Short, human-readable code: 2 letters + 3 digits (e.g. "SD482").
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const digits = '0123456789'
  const l1 = letters[Math.floor(Math.random() * letters.length)]
  const l2 = letters[Math.floor(Math.random() * letters.length)]
  const d = Array.from({ length: 3 }, () => digits[Math.floor(Math.random() * digits.length)]).join('')
  return `${l1}${l2}${d}`
}
