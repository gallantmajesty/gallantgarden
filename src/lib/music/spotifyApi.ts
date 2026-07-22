// Spotify Web API client for playback control.
// Talks to the active Spotify device (phone, desktop, web player).

import { getSpotifyAccessToken } from './spotifyAuth'

const API = 'https://api.spotify.com/v1'

export interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string; width: number; height: number }[]
  }
  duration_ms: number
  uri: string
}

export interface SpotifyPlayback {
  is_playing: boolean
  progress_ms: number
  item: SpotifyTrack | null
  device: { name: string; volume_percent: number } | null
  shuffle_state: boolean
  repeat_state: 'off' | 'track' | 'context'
  context: { type: string; uri: string } | null
}

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T | null> {
  const token = getSpotifyAccessToken()
  if (!token) return null
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 204) return null
    if (!res.ok) {
      console.warn(`[Spotify API] ${method} ${path} → ${res.status}`)
      return null
    }
    return res.json()
  } catch {
    return null
  }
}

export async function getPlayback(): Promise<SpotifyPlayback | null> {
  return api<SpotifyPlayback>('/me/player')
}

export async function play(): Promise<void> {
  await api('/me/player/play', 'PUT')
}

export async function pause(): Promise<void> {
  await api('/me/player/pause', 'PUT')
}

export async function next(): Promise<void> {
  await api('/me/player/next', 'POST')
}

export async function previous(): Promise<void> {
  await api('/me/player/previous', 'POST')
}

export async function setVolume(percent: number): Promise<void> {
  await api(`/me/player/volume?volume_percent=${Math.round(percent)}`, 'PUT')
}

export async function seek(positionMs: number): Promise<void> {
  await api(`/me/player/seek?position_ms=${Math.round(positionMs)}`, 'PUT')
}

export async function setShuffle(state: boolean): Promise<void> {
  await api(`/me/player/shuffle?state=${state}`, 'PUT')
}

export async function setRepeat(state: 'off' | 'track' | 'context'): Promise<void> {
  await api(`/me/player/repeat?state=${state}`, 'PUT')
}

/** Start playback on a specific device */
export async function transferPlayback(deviceId: string): Promise<void> {
  await api('/me/player', 'PUT', { device_ids: [deviceId] })
}
