import { supabase } from '../lib/insforge'

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

export async function claimSession(): Promise<boolean> {
  return false
}
