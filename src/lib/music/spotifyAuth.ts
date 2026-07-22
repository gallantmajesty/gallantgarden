// Spotify OAuth 2.0 Authorization Code Flow with PKCE
// No backend secret needed — everything runs client-side.

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
].join(' ')

const STORAGE_KEY = 'sg.spotify.auth'
const REDIRECT_URI = `${window.location.origin}/realm`

interface TokenData {
  access_token: string
  refresh_token: string
  expires_at: number
}

function loadToken(): TokenData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TokenData
  } catch {
    return null
  }
}

function saveToken(t: TokenData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEY)
}

function generateVerifier(): string {
  const arr = new Uint8Array(64)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64)
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  return crypto.subtle.digest('SHA-256', encoder.encode(plain))
}

function base64urlencode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function isSpotifyConfigured(): boolean {
  return !!CLIENT_ID
}

export function isSpotifyLoggedIn(): boolean {
  const t = loadToken()
  return !!t && t.expires_at > Date.now()
}

export function getSpotifyAccessToken(): string | null {
  const t = loadToken()
  if (!t) return null
  if (t.expires_at > Date.now()) return t.access_token
  // Token expired — try refresh
  if (t.refresh_token) {
    refreshAccessToken(t.refresh_token)
    return t.access_token // might be stale but refresh is async
  }
  return null
}

export function loginWithSpotify() {
  const verifier = generateVerifier()
  localStorage.setItem('sg.spotify.pkce_verifier', verifier)

  return sha256(verifier).then((challenge) => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: base64urlencode(challenge),
      show_dialog: 'true',
    })
    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
  })
}

export async function handleSpotifyCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const error = params.get('error')
  if (error) {
    console.warn('[Spotify] Auth error:', error)
    cleanUrl()
    return false
  }
  if (!code) return false

  const verifier = localStorage.getItem('sg.spotify.pkce_verifier') || ''
  localStorage.removeItem('sg.spotify.pkce_verifier')

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }),
    })
    const data = await res.json()
    if (data.access_token) {
      saveToken({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in - 60) * 1000,
      })
      cleanUrl()
      return true
    }
    console.error('[Spotify] Token exchange failed:', data)
    cleanUrl()
    return false
  } catch (e) {
    console.error('[Spotify] Token exchange error:', e)
    cleanUrl()
    return false
  }
}

async function refreshAccessToken(refreshToken: string) {
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    const data = await res.json()
    if (data.access_token) {
      saveToken({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: Date.now() + (data.expires_in - 60) * 1000,
      })
    }
  } catch {
    clearToken()
  }
}

export function logoutSpotify() {
  clearToken()
}

function cleanUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  window.history.replaceState({}, '', url.toString())
}
