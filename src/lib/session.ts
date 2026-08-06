let sessionId: string | null = null
let deviceLabel: string | null = null

export function initSession(): void {
  sessionId = crypto.randomUUID()
  deviceLabel = getDeviceLabel()
}

export function getDeviceLabel(): string {
  if (deviceLabel) return deviceLabel
  deviceLabel = getDeviceLabelInternal()
  return deviceLabel
}

function getDeviceLabelInternal(): string {
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android phone' : 'Android tablet'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac'
  if (/Linux/i.test(ua)) return 'Linux PC'
  return 'another device'
}

export function getSessionId(): string | null {
  return sessionId
}

/** Try to claim the single-account session. Returns true (I hold it), false
 *  (someone else holds it — heartbeat will fail and kick this tab), or null
 *  (network/error — caller should skip heartbeating so offline use survives). */
export async function claimSession(): Promise<boolean | null> {
  const sid = getSessionId()
  if (!sid) return null

  const { supabase } = await import('./supabase')
  const { data, error } = await supabase.rpc('claim_session', {
    p_session_id: sid,
    p_device_label: getDeviceLabel(),
  })

  if (error) {
    console.error('[Session] claimSession failed:', error)
    return null
  }

  return data === true
}

export async function heartbeatSession(): Promise<boolean> {
  const sid = getSessionId()
  if (!sid) return false

  const { supabase } = await import('./supabase')
  const { data, error } = await supabase.rpc('session_heartbeat', {
    p_session_id: sid,
  })

  if (error) {
    console.error('[Session] heartbeat failed:', error)
    return false
  }

  return data === true
}

export async function releaseSession(): Promise<void> {
  const { supabase } = await import('./supabase')
  await supabase.rpc('release_session')
}

export function startHeartbeat(intervalMs = 15000): () => void {
  let stopped = false
  let failCount = 0
  const MAX_FAILS = 3

  const tick = async () => {
    if (stopped) return
    const ok = await heartbeatSession()
    if (ok) {
      failCount = 0
    } else {
      failCount++
      console.warn(`[Session] heartbeat failed (${failCount}/${MAX_FAILS})`)
      if (failCount >= MAX_FAILS) {
        stopped = true
        window.dispatchEvent(new CustomEvent('session-lost'))
      }
    }
  }

  tick()
  const id = setInterval(tick, intervalMs)

  return () => {
    stopped = true
    clearInterval(id)
  }
}